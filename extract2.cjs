const fs = require('fs');
const lines = fs.readFileSync('transcript.txt', 'utf8').split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.function && call.function.name === 'multi_replace_file_content') {
           const args = JSON.parse(call.function.arguments);
           if (args.TargetFile && args.TargetFile.includes('TargetTerminal.tsx')) {
              fs.writeFileSync('extracted_' + i + '.json', JSON.stringify(args, null, 2));
           }
        }
      }
    }
  } catch(e) {}
}
