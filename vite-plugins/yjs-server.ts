import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

export function yjsWebsocketServer() {
  return {
    name: 'yjs-websocket-server',
    configureServer(server: any) {
      const wss = new WebSocketServer({ noServer: true });
      
      server.httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        if (request.url.startsWith('/yjs')) {
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', setupWSConnection);
    }
  };
}
