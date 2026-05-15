
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
  
  level += (totalOpens - selfClosings);
  level -= totalCloses;
  
  if (i + 1 === 2316) {
    console.log("Level at line 2316 (fieldset close):", level);
  }
}
console.log("Final level at end:", level);
