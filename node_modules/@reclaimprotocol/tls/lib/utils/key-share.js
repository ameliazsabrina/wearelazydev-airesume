"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processServerKeyShare = exports.packClientKeyShare = void 0;
const crypto_1 = require("../crypto");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
async function packClientKeyShare(publicKey) {
    return (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([
            constants_1.SUPPORTED_RECORD_TYPE_MAP['CLIENT_KEY_SHARE']
        ]),
        (0, packets_1.packWith3ByteLength)(
        // pack with 1 byte length
        (0, packets_1.packWithLength)(await crypto_1.crypto.exportKey(publicKey)).slice(1))
    ]);
}
exports.packClientKeyShare = packClientKeyShare;
async function processServerKeyShare(data) {
    const type = read(1)[0];
    if (type !== 0x03) {
        throw new Error('expected "named_group" key share');
    }
    const curveTypeBytes = read(2);
    const curveTypeEntry = Object.entries(constants_1.SUPPORTED_NAMED_CURVE_MAP)
        .find(([, { identifier }]) => (0, generics_1.areUint8ArraysEqual)(identifier, curveTypeBytes));
    if (!curveTypeEntry) {
        throw new Error(`unsupported curve type: ${curveTypeBytes}`);
    }
    const publicKeyType = curveTypeEntry[0];
    const publicKeyBytes = readWLength(1);
    const publicKey = await crypto_1.crypto.importKey(curveTypeEntry[1].algorithm, publicKeyBytes, 'public');
    const signatureTypeBytes = read(2);
    const signatureTypeEntry = Object.entries(constants_1.SUPPORTED_SIGNATURE_ALGS_MAP)
        .find(([, { identifier }]) => (0, generics_1.areUint8ArraysEqual)(identifier, signatureTypeBytes));
    if (!signatureTypeEntry) {
        throw new Error(`unsupported signature type: ${signatureTypeBytes}`);
    }
    const signatureAlgorithm = signatureTypeEntry[0];
    const signatureBytes = readWLength(2);
    return {
        publicKeyType,
        publicKey,
        signatureAlgorithm,
        signatureBytes,
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
exports.processServerKeyShare = processServerKeyShare;
