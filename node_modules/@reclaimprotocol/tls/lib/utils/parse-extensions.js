"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientExtensions = exports.parseServerExtensions = void 0;
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
/**
 * Parse a length-encoded list of extensions
 * sent by the server
 */
function parseServerExtensions(data) {
    return parseExtensions(data, {
        'ALPN': (extData) => {
            const data = (0, packets_1.expectReadWithLength)(extData);
            const alpnBytes = (0, packets_1.expectReadWithLength)(data, 1);
            return (0, generics_1.uint8ArrayToStr)(alpnBytes);
        },
        'SUPPORTED_VERSIONS': generics_1.getTlsVersionFromBytes,
        'PRE_SHARED_KEY': () => ({ supported: true }),
        'KEY_SHARE': (extData) => {
            const typeBytes = extData.slice(0, 2);
            const type = constants_1.SUPPORTED_NAMED_CURVES
                .find(k => (0, generics_1.areUint8ArraysEqual)(constants_1.SUPPORTED_NAMED_CURVE_MAP[k].identifier, typeBytes));
            if (!type) {
                throw new Error(`Unsupported key type '${typeBytes}'`);
            }
            const publicKey = (0, packets_1.expectReadWithLength)(extData.slice(2));
            return { type, publicKey };
        }
    });
}
exports.parseServerExtensions = parseServerExtensions;
/**
 * Parse a length-encoded list of extensions
 * sent by the client
 */
function parseClientExtensions(data) {
    return parseExtensions(data, {
        'SERVER_NAME': (extData) => {
            extData = (0, packets_1.expectReadWithLength)(extData);
            const byte = extData[0];
            extData = extData.slice(1);
            const serverNameBytes = (0, packets_1.expectReadWithLength)(extData);
            return {
                type: byte,
                serverName: (0, generics_1.uint8ArrayToStr)(serverNameBytes)
            };
        }
    });
}
exports.parseClientExtensions = parseClientExtensions;
function parseExtensions(data, parsers) {
    data = readWLength(2);
    const map = {};
    const seenExtensions = new Set();
    while (data.length) {
        const typeByte = read(2)[1];
        const extData = readWLength(2);
        const type = constants_1.SUPPORTED_EXTENSIONS
            .find(k => constants_1.SUPPORTED_EXTENSION_MAP[k] === typeByte);
        if (seenExtensions.has(typeByte)) {
            throw new Error(`Duplicate extension '${type}' (${typeByte})`);
        }
        if (type && type in parsers) {
            map[type] = parsers[type](extData);
        }
    }
    return map;
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
