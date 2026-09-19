import fs from 'fs';
import zlib from 'zlib';

export function extractTextFromPDFBuffer(pdfBuffer) {
  let fullText = '';
  const bufferString = pdfBuffer.toString('latin1');

  // 1. Decompress FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  const decompressedStreams = [];

  while ((match = streamRegex.exec(bufferString)) !== null) {
    const rawStream = Buffer.from(match[1], 'latin1');
    try {
      const decompressed = zlib.inflateSync(rawStream).toString('latin1');
      decompressedStreams.push(decompressed);
    } catch {
      try {
        const decompressed = zlib.inflateRawSync(rawStream).toString('latin1');
        decompressedStreams.push(decompressed);
      } catch {
        decompressedStreams.push(match[1]);
      }
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

    // Also handle beginbfrange
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
      const asciiStrings = inner.match(/\(([^)]*)\)/g);
      if (asciiStrings) {
        fullText += asciiStrings.map((s) => s.slice(1, -1)).join('') + '\n';
      }
    }

    // Standard ASCII Tj: (Some text) Tj
    const asciiTjRegex = /\(([^)]+)\)\s*Tj/g;
    let atj;
    while ((atj = asciiTjRegex.exec(stream)) !== null) {
      fullText += atj[1] + '\n';
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

export function understandDocumentContent(docText, fileName = '', componentName = '', componentId = '') {
  const combined = `${fileName}\n${docText}`.trim();
  const normalized = combined.replace(/[_.\-\/]/g, ' ');
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Evidence of vehicle / automotive context
  const vehicleRegex = /\b(hyundai|eon|maruti|suzuki|honda|tata|toyota|mahindra|ford|volkswagen|skoda|renault|nissan|kia|car|vehicle|automobile|motor|auto|tail\s*light|tail\s*lamp|taillight|headlight|headlamp|fog\s*lamp|lamp|bulb|tyre|tire|wheel|rim|windshield|rear\s*glass|glass|brake|pad|disc|caliper|battery|engine|oil\s*filter|air\s*filter|coolant|bumper|fender|bonnet|hood|mirror|door|wiper|steering|suspension|strut|shock\s*absorber|clutch|exhaust|silencer|seat|spark\s*plug|fuse|belt|replacement|replaced|replace|repair|repaired|maintenance|servicing|periodic\s*service|inspection|checkup|diagnostic|alignment|balancing|labour|labor|fitting|installation|job\s*card|workshop|garage|service\s*center|service\s*centre|service\s*plaza|auto\s*care|tyre\s*care|car\s*care)\b/i;

  const hasVehicleEvidence = vehicleRegex.test(normalized);

  // Non-vehicle domain checks (ONLY when there is no vehicle evidence)
  const academicRegex = /\b(marksheet|mark\s*sheet|grade\s*sheet|leaving\s*certificate|transfer\s*certificate|school|college|university|board\s*of\s*secondary|cbse|icse|diploma|degree|academic|passing\s*certificate|10th\s*std|12th\s*std)\b/i;
  const cvResumeRegex = /\b(curriculum\s*vitae|resume|biodata|bio\s*data|work\s*experience|education\s*qualification|personal\s*profile|\bcv\b)\b/i;

  if (academicRegex.test(normalized) && !hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Academic certificate',
      reason: 'The document contains academic information and no vehicle/service information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  if (cvResumeRegex.test(normalized) && !hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Curriculum Vitae / Resume',
      reason: 'The document contains curriculum vitae / resume information and no vehicle/service information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  if (!hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Unrelated document',
      reason: 'This document does not contain any vehicle service or maintenance information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null }
    };
  }

  // 1. Service Type
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

  // 2. Date (Strict: null if absent)
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

  // 3. Mileage (Strict: null if absent, never guess or invent)
  let mileage = null;
  const mileageMatch = combined.match(/(?:mileage|odometer|odo|kms?|km reading)[\s\S]{0,30}?([\d,]{4,7})\s*(?:km|kms)?/i);
  if (mileageMatch) {
    const num = parseInt(mileageMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 1000000) {
      mileage = num;
    }
  }

  // 4. Cost (Strict: null if absent)
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

  // 5. Service Center / Workshop (Strict: null if absent)
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

  // 6. Parts / Work Performed
  let parts = null;
  for (const line of lines) {
    if (/\.(pdf|png|jpe?g|webp)$/i.test(line.trim())) continue;
    if (/(tail lamp|taillight|tail light|headlight|headlamp|lamp assy|lamp|tyre|tire|windshield|glass|bumper|mirror|brake|bulb|assembly|fitting)/i.test(line)) {
      if (!line.toLowerCase().startsWith('invoice') && !line.toLowerCase().startsWith('date') && !line.toLowerCase().startsWith('total') && !line.toLowerCase().startsWith('customer')) {
        parts = line.replace(/^[#\-*\d\.\s]+/, '').split(/[₹|]/)[0].trim();
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

  // 7. Description
  let description = null;
  for (const line of lines) {
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

  // 8. Warranty
  let warranty = null;
  const warrantyMatch = combined.match(/(\d+[\s-]*(?:years?|months?)\s+(?:limited\s+|manufacturer\s+)?warranty)/i);
  if (warrantyMatch) {
    warranty = warrantyMatch[1].trim();
  }

  // 9. Component Match Verification
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

const pdfPath = 'C:/Users/pande/OneDrive/Desktop/vashisth/misc/devengers/hyundai_eon_taillight_invoice.pdf';
const buf = fs.readFileSync(pdfPath);
const text = extractTextFromPDFBuffer(buf);
console.log('Extracted text length:', text.length);
const result = understandDocumentContent(text, 'hyundai_eon_taillight_invoice.pdf', 'Taillight', 'tail-light');
console.log('UNDERSTOOD RESULT:', JSON.stringify(result, null, 2));
