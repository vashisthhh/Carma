import fs from 'fs';
import zlib from 'zlib';

function extractTextFromPDFBuffer(pdfBuffer) {
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

const insPdf = fs.readFileSync('test pdfs/hyundai_eon_insurance_schedule.pdf');
const pucPdf = fs.readFileSync('test pdfs/hyundai_eon_puc_certificate.pdf');

console.log('=== RAW TEXT FROM INSURANCE PDF ===');
const insText = extractTextFromPDFBuffer(insPdf);
console.log(insText);

console.log('=== RAW TEXT FROM PUC PDF ===');
const pucText = extractTextFromPDFBuffer(pucPdf);
console.log(pucText);
