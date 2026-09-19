import fs from 'fs';
import zlib from 'zlib';

function decodeAscii85(str) {
  let clean = str.replace(/<~|~>/g, '').replace(/\s+/g, '');
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
    let paddedChunk = chunk;
    for (let p = 0; p < pad; p++) {
      paddedChunk += 'u';
    }
    for (let j = 0; j < 5; j++) {
      val = val * 85 + (paddedChunk.charCodeAt(j) - 33);
    }
    const b0 = (val >>> 24) & 0xff;
    const b1 = (val >>> 16) & 0xff;
    const b2 = (val >>> 8) & 0xff;
    const b3 = val & 0xff;
    const bytes = [b0, b1, b2, b3];
    out.push(...bytes.slice(0, 4 - pad));
    i += chunk.length;
  }
  return Buffer.from(out);
}

function extractFromPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const start = buf.indexOf(Buffer.from('stream\n')) + 7;
  const end = buf.indexOf(Buffer.from('\nendstream'));
  const streamRaw = buf.subarray(start, end).toString('latin1');
  const ascii85Decoded = decodeAscii85(streamRaw);
  return zlib.inflateSync(ascii85Decoded).toString('latin1');
}

console.log('=== PUC CONTENT ===');
console.log(extractFromPdf('test pdfs/hyundai_eon_puc_certificate.pdf'));
