import fs from 'fs';
const buf = fs.readFileSync('test pdfs/hyundai_eon_insurance_schedule.pdf');
console.log('Object before stream:', buf.subarray(900, 1030).toString('latin1'));
