const fs = require('fs');
const content = fs.readFileSync('transcript.txt', 'utf8');
const lines = content.split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('multi_replace_file_content') && lines[i].includes('TargetTerminal.tsx') && lines[i].includes('Crosshair')) {
    console.log("Found replace file content log at line", i);
    const jsonStr = lines[i];
    try {
      const obj = JSON.parse(jsonStr);
      // We know obj is the step. Look for tool_calls
      if (obj.tool_calls) {
         obj.tool_calls.forEach(call => {
            if (call.function && call.function.name === 'multi_replace_file_content') {
               const args = JSON.parse(call.function.arguments);
               fs.writeFileSync('extracted_replace.json', JSON.stringify(args, null, 2));
               console.log("Extracted args to extracted_replace.json");
               process.exit(0);
            }
         });
      }
    } catch(e) {}
  }
}
