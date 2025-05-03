"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientHello = void 0;
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
const parse_extensions_1 = require("./parse-extensions");
/**
 * Parse a full client hello message
 */
function parseClientHello(data) {
    const packetType = read(1)[0];
    if (packetType !== constants_1.SUPPORTED_RECORD_TYPE_MAP.CLIENT_HELLO) {
        throw new Error(`Invalid record type for client hello (${packetType})`);
    }
    data = readWLength(3);
    const versionBytes = read(2);
    const version = (0, generics_1.getTlsVersionFromBytes)(versionBytes);
    const serverRandom = read(32);
    const sessionId = readWLength(1);
    const cipherSuitesBytes = readWLength(2);
    const compressionMethodByte = readWLength(1)[0];
    const extensions = (0, parse_extensions_1.parseClientExtensions)(data);
    return {
        version,
        serverRandom,
        sessionId,
        cipherSuitesBytes,
        compressionMethodByte,
        extensions,
    };
    function read(bytes) {
        const result = data.slice(0, bytes);
        data = data.slice(bytes);
        return result;
    }
    function readWLength(bytesLength = 2) {
        const content = (0, packets_1.expectReadWithLength)(data, bytesLength);
        data = data.slice(content.length + bytesLength);
        return content;
    }
}
exports.parseClientHello = parseClientHello;
