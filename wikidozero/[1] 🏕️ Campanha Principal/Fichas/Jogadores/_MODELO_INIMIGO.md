---
nome: _MODELO_INIMIGO
pv: 40
pv_max: 40
xp: 10
nivel: 1
mana: 0
mana_max: 0
FOR: 12
DES: 14
CON: 12
INT: 8
SAB: 10
CAR: 8
CA: 15
Deslocamento: 9m
status: inimigo
avatar: 
ouro: 0
usos_cura: 0
status_efeitos: []
saqueado: false
ativo: true
Acrobacia: 0
Furtividade: 0
Atletismo: 0
Percepcao: 0
inventario: []
---
# 📋 MODELO — Ficha de Inimigo

> Copie este arquivo para criar um novo inimigo. Inimigos aparecem em vermelho no widget Lista de Personagens.

## Dicas para inimigos

* **`pv`** e **`pv_max`** são atualizados automaticamente pelo Dados Automáticos após combates
* **`CA`** (Classe de Armadura) define o alvo para acertos. Crítico acontece se o atacante superar a CA em 10 pontos.
* **`nivel`** define quanto XP o atacante ganha ao vencer (`nivel × 10`)
* **`FOR`** ou **`DES`** altos aumentam o dano e as chances de acerto de macros deste monstro.

## Combinações sugeridas

| Arquétipo      | FOR | DES | CON | CA | Deslocamento |
| -------------- | --- | --- | --- | -- | ------------ |
| Berserker      | 18  | 12  | 16  | 14 | 9m           |
| Tanque         | 16  | 8   | 18  | 18 | 6m           |
| Arqueiro       | 10  | 18  | 12  | 15 | 12m          |
| Mago Inimigo   | 8   | 14  | 10  | 12 | 9m           |
| Minion (fraco) | 12  | 12  | 10  | 13 | 9m           |

## Abaixo do frontmatter

Descreva táticas, pontos fracos, loot, histórico e notas do mestre.