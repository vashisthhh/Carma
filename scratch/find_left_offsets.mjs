import fs from 'fs';

const css = fs.readFileSync('src/index.css', 'utf8');
const lines = css.split('\n');

let currentSelector = '';
lines.forEach((line, idx) => {
  if (line.includes('{')) {
    currentSelector = line.split('{')[0].trim();
  }
  if (line.includes('left:') || line.includes('margin-left') || line.includes('translateX') || line.includes('transform:')) {
    console.log(`${idx + 1} [${currentSelector}]: ${line.trim()}`);
  }
});
