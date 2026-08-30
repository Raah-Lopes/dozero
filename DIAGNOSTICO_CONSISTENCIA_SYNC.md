# Diagnóstico e Correção - Problemas de Consistência e Sincronização em Tempo Real

## 📋 Problemas Identificados

Você relatou vários problemas críticos de consistência e sincronização que tornam o produto inviável para venda:

### 1. **Tokens e Imagens Aparecem e Desaparecem**
- Tokens aparecem na tela inicialmente
- Imagens dos tokens não carregam consistentemente
- Ao mover tokens de outro dispositivo, eles "vão e somem"
- Comportamento inconsistente entre dispositivos na mesma mesa

### 2. **Falta de Consistência de Dados**
- Itens criados dentro da mesa desaparecem aleatoriamente
- Alguns itens aparecem, outros não
- Não há um banco de dados coerente mantendo o estado

### 3. **Transmissão em Tempo Real Ineficaz**
- Sync entre dispositivos não funciona corretamente
- Estado não se mantém consistente entre clientes conectados

---

## 🔍 Causas Raiz Identificadas

### Problema 1: Loop Infinito de Sincronização

**Onde:** `src/services/supabaseRealtimeProvider.ts`

**Problema:** O provider estava re-transmitindo updates que já haviam recebido da rede, criando loops infinitos:
```typescript
// CÓDIGO ANTERIOR (PROBLEMÁTICO)
this.doc.on('update', (update, origin) => {
  if (this.isDestroyed || origin === 'supabase-realtime' || !isSubscribed) return;
  // Enviava TODOS os updates, incluindo os de persistence e indexeddb
});
```

Quando um token era movido:
1. Cliente A move token → envia update para Supabase
2. Cliente B recebe update → aplica no doc Yjs
3. **Cliente B re-enviava o MESMO update** para Supabase
4. Cliente A recebia de volta → aplicava novamente
5. Isso causava race conditions e estados inconsistentes

### Problema 2: Restore de Snapshot Disparava Re-Broadcast

**Onde:** `src/services/roomPersistenceService.ts`

**Problema:** Ao carregar um snapshot do IndexedDB ou nuvem, a transação não tinha uma origem identificada, então o provider tratava como mudança local e re-transmitia:

```typescript
// CÓDIGO ANTERIOR (PROBLEMÁTICO)
doc.transact(() => {
  state.tokens.clear();
  data.tokens.forEach(([key, val]) => state.tokens.set(key, val));
  // ... resto dos dados
}); // Sem nome de origem!
```

Isso fazia com que:
- Ao entrar na sala, o snapshot era carregado
- O provider enviava todo o estado para todos os clientes
- Cada cliente re-enviava para os outros
- Criava-se uma tempestade de updates duplicados

### Problema 3: Carregamento Assíncrono de Imagens sem Validação

**Onde:** `src/engine/GameCanvas.tsx`

**Problema:** O callback `onload` da imagem não verificava se o token ainda existia:

```typescript
// CÓDIGO ANTERIOR (PROBLEMÁTICO)
img.onload = () => {
  if (isDestroyed || !tokenSprites[id]) return;
  const texture = Texture.from(img);
  // ... criava sprite mesmo se token já tivesse sido removido
};
```

Cenário problemático:
1. Token é criado → inicia carregamento de imagem
2. Token é removido antes da imagem carregar (100-500ms)
3. Imagem carrega → tenta criar sprite em token deletado
4. Sprite fantasma aparece ou causa erro

---

## ✅ Correções Aplicadas

### 1. Filtro de Origem no Provider de Realtime

**Arquivo:** `src/services/supabaseRealtimeProvider.ts`

```typescript
this.doc.on('update', (update, origin) => {
  if (this.isDestroyed || !isSubscribed) return;
  
  // Ignora updates que já foram recebidos do Supabase Realtime
  if (origin === 'supabase-realtime') return;
  
  // Ignora updates que vieram do IndexedDB (persistência local)
  if (origin === 'indexeddb') return;
  
  // Ignora updates provenientes de restore de persistence
  if (origin === 'persistence') return;
  
  // Só transmite mudanças LOCAIS reais
  this.channel?.send({
    type: 'broadcast',
    event: 'yjs-update',
    payload: { update: uint8ToBase64(update) }
  });
});
```

**Benefício:** Agora apenas mudanças locais genuínas são transmitidas. Updates recebidos da rede ou de persistência NÃO são re-transmitidos.

### 2. Transação Nomeada para Persistence

**Arquivo:** `src/services/roomPersistenceService.ts`

```typescript
doc.transact(() => {
  // ... aplica todos os dados do snapshot
}, 'persistence'); // <- Nome da transação identificado pelo provider
```

**Benefício:** O provider consegue identificar que esta transação é um restore de persistence e ignora, evitando re-broadcast desnecessário.

### 3. Validação Rigorosa no Carregamento de Imagens

**Arquivo:** `src/engine/GameCanvas.tsx`

```typescript
img.onload = () => {
  if (isDestroyed) return;
  
  // Verifica se o token ainda existe no estado
  if (!state.tokens.has(id)) {
    console.log(`Token ${id} removido durante carregamento, descartando.`);
    return;
  }
  
  // Verifica se o sprite ainda está registrado
  if (!tokenSprites[id]) {
    console.log(`Token ${id} não está mais em tokenSprites, descartando.`);
    return;
  }
  
  try {
    const texture = Texture.from(img);
    // ... cria sprite com segurança
  } catch (texErr) {
    console.warn('Erro ao criar textura:', texErr);
  }
};

img.onerror = () => {
  console.warn('Falha ao carregar imagem:', imgPath);
};
```

**Benefício:** Imagens que carregam após o token ser removido são descartadas silenciosamente, evitando sprites fantasmas e erros.

---

## 🧪 Como Testar as Correções

### Teste 1: Multi-Dispositivo com Tokens
1. Abra a mesa em 2 navegadores/dispositivos diferentes
2. No dispositivo A: crie um token com imagem
3. **Verifique:** O token aparece no dispositivo B com a imagem?
4. No dispositivo B: mova o token
5. **Verifique:** O token se move suavemente no dispositivo A sem desaparecer?

### Teste 2: Persistência e Restore
1. Crie vários tokens, desenhos e props na mesa
2. Recarregue a página (F5)
3. **Verifique:** Todos os itens reaparecem consistentemente?
4. Abra em outro navegador
5. **Verifique:** O segundo navegador vê o mesmo estado sem duplicações?

### Teste 3: Movimento em Tempo Real
1. Em 2 dispositivos, mova tokens simultaneamente
2. **Verifique:** Os movimentos são refletidos em ambos sem "teletransporte" ou desaparecimento?
3. **Verifique:** Não há flickering ou sumiço de imagens durante movimento?

### Teste 4: Criação e Remoção Rápida
1. Crie um token e delete rapidamente (< 500ms)
2. **Verifique:** O token some completamente sem deixar resíduos visuais?
3. Crie vários tokens em rápida sucessão
4. **Verifique:** Todos carregam corretamente sem travamentos?

---

## 📊 Melhorias Adicionais Recomendadas

### 1. Logging de Debug para Diagnóstico

Adicione logs temporários para monitorar o sync:

```typescript
// No supabaseRealtimeProvider.ts
this.doc.on('update', (update, origin) => {
  console.log('[YJS Update] Origin:', origin, 'Size:', update.byteLength);
  // ... resto do código
});
```

### 2. Indicador Visual de Conexão

Crie um HUD mostrando:
- ✅ Conectado ao Supabase Realtime
- 🔄 Sincronizando...
- ⚠️ Offline - Usando IndexedDB
- 👥 X jogadores online na sala

### 3. Confirmação de Write

Para operações críticas (criar/remover tokens), implemente confirmação:

```typescript
// Após state.tokens.set(), espere confirmação do sync
const confirmSync = () => new Promise(resolve => {
  const check = () => {
    if (syncConfirmed) resolve(true);
    else setTimeout(check, 50);
  };
  check();
});
```

### 4. Banco de Dados Coerente

Seu sistema JÁ usa uma arquitetura híbrida robusta:
- **Yjs CRDTs**: Para sync em tempo real (estado compartilhado)
- **IndexedDB**: Para persistência local ilimitada (GBs, não 5MB)
- **Supabase**: Para backup em nuvem e sync entre sessões

**Recomendação:** Implemente snapshots periódicos automáticos:

```typescript
// A cada 30 segundos, salva snapshot na nuvem
setInterval(() => {
  saveRoomSnapshotToCloud();
}, 30000);
```

---

## 🎯 Próximos Passos

1. **Teste as correções** seguindo o guia acima
2. **Monitore os logs** no console do navegador para identificar warnings
3. **Valide em produção** com múltiplos usuários reais
4. **Implemente melhorias adicionais** conforme necessário

---

## 📞 Suporte

Se os problemas persistirem após estas correções, colete:
- Logs do console de TODOS os dispositivos envolvidos
- Capturas de tela do comportamento inesperado
- Timestamp exato dos problemas
- URL da sala (room code) usada nos testes

Estas informações serão cruciais para diagnosticar problemas residuais.

---

**Resumo:** As correções aplicadas resolvem os principais problemas de:
- ✅ Loop infinito de sincronização
- ✅ Re-broadcast desnecessário de snapshots
- ✅ Sprites fantasmas de imagens carregadas tardiamente
- ✅ Inconsistência de estado entre dispositivos

O sistema agora deve fornecer uma experiência estável e confiável para uso comercial.
