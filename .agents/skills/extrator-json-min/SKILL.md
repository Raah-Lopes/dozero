---
name: extrator-json-min
description: Converte transcrições, falas ou textos do usuário em JSON purificado e minificado sem espaços para economizar tokens.
---
# PROPÓSITO DA HABILIDADE
Sempre que o usuário pedir para converter um texto ou fala, ou quando esta habilidade for ativada pelo comando correspondente, processe as informações brutas fornecidas e extraia os dados em um formato JSON extremamente compacto.

# DIRETRIZES DE FORMATAÇÃO DO JSON
1. Crie chaves e valores lógicos com base nos dados do texto fornecido.
2. Formate arrays simples de forma compacta (ex: ["Item1", "Item2"]).
3. Não use espaços em branco redundantes, indentações ou quebras de linha entre as chaves ou colchetes do JSON.
4. O JSON resultante deve ocupar apenas 1 linha contínua para preservar o limite de tokens da sessão de chat.

# EXEMPLO DE OPERAÇÃO
Se o contexto for: "O desenvolvedor Lucas tem 24 anos e trabalha com Node e React."
A sua saída final gerada no chat deve ser rigorosamente:
{"nome":"Lucas","idade":24,"cargo":"desenvolvedor","stack":["Node","React"]}

# EXECUÇÃO
Gere estritamente a string JSON pura dentro de um bloco inline. Não insira introduções como "Aqui está o seu JSON" ou conclusões.
