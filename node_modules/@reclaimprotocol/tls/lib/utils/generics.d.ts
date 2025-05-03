import { AuthenticatedSymmetricCryptoAlgorithm, SymmetricCryptoAlgorithm } from '../types';
/**
 * Converts a buffer to a hex string with whitespace between each byte
 * @returns eg. '01 02 03 04'
 */
export declare function toHexStringWithWhitespace(buff: Uint8Array, whitespace?: string): string;
export declare function xor(a: Uint8Array, b: Uint8Array): Uint8Array;
export declare function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array;
export declare function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean;
export declare function uint8ArrayToDataView(arr: Uint8Array): DataView;
export declare function strToUint8Array(str: string): Uint8Array;
export declare function uint8ArrayToStr(arr: Uint8Array): string;
export declare function generateIV(iv: Uint8Array, recordNumber: number): Uint8Array;
/**
 * TLS has this special sort of padding where the last byte
 * is the number of padding bytes, and all the padding bytes
 * are the same as the last byte.
 * Eg. for an 8 byte block [ 0x0a, 0x0b, 0x0c, 0xd ]
 * -> [ 0x0a, 0x0b, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x04 ]
 */
export declare function padTls(data: Uint8Array, blockSize: number): Uint8Array;
/**
 * Unpad a TLS-spec padded buffer
 */
export declare function unpadTls(data: Uint8Array): Uint8Array;
export declare function isSymmetricCipher(cipher: SymmetricCryptoAlgorithm | AuthenticatedSymmetricCryptoAlgorithm): cipher is SymmetricCryptoAlgorithm;
export declare function chunkUint8Array(arr: Uint8Array, chunkSize: number): Uint8Array[];
export declare function getTlsVersionFromBytes(bytes: Uint8Array): "TLS1_3" | "TLS1_2";
