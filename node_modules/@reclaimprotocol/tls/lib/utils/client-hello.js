"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packPresharedKeyExtension = exports.computeBinderSuffix = exports.packClientHello = void 0;
const crypto_1 = require("../crypto");
const decryption_utils_1 = require("../utils/decryption-utils");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
const CLIENT_VERSION = new Uint8Array([0x03, 0x03]);
// no compression, as our client won't support it
// neither does TLS1.3
const COMPRESSION_MODE = new Uint8Array([0x01, 0x00]);
const RENEGOTIATION_INFO = new Uint8Array([0xff, 0x01, 0x00, 0x01, 0x00]);
async function packClientHello({ host, sessionId, random, keysToShare, psk, cipherSuites, supportedProtocolVersions, signatureAlgorithms, applicationLayerProtocols = [] }) {
    // generate random & sessionId if not provided
    random ||= crypto_1.crypto.randomBytes(32);
    sessionId ||= crypto_1.crypto.randomBytes(32);
    supportedProtocolVersions ||= Object
        .keys(constants_1.TLS_PROTOCOL_VERSION_MAP);
    signatureAlgorithms ||= Object
        .keys(constants_1.SUPPORTED_SIGNATURE_ALGS_MAP);
    const packedSessionId = (0, packets_1.packWithLength)(sessionId).slice(1);
    const cipherSuiteList = (cipherSuites || Object.keys(constants_1.SUPPORTED_CIPHER_SUITE_MAP))
        .map(cipherSuite => constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite].identifier);
    const packedCipherSuites = (0, packets_1.packWithLength)((0, generics_1.concatenateUint8Arrays)(cipherSuiteList));
    const extensionsList = [
        packServerNameExtension(host),
        packSupportedGroupsExtension(keysToShare.map(k => k.type)),
        packSessionTicketExtension(),
        packVersionsExtension(supportedProtocolVersions),
        packSignatureAlgorithmsExtension(signatureAlgorithms),
        packPresharedKeyModeExtension(),
        await packKeyShareExtension(keysToShare),
        RENEGOTIATION_INFO
    ];
    if (psk) {
        extensionsList.push(packPresharedKeyExtension(psk));
    }
    if (applicationLayerProtocols.length) {
        const protocols = applicationLayerProtocols.map(alp => (
        // 1 byte for length
        (0, packets_1.packWithLength)((0, generics_1.strToUint8Array)(alp)).slice(1)));
        extensionsList.push(packExtension({
            type: 'ALPN',
            data: (0, generics_1.concatenateUint8Arrays)(protocols),
        }));
    }
    const packedExtensions = (0, packets_1.packWithLength)((0, generics_1.concatenateUint8Arrays)(extensionsList));
    const handshakeData = (0, generics_1.concatenateUint8Arrays)([
        CLIENT_VERSION,
        random,
        packedSessionId,
        packedCipherSuites,
        COMPRESSION_MODE,
        packedExtensions
    ]);
    const packedHandshake = (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([constants_1.SUPPORTED_RECORD_TYPE_MAP.CLIENT_HELLO]),
        (0, packets_1.packWith3ByteLength)(handshakeData)
    ]);
    if (psk) {
        const { hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[psk.cipherSuite];
        const prefixHandshake = packedHandshake.slice(0, -hashLength - 3);
        const binder = await computeBinderSuffix(prefixHandshake, psk);
        packedHandshake.set(binder, packedHandshake.length - binder.length);
    }
    return packedHandshake;
}
exports.packClientHello = packClientHello;
async function computeBinderSuffix(packedHandshakePrefix, psk) {
    const { hashAlgorithm } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[psk.cipherSuite];
    const hashedHelloHandshake = await (0, decryption_utils_1.getHash)([packedHandshakePrefix], psk.cipherSuite);
    return crypto_1.crypto.hmac(hashAlgorithm, psk.finishKey, hashedHelloHandshake);
}
exports.computeBinderSuffix = computeBinderSuffix;
/**
 * Packs the preshared key extension; the binder is assumed to be 0
 * The empty binder is suffixed to the end of the extension
 * and should be replaced with the correct binder after the full handshake is computed
 */
function packPresharedKeyExtension({ identity, ticketAge, cipherSuite }) {
    const binderLength = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite].hashLength;
    const packedIdentity = (0, packets_1.packWithLength)(identity);
    const packedTicketAge = new Uint8Array(4);
    const packedTicketAgeView = (0, generics_1.uint8ArrayToDataView)(packedTicketAge);
    packedTicketAgeView.setUint32(0, ticketAge);
    const serialisedIdentity = (0, generics_1.concatenateUint8Arrays)([
        packedIdentity,
        packedTicketAge
    ]);
    const identityPacked = (0, packets_1.packWithLength)(serialisedIdentity);
    const binderHolderBytes = new Uint8Array(binderLength + 2 + 1);
    const binderHolderBytesView = (0, generics_1.uint8ArrayToDataView)(binderHolderBytes);
    binderHolderBytesView.setUint16(0, binderLength + 1);
    binderHolderBytesView.setUint8(2, binderLength);
    const total = (0, generics_1.concatenateUint8Arrays)([
        identityPacked,
        // 2 bytes for binders
        // 1 byte for each binder length
        binderHolderBytes
    ]);
    const totalPacked = (0, packets_1.packWithLength)(total);
    const ext = new Uint8Array(2 + totalPacked.length);
    ext.set(totalPacked, 2);
    const extView = (0, generics_1.uint8ArrayToDataView)(ext);
    extView.setUint16(0, constants_1.SUPPORTED_EXTENSION_MAP.PRE_SHARED_KEY);
    return ext;
}
exports.packPresharedKeyExtension = packPresharedKeyExtension;
function packPresharedKeyModeExtension() {
    return packExtension({
        type: 'PRE_SHARED_KEY_MODE',
        data: new Uint8Array([0x00, 0x01]),
        lengthBytes: 1
    });
}
function packSessionTicketExtension() {
    return packExtension({
        type: 'SESSION_TICKET',
        data: new Uint8Array(),
    });
}
function packVersionsExtension(supportedVersions) {
    return packExtension({
        type: 'SUPPORTED_VERSIONS',
        data: (0, generics_1.concatenateUint8Arrays)(supportedVersions.map(v => constants_1.TLS_PROTOCOL_VERSION_MAP[v])),
        lengthBytes: 1
    });
}
function packSignatureAlgorithmsExtension(algs) {
    return packExtension({
        type: 'SIGNATURE_ALGS',
        data: (0, generics_1.concatenateUint8Arrays)(algs.map(v => constants_1.SUPPORTED_SIGNATURE_ALGS_MAP[v].identifier))
    });
}
function packSupportedGroupsExtension(namedCurves) {
    return packExtension({
        type: 'SUPPORTED_GROUPS',
        data: (0, generics_1.concatenateUint8Arrays)(namedCurves
            .map(n => constants_1.SUPPORTED_NAMED_CURVE_MAP[n].identifier))
    });
}
async function packKeyShareExtension(keys) {
    const buffs = [];
    for (const { key, type } of keys) {
        const exportedKey = await crypto_1.crypto.exportKey(key);
        buffs.push(constants_1.SUPPORTED_NAMED_CURVE_MAP[type].identifier, (0, packets_1.packWithLength)(exportedKey));
    }
    return packExtension({
        type: 'KEY_SHARE',
        data: (0, generics_1.concatenateUint8Arrays)(buffs)
    });
}
function packServerNameExtension(host) {
    return packExtension({
        type: 'SERVER_NAME',
        data: (0, generics_1.concatenateUint8Arrays)([
            // specify that this is a server hostname
            new Uint8Array([0x0]),
            // pack the remaining data prefixed with length
            (0, packets_1.packWithLength)((0, generics_1.strToUint8Array)(host))
        ])
    });
}
function packExtension({ type, data, lengthBytes }) {
    lengthBytes = lengthBytes || 2;
    let packed = data.length ? (0, packets_1.packWithLength)(data) : data;
    if (lengthBytes === 1) {
        packed = packed.slice(1);
    }
    // 2 bytes for type, 2 bytes for packed data length
    const result = new Uint8Array(2 + 2 + packed.length);
    const resultView = (0, generics_1.uint8ArrayToDataView)(result);
    resultView.setUint8(1, constants_1.SUPPORTED_EXTENSION_MAP[type]);
    resultView.setUint16(2, packed.length);
    result.set(packed, 4);
    return result;
}
