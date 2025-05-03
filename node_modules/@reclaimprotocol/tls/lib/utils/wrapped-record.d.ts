import { CipherSuite, Key, TLSProtocolVersion } from '../types';
import { PacketHeaderOptions } from './packets';
type WrappedRecordMacGenOptions = {
    macKey?: Key;
    recordNumber: number | undefined;
    cipherSuite: CipherSuite;
    version: TLSProtocolVersion;
} & ({
    recordHeaderOpts: PacketHeaderOptions;
} | {
    recordHeader: Uint8Array;
});
type WrappedRecordCipherOptions = {
    iv: Uint8Array;
    key: Key;
} & WrappedRecordMacGenOptions;
export declare function decryptWrappedRecord(encryptedData: Uint8Array, opts: WrappedRecordCipherOptions): Promise<{
    plaintext: Uint8Array;
    iv: Uint8Array;
}>;
export declare function encryptWrappedRecord(plaintext: Uint8Array, opts: WrappedRecordCipherOptions): Promise<{
    ciphertext: Uint8Array;
    iv: Uint8Array;
}>;
export {};
