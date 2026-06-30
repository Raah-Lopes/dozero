---
nome: _MODELO_JOGADOR
pv: 20
pv_max: 20
xp: 0
nivel: 1
mana: 10
mana_max: 10
FOR: 10
DES: 10
CON: 10
INT: 10
SAB: 10
CAR: 10
CA: 10
Deslocamento: 9m
status: jogador
usos_cura: 3
saqueado: false
ativo: true
status_efeitos: []
Acrobacia: 0
Furtividade: 0
Atletismo: 0
Percepcao: 0
inventario:
  - id: pocao_1
    nome: Poção de Vida P
    quantidade: 3
    tipo: consumivel
    efeito: heal_20
  - id: espada_aço
    nome: Espada de Aço
    quantidade: 1
    tipo: equipamento
    efeito: ataque_5
    equipado: false
po: 0
pp: 0
pc: 0
defesas:
  proficiencia_armadura:
    sem_armadura: 0
    leve: 0
    media: 0
    pesada: 0
conjuracao:
  atributo: INT
  proficiencia: 0
magias_preparadas:
  truques:
    current: 0
    max: 0
  nivel_1:
    current: 0
    max: 0
  nivel_2:
    current: 0
    max: 0
  nivel_3:
    current: 0
    max: 0
poderes: []
macros: []
---
# 📋 MODELO — Ficha de Jogador

> Copie este arquivo, renomeie (sem o `_MODELO_`) e preencha os campos.

## Como preencher o cabeçalho (frontmatter)

O bloco entre os `---` é lido automaticamente pelos widgets. **Não mude os nomes dos campos!**