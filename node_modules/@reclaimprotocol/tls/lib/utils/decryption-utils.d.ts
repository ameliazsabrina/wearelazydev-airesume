import { CipherSuite, HashAlgorithm } from '../types';
type DeriveTrafficKeysOptions = {
    masterSecret: Uint8Array;
    /** used to derive keys when resuming session */
    earlySecret?: Uint8Array;
    cipherSuite: CipherSuite;
    /** list of handshake message to hash; or the hash itself */
    hellos: Uint8Array[] | Uint8Array;
    /** type of secret; handshake or provider-data */
    secretType: 'hs' | 'ap';
};
type DeriveTrafficKeysOptionsTls12 = {
    preMasterSecret: Uint8Array;
    clientRandom: Uint8Array;
    serverRandom: Uint8Array;
    cipherSuite: CipherSuite;
};
export type SharedKeyData = Awaited<ReturnType<typeof computeSharedKeys>> | Awaited<ReturnType<typeof computeSharedKeysTls12>>;
export declare function computeSharedKeysTls12(opts: DeriveTrafficKeysOptionsTls12): Promise<{
    type: "TLS1_2";
    masterSecret: Uint8Array;
    clientMacKey: CryptoKey | undefined;
    serverMacKey: CryptoKey | undefined;
    clientEncKey: CryptoKey;
    serverEncKey: CryptoKey;
    clientIv: Uint8Array;
    serverIv: Uint8Array;
    serverSecret: Uint8Array;
    clientSecret: Uint8Array;
}>;
export declare function computeUpdatedTrafficMasterSecret(masterSecret: Uint8Array, cipherSuite: CipherSuite): Promise<Uint8Array>;
export declare function computeSharedKeys({ hellos, masterSecret: masterKey, cipherSuite, secretType, earlySecret }: DeriveTrafficKeysOptions): Promise<{
    type: "TLS1_3";
    masterSecret: Uint8Array;
    clientSecret: Uint8Array;
    serverSecret: Uint8Array;
    clientEncKey: CryptoKey;
    serverEncKey: CryptoKey;
    clientIv: Uint8Array;
    serverIv: Uint8Array;
}>;
export declare function deriveTrafficKeys({ masterSecret, cipherSuite, hellos, secretType, }: DeriveTrafficKeysOptions): Promise<{
    type: "TLS1_3";
    masterSecret: Uint8Array;
    clientSecret: Uint8Array;
    serverSecret: Uint8Array;
    clientEncKey: CryptoKey;
    serverEncKey: CryptoKey;
    clientIv: Uint8Array;
    serverIv: Uint8Array;
}>;
export declare function deriveTrafficKeysForSide(masterSecret: Uint8Array, cipherSuite: CipherSuite): Promise<{
    masterSecret: Uint8Array;
    encKey: CryptoKey;
    iv: Uint8Array;
}>;
export declare function hkdfExtractAndExpandLabel(algorithm: HashAlgorithm, secret: Uint8Array, label: string, context: Uint8Array, length: number): Promise<Uint8Array>;
export declare function getHash(msgs: Uint8Array[] | Uint8Array, cipherSuite: CipherSuite): Promise<Uint8Array>;
/**
 * Get the PRF algorithm for the given cipher suite
 * Relevant for TLS 1.2
 */
export declare function getPrfHashAlgorithm(cipherSuite: CipherSuite): "SHA-256" | "SHA-384";
export {};
