
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('return (')) inJSX = true;
  if (!inJSX) continue;
  
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  level += opens;
  level -= closes;
  if (level < 0) {
    console.log(`Line ${i + 1}: Level dropped below zero! (${level})`);
  }
}
console.log(`Final level: ${level}`);
