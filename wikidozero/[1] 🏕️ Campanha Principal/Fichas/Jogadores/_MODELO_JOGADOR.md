---
nome: _MODELO_JOGADOR
pv: 49
pv_max: 50
xp: 0
nivel: 1
mana: 30
mana_max: 30
armadura: 4
defesa: 10
velocidade: 10
ataque: 10
status: jogador
ouro: 0
usos_cura: 3
saqueado: false
ativo: fals
status_efeitos: []
inventario: 
  - id: "pocao_1"
    nome: "Poção de Vida P"
    quantidade: 3
    tipo: "consumivel"
    efeito: "heal_20"
  - id: "espada_aço"
    nome: "Espada de Aço"
    quantidade: 1
    tipo: "equipamento"
    efeito: "ataque_5"
    equipado: false
---
# 📋 MODELO — Ficha de Jogador

> Copie este arquivo, renomeie (sem o `_MODELO_`) e preencha os campos.

## Como preencher o cabeçalho (frontmatter)

O bloco entre os `---` é lido automaticamente pelos widgets. **Não mude os nomes dos campos!**