
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i + 1 === 1170) inJSX = true;
  if (!inJSX) continue;
  
  const totalOpens = (line.match(/<div(\s|>)/g) || []).length;
  const totalCloses = (line.match(/<\/div>/g) || []).length;
  const selfClosings = (line.match(/<div[^>]*\/>/g) || []).length;
  
  const oldLevel = level;
  level += (totalOpens - selfClosings);
  level -= totalCloses;
  
  if (level < oldLevel && level < 5 && i + 1 > 1250 && i + 1 < 2316) {
     console.log(`Line ${i + 1}: Level dropped to ${level} - ${line.trim().substring(0, 50)}`);
  }
}
