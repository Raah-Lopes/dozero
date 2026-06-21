---
nome: _MODELO_INIMIGO
pv: 80
pv_max: 80
xp: 0
nivel: 3
mana: 0
mana_max: 0
armadura: 10
defesa: 8
velocidade: 8
ataque: 20
status: inimigo
avatar: 
ouro: 0
usos_cura: 3
status_efeitos: []
saqueado: false
ativo: fals
inventario: []
---
# 📋 MODELO — Ficha de Inimigo

> Copie este arquivo para criar um novo inimigo. Inimigos aparecem em vermelho no widget Lista de Personagens.

## Dicas para inimigos

* **`pv`** e **`pv_max`** são atualizados automaticamente pelo Dados Automáticos após combates
* **`armadura`** absorve dano antes de chegar no PV (até zerar a armadura)
* **`nivel`** define quanto XP o atacante ganha ao vencer (`nivel × 10`)
* **`ataque`** elevado + **`defesa`** baixo \= vidro de cânone (vai longe mas morre rápido)
* **`armadura`** elevada \= tanque (aguenta muito, mas fica vulnerável quando a armadura zera)

## Combinações sugeridas

| Arquétipo      | Ataque | Defesa | Armadura | Velocidade |
| -------------- | ------ | ------ | -------- | ---------- |
| Berserker      | 35     | 5      | 5        | 14         |
| Tanque         | 15     | 10     | 30       | 5          |
| Arqueiro       | 20     | 18     | 2        | 16         |
| Mago Inimigo   | 25     | 12     | 0        | 10         |
| Minion (fraco) | 8      | 6      | 2        | 10         |

## Abaixo do frontmatter

Descreva táticas, pontos fracos, loot, histórico e notas do mestre.