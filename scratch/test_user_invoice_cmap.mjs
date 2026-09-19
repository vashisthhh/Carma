import fs from 'fs';
import zlib from 'zlib';

const filePath = 'C:/Users/pande/OneDrive/Desktop/vashisth/misc/devengers/hyundai_eon_taillight_invoice.pdf';
const pdfBuffer = fs.readFileSync(filePath);

export function extractTextFromPDFBuffer(pdfBuffer) {
  const bufferString = pdfBuffer.toString('latin1');

  // 1. Decompress all streams
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

  // 2. Parse ToUnicode CMaps
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
  }

  // 3. Extract text from streams using CMap and standard Tj/TJ operators
  let fullDecodedText = '';

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
      fullDecodedText += lineText + '\n';
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
        fullDecodedText += lineText + '\n';
      }
    }

    // Standard ASCII Tj: (Some text) Tj
    const asciiTjRegex = /\(([^)]+)\)\s*Tj/g;
    let atj;
    while ((atj = asciiTjRegex.exec(stream)) !== null) {
      fullDecodedText += atj[1] + '\n';
    }
  }

  return fullDecodedText;
}

const docText = extractTextFromPDFBuffer(pdfBuffer);
console.log('Decoded text length:', docText.length);

// Now test parsing the decoded text!
function parseExtractedText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Date
  let date = null;
  // Match DD-Mon-YYYY (e.g. 14-Oct-2024)
  const dmyMonMatch = text.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/\s](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/\s](202[0-9])\b/i);
  if (dmyMonMatch) {
    const monthNames = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const mStr = monthNames[dmyMonMatch[2].substring(0, 3).toLowerCase()] || '01';
    const day = dmyMonMatch[1].padStart(2, '0');
    date = `${dmyMonMatch[3]}-${mStr}-${day}`;
  }

  // 2. Mileage
  let mileage = null;
  const mileageMatch = text.match(/(?:mileage|odometer|odo)[\s\S]{0,30}?([\d,]{4,7})\s*(?:km|kms)?/i);
  if (mileageMatch) {
    const num = parseInt(mileageMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 1000000) {
      mileage = num;
    }
  }

  // 3. Cost (Grand Total)
  let cost = null;
  const grandTotalMatch = text.match(/(?:grand total|total amount|final amount|net amount)[\s\S]{0,30}?([\d,]+(?:\.\d{1,2})?)/i);
  if (grandTotalMatch) {
    const num = parseFloat(grandTotalMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      cost = num;
    }
  }

  // 4. Service Center
  let serviceCenter = null;
  for (const line of lines) {
    if (/(auto service|service centre|service center|workshop|garage|motors)/i.test(line)) {
      serviceCenter = line.replace(/^[#\-*\d\.\s]+/, '').split(/[,\n]/)[0].trim();
      break;
    }
  }

  // 5. Parts
  let parts = null;
  for (const line of lines) {
    if (/(tail light|tail lamp|combination|headlight|bulb)/i.test(line)) {
      if (!line.toLowerCase().startsWith('invoice') && !line.toLowerCase().startsWith('date') && !line.toLowerCase().startsWith('rate')) {
        parts = line.replace(/^[#\-*\d\.\s]+/, '').split(/[₹:\-]/)[0].trim();
        break;
      }
    }
  }

  return { date, mileage, cost, serviceCenter, parts };
}

const parsed = parseExtractedText(docText);
console.log('\n=== PARSED FIELDS FROM USER TEST INVOICE ===');
console.log(JSON.stringify(parsed, null, 2));
