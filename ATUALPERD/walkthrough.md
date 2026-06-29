# Diário de Bordo: Revisão do Combate Visual 🛠️

As engrenagens gráficas e o diário do DOZERO passaram por uma otimização profunda para garantir que a experiência de combate não seja apenas funcional, mas visualmente impecável.

## 1. Correção Absoluta do HP (Canvas)
Antes, ao aplicar danos customizados (que não fossem números inteiros perfeitos), o motor do jogo engasgava silenciosamente lendo "texto" onde deveria haver um "número", travando a atualização visual da barrinha vermelha na miniatura.
- **Resolução:** O motor de animação (`GameCanvas`) agora utiliza parseamento cirúrgico de `Number` em todo *frame*, garantindo que mesmo se um atributo chegar em formato de texto (`"80"` vs `80`), a barra continuará decaindo ou subindo dinamicamente sobre o personagem no mapa!

## 2. A Volta das Animações 3D (Overlay)
Os dados animados explodindo na tela existiam, mas estavam escondidos! O componente reagia, mas sua posição absoluta colapsava dependendo do painel que você abria.
- **Resolução:** Movi a propriedade do overlay para `position: fixed` com `z-index` no teto, desvencilhando-o de caixas transparentes. Agora, quer você rode uma magia de gelo do seu novo Construtor Visual, quer rode um ataque básico de espada, você verá a pontuação pular na frente do seu rosto, acompanhado do ícone correto (Crosshair vermelho para danos, Chamas verdes para cura).

## 3. Re-design do Combat Log
O registro histórico era denso. Caixas escuras com bordas grossas roubavam muita atenção e espaço na tela, dificultando a leitura de múltiplos ataques seguidos em combates de longo prazo.
- **O Novo Log:** Inspirado em *Terminais* de programação. As bordas foram trocadas por margens finas (`dotted`), e o fundo só muda de cor se for algo crucial. O momento exato de cada rolagem agora carrega uma "estampa de tempo" (`[14:25:31]`) discreta.
- O texto corre solto, alinhado à esquerda, e o foco das cores (`#10b981` verde esmeralda ou `#ef4444` vermelho sangue) fica reservado estritamente para os textos de *Sucesso* e *Falha Crítica*.

> [!TIP]
> Tente testar um ataque contra um Token qualquer arrastando sua magia nova e veja a barra dele descendo no mesmo instante que o dado 3D some da tela! E confira como a barra lateral do log ficou bem mais leve de se acompanhar.
