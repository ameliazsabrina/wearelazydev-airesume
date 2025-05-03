import { IncomingMessage } from 'http';
/**
 * Creates the WebSocket API server,
 * creates a fileserver to serve the browser RPC client,
 * and listens on the given port.
 */
export declare function createServer(port?: number): Promise<import("ws").Server<typeof import("ws"), typeof IncomingMessage>>;
