const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/app/api/contacts/route.ts', 'utf8');
const lines = content.split('\n');

// Find the end of our new implementation (line 334)
// and the start of the else block for non-query searches (should be around line 718-723)
let newLines = [];
let inOldCode = false;
let foundElseBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Keep everything up to line 334
  if (lineNum <= 334) {
    newLines.push(line);
  }
  // Skip old vector search code from 335-717
  else if (lineNum >= 335 && lineNum <= 717) {
    // Skip this
    continue;
  }
  // For the else block starting at 718
  else if (lineNum === 718) {
    // Remove the "else" since we don't have an if anymore
    // Skip this line
    continue;
  }
  else if (lineNum === 719) {
    // This is the comment line, skip it
    continue;
  }
  else if (lineNum >= 720 && lineNum <= 723) {
    // These are the substring search lines for non-query requests
    // We need to add them back but not in an else block
    if (lineNum === 720) {
      newLines.push('');
      newLines.push('\t\t// No query provided - use regular substring search');
    }
    newLines.push(line);
  }
  else {
    // Keep everything else
    newLines.push(line);
  }
}

// Write the cleaned file
fs.writeFileSync('src/app/api/contacts/route.ts', newLines.join('\n'));
console.log('File cleaned successfully');
