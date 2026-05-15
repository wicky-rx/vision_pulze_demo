
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
  const totalOpens = (line.match(/<div(\s|>|$)/g) || []).length;
  const totalCloses = (line.match(/<\/div>/g) || []).length;
  const selfClosings = (line.match(/<div[^>]*\/>/g) || []).length;
  
  level += (totalOpens - selfClosings);
  level -= totalCloses;
  
  if (line.includes('</DiagnosticCard>')) {
     console.log(`Line ${i + 1}: Level ${level} - </DiagnosticCard>`);
  }
}
console.log("Final level:", level);
