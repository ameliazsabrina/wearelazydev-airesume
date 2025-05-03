import { CreateTunnelRequest } from '../../proto/api';
import type { Logger } from '../../types';
import type { MakeTunnelFn, TCPSocketProperties } from '../../types';
type ExtraOpts = Omit<CreateTunnelRequest, 'id' | 'initialMessage'> & {
    logger: Logger;
};
/**
 * Builds a TCP tunnel to the given host and port.
 * If a geolocation is provided -- an HTTPS proxy is used
 * to connect to the host.
 *
 * HTTPS proxy essentially creates an opaque tunnel to the
 * host using the CONNECT method. Any data can be sent through
 * this tunnel to the end host.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT
 *
 * The tunnel also retains a transcript of all messages sent and received.
 */
export declare const makeTcpTunnel: MakeTunnelFn<ExtraOpts, TCPSocketProperties>;
export {};
