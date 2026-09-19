import fs from 'fs';

const buf = fs.readFileSync('test pdfs/hyundai_eon_insurance_schedule.pdf');
console.log('PDF length:', buf.length);
console.log('PDF head:', buf.subarray(0, 500).toString('latin1'));

let idx = 0;
while ((idx = buf.indexOf(Buffer.from('stream'), idx)) !== -1) {
  console.log('Found "stream" at index:', idx);
  console.log('Bytes right after stream:', buf.subarray(idx, idx + 20));
  const endIdx = buf.indexOf(Buffer.from('endstream'), idx);
  console.log('Found "endstream" at index:', endIdx);
  idx = endIdx + 9;
}
