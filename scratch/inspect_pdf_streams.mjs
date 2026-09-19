import fs from 'fs';
import zlib from 'zlib';

const insPdf = fs.readFileSync('test pdfs/hyundai_eon_insurance_schedule.pdf');
const bufferString = insPdf.toString('latin1');

const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match;
let i = 0;
while ((match = streamRegex.exec(bufferString)) !== null) {
  i++;
  const rawStream = Buffer.from(match[1], 'latin1');
  console.log(`Stream ${i} length:`, rawStream.length);
  try {
    const decompressed = zlib.inflateSync(rawStream).toString('utf8');
    console.log(`Stream ${i} (utf8):`, decompressed);
  } catch (e) {
    try {
      const decompressed = zlib.inflateRawSync(rawStream).toString('utf8');
      console.log(`Stream ${i} (raw):`, decompressed);
    } catch (e2) {
      console.log(`Stream ${i} failed to inflate:`, e2.message);
    }
  }
}
