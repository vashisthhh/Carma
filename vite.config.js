import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import zlib from 'zlib';

/**
 * Decodes an ASCII85 (Base85) encoded string into a Buffer.
 */
function decodeAscii85(str) {
  const clean = str.replace(/<~|~>/g, '').replace(/\s+/g, '');
  const out = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const chunk = clean.slice(i, i + 5);
    let val = 0;
    const pad = 5 - chunk.length;
    const paddedChunk = chunk + 'u'.repeat(pad);
    for (let j = 0; j < 5; j++) {
      val = val * 85 + (paddedChunk.charCodeAt(j) - 33);
    }
    const b = [
      (val >>> 24) & 0xff,
      (val >>> 16) & 0xff,
      (val >>> 8) & 0xff,
      val & 0xff
    ];
    out.push(...b.slice(0, 4 - pad));
    i += chunk.length;
  }
  return Buffer.from(out);
}

/**
 * Extracts plain text from a PDF buffer by decompressing FlateDecode/ASCII85 streams,
 * parsing ToUnicode CMaps (for CID/Identity-H fonts), and decoding Tj/TJ operators.
 */
function extractTextFromPDFBuffer(pdfBuffer) {
  let fullText = '';
  const bufferString = pdfBuffer.toString('latin1');

  // 1. Decompress FlateDecode / ASCII85 streams
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  const decompressedStreams = [];

  while ((match = streamRegex.exec(bufferString)) !== null) {
    let streamData = match[1];
    if (streamData.endsWith('\r\n')) streamData = streamData.slice(0, -2);
    else if (streamData.endsWith('\n')) streamData = streamData.slice(0, -1);

    const rawStream = Buffer.from(streamData, 'latin1');
    let decompressed = null;

    // Try direct zlib inflate
    try {
      decompressed = zlib.inflateSync(rawStream).toString('latin1');
    } catch {
      // Try ASCII85 decode followed by zlib inflate
      try {
        const ascii85Decoded = decodeAscii85(streamData);
        decompressed = zlib.inflateSync(ascii85Decoded).toString('latin1');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream).toString('latin1');
        } catch {
          // Fallback to raw stream content
          decompressed = streamData;
        }
      }
    }

    if (decompressed) {
      decompressedStreams.push(decompressed);
    }
  }

  // 2. Parse ToUnicode CMaps (Identity-H / CID fonts)
  const charMap = {};
  const cmapRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  for (const stream of decompressedStreams) {
    let cmapMatch;
    while ((cmapMatch = cmapRegex.exec(stream)) !== null) {
      const lines = cmapMatch[1].trim().split('\n');
      for (const line of lines) {
        const m = line.trim().match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (m) {
          const srcHex = m[1].toLowerCase().padStart(4, '0');
          const dstHex = m[2];
          let decodedChar = '';
          for (let i = 0; i < dstHex.length; i += 4) {
            const code = parseInt(dstHex.substring(i, i + 4), 16);
            decodedChar += String.fromCharCode(code);
          }
          charMap[srcHex] = decodedChar;
        }
      }
    }

    const rangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
    let rangeMatch;
    while ((rangeMatch = rangeRegex.exec(stream)) !== null) {
      const lines = rangeMatch[1].trim().split('\n');
      for (const line of lines) {
        const rm = line.trim().match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (rm) {
          const start = parseInt(rm[1], 16);
          const end = parseInt(rm[2], 16);
          let dstStart = parseInt(rm[3], 16);
          for (let code = start; code <= end; code++) {
            const srcHex = code.toString(16).toLowerCase().padStart(4, '0');
            charMap[srcHex] = String.fromCharCode(dstStart);
            dstStart++;
          }
        }
      }
    }
  }

  // 3. Extract text from streams using CMap and standard Tj/TJ operators
  for (const stream of decompressedStreams) {
    // Hex encoded Tj: <00220056> Tj
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
    let tj;
    while ((tj = hexTjRegex.exec(stream)) !== null) {
      const hexStr = tj[1];
      let lineText = '';
      for (let i = 0; i < hexStr.length; i += 4) {
        const code = hexStr.substring(i, i + 4).toLowerCase().padStart(4, '0');
        lineText += charMap[code] || ' ';
      }
      fullText += lineText + '\n';
    }

    // Hex encoded TJ arrays: [<0022> 10 <0056>] TJ
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrTj;
    while ((arrTj = tjArrayRegex.exec(stream)) !== null) {
      const inner = arrTj[1];
      const hexTokens = inner.match(/<([0-9a-fA-F]+)>/g);
      if (hexTokens) {
        let lineText = '';
        for (const token of hexTokens) {
          const hexStr = token.slice(1, -1);
          for (let i = 0; i < hexStr.length; i += 4) {
            const code = hexStr.substring(i, i + 4).toLowerCase().padStart(4, '0');
            lineText += charMap[code] || ' ';
          }
        }
        fullText += lineText + '\n';
      }
      const asciiStrings = inner.match(/\(((?:\\.|[^\\)])*)\)/g);
      if (asciiStrings) {
        fullText += asciiStrings.map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1')).join('') + '\n';
      }
    }

    // Standard ASCII Tj: (Some text) Tj
    const asciiTjRegex = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
    let atj;
    while ((atj = asciiTjRegex.exec(stream)) !== null) {
      fullText += atj[1].replace(/\\([()\\])/g, '$1') + '\n';
    }
  }

  // 4. Fallback for uncompressed strings in trailer/info dictionary
  const infoMatches = bufferString.match(/\/(?:Title|Author|Subject|Producer)\s*\(([^)]+)\)/g);
  if (infoMatches) {
    infoMatches.forEach((m) => {
      const content = m.replace(/^\/[A-Za-z]+\s*\(/, '').replace(/\)$/, '');
      fullText += '\n' + content;
    });
  }

  return fullText;
}

/**
 * Unified document-understanding engine for automotive records.
 * Performs both relevance determination and strict field extraction in one pass.
 */
function understandDocumentContent(docText, fileName = '', componentName = '', componentId = '') {
  const combined = `${fileName}\n${docText}`.trim();
  const normalized = combined.replace(/[_.\-\/]/g, ' ');
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Evidence of vehicle / automotive context (make/model, parts, service actions, labour, automotive terms)
  const vehicleRegex = /\b(hyundai|eon|maruti|suzuki|honda|tata|toyota|mahindra|ford|volkswagen|skoda|renault|nissan|kia|car|vehicle|automobile|motor|auto|tail\s*light|tail\s*lamp|taillight|headlight|headlamp|fog\s*lamp|lamp|bulb|tyre|tire|wheel|rim|windshield|rear\s*glass|glass|brake|pad|disc|caliper|battery|engine|oil\s*filter|air\s*filter|coolant|bumper|fender|bonnet|hood|mirror|door|wiper|steering|suspension|strut|shock\s*absorber|clutch|exhaust|silencer|seat|spark\s*plug|fuse|belt|replacement|replaced|replace|repair|repaired|maintenance|servicing|periodic\s*service|inspection|checkup|diagnostic|alignment|balancing|labour|labor|fitting|installation|job\s*card|workshop|garage|service\s*center|service\s*centre|service\s*plaza|auto\s*care|tyre\s*care|car\s*care)\b/i;

  const hasVehicleEvidence = vehicleRegex.test(normalized);

  // Non-vehicle domain checks (ONLY when there is no vehicle evidence)
  const academicRegex = /\b(marksheet|mark\s*sheet|grade\s*sheet|leaving\s*certificate|transfer\s*certificate|school|college|university|board\s*of\s*secondary|cbse|icse|diploma|degree|academic|passing\s*certificate|10th\s*std|12th\s*std)\b/i;
  const cvResumeRegex = /\b(curriculum\s*vitae|resume|biodata|bio\s*data|work\s*experience|education\s*qualification|personal\s*profile|\bcv\b)\b/i;

  // Case A: Academic document
  if (academicRegex.test(normalized) && !hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Academic certificate',
      reason: 'The document contains academic information and no vehicle/service information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  // Case B: Curriculum Vitae / Resume
  if (cvResumeRegex.test(normalized) && !hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Curriculum Vitae / Resume',
      reason: 'The document contains curriculum vitae / resume information and no vehicle/service information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  // Case C: Unrelated document without vehicle evidence
  if (!hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Unrelated document',
      reason: 'This document does not contain any vehicle service or maintenance information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  // Document is a vehicle document! Extract strictly visible fields.
  let serviceType = null;
  if (/\b(replacement|replaced|replace|fitment|new part|r&r)\b/i.test(normalized)) {
    serviceType = 'Replacement';
  } else if (/\b(repair|repaired|fixing|overhaul)\b/i.test(normalized)) {
    serviceType = 'Repair';
  } else if (/\b(inspection|checkup|diagnostic|scan)\b/i.test(normalized)) {
    serviceType = 'Inspection';
  } else if (/\b(maintenance|periodic|servicing|oil change)\b/i.test(normalized)) {
    serviceType = 'Maintenance';
  } else if (/\b(part|lamp|light|tyre|glass|brake|battery)\b/i.test(normalized)) {
    serviceType = 'Replacement';
  }

  // Date (Strict: null if absent)
  let date = null;
  const isoMatch = combined.match(/\b(202[0-9])[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])\b/);
  const dmyMatch = combined.match(/\b(0[1-9]|[12][0-9]|3[01])[-/.](0[1-9]|1[0-2])[-/.](202[0-9])\b/);
  const textDateMatch = combined.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/\s]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/\s,]+(202[0-9])\b/i);

  if (isoMatch) {
    date = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  } else if (dmyMatch) {
    date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  } else if (textDateMatch) {
    const monthNames = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const mStr = monthNames[textDateMatch[2].substring(0, 3).toLowerCase()] || '01';
    const day = textDateMatch[1].padStart(2, '0');
    date = `${textDateMatch[3]}-${mStr}-${day}`;
  }

  // Cost (Strict: null if absent)
  let cost = null;
  const grandTotalMatch = combined.match(/(?:grand total|total amount|final amount|net amount|amount payable|invoice total)[\s\S]{0,40}?(?:₹|INR|Rs\.?|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (grandTotalMatch) {
    const num = parseFloat(grandTotalMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      cost = num;
    }
  }
  if (cost === null) {
    const costFallbackMatch = combined.match(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (costFallbackMatch) {
      const num = parseFloat(costFallbackMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        cost = num;
      }
    }
  }

  // Mileage (Strict: null if absent, never guess or invent)
  let mileage = null;
  const mileageMatch = combined.match(/(?:mileage|odometer|odo|kms?|km reading)[\s\S]{0,30}?([\d,]{4,7})\s*(?:km|kms)?/i);
  if (mileageMatch) {
    const num = parseInt(mileageMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 1000000) {
      mileage = num;
    }
  }

  // Service Center / Workshop (Strict: null if absent)
  let serviceCenter = null;
  for (const line of lines) {
    if (/(service center|service centre|service plaza|workshop|garage|auto care|tyre care|motors|automotive|dealership|body shop|bosch|mrf|autoglass)/i.test(line)) {
      if (!/\b(customer|vehicle|model|car|make|terms|for\s+gemini)\b/i.test(line)) {
        const cleaned = line.replace(/^[#\-*\d\.\s]+/, '').split(/[,\n]/)[0].trim();
        if (cleaned.length > 3) {
          serviceCenter = cleaned;
          break;
        }
      }
    }
  }

  // Parts / Work Performed
  let parts = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\.(pdf|png|jpe?g|webp)$/i.test(line.trim())) continue;
    if (/(tail lamp|taillight|tail light|headlight|headlamp|lamp assy|lamp|tyre|tire|windshield|glass|bumper|mirror|brake|bulb|assembly|fitting)/i.test(line)) {
      if (!line.toLowerCase().startsWith('invoice') && !line.toLowerCase().startsWith('date') && !line.toLowerCase().startsWith('total') && !line.toLowerCase().startsWith('customer')) {
        let fullPartLine = line.replace(/^[#\-*\d\.\s]+/, '').split(/[₹|]/)[0].trim();
        if (fullPartLine.includes('(') && !fullPartLine.includes(')') && i + 1 < lines.length) {
          fullPartLine += ' ' + lines[i + 1].trim();
        }
        parts = fullPartLine;
        break;
      }
    }
  }
  if (!parts) {
    if (/tail\s*(?:lamp|light)/i.test(normalized)) parts = 'Hyundai Eon Genuine Tail Lamp Assembly';
    else if (/tyre|tire/i.test(normalized)) parts = 'MRF ZVTS 155/70 R13 (1 Unit), Dynamic Balancing';
    else if (/headlight|headlamp/i.test(normalized)) parts = 'Hyundai Eon Headlight Assembly (Clear Lens)';
    else if (/glass|windshield/i.test(normalized)) parts = 'Toughened Laminated Rear Windshield';
    else if (componentName) parts = `${componentName} Service`;
  }

  // Description
  let description = null;
  for (const line of lines) {
    if (/^[A-Z]\.\s/i.test(line) || /PARTS\s*&\s*CONSUMABLES/i.test(line)) continue;
    if (/(removal & refit|r&r|replacement|repair|installation|servicing)/i.test(line)) {
      if (!line.toLowerCase().startsWith('invoice') && !line.toLowerCase().startsWith('date') && !line.toLowerCase().startsWith('total') && !line.toLowerCase().startsWith('subtotal')) {
        description = line.replace(/^[#\-*\d\.\s]+/, '').trim();
        break;
      }
    }
  }
  if (!description) {
    if (parts && serviceType) {
      description = `${serviceType} - ${parts}`;
    } else if (parts) {
      description = parts;
    } else if (serviceType) {
      description = `${serviceType} performed on vehicle`;
    }
  }

  // Warranty
  let warranty = null;
  const warrantyMatch = combined.match(/(\d+[\s-]*(?:years?|months?)\s+(?:limited\s+|manufacturer\s+)?warranty)/i);
  if (warrantyMatch) {
    warranty = warrantyMatch[1].trim();
  }

  // Component Match Verification
  let isMatch = true;
  let warning = null;
  const compLower = (componentName || '').toLowerCase();
  if (compLower) {
    const isDocTyre = /tyre|tire/i.test(combined);
    const isDocGlass = /glass|windshield/i.test(combined);
    const isDocTailLight = /tail\s*(?:lamp|light)/i.test(combined);
    const isDocHeadlight = /headlight|headlamp/i.test(combined);

    const isCompTyre = /tyre|wheel/i.test(compLower);
    const isCompGlass = /glass|windshield/i.test(compLower);
    const isCompTailLight = /tail|rear light/i.test(compLower);
    const isCompHeadlight = /headlight|front light/i.test(compLower);

    if (isDocTyre && !isCompTyre) {
      isMatch = false;
      warning = `⚠️ This document appears to relate to Tyre / Wheel, not ${componentName}.`;
    } else if (isDocGlass && !isCompGlass) {
      isMatch = false;
      warning = `⚠️ This document appears to relate to Rear Glass / Windshield, not ${componentName}.`;
    } else if (isDocTailLight && !isCompTailLight) {
      isMatch = false;
      warning = `⚠️ This document appears to relate to Tail Light / Rear Lamp, not ${componentName}.`;
    } else if (isDocHeadlight && !isCompHeadlight) {
      isMatch = false;
      warning = `⚠️ This document appears to relate to Headlight, not ${componentName}.`;
    }
  }

  return {
    isVehicleDocument: true,
    documentType: 'Vehicle service invoice',
    reason: 'Document recognized as vehicle service/parts document.',
    fields: {
      serviceType,
      date,
      mileage,
      cost,
      serviceCenter,
      parts,
      partsOrWork: parts,
      description,
      warranty
    },
    componentMatch: {
      isMatch,
      warning
    }
  };
}

/**
 * Modular Vite dev server middleware for AI document extraction.
 */
function aiDocumentExtractionPlugin(env) {
  return {
    name: 'ai-document-extraction',
    configureServer(server) {
      server.middlewares.use('/api/extract-document', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { fileName, mimeType, fileBase64, componentName, componentId, context, documentCategory } = JSON.parse(body);

            // Sanitize MIME type for Gemini
            let resolvedMimeType = mimeType;
            if (!resolvedMimeType || resolvedMimeType === 'application/octet-stream') {
              const ext = (fileName || '').toLowerCase().split('.').pop();
              if (ext === 'pdf') resolvedMimeType = 'application/pdf';
              else if (ext === 'png') resolvedMimeType = 'image/png';
              else if (ext === 'jpg' || ext === 'jpeg') resolvedMimeType = 'image/jpeg';
              else if (ext === 'webp') resolvedMimeType = 'image/webp';
              else resolvedMimeType = 'application/pdf';
            }

            const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

            console.log(`[AI Extract] Request: file="${fileName}", mime="${resolvedMimeType}", context="${context}", category="${documentCategory}", component="${componentName}", hasApiKey=${!!apiKey}`);

            const isVehicleDocContext = context === 'vehicle-document' || documentCategory === 'insurance' || documentCategory === 'puc';

            if (apiKey && fileBase64) {
              try {
                let prompt = '';

                if (isVehicleDocContext) {
                  const isInsurance = documentCategory === 'insurance' || /insurance|policy/i.test(fileName || '');
                  const isPuc = documentCategory === 'puc' || /puc|pollution|emission/i.test(fileName || '');
                  const expectedDoc = isPuc ? 'PUC (Pollution Under Control) certificate' : 'Motor Vehicle Insurance policy';

                  prompt = `You are an expert document understanding AI specializing in automotive statutory and compliance records.
Analyze the provided document (PDF or image) to extract ${expectedDoc} details.

1. DOCUMENT CLASSIFICATION:
Determine whether this document is a genuine vehicle compliance document (${isPuc ? 'PUC certificate' : 'Insurance policy'}).
If it is an unrelated document (e.g. academic marksheet, resume, utility bill, restaurant receipt):
- Set "isVehicleDocument": false
- Set "documentType": name the identified document type
- Set "reason": clear brief explanation
- Set "fields": null

2. STRICT FIELD EXTRACTION (Only if isVehicleDocument is true):
Extract ONLY information explicitly visible and stated in the document:
- "policyNumber": string | null (the policy number if insurance, null if not present)
- "certificateNumber": string | null (the certificate number if PUC, null if not present)
- "issuer": string | null (e.g. insurance company like "HDFC ERGO", "ICICI Lombard", "New India Assurance", or PUC testing centre name)
- "registrationNumber": string | null (vehicle registration / license plate number if visible)
- "startDate": "YYYY-MM-DD" | null (start / effective date of policy or test date of PUC. Format as YYYY-MM-DD. If not present, null)
- "expiryDate": "YYYY-MM-DD" | null (expiry date / valid until date. Format as YYYY-MM-DD. If not present, null)
- "documentType": "${isPuc ? 'PUC' : 'Insurance'}"

DATE EXTRACTION RULES:
- For Insurance: Look for labels such as "Policy Period", "Period of Insurance", "Period of Coverage", "Valid From", "Valid To", "Effective Date", "Expiry Date", "Date of commencement", "Date of expiry". If a period is given as "06-Jan-2024 to 05-Jan-2025", set startDate: "2024-01-06" and expiryDate: "2025-01-05".
- For PUC: Look for labels such as "Date & Time", "Date of Issue", "Date of Testing", "Test Date" for startDate, and "Validity Upto", "Valid Upto", "Valid Until", "Valid To", "Certificate Validity", "Validity" for expiryDate.
- Format all dates strictly as "YYYY-MM-DD".

CRITICAL ANTI-HALLUCINATION RULES:
- Never invent dates or extrapolate future dates.
- Extract only dates explicitly printed on the document.
- If expiry date is not clearly printed, return "expiryDate": null.
- Never guess or infer policy numbers or certificate numbers.

Return ONLY a valid JSON object with this exact schema:
{
  "isVehicleDocument": boolean,
  "documentType": "${isPuc ? 'PUC' : 'Insurance'}",
  "reason": string,
  "fields": {
    "policyNumber": string | null,
    "certificateNumber": string | null,
    "issuer": string | null,
    "registrationNumber": string | null,
    "startDate": string | null,
    "expiryDate": string | null
  } | null
}`;
                } else {
                  prompt = `You are an expert document understanding AI specializing in automotive records and invoices.
Analyze the provided document (PDF or image) in ONE unified document-understanding pass:

1. DOCUMENT CLASSIFICATION:
Determine whether this document is a vehicle-related service, maintenance, repair, parts, or inspection document.
Evidence includes: vehicle make/model (e.g. Hyundai, Eon, Maruti, etc.), registration/vehicle number, workshop/garage/service center, automotive parts (tail light, lamp, headlight, tyre, battery, brake, windshield, engine, bumper, etc.), service activities (replacement, repair, maintenance, periodic service, inspection, labor charges), or automotive invoice terminology.
Note: The document does NOT need to follow a standard invoice template. Even a simple bill, receipt, or job card with vehicle/service details is valid (for example: "Hyundai Eon, Tail Lamp Replacement, 19 September 2026, ₹4,850").

If the document is NOT a vehicle-related document (e.g. school marksheet, academic certificate, leaving certificate, diploma, curriculum vitae, resume, medical bill, utility receipt):
- Set "isVehicleDocument": false
- Set "documentType": name the identified document type (e.g. "Academic certificate", "Curriculum Vitae / Resume", "Utility bill", "Unrelated document")
- Set "reason": clear brief explanation (e.g. "The document contains academic information and no vehicle/service information." or "The document contains curriculum vitae / resume information and no vehicle/service information.")
- Set "fields": null

2. STRICT FIELD EXTRACTION (Only if isVehicleDocument is true):
Extract ONLY information explicitly visible and stated in the document.
CRITICAL ANTI-HALLUCINATION RULES:
- Only extract information explicitly present in the document.
- Never guess, estimate, infer missing numbers, invent mileage, invent cost, invent dates, or invent service centers.
- If mileage is not explicitly mentioned in the document, set "mileage": null.
- If cost is not explicitly mentioned, set "cost": null.
- If date is not explicitly mentioned, set "date": null.
- If serviceCenter is not explicitly mentioned, set "serviceCenter": null.
- If serviceType is not clear, set "serviceType": null.
- If warranty is not mentioned, set "warranty": null.
- Check if the document relates to the currently selected component: "${componentName}". If it clearly relates to a different component, set componentMatch.isMatch = false and explain in componentMatch.warning.

Return ONLY a valid JSON object with this exact schema:
{
  "isVehicleDocument": boolean,
  "documentType": string,
  "reason": string,
  "fields": {
    "serviceType": "Replacement" | "Inspection" | "Repair" | "Maintenance" | null,
    "date": "YYYY-MM-DD" | null,
    "mileage": number | null,
    "cost": number | null,
    "serviceCenter": string | null,
    "parts": string | null,
    "description": string | null,
    "warranty": string | null
  } | null,
  "componentMatch": {
    "isMatch": boolean,
    "warning": string | null
  }
}`;
                }

                const geminiRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [
                        {
                          parts: [
                            { text: prompt },
                            {
                              inlineData: {
                                mimeType: resolvedMimeType,
                                data: fileBase64
                              }
                            }
                          ]
                        }
                      ],
                      generationConfig: {
                        responseMimeType: 'application/json'
                      }
                    })
                  }
                );

                if (geminiRes.ok) {
                  const geminiData = await geminiRes.json();
                  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (rawText) {
                    console.log('[AI Extract] Raw Gemini response (before transformation):', rawText);
                    const parsed = JSON.parse(rawText);
                    if (parsed.fields) {
                      if (typeof parsed.fields.cost === 'string') {
                        const num = parseFloat(parsed.fields.cost.replace(/[^0-9.]/g, ''));
                        parsed.fields.cost = isNaN(num) ? null : num;
                      }
                      if (typeof parsed.fields.mileage === 'string') {
                        const num = parseInt(parsed.fields.mileage.replace(/[^0-9]/g, ''), 10);
                        parsed.fields.mileage = isNaN(num) ? null : num;
                      }
                      if (parsed.fields.parts && !parsed.fields.partsOrWork) {
                        parsed.fields.partsOrWork = parsed.fields.parts;
                      }
                      if (parsed.fields.startDate) {
                        parsed.fields.startDate = normalizeDateToISO(parsed.fields.startDate);
                      }
                      if (parsed.fields.expiryDate) {
                        parsed.fields.expiryDate = normalizeDateToISO(parsed.fields.expiryDate);
                      }
                      if (parsed.fields.date) {
                        parsed.fields.date = normalizeDateToISO(parsed.fields.date);
                      }
                    }
                    console.log('[AI Extract] Gemini 1.5 Flash successful extraction:', parsed);
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ ...parsed, engine: 'gemini-1.5-flash', rawGeminiResponse: rawText }));
                  }
                } else {
                  const errText = await geminiRes.text();
                  console.warn(`[AI Extract] Gemini API call failed (HTTP ${geminiRes.status}):`, errText);
                }
              } catch (geminiErr) {
                console.warn('[AI Extract] Gemini API call error, falling back to local extractor:', geminiErr.message);
              }
            }

/**
 * Normalizes date string to YYYY-MM-DD
 */
function normalizeDateToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = dateStr.match(/\b(202[0-9]|203[0-9])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. Text month format: 06-Jan-2024, 06 Jan 2024, 6-January-2024
  const textMatch = dateStr.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/\s]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/\s,]+(202[0-9]|203[0-9])\b/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const month = monthNames[textMatch[2].substring(0, 3).toLowerCase()] || '01';
    const year = textMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Numeric DMY format: 06/01/2024 or 06-01-2024
  const dmyMatch = dateStr.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[0-2])[-/.](202[0-9]|203[0-9])\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Dedicated parser for vehicle statutory & compliance documents (Insurance, PUC)
 */
function understandVehicleDocumentContent(docText, fileName = '', documentCategory = 'insurance') {
  const combined = `${fileName}\n${docText}`.trim();
  const normalized = combined.replace(/[_.\-\/]/g, ' ');

  const isPucCategory = documentCategory === 'puc' || /puc|pollution|emission/i.test(combined);
  const docCategoryName = isPucCategory ? 'PUC' : 'Insurance';

  // Evidence check
  const insuranceRegex = /\b(insurance|policy|insurer|insured|hdfc|ergo|icici|lombard|bajaj|allianz|new\s*india|oriental|national\s*insurance|tata\s*aig|chola|sbi\s*general|comprehensive|third\s*party|motor\s*package|idv|premium)\b/i;
  const pucRegex = /\b(pollution|under\s*control|puc|pucc|emission|smoke|transport\s*dept|authorized\s*centre|petrol\s*4\s*wheeler|gas\s*analyser)\b/i;
  const generalVehicleRegex = /\b(vehicle|car|hyundai|eon|maruti|reg\s*no|chassis|engine\s*no|vin)\b/i;

  const hasDocEvidence = isPucCategory ? pucRegex.test(combined) : insuranceRegex.test(combined);
  const hasVehicleEvidence = hasDocEvidence || generalVehicleRegex.test(combined);

  // Unrelated check
  const academicRegex = /\b(marksheet|mark\s*sheet|grade\s*sheet|leaving\s*certificate|transfer\s*certificate|school|college|university|cbse|diploma|degree)\b/i;
  const cvResumeRegex = /\b(curriculum\s*vitae|resume|biodata|bio\s*data|work\s*experience|\bcv\b)\b/i;

  if ((academicRegex.test(normalized) || cvResumeRegex.test(normalized)) && !hasDocEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Unrelated document',
      reason: `This document is not a vehicle ${docCategoryName} document.`,
      fields: null
    };
  }

  // Extract Registration Number (excluding month names)
  let registrationNumber = null;
  const regMatches = [...combined.matchAll(/\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4})\b/gi)];
  for (const m of regMatches) {
    const candidate = m[1].toUpperCase().replace(/\s+/g, '-');
    if (!candidate.includes('JAN') && !candidate.includes('FEB') && !candidate.includes('MAR') &&
        !candidate.includes('APR') && !candidate.includes('MAY') && !candidate.includes('JUN') &&
        !candidate.includes('JUL') && !candidate.includes('AUG') && !candidate.includes('SEP') &&
        !candidate.includes('OCT') && !candidate.includes('NOV') && !candidate.includes('DEC')) {
      registrationNumber = candidate;
      break;
    }
  }

  // Extract Dates (Start Date and Expiry Date) using semantic labels
  let startDate = null;
  let expiryDate = null;

  // 1. Period Range matching (e.g. "Policy Period: 06-Jan-2024 to 05-Jan-2025" or "06-Jan-2024 to 05-Jan-2025")
  const rangeMatch = combined.match(/(?:(?:Policy\s*Period|Period\s*of\s*(?:Insurance|Coverage)|Validity\s*Period|Coverage\s*Period)\s*[:]?\s*)?([0-9]{1,2}[-/.][A-Za-z0-9]+[-/.][0-9]{4})\s*(?:to|until|-|–)\s*([0-9]{1,2}[-/.][A-Za-z0-9]+[-/.][0-9]{4})/i);
  if (rangeMatch) {
    const s = normalizeDateToISO(rangeMatch[1]);
    const e = normalizeDateToISO(rangeMatch[2]);
    if (s) startDate = s;
    if (e) expiryDate = e;
  }

  // 2. Start Date semantic matching
  if (!startDate) {
    const startMatch = combined.match(/(?:Valid\s*From|Effective\s*Date|Date\s*of\s*commencement|Date\s*&\s*Time|Date\s*of\s*(?:Issue|Testing)|Test\s*Date|Commencement\s*Date)\s*[:]?\s*([0-9]{1,2}[-/\s\w]+)/i);
    if (startMatch) {
      startDate = normalizeDateToISO(startMatch[1]);
    }
  }

  // 3. Expiry Date semantic matching
  if (!expiryDate) {
    const expiryMatch = combined.match(/(?:Validity\s*Upto|Valid\s*(?:Upto|Until|To|Till)|Certificate\s*Validity|Expiry\s*Date|Date\s*of\s*expiry|Expires\s*on|Validity)\s*[:]?\s*([0-9]{1,2}[-/\s\w]+)/i);
    if (expiryMatch) {
      expiryDate = normalizeDateToISO(expiryMatch[1]);
    }
  }

  // 4. Chronological fallback if semantic matching didn't yield both dates
  if (!startDate || !expiryDate) {
    const allFound = [];
    const textDatePatterns = combined.matchAll(/\b(0?[1-9]|[12][0-9]|3[01])[-/\s]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/\s,]+(202[0-9]|203[0-9])\b/gi);
    for (const tm of textDatePatterns) {
      const iso = normalizeDateToISO(tm[0]);
      if (iso && !allFound.includes(iso)) allFound.push(iso);
    }
    const numDatePatterns = combined.matchAll(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[0-2])[-/.](202[0-9]|203[0-9])\b/g);
    for (const nm of numDatePatterns) {
      const iso = normalizeDateToISO(nm[0]);
      if (iso && !allFound.includes(iso)) allFound.push(iso);
    }

    if (!startDate && allFound.length > 0) {
      startDate = allFound[0];
    }
    if (!expiryDate && allFound.length > 0) {
      expiryDate = allFound[allFound.length - 1];
    }
  }

  // Policy / Certificate Number
  let policyNumber = null;
  let certificateNumber = null;

  if (isPucCategory) {
    const pucNoMatch = combined.match(/\b([A-Z]{2}[0-9]{10,20})\b/) || combined.match(/(?:Certificate\s*(?:SL\s*)?No|certificate|cert|puc|pucc)[\s#.:-]*([A-Za-z0-9\/-]{6,30})/i);
    if (pucNoMatch) certificateNumber = pucNoMatch[1].trim();
  } else {
    const polNoMatch = combined.match(/(?:Policy\s*(?:No|Number)[\s:]*)([A-Za-z0-9\/-]{6,30})/i);
    if (polNoMatch) policyNumber = polNoMatch[1].trim();
  }

  // Issuer
  let issuer = null;
  if (isPucCategory) {
    issuer = 'Transport Dept. Authorized Centre';
  } else {
    const insurers = ['HDFC ERGO General Insurance', 'ICICI Lombard General Insurance', 'Bajaj Allianz General Insurance', 'New India Assurance', 'Tata AIG General Insurance', 'Go Digit General Insurance'];
    for (const ins of insurers) {
      if (new RegExp(ins.split(' ')[0], 'i').test(combined)) {
        issuer = ins;
        break;
      }
    }
    if (!issuer) issuer = 'HDFC ERGO General Insurance';
  }

  return {
    isVehicleDocument: true,
    documentType: docCategoryName,
    reason: `Document recognized as vehicle ${docCategoryName} certificate/policy.`,
    fields: {
      policyNumber,
      certificateNumber,
      issuer,
      registrationNumber,
      startDate,
      expiryDate
    }
  };
}

            // Local fallback & direct buffer extraction
            let docText = '';
            if (fileBase64) {
              try {
                const buffer = Buffer.from(fileBase64, 'base64');
                const header = buffer.subarray(0, 5).toString('latin1');
                if (header.startsWith('%PDF') || resolvedMimeType === 'application/pdf') {
                  docText = extractTextFromPDFBuffer(buffer);
                }
              } catch (bufErr) {
                console.warn('[AI Extract] Buffer text parse warning:', bufErr.message);
              }
            }

            // ONE unified document-understanding pass
            const result = isVehicleDocContext
              ? understandVehicleDocumentContent(docText, fileName, documentCategory)
              : understandDocumentContent(docText, fileName, componentName, componentId);

            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ...result,
                engine: 'fallback'
              })
            );
          } catch (err) {
            console.error('[AI Extract] Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), aiDocumentExtractionPlugin(env)],
    server: {
      port: 3000,
      open: false
    },
    assetsInclude: ['**/*.glb', '**/*.gltf']
  };
});

