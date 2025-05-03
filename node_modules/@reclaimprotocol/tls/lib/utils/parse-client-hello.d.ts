/**
 * Parse a full client hello message
 */
export declare function parseClientHello(data: Uint8Array): {
    version: "TLS1_3" | "TLS1_2";
    serverRandom: Uint8Array;
    sessionId: Uint8Array;
    cipherSuitesBytes: Uint8Array;
    compressionMethodByte: number;
    extensions: Partial<import("..").SupportedExtensionClientData>;
};
