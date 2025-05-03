import { ProcessPacket, TLSClientOptions, TLSHandshakeOptions, TLSSessionTicket } from './types';
export declare function makeTLSClient({ host, verifyServerCertificate, rootCAs, logger: _logger, cipherSuites, namedCurves, supportedProtocolVersions, signatureAlgorithms, applicationLayerProtocols, write, onRead, onApplicationData, onSessionTicket, onTlsEnd, onHandshake, onRecvCertificates }: TLSClientOptions): {
    getMetadata(): {
        cipherSuite: "TLS_CHACHA20_POLY1305_SHA256" | "TLS_AES_256_GCM_SHA384" | "TLS_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA" | "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA" | undefined;
        keyType: "X25519" | "SECP256R1" | "SECP384R1" | undefined;
        version: "TLS1_3" | "TLS1_2" | undefined;
        selectedAlpn: string | undefined;
    };
    hasEnded(): boolean;
    /**
     * Get the current traffic keys
     */
    getKeys(): {
        recordSendCount: number;
        recordRecvCount: number;
        type: "TLS1_3";
        masterSecret: Uint8Array;
        clientSecret: Uint8Array;
        serverSecret: Uint8Array;
        clientEncKey: CryptoKey;
        serverEncKey: CryptoKey;
        clientIv: Uint8Array;
        serverIv: Uint8Array;
    } | {
        recordSendCount: number;
        recordRecvCount: number;
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
    } | undefined;
    /**
     * Session ID used to connect to the server
     */
    getSessionId(): Uint8Array;
    isHandshakeDone(): boolean;
    getPskFromTicket(ticket: TLSSessionTicket): Promise<{
        identity: Uint8Array;
        ticketAge: number;
        finishKey: CryptoKey;
        resumeMasterSecret: Uint8Array;
        earlySecret: Uint8Array;
        cipherSuite: "TLS_CHACHA20_POLY1305_SHA256" | "TLS_AES_256_GCM_SHA384" | "TLS_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256" | "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256" | "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384" | "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA" | "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA";
    }>;
    /**
     * Start the handshake with the server
     */
    startHandshake(opts?: TLSHandshakeOptions): Promise<void>;
    /**
     * Handle bytes received from the server.
     * Could be a complete or partial TLS packet
     */
    handleReceivedBytes(data: Uint8Array): void;
    /**
     * Handle a complete TLS packet received
     * from the server
     */
    handleReceivedPacket: ProcessPacket;
    /**
     * Utilise the KeyUpdate handshake message to update
     * the traffic keys. Available only in TLS 1.3
     * @param requestUpdateFromServer should the server be requested to
     * update its keys as well
     */
    updateTrafficKeys(requestUpdateFromServer?: boolean): Promise<void>;
    write(data: Uint8Array): Promise<void>;
    end: (error?: Error) => Promise<void>;
};
