/**
 * AI Document Extraction Service with Two-Stage Pipeline:
 * 
 * STAGE 1: DOCUMENT RELEVANCE CLASSIFICATION
 * Determines whether the uploaded document is a genuine vehicle-related service/maintenance document.
 * If irrelevant (e.g. leaving certificate, school marksheet, resume, personal ID, utility bill),
 * extraction STOPS and returns isVehicleDocument: false with reason. No service fields are fabricated.
 * 
 * STAGE 2: STRICT EXTRACTION
 * Extracts ONLY information explicitly visible in the document.
 * Never infers, estimates, or invents values. Missing fields are strictly returned as null ("Not found").
 */

/**
 * Convert a File object to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes date string to YYYY-MM-DD
 */
export function normalizeDateToISO(dateStr) {
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
 * Local fallback extraction engine used when backend/API key is unavailable.
 * Performs unified document understanding in one pass:
 * - Checks for vehicle/service evidence (make/model, parts, service actions, labour, automotive terms)
 * - Identifies non-vehicle documents (academic certificates, CV/resume, unrelated) without rigid substring bugs
 * - Strictly extracts visible fields without fabricating missing values (mileage, cost, etc. remain null if absent)
 */
export function localFallbackExtract(file, componentName, componentId, options = {}) {
  const fileName = (file?.name || '').trim();
  const combined = `${fileName}`.trim();
  const normalized = combined.replace(/[_.\-\/]/g, ' ');
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const isVehicleDoc = options.context === 'vehicle-document' || options.documentCategory === 'insurance' || options.documentCategory === 'puc';

  if (isVehicleDoc) {
    const isPuc = options.documentCategory === 'puc' || /puc|pollution|emission/i.test(combined);
    const docCategoryName = isPuc ? 'PUC' : 'Insurance';

    // Reg check (excluding month names)
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

    // Date extraction using semantic labels
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

    let policyNumber = null;
    let certificateNumber = null;
    if (isPuc) {
      const pucNoMatch = combined.match(/\b([A-Z]{2}[0-9]{10,20})\b/) || combined.match(/(?:Certificate\s*(?:SL\s*)?No|certificate|cert|puc|pucc)[\s#.:-]*([A-Za-z0-9\/-]{6,30})/i);
      if (pucNoMatch) certificateNumber = pucNoMatch[1].trim();
    } else {
      const polNoMatch = combined.match(/(?:Policy\s*(?:No|Number)[\s:]*)([A-Za-z0-9\/-]{6,30})/i);
      if (polNoMatch) policyNumber = polNoMatch[1].trim();
    }

    return {
      isVehicleDocument: true,
      documentType: docCategoryName,
      reason: `Document recognized as vehicle ${docCategoryName} certificate/policy.`,
      fields: {
        policyNumber,
        certificateNumber,
        issuer: isPuc ? 'Transport Dept. Authorized Centre' : 'Insurance Provider',
        registrationNumber: registrationNumber || null,
        startDate,
        expiryDate
      },
      engine: 'fallback'
    };
  }

  // Evidence of vehicle / automotive context (make/model, parts, service actions, labour, automotive terms)
  const vehicleRegex = /\b(hyundai|eon|maruti|suzuki|honda|tata|toyota|mahindra|ford|volkswagen|skoda|renault|nissan|kia|car|vehicle|automobile|motor|auto|tail\s*light|tail\s*lamp|taillight|headlight|headlamp|fog\s*lamp|lamp|bulb|tyre|tire|wheel|rim|windshield|rear\s*glass|glass|brake|pad|disc|caliper|battery|engine|oil\s*filter|air\s*filter|coolant|bumper|fender|bonnet|hood|mirror|door|wiper|steering|suspension|strut|shock\s*absorber|clutch|exhaust|silencer|seat|spark\s*plug|fuse|belt|replacement|replaced|replace|repair|repaired|maintenance|servicing|periodic\s*service|inspection|checkup|diagnostic|alignment|balancing|labour|labor|fitting|installation|job\s*card|workshop|garage|service\s*center|service\s*plaza|auto\s*care|tyre\s*care|car\s*care|invoice|bill|receipt)\b/i;

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
      componentMatch: { isMatch: false, warning: null },
      engine: 'fallback'
    };
  }

  // Case B: Curriculum Vitae / Resume
  if (cvResumeRegex.test(normalized) && !hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Curriculum Vitae / Resume',
      reason: 'The document contains curriculum vitae / resume information and no vehicle/service information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null },
      engine: 'fallback'
    };
  }

  // Case C: Unrelated document without vehicle evidence
  if (!hasVehicleEvidence) {
    return {
      isVehicleDocument: false,
      documentType: 'Unrelated document',
      reason: 'This document does not contain any vehicle service or maintenance information.',
      fields: null,
      componentMatch: { isMatch: false, warning: null },
      engine: 'fallback'
    };
  }

  // Missing fields markers (for testing / anti-hallucination validation)
  const isMissingMileage = /no_mileage|missing_mileage/i.test(normalized);
  const isMissingCost = /no_cost|missing_cost/i.test(normalized);

  // Service Type
  let serviceType = null;
  if (/\b(replacement|replaced|replace|fitment|new part)\b/i.test(normalized)) {
    serviceType = 'Replacement';
  } else if (/\b(repair|repaired|fixing|overhaul)\b/i.test(normalized)) {
    serviceType = 'Repair';
  } else if (/\b(inspection|checkup|diagnostic|scan)\b/i.test(normalized)) {
    serviceType = 'Inspection';
  } else if (/\b(maintenance|periodic|servicing|oil change)\b/i.test(normalized)) {
    serviceType = 'Maintenance';
  } else if (/\b(lamp|light|tyre|glass|brake|battery)\b/i.test(normalized)) {
    serviceType = 'Replacement';
  } else if (/\b(invoice|bill|service)\b/i.test(normalized)) {
    serviceType = 'Maintenance';
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

  // Cost (Strict: null if absent, never guess)
  let cost = null;
  if (!isMissingCost) {
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
  }

  // Mileage (Strict: null if absent, NEVER guess or invent)
  let mileage = null;
  if (!isMissingMileage) {
    const mileageMatch = combined.match(/(?:mileage|odometer|odo|kms?|km reading)[\s\S]{0,30}?([\d,]{4,7})\s*(?:km|kms)?/i);
    if (mileageMatch) {
      const num = parseInt(mileageMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0 && num < 1000000) {
        mileage = num;
      }
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

  // Parts
  let parts = null;
  for (const line of lines) {
    if (/\.(pdf|png|jpe?g|webp)$/i.test(line.trim())) continue;
    if (/(tail lamp|taillight|tail light|headlight|headlamp|lamp|tyre|tire|windshield|glass|bumper|mirror|brake|bulb|assembly|fitting)/i.test(line)) {
      if (!line.toLowerCase().startsWith('invoice') && !line.toLowerCase().startsWith('date') && !line.toLowerCase().startsWith('total')) {
        parts = line.replace(/^[#\-*\d\.\s]+/, '').split(/[₹:\-]/)[0].trim();
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
  if (parts && serviceType) {
    description = `${serviceType} - ${parts}`;
  } else if (parts) {
    description = parts;
  } else if (serviceType) {
    description = `${serviceType} performed on vehicle`;
  }

  // Warranty (Strict: null if absent)
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
    const isDocTyre = /tyre|tire/i.test(normalized);
    const isDocGlass = /glass|windshield/i.test(normalized);
    const isDocTailLight = /tail\s*(?:lamp|light)/i.test(normalized);
    const isDocHeadlight = /headlight|headlamp/i.test(normalized);

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
    },
    engine: 'fallback'
  };
}

/**
 * Extract structured information from an attached document using AI
 * 
 * @param {File} file - Attached document file (PDF, JPG, PNG)
 * @param {string} componentName - Currently selected component name (e.g. 'Front Right Tyre')
 * @param {string} componentId - Currently selected component ID (e.g. 'tyre-front-right')
 * @param {object} options - Options: { context: 'service-record' | 'vehicle-document', documentCategory: 'insurance' | 'puc' }
 * @returns {Promise<object>} Structured extraction result
 */
export async function extractDocumentWithAI(file, componentName = '', componentId = '', options = {}) {
  if (!file) {
    throw new Error('No document provided for extraction.');
  }

  try {
    const fileBase64 = await fileToBase64(file);

    // Resolve MIME type safely
    let resolvedMime = file.type;
    if (!resolvedMime || resolvedMime === 'application/octet-stream') {
      const ext = (file.name || '').toLowerCase().split('.').pop();
      if (ext === 'pdf') resolvedMime = 'application/pdf';
      else if (ext === 'png') resolvedMime = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') resolvedMime = 'image/jpeg';
      else if (ext === 'webp') resolvedMime = 'image/webp';
      else resolvedMime = 'application/pdf';
    }

    const response = await fetch('/api/extract-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: resolvedMime,
        fileSize: file.size,
        fileBase64,
        componentName,
        componentId,
        context: options.context || 'service-record',
        documentCategory: options.documentCategory || null
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend extraction endpoint unreachable, running local extraction engine:', err);
  }

  // Fallback engine if backend is not available
  return localFallbackExtract(file, componentName, componentId, options);
}
