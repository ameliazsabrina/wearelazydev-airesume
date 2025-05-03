import type { CertificatePublicKey, CipherSuite, Key, TLSProcessContext, X509Certificate } from '../types';
import { SUPPORTED_NAMED_CURVE_MAP, SUPPORTED_SIGNATURE_ALGS_MAP } from './constants';
type VerifySignatureOptions = {
    signature: Uint8Array;
    algorithm: keyof typeof SUPPORTED_SIGNATURE_ALGS_MAP;
    publicKey: CertificatePublicKey;
    signatureData: Uint8Array;
};
export declare function parseCertificates(data: Uint8Array, { version }: TLSProcessContext): {
    certificates: X509Certificate<any>[];
    ctx: number;
};
export declare function parseServerCertificateVerify(data: Uint8Array): {
    algorithm: "ED25519" | "ECDSA_SECP384R1_SHA256" | "ECDSA_SECP256R1_SHA256" | "RSA_PSS_RSAE_SHA256" | "RSA_PKCS1_SHA512" | "RSA_PKCS1_SHA256";
    signature: Uint8Array;
};
export declare function verifyCertificateSignature({ signature, algorithm, publicKey, signatureData, }: VerifySignatureOptions): Promise<void>;
export declare function getSignatureDataTls13(hellos: Uint8Array[] | Uint8Array, cipherSuite: CipherSuite): Promise<Uint8Array>;
type Tls12SignatureDataOpts = {
    clientRandom: Uint8Array;
    serverRandom: Uint8Array;
    curveType: keyof typeof SUPPORTED_NAMED_CURVE_MAP;
    publicKey: Key;
};
export declare function getSignatureDataTls12({ clientRandom, serverRandom, curveType, publicKey, }: Tls12SignatureDataOpts): Promise<Uint8Array>;
export declare function verifyCertificateChain(chain: X509Certificate[], host: string, additionalRootCAs?: X509Certificate[]): Promise<void>;
export {};
