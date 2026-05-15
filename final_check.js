
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('return (')) inJSX = true;
  if (!inJSX) continue;
  
  // Count all <div except self-closing
  // A div opening can be <div , <div\n, or <div>
  const totalOpens = (line.match(/<div(\s|>|$)/g) || []).length;
  const totalCloses = (line.match(/<\/div>/g) || []).length;
  const selfClosings = (line.match(/<div[^>]*\/>/g) || []).length;
  
  level += (totalOpens - selfClosings);
  level -= totalCloses;
  
  if (i + 1 >= 2310) {
     console.log(`${i+1}: Level ${level} - ${line.trim()}`);
  }
}
console.log("Final level:", level);
