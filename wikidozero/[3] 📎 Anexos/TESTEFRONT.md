\# 🧙‍♂️ Guia Prático: Como Expandir o Mega Oráculo

O \*\*Mega Oráculo\*\* foi criado para ser incrivelmente fácil de editar. Por ser apenas um arquivo de texto gigante em formato \*\*Markdown\*\*, você tem controle absoluto.&#x20;

Sempre que quiser adicionar novas tabelas personalizadas (seja uma rolagem de loot, tipos de magias, eventos climáticos, etc), basta abrir o arquivo \`MegaOraculo.md\` no seu Obsidian, VSCode, ou bloco de notas, e seguir as 4 regrinhas abaixo!

\---

\## 1. A Estrutura Básica

Cada nova tabela que você cria precisa de \*\*4 elementos essenciais\*\*:

1\. Uma \*\*Categoria\*\* (Opcional, se quiser usar uma existente).

2\. O \*\*Nome da Tabela\*\*.

3\. O \*\*Tipo de Dado\*\* a ser rolado.

4\. A \*\*Tabela\*\* de resultados.

Veja um exemplo perfeito de como escrever isso no final do arquivo:

\`\`\`text

\# 📦 Minhas Expansões

\## Clima Bizarro

dados: 1d20

\| Dado | Resultado |

\|---|---|

\| 1-5 | Chuva de meteoritos ácidos |

\| 6-10 | Névoa espessa e sussurrante |

\| 11 | O sol brilha roxo |

\| 12-19 | Tudo congela instantaneamente |

\| 20 | Normal (Glória a Deus) |

\`\`\`

\---

\## 2. Dissecando as Regras

\### 🔹 Regra 1: Categorias usam um jogo da velha (\`#\`)

Para dizer ao VTT qual a "pasta/tema" onde essa tabela vai entrar, use \`# Nome da Categoria\`.&#x20;

\*\*Dica:\*\* Se você colocar um nome novo como \`# 📦 Minhas Expansões\`, o VTT vai criá-la e colocá-la na aba \*\*"📂 Outros (📦 Minhas Expansões)"\*\*. Se você usar um nome que já existe (ex: \`# Assentamentos\`), ele vai organizar junto com as outras!

\### 🔹 Regra 2: Tabelas usam dois jogos da velha (\`##\`)

O nome específico do dropdown será definido por \`## Nome da Tabela\`.

\### 🔹 Regra 3: O Motor de Dados (\`dados:\`)

Logo abaixo do nome da tabela, pule uma linha e escreva \`dados: 1d100\` (ou \`dados: 1d6\`, \`1d20\`, \`2d6\`, o que quiser!).

⚠️ \*\*Importante:\*\* Escreva sempre \`dados:\` seguido pelo dado desejado, sem símbolos estranhos.

\### 🔹 Regra 4: A Tabela Markdown

Você vai desenhar a tabela usando barras retas (\`|\`).&#x20;

\- A primeira coluna DEVE sempre conter os números (ex: \`1-5\` ou \`11\`). Se tiver um número só, o VTT entende que a chance é de apenas 1.

\- A segunda coluna contém o texto da resposta que vai parar no chat.

\- A linha divisória \`|---|---|\` é \*\*obrigatória\*\* entre o cabeçalho e os resultados para que o Markdown seja válido.

\---

\## 3. Posso adicionar fotos ou links nos resultados?

\*\*SIM!\*\*

O VTT suporta marcações visuais dentro das colunas de resultado. Por exemplo:

\`\`\`text

\| 100 | Encontrou a espada épica! !\[Espada]\(linkdaimagem.png) |

\`\`\`

\## 4. Atualizando o VTT

Como o VTT faz um cache inteligente para ser rápido, sempre que você terminar de escrever suas tabelas e salvar o arquivo \`MegaOraculo.md\`, \*\*não se esqueça de apertar \`F5\` no seu navegador\*\* para que o motor carregue os seus textos mais recentes!

Prontinho! Você agora é oficialmente o Mestre Arquiteto do Mega Oráculo. Boas rolagens! 🎲