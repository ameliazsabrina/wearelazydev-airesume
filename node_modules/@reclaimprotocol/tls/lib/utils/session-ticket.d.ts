import { CipherSuite, TLSSessionTicket } from '../types';
type GetResumableSessionTicketOptions = {
    masterKey: Uint8Array;
    /** hello msgs without record header */
    hellos: Uint8Array[] | Uint8Array;
    cipherSuite: CipherSuite;
};
export declare function parseSessionTicket(data: Uint8Array): TLSSessionTicket;
export declare function getPskFromTicket(ticket: TLSSessionTicket, { masterKey, hellos, cipherSuite }: GetResumableSessionTicketOptions): Promise<{
    identity: Uint8Array;
    ticketAge: number;
    finishKey: CryptoKey;
    resumeMasterSecret: Uint8Array;
    earlySecret: Uint8Array;
    cipherSuite: "TLS_CHACHA20_POLY1305_SHA256" | "TLS_AES_256_GCM_SHA384" | "TLS_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA" | "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA";
}>;
export {};
