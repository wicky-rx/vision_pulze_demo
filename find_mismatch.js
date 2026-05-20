
import fs from 'fs';

const content = fs.readFileSync('src/components/stations/RefractionStation.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let inJSX = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('return (')) inJSX = true;
  if (!inJSX) continue;
  
  // Count openings and closings properly even if multiple on one line
  // Use regex to find tags
  const openings = (line.match(/<div(\s|>)/g) || []).length;
  const closings = (line.match(/<\/div>/g) || []).length;
  
  if (openings > 0 || closings > 0) {
    const oldLevel = level;
    level += openings;
    level -= closings;
    if (level < 0) {
      console.log(`Line ${i + 1}: ERROR - Level dropped to ${level}. Line: ${line.trim()}`);
      level = 0; // Reset to continue finding more
    }
  }
}
console.log(`Final level: ${level}`);
