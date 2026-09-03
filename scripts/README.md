# Scripts auxiliares

- `qa/`: verificações manuais e automações de qualidade que podem ser
  promovidas a comandos npm quando forem adotadas no fluxo recorrente.
- `docs/`: geração de recursos para documentação.
- `legacy/`: migrações e transformações pontuais da wiki/código antigo. Não
  fazem parte do build, da CI nem devem ser executadas sem revisão do alvo.

Os fluxos oficiais permanecem em `package.json`: `npm run dev`, `npm run test`,
`npm run lint` e `npm run build`.
