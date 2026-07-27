# Contribuindo para o Dozero VTT

Obrigado pelo seu interesse em ajudar o desenvolvimento do Dozero! Abaixo você encontrará o guia rápido para rodar o projeto na sua máquina.

## 🚀 Como Rodar o Projeto Localmente

1. **Pré-requisitos:** Certifique-se de que você tenha o **Node.js 20.x** instalado.
2. **Clonar o Repositório:** 
   ```bash
   git clone https://github.com/Raah-Lopes/dozero.git
   cd dozero
   ```
3. **Instalar Dependências:**
   ```bash
   npm install
   ```
4. **Executar em Modo Dev:**
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:5174` para ver a mesa virtual localmente. O Vite está configurado para expor pela rede para facilitar testes mobile!

## 🧪 Como Testar

Os testes garantem a estabilidade central do VTT. Se você alterar lógicas de gerenciamento de janela ou de engine de combate, rode a suíte de testes.

Para rodar todos os testes unitários:
```bash
npm run test
```

## 📝 Padrões de Commit

Temos uma automação (CI/CD) rodando no GitHub, portanto, commits diretos na branch principal (`main`) vão acionar builds e testes. 
Para manter tudo limpo, siga o padrão *Conventional Commits*:
- `feat:` Uma nova funcionalidade
- `fix:` Correção de bug
- `docs:` Mudanças em documentação
- `style:` Formatações, ponto e vírgula, etc (sem mudança de lógica)
- `refactor:` Refatoração de código
- `perf:` Mudança para ganho de performance
- `test:` Adicionar ou refatorar testes

Exemplo: `git commit -m "feat: adicionado novo gerador de nome para guildas"`
