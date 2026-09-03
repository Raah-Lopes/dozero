const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Chave da API fornecida pelo usuário
const genAI = new GoogleGenerativeAI('AIzaSyDKsCXXBEDfSecl6Igl9mVCnP72gshCpkE');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.1, // Baixa temperatura para ser literal
  }
});

const WIKI_DIR = 'D:/DOZERO/wikidozero';
const ORACLES_DIR = path.join(WIKI_DIR, 'Oracles');
const JSON_FILES = ['Ironsmith-Expanded-Oracles.JSON', 'Starsmith-Expanded-Oracles.json'];

// Helper para respeitar os 15 Requests Per Minute (RPM) do plano Free
// 15 requests / 60s = 1 request a cada 4 segundos.
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function translateMarkdownWithGemini(content) {
  const prompt = `Você é um tradutor especialista em RPG de Mesa (Ironsworn/Starforged).
Traduza o seguinte texto em Markdown do Inglês para o Português (Brasil).
MANTENHA ABSOLUTAMENTE TODA A FORMATAÇÃO: não altere as marcações de tabela (|), não traduza ou altere os números, e NÃO altere metadados como "dice: 1d100".
Retorne APENAS o conteúdo em Markdown traduzido, sem explicações adicionais, sem formatação \`\`\`markdown.

TEXTO A TRADUZIR:
${content}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/^```markdown\n/, '').replace(/\n```$/, ''); // Remover blocos markdown caso o modelo teime em colocar
  return text.trim() + '\n';
}

async function translateJsonBatch(stringArray) {
  const prompt = `Você é um tradutor de RPG. Traduza a seguinte array JSON de strings do Inglês para o Português (Brasil).
Mantenha o tom das frases no contexto de cenários sci-fi e fantasia medieval.
Retorne APENAS uma array JSON válida contendo as strings traduzidas, na mesma ordem e com o mesmo tamanho da original. Não inclua mais nada.

JSON INPUT:
${JSON.stringify(stringArray)}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/^```json\n/, '').replace(/\n```$/, '').trim();
  
  try {
    const translatedArray = JSON.parse(text);
    if (!Array.isArray(translatedArray) || translatedArray.length !== stringArray.length) {
      throw new Error("O tamanho do array de retorno não bate com o original.");
    }
    return translatedArray;
  } catch (err) {
    console.error("Falha ao parsear o lote. Tentando recuperar:", err);
    return null;
  }
}

async function processMarkdownDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processMarkdownDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Checa se já tem sinais de português ou se foi traduzido para não gastar API à toa
      if (content.includes('Oráculo') || content.includes('Rolagem') || content.includes('_translated_gemini')) {
        continue; // Já parece traduzido
      }

      console.log(`[Gemini] Traduzindo arquivo completo: ${entry.name}`);
      try {
        const translatedContent = await translateMarkdownWithGemini(content);
        // Adiciona um marcador invisível para não retraduzir caso o script caia
        fs.writeFileSync(fullPath, translatedContent + '\n<!-- _translated_gemini -->', 'utf8');
        console.log(`[Gemini] Sucesso: ${entry.name}`);
      } catch (e) {
        console.error(`[Gemini] Erro no arquivo ${entry.name}:`, e.message);
      }
      
      // Delay de 4.1s para manter abaixo de 15 requests por minuto (RPM)
      await sleep(4100);
    }
  }
}

async function processJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\n[Gemini] Analisando JSON: ${path.basename(filePath)}`);
  
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oracles = data.Oracles || [];
  
  // Coletar referências de objetos que precisam de tradução
  let pendingTranslations = [];
  
  for (const orc of oracles) {
    // Adicionar nome do oráculo se não traduzido
    if (orc.Name && !orc._nameTranslated) {
      pendingTranslations.push({ obj: orc, key: 'Name', flag: '_nameTranslated' });
    }
    
    const table = orc['Oracle Table'] || orc.Table || [];
    for (const row of table) {
      if (row.Description && !row._descTranslated) {
        pendingTranslations.push({ obj: row, key: 'Description', flag: '_descTranslated' });
      }
      if (row.Result && !row._resTranslated) {
        pendingTranslations.push({ obj: row, key: 'Result', flag: '_resTranslated' });
      }
    }
  }

  console.log(`[Gemini] Encontrados ${pendingTranslations.length} itens não traduzidos no JSON.`);
  if (pendingTranslations.length === 0) return;

  const BATCH_SIZE = 50; // Quantidade de frases por pedido

  for (let i = 0; i < pendingTranslations.length; i += BATCH_SIZE) {
    const batch = pendingTranslations.slice(i, i + BATCH_SIZE);
    const stringsToTranslate = batch.map(item => item.obj[item.key]);
    
    console.log(`[Gemini] Enviando Lote de ${batch.length} itens (Progresso: ${i}/${pendingTranslations.length})...`);
    
    try {
      const translatedStrings = await translateJsonBatch(stringsToTranslate);
      
      if (translatedStrings) {
        for (let j = 0; j < batch.length; j++) {
          batch[j].obj[batch[j].key] = translatedStrings[j];
          batch[j].obj[batch[j].flag] = true; // Marca como traduzido
        }
        // Salva backup a cada lote de sucesso
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.error("[Gemini] Erro no lote JSON:", e.message);
    }
    
    // Delay de 4.1s para respeitar a cota do Gemini Free (15 RPM)
    await sleep(4100);
  }
}

async function start() {
  console.log('======================================================');
  console.log(' INICIANDO MOTOR DE TRADUÇÃO GEMINI 1.5 FLASH (BATCH) ');
  console.log('======================================================');

  if (fs.existsSync(ORACLES_DIR)) {
    console.log('\n--- 1. Traduzindo Tabelas Markdown ---');
    await processMarkdownDirectory(ORACLES_DIR);
  }

  console.log('\n--- 2. Traduzindo Megabytes de JSON ---');
  for (const file of JSON_FILES) {
    await processJsonFile(path.join(WIKI_DIR, file));
  }

  console.log('======================================================');
  console.log(' TRADUÇÃO TOTAL FINALIZADA COM SUCESSO!               ');
  console.log('======================================================');
}

start().catch(err => console.error("Erro Fatal no Motor Gemini:", err));
