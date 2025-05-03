"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptWrappedRecord = exports.decryptWrappedRecord = void 0;
const crypto_1 = require("../crypto");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
const AUTH_CIPHER_LENGTH = 12;
async function decryptWrappedRecord(encryptedData, opts) {
    if (!('recordHeader' in opts)) {
        throw new Error('recordHeader is required for decrypt');
    }
    const { key, recordNumber, cipherSuite, } = opts;
    const { cipher, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    return (0, generics_1.isSymmetricCipher)(cipher)
        ? doCipherDecrypt(cipher)
        : doAuthCipherDecrypt(cipher);
    async function doCipherDecrypt(cipher) {
        const iv = encryptedData.slice(0, 16);
        const ciphertext = encryptedData.slice(16);
        let plaintextAndMac = await crypto_1.crypto.decrypt(cipher, {
            key,
            iv,
            data: ciphertext,
        });
        plaintextAndMac = (0, generics_1.unpadTls)(plaintextAndMac);
        plaintextAndMac = plaintextAndMac.slice(0, -1);
        const mac = plaintextAndMac.slice(-hashLength);
        const plaintext = plaintextAndMac.slice(0, -hashLength);
        const macComputed = await computeMacTls12(plaintext, opts);
        if (!(0, generics_1.areUint8ArraysEqual)(mac, macComputed)) {
            throw new Error(`MAC mismatch: expected ${(0, generics_1.toHexStringWithWhitespace)(macComputed)}, got ${(0, generics_1.toHexStringWithWhitespace)(mac)}`);
        }
        return { plaintext, iv };
    }
    async function doAuthCipherDecrypt(cipher) {
        let iv = opts.iv;
        const recordIvLength = AUTH_CIPHER_LENGTH - iv.length;
        if (recordIvLength) {
            // const recordIv = new Uint8Array(recordIvLength)
            // const seqNumberView = uint8ArrayToDataView(recordIv)
            // seqNumberView.setUint32(recordIvLength - 4, recordNumber)
            const recordIv = encryptedData.slice(0, recordIvLength);
            encryptedData = encryptedData.slice(recordIvLength);
            iv = (0, generics_1.concatenateUint8Arrays)([
                iv,
                recordIv
            ]);
        }
        else if (
        // use IV generation alg for TLS 1.3
        // and ChaCha20-Poly1305
        (opts.version === 'TLS1_3'
            || cipher === 'CHACHA20-POLY1305') && typeof recordNumber !== 'undefined') {
            iv = (0, generics_1.generateIV)(iv, recordNumber);
        }
        const authTag = encryptedData.slice(-constants_1.AUTH_TAG_BYTE_LENGTH);
        encryptedData = encryptedData.slice(0, -constants_1.AUTH_TAG_BYTE_LENGTH);
        const aead = getAead(encryptedData.length, opts);
        const { plaintext } = await crypto_1.crypto.authenticatedDecrypt(cipher, {
            key,
            iv,
            data: encryptedData,
            aead,
            authTag,
        });
        if (plaintext.length !== encryptedData.length) {
            throw new Error('Decrypted length does not match encrypted length');
        }
        return { plaintext, iv };
    }
}
exports.decryptWrappedRecord = decryptWrappedRecord;
async function encryptWrappedRecord(plaintext, opts) {
    const { key, recordNumber, cipherSuite, } = opts;
    const { cipher } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    let iv = opts.iv;
    return (0, generics_1.isSymmetricCipher)(cipher)
        ? doSymmetricEncrypt(cipher)
        : doAuthSymmetricEncrypt(cipher);
    async function doAuthSymmetricEncrypt(cipher) {
        const aead = getAead(plaintext.length, opts);
        // record IV is the record number as a 64-bit big-endian integer
        const recordIvLength = AUTH_CIPHER_LENGTH - iv.length;
        let recordIv;
        let completeIv = iv;
        if (recordIvLength && typeof recordNumber !== 'undefined') {
            recordIv = new Uint8Array(recordIvLength);
            const seqNumberView = (0, generics_1.uint8ArrayToDataView)(recordIv);
            seqNumberView.setUint32(recordIvLength - 4, recordNumber);
            completeIv = (0, generics_1.concatenateUint8Arrays)([
                iv,
                recordIv
            ]);
        }
        else if (
        // use IV generation alg for TLS 1.3
        // and ChaCha20-Poly1305
        (opts.version === 'TLS1_3'
            || cipher === 'CHACHA20-POLY1305')
            && typeof recordNumber !== 'undefined') {
            completeIv = (0, generics_1.generateIV)(completeIv, recordNumber);
        }
        const enc = await crypto_1.crypto.authenticatedEncrypt(cipher, {
            key,
            iv: completeIv,
            data: plaintext,
            aead,
        });
        if (recordIv) {
            enc.ciphertext = (0, generics_1.concatenateUint8Arrays)([
                recordIv,
                enc.ciphertext,
            ]);
        }
        return {
            ciphertext: (0, generics_1.concatenateUint8Arrays)([
                enc.ciphertext,
                enc.authTag,
            ]),
            iv: completeIv
        };
    }
    async function doSymmetricEncrypt(cipher) {
        const blockSize = 16;
        iv = padBytes(opts.iv, 16).slice(0, 16);
        const mac = await computeMacTls12(plaintext, opts);
        const completeData = (0, generics_1.concatenateUint8Arrays)([
            plaintext,
            mac,
        ]);
        // add TLS's special padding :(
        const padded = (0, generics_1.padTls)(completeData, blockSize);
        const result = await crypto_1.crypto.encrypt(cipher, { key, iv, data: padded });
        return {
            ciphertext: (0, generics_1.concatenateUint8Arrays)([
                iv,
                result
            ]),
            iv,
        };
    }
    function padBytes(arr, len) {
        const returnVal = new Uint8Array(len);
        returnVal.set(arr, len - arr.length);
        return returnVal;
    }
}
exports.encryptWrappedRecord = encryptWrappedRecord;
function getAead(plaintextLength, opts) {
    const isTls13 = opts.version === 'TLS1_3';
    let aead;
    if (isTls13) {
        const dataLen = plaintextLength + constants_1.AUTH_TAG_BYTE_LENGTH;
        const recordHeader = 'recordHeaderOpts' in opts
            ? (0, packets_1.packPacketHeader)(dataLen, opts.recordHeaderOpts)
            : replaceRecordHeaderLen(opts.recordHeader, dataLen);
        aead = recordHeader;
    }
    else {
        aead = getTls12Header(plaintextLength, opts);
    }
    return aead;
}
function getTls12Header(plaintextLength, opts) {
    const { recordNumber } = opts;
    const recordHeader = 'recordHeaderOpts' in opts
        ? (0, packets_1.packPacketHeader)(plaintextLength, opts.recordHeaderOpts)
        : replaceRecordHeaderLen(opts.recordHeader, plaintextLength);
    const seqNumberBytes = new Uint8Array(8);
    const seqNumberView = (0, generics_1.uint8ArrayToDataView)(seqNumberBytes);
    seqNumberView.setUint32(4, recordNumber || 0);
    return (0, generics_1.concatenateUint8Arrays)([
        seqNumberBytes,
        recordHeader,
    ]);
}
async function computeMacTls12(plaintext, opts) {
    const { macKey, cipherSuite } = opts;
    if (!macKey) {
        throw new Error('macKey is required for non-AEAD cipher');
    }
    const { hashAlgorithm } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const dataToSign = (0, generics_1.concatenateUint8Arrays)([
        getTls12Header(plaintext.length, opts),
        plaintext,
    ]);
    const mac = await crypto_1.crypto.hmac(hashAlgorithm, macKey, dataToSign);
    return mac;
}
function replaceRecordHeaderLen(header, newLength) {
    const newRecordHeader = new Uint8Array(header);
    const dataView = (0, generics_1.uint8ArrayToDataView)(newRecordHeader);
    dataView.setUint16(3, newLength);
    return newRecordHeader;
}
