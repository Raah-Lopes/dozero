/**
 * A API de arquivos da wiki existe apenas no servidor Vite local. No site
 * publicado, o conteúdo é servido pelo acervo empacotado e não há filesystem
 * para expor. Uma resposta explícita evita que a regra de fallback da SPA
 * devolva HTML para clientes que esperam JSON ou SSE.
 */
export default {
  fetch() {
    return Response.json(
      { error: 'Local wiki API is unavailable in the hosted application.' },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  },
};
