# 🔍 Diagnóstico Completo: Problemas de Consistência em Tempo Real

## 📋 Resumo Executivo

Seu VTT apresenta **3 problemas críticos de arquitetura** que causam inconsistência entre dispositivos:

### Problema 1: **Loop Infinito de Sincronização** ✅ CORrigido
**Sintoma:** Tokens aparecem e somem, movimento em um dispositivo causa desaparecimento no outro.

**Causa Raiz:** O `supabaseRealtimeProvider.ts` tinha DOIS listeners de update no mesmo documento Yjs:
```typescript
// Listener 1 (linhas 138-155) - Enviava 'yjs-sync-req' em loop
this.doc.on('update', (update, origin) => {
  if (origin === 'supabase-realtime') return;
  // ... filtros ...
  await this.broadcast('yjs-sync-req', {}); // ❌ DISPARAVA LOOP
});

// Listener 2 (linhas 158-163) - Enviava 'yjs-update'
this.handleDocUpdate = (update, origin) => {
  if (origin === 'supabase-realtime') return;
  void this.broadcast('yjs-update', { update: uint8ToBase64(update) });
};
```

**Resultado:** Cada atualização gerava 2 broadcasts → outros clientes recebiam → aplicavam → geravam 2 novos broadcasts → loop infinito → tokens "teletransportavam" ou sumiam.

**Correção Aplicada:** Unificado em único listener com filtros rigorosos:
```typescript
this.handleDocUpdate = (update, origin) => {
  if (this.isDestroyed || !isSubscribed) return;
  if (origin === 'supabase-realtime') return;      // Evita eco da rede
  if (origin === 'indexeddb') return;               // Evita eco do IndexedDB
  if (origin === 'persistence') return;             // Evita re-broadcast de restores
  if (origin === 'room-auto-hydration') return;     // Evita re-broadcast de hidratação
  void this.broadcast('yjs-update', { update: uint8ToBase64(update) });
};
```

---

### Problema 2: **Sprites Fantasmas de Imagens** ⚠️ Parcialmente Corrigido
**Sintoma:** Imagem não aparece, ou aparece em token já deletado, ou some ao mover.

**Causa Raiz:** Carregamento assíncrono de imagens sem validação de existência do token:
```typescript
img.onload = () => {
  // ❌ Não verificava se o token ainda existia
  const texture = Texture.from(img);
  const sprite = new Sprite(texture);
  token.addChild(sprite); // Criava sprite mesmo se token já foi deletado
};
```

**Correção Aplicada (linhas 1951-1959):**
```typescript
img.onload = () => {
  if (isDestroyed) return;
  // ✅ Verifica se token ainda existe no estado Yjs
  if (!state.tokens.has(id)) {
    console.log(`[GameCanvas] Token ${id} removido durante carregamento, descartando.`);
    return;
  }
  // ✅ Verifica se token ainda está em tokenSprites
  if (!tokenSprites[id]) {
    console.log(`[GameCanvas] Token ${id} não está mais em tokenSprites, descartando.`);
    return;
  }
  // ... cria textura ...
};
```

---

### Problema 3: **Condição de Corrida no Arrasto (Drag Race Condition)** 🔴 AINDA PRESENTE
**Sintoma:** Ao mover token de um dispositivo, ele "treme" ou volta para posição anterior no outro dispositivo.

**Causa Raiz:** Durante o arrasto, o canvas continua observando mudanças do Yjs e atualizando posições:
```typescript
// GameCanvas.tsx linha 2169-2176
if (!isBeingDragged) {
  const dx = t.x - tokenSprites[id].container.x;
  const dy = t.y - tokenSprites[id].container.y;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    tokenSprites[id].container.x = t.x;  // ❌ ATUALIZA DURANTE DRAG LOCAL
    tokenSprites[id].container.y = t.y;
  }
}
```

**Problema:** Quando você arrasta no Dispositivo A:
1. Dispositivo A move token visualmente (drag local)
2. Dispositivo A envia update para Yjs
3. Yjs notifica Dispositivo B
4. Dispositivo B aplica nova posição ✅
5. **MAS** Dispositivo A também recebe seu próprio update da rede
6. Dispositivo A tenta corrigir posição do token que já está sendo arrastado → conflito visual

**Correção Necessária:** Adicionar flag `isLocalDragging` para ignorar updates da rede enquanto arrasta localmente.

---

## 🛠️ Correções Pendentes

### 1. Implementar Interpolação de Movimento Suave
Em vez de teletransportar tokens para a nova posição, interpolar suavemente:

```typescript
// Adicionar ao GameCanvas.tsx
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

// No syncTokens, em vez de:
tokenSprites[id].container.x = t.x;

// Usar:
const targetX = t.x;
const currentX = tokenSprites[id].container.x;
tokenSprites[id].container.x = lerp(currentX, targetX, 0.3); // 30% do caminho
```

### 2. Adicionar Flag de Autoridade Local
Criar sistema de "quem está arrastando tem autoridade":

```typescript
// Em GameCanvas.tsx
let localDraggingTokens = new Set<string>();

// No pointerdown do token
localDraggingTokens.add(id);
Tokens.update(id, { x, y, __draggingBy: localClientId });

// No syncTokens
if (t.__draggingBy === localClientId) {
  return; // Ignora updates da rede para tokens que estou arrastando
}

// No pointerup
localDraggingTokens.delete(id);
Tokens.update(id, { __draggingBy: null });
```

### 3. Throttling de Updates de Posição
Atualizar Yjs apenas a cada 50-100ms durante arrasto contínuo:

```typescript
let dragUpdateThrottle: Record<string, number> = {};

const onTokenDrag = (id: string, x: number, y: number) => {
  const now = Date.now();
  if (now - dragUpdateThrottle[id] < 50) return; // Limita a 20 updates/segundo
  dragUpdateThrottle[id] = now;
  Tokens.update(id, { x, y });
};
```

---

## 🧪 Plano de Testes

### Teste 1: Multi-Dispositivo Simultâneo
1. Abra a mesa em 2 navegadores diferentes
2. Crie um token com imagem no Navegador A
3. **Verifique:** Imagem aparece instantaneamente no Navegador B?
4. Mova o token no Navegador A
5. **Verifique:** Movimento é suave no Navegador B ou há "teletransporte"?

### Teste 2: Arrasto Conflitante
1. Com a mesa aberta em 2 navegadores
2. Comece a arrastar um token no Navegador A
3. Enquanto arrasta no A, tente arrastar o MESMO token no Navegador B
4. **Verifique:** Qual dispositivo "vence"? O token some ou treme?

### Teste 3: Persistência e Restore
1. Crie vários tokens com imagens
2. Recarregue a página (F5)
3. **Verifique:** Todos os tokens voltaram com imagens corretas?
4. **Verifique:** Não há tokens duplicados ou fantasmas?

### Teste 4: Delete Durante Carregamento
1. Crie um token com imagem pesada (URL externa lenta)
2. Imediatamente após criar, delete o token antes da imagem carregar
3. **Verifique:** Não aparece sprite fantasma? Não há erro no console?

---

## 📊 Métricas de Performance Ideal

| Métrica | Valor Atual (Estimado) | Valor Ideal |
|---------|------------------------|-------------|
| Latência de Sync | 200-500ms | < 100ms |
| Updates/segundo durante drag | Ilimitado (causa flood) | 20-30 fps |
| Tokens fantasmas | Ocasional | Zero |
| Teletransporte visual | Frequente | Nunca |

---

## ✅ Checklist de Correções

- [x] Unificar listeners de update no RealtimeProvider
- [x] Adicionar filtros de origem (supabase, indexeddb, persistence)
- [x] Validar existência do token antes de criar sprite de imagem
- [ ] Implementar interpolação de movimento (lerp)
- [ ] Adicionar flag de autoridade local (__draggingBy)
- [ ] Implementar throttling de updates durante arrasto
- [ ] Adicionar timeout para limpeza de sprites órfãos
- [ ] Testar em 3+ dispositivos simultâneos
- [ ] Medir latência real de sync com cronômetro

---

## 🚀 Próximos Passos Imediatos

1. **Aplicar correção de interpolação** no `GameCanvas.tsx`
2. **Adicionar cliente ID único** por sessão para autoridade de arrasto
3. **Implementar throttling** nos updates de posição
4. **Testar em produção** com 2-3 dispositivos reais
5. **Coletar métricas** de latência e estabilidade

---

## 💡 Dica de Debug

Use o arquivo `diagnostico_sync.html` incluso neste repositório para monitorar eventos em tempo real. Injete-o na sua aplicação ou use as funções globais:

```javascript
window.diagEvent('recv', { type: 'token-move', id: 'abc' });
window.diagGhostToken('token_123');
window.diagSyncError('Loop detectado!');
```

Isso mostrará um painel visual com contadores de eventos recebidos/enviados/erros.

---

**Status:** 2 de 3 problemas críticos corrigidos.  
**Próxima Sprint:** Implementar interpolação e autoridade local para eliminar tremores durante arrasto.
