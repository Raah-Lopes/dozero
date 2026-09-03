/**
 * scripts/validate-theme-contrast.cjs
 * Validador de Acessibilidade e Contraste WCAG 2.1 AA para Temas do DOZERO VTT
 */

const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
  hex = hex.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function parseThemeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const getProp = (prop) => {
    const match = content.match(new RegExp(`${prop}:\\s*['"](#[0-9a-fA-F]{3,8})['"]`));
    return match ? match[1] : null;
  };
  const getId = () => {
    const match = content.match(/id:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : path.basename(filePath, '.ts');
  };
  const getName = () => {
    const match = content.match(/name:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : getId();
  };

  return {
    id: getId(),
    name: getName(),
    bgPrimary: getProp('bgPrimary'),
    bgSecondary: getProp('bgSecondary'),
    bgTertiary: getProp('bgTertiary'),
    textPrimary: getProp('textPrimary'),
    textSecondary: getProp('textSecondary'),
    accentPrimary: getProp('accentPrimary'),
    danger: getProp('danger'),
    success: getProp('success'),
    warning: getProp('warning')
  };
}

function runValidation() {
  const themesDir = path.join(__dirname, '..', 'src', 'themes');
  const themeFiles = fs.readdirSync(themesDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');

  console.log('\n=============================================================');
  console.log('       DOZERO VTT - AUDITORIA DE CONTRASTE WCAG 2.1 AA       ');
  console.log('=============================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const file of themeFiles) {
    const theme = parseThemeFile(path.join(themesDir, file));
    console.log(`\n🎨 TEMA: ${theme.name} (${theme.id})`);
    console.log('-------------------------------------------------------------');

    const checks = [
      { name: 'Texto Primário sobre Fundo Primário', fg: theme.textPrimary, bg: theme.bgPrimary, min: 4.5 },
      { name: 'Texto Primário sobre Fundo Secundário', fg: theme.textPrimary, bg: theme.bgSecondary, min: 4.5 },
      { name: 'Texto Primário sobre Fundo Terciário', fg: theme.textPrimary, bg: theme.bgTertiary, min: 4.5 },
      { name: 'Texto Secundário sobre Fundo Secundário', fg: theme.textSecondary, bg: theme.bgSecondary, min: 4.0 },
      { name: 'Texto Secundário sobre Fundo Primário', fg: theme.textSecondary, bg: theme.bgPrimary, min: 4.0 },
      { name: 'Acento Primário sobre Fundo Secundário', fg: theme.accentPrimary, bg: theme.bgSecondary, min: 3.0 },
    ];

    for (const check of checks) {
      if (!check.fg || !check.bg) continue;
      totalTests++;
      const ratio = getContrastRatio(check.fg, check.bg);
      const passed = ratio >= check.min;
      const formattedRatio = ratio.toFixed(2) + ':1';

      if (passed) {
        passedTests++;
        console.log(`  ✅ PASS  ${check.name.padEnd(42)} [${formattedRatio}] (${check.fg} em ${check.bg})`);
      } else {
        failedTests++;
        console.log(`  ❌ FAIL  ${check.name.padEnd(42)} [${formattedRatio}] (Mínimo: ${check.min}:1)`);
      }
    }
  }

  console.log('\n=============================================================');
  console.log(` RESUMO: ${passedTests}/${totalTests} testes aprovados.`);
  if (failedTests === 0) {
    console.log(' ✨ TODOS OS TEMAS ESTÃO EM CONFORMIDADE COM WCAG AA!');
  } else {
    console.log(` ⚠️ ${failedTests} testes precisam de pequenos ajustes de contraste.`);
  }
  console.log('=============================================================\n');
}

runValidation();
