
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('return (')) inJSX = true;
  if (!inJSX) continue;
  
  // A better way: find all occurrences of <div and </div>
  // and check if <div is followed by /> on the SAME tag level
  // Actually, let's just count them carefully.
  
  const divOpenRegex = /<div(\s|>)/g;
  const divCloseRegex = /<\/div>/g;
  const selfClosingDivRegex = /<div[^>]*\/>/g;
  
  const totalOpens = (line.match(divOpenRegex) || []).length;
  const totalCloses = (line.match(divCloseRegex) || []).length;
  const selfClosings = (line.match(selfClosingDivRegex) || []).length;
  
  const netOpens = totalOpens - selfClosings;
  
  level += netOpens;
  level -= totalCloses;
  
  if (netOpens > 0 || totalCloses > 0) {
    console.log(`${i + 1}: Level ${level} (${netOpens} up, ${totalCloses} down) - ${line.trim().substring(0, 100)}`);
  }
}
console.log("Final level:", level);
