"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFinishTls12 = exports.packClientFinishTls12 = exports.packFinishMessagePacket = exports.verifyFinishMessage = void 0;
const crypto_1 = require("../crypto");
const decryption_utils_1 = require("../utils/decryption-utils");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
async function verifyFinishMessage(verifyData, opts) {
    const computedData = await computeFinishMessageHash(opts);
    if (!(0, generics_1.areUint8ArraysEqual)(computedData, verifyData)) {
        throw new Error('Invalid finish message');
    }
}
exports.verifyFinishMessage = verifyFinishMessage;
async function packFinishMessagePacket(opts) {
    const hash = await computeFinishMessageHash(opts);
    const packet = (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([constants_1.SUPPORTED_RECORD_TYPE_MAP.FINISHED, 0x00]),
        (0, packets_1.packWithLength)(hash)
    ]);
    return packet;
}
exports.packFinishMessagePacket = packFinishMessagePacket;
async function computeFinishMessageHash({ secret, handshakeMessages, cipherSuite }) {
    const { hashAlgorithm, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const handshakeHash = await (0, decryption_utils_1.getHash)(handshakeMessages, cipherSuite);
    const finishKey = await (0, decryption_utils_1.hkdfExtractAndExpandLabel)(hashAlgorithm, secret, 'finished', new Uint8Array(0), hashLength);
    const hmacKey = await crypto_1.crypto.importKey(hashAlgorithm, finishKey);
    return crypto_1.crypto.hmac(hashAlgorithm, hmacKey, handshakeHash);
}
const TLS12_CLIENT_FINISH_DATA_LABEL = (0, generics_1.strToUint8Array)('client finished');
const TLS12_SERVER_FINISH_DATA_LABEL = (0, generics_1.strToUint8Array)('server finished');
async function packClientFinishTls12(opts) {
    return (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([constants_1.SUPPORTED_RECORD_TYPE_MAP.FINISHED]),
        (0, packets_1.packWith3ByteLength)(await generateFinishTls12('client', opts))
    ]);
}
exports.packClientFinishTls12 = packClientFinishTls12;
async function generateFinishTls12(type, { secret, handshakeMessages, cipherSuite }) {
    // all key derivation in TLS 1.2 uses SHA-256
    const hashAlgorithm = (0, decryption_utils_1.getPrfHashAlgorithm)(cipherSuite);
    const handshakeHash = await crypto_1.crypto.hash(hashAlgorithm, (0, generics_1.concatenateUint8Arrays)(handshakeMessages));
    const seed = (0, generics_1.concatenateUint8Arrays)([
        type === 'client'
            ? TLS12_CLIENT_FINISH_DATA_LABEL
            : TLS12_SERVER_FINISH_DATA_LABEL,
        handshakeHash
    ]);
    const key = await crypto_1.crypto.importKey(hashAlgorithm, secret);
    const a1 = await crypto_1.crypto.hmac(hashAlgorithm, key, seed);
    const p1 = await crypto_1.crypto.hmac(hashAlgorithm, key, (0, generics_1.concatenateUint8Arrays)([a1, seed]));
    return p1.slice(0, 12);
}
exports.generateFinishTls12 = generateFinishTls12;
