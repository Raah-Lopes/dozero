const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Widgets/GameMaster/ArsenalMestreWidget.tsx');
let content = fs.readFileSync(file, 'utf8');

const mapping = {
  // text-primary
  "'#fff'": "'var(--text-primary)'",
  '"#fff"': "'var(--text-primary)'",
  // success
  "'#34d399'": "'var(--success)'", // emerald-400
  "'#10b981'": "'var(--success)'", // emerald-500
  "'rgba(16,185,129,0.15)'": "'rgba(var(--success-rgb, 16,185,129), 0.15)'", 
  "'rgba(16,185,129,0.2)'": "'rgba(var(--success-rgb, 16,185,129), 0.2)'",
  "'rgba(16,185,129,0.3)'": "'rgba(var(--success-rgb, 16,185,129), 0.3)'",
  // danger
  "'#f87171'": "'var(--danger)'", // red-400
  "'#ef4444'": "'var(--danger)'", // red-500
  "'rgba(239,68,68,0.15)'": "'rgba(var(--danger-rgb, 239,68,68), 0.15)'",
  "'rgba(239,68,68,0.3)'": "'rgba(var(--danger-rgb, 239,68,68), 0.3)'",
  // mana
  "'#38bdf8'": "'var(--mana)'", // sky-400
  "'#3b82f6'": "'var(--mana)'", // blue-500
  // warning
  "'#fbbf24'": "'var(--warning)'", // amber-400
  "'#eab308'": "'var(--warning)'", // yellow-500
  // accent
  "'#c084fc'": "'var(--accent-primary)'", // purple-400
  "'#a855f7'": "'var(--accent-primary)'", // purple-500
  "'rgba(168,85,247,0.15)'": "'rgba(var(--accent-rgb, 168,85,247), 0.15)'",
  "'rgba(168,85,247,0.3)'": "'rgba(var(--accent-rgb, 168,85,247), 0.3)'",
  // text-secondary
  "'#94a3b8'": "'var(--text-secondary)'",
  "'#cbd5e1'": "'var(--text-secondary)'",
  // transparent black borders/backgrounds for inputs (need to adapt to glass variables)
  "'rgba(0,0,0,0.5)'": "'var(--bg-tertiary)'",
  "'rgba(0,0,0,0.4)'": "'var(--bg-tertiary)'",
  "'rgba(255,255,255,0.1)'": "'var(--glass-border)'",
  "'rgba(255,255,255,0.2)'": "'var(--glass-border)'",
};

for (const [key, value] of Object.entries(mapping)) {
  content = content.split(key).join(value);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ArsenalMestreWidget.tsx');
