import { CipherSuite } from '../types';
type VerifyFinishMessageOptions = {
    secret: Uint8Array;
    handshakeMessages: Uint8Array[];
    cipherSuite: CipherSuite;
};
export declare function verifyFinishMessage(verifyData: Uint8Array, opts: VerifyFinishMessageOptions): Promise<void>;
export declare function packFinishMessagePacket(opts: VerifyFinishMessageOptions): Promise<Uint8Array>;
export declare function packClientFinishTls12(opts: VerifyFinishMessageOptions): Promise<Uint8Array>;
export declare function generateFinishTls12(type: 'client' | 'server', { secret, handshakeMessages, cipherSuite }: VerifyFinishMessageOptions): Promise<Uint8Array>;
export {};
