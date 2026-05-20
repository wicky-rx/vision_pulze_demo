
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i + 1 === 1170) inJSX = true;
  if (!inJSX) continue;
  
  const divOpenRegex = /<div(\s|>)/g;
  const divCloseRegex = /<\/div>/g;
  const selfClosingDivRegex = /<div[^>]*\/>/g;
  
  const totalOpens = (line.match(divOpenRegex) || []).length;
  const totalCloses = (line.match(divCloseRegex) || []).length;
  const selfClosings = (line.match(selfClosingDivRegex) || []).length;
  
  level += (totalOpens - selfClosings);
  level -= totalCloses;
  
  if (i + 1 >= 2240 && i + 1 <= 2321) {
    console.log(`${i + 1}: Level ${level} (${totalOpens - selfClosings} up, ${totalCloses} down) - ${line.trim()}`);
  }
}
