import { Logger } from 'pino';
import { WebSocket } from 'ws';
/**
 * Adds a keep-alive mechanism to the WebSocket
 * client
 */
export declare function addKeepAlive(ws: WebSocket, logger: Logger): void;
