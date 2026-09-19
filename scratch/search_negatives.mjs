import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDir(full));
    } else if (entry.name.endsWith('.css') || entry.name.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = walkDir('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('margin') || line.includes('padding') || line.includes('left') || line.includes('align') || line.includes('justify')) {
      if (line.includes('-') && (line.includes('px') || line.includes('rem') || line.includes('%'))) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
