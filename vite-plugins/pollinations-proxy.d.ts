import type { Plugin } from 'vite';
/**
 * Plugin Vite dedicado para servir como proxy para a API do Pollinations AI.
 * Resolve o bloqueio de CORS que impede chamadas diretas do navegador.
 */
export declare function pollinationsProxy(): Plugin;
