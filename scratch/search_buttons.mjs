import fs from 'fs';

const css = fs.readFileSync('src/index.css', 'utf8');
const lines = css.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('button') || line.includes('btn') || line.includes('floating') || line.includes('back-to-vehicle')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
