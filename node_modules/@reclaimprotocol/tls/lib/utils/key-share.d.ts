import { Key } from '../types';
export declare function packClientKeyShare(publicKey: Key): Promise<Uint8Array>;
export declare function processServerKeyShare(data: Uint8Array): Promise<{
    publicKeyType: "X25519" | "SECP256R1" | "SECP384R1";
    publicKey: CryptoKey;
    signatureAlgorithm: "ED25519" | "ECDSA_SECP384R1_SHA256" | "ECDSA_SECP256R1_SHA256" | "RSA_PSS_RSAE_SHA256" | "RSA_PKCS1_SHA512" | "RSA_PKCS1_SHA256";
    signatureBytes: Uint8Array;
}>;
