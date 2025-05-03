"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrfHashAlgorithm = exports.getHash = exports.hkdfExtractAndExpandLabel = exports.deriveTrafficKeysForSide = exports.deriveTrafficKeys = exports.computeSharedKeys = exports.computeUpdatedTrafficMasterSecret = exports.computeSharedKeysTls12 = void 0;
const crypto_1 = require("../crypto");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
const TLS1_2_BASE_SEED = (0, generics_1.strToUint8Array)('master secret');
const TLS1_2_KEY_EXPANSION_SEED = (0, generics_1.strToUint8Array)('key expansion');
async function computeSharedKeysTls12(opts) {
    const { clientRandom, serverRandom, cipherSuite, } = opts;
    const masterSecret = await generateMasterSecret(opts);
    // all key derivation in TLS 1.2 uses SHA-256
    const hashAlgorithm = getPrfHashAlgorithm(cipherSuite);
    const { keyLength, cipher, hashLength, hashAlgorithm: cipherHashAlg, ivLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const masterKey = await crypto_1.crypto
        .importKey(hashAlgorithm, masterSecret);
    const seed = (0, generics_1.concatenateUint8Arrays)([
        TLS1_2_KEY_EXPANSION_SEED,
        serverRandom,
        clientRandom,
    ]);
    const expandedSecretArr = [];
    let lastSeed = seed;
    for (let i = 0; i < 4; i++) {
        lastSeed = await crypto_1.crypto.hmac(hashAlgorithm, masterKey, lastSeed);
        const expandedSecret = await crypto_1.crypto.hmac(hashAlgorithm, masterKey, (0, generics_1.concatenateUint8Arrays)([
            lastSeed,
            seed
        ]));
        expandedSecretArr.push(expandedSecret);
    }
    let expandedSecret = (0, generics_1.concatenateUint8Arrays)(expandedSecretArr);
    const needsMac = (0, generics_1.isSymmetricCipher)(cipher);
    const clientMacKey = needsMac ? await crypto_1.crypto.importKey(cipherHashAlg, readExpandedSecret(hashLength)) : undefined;
    const serverMacKey = needsMac ? await crypto_1.crypto.importKey(cipherHashAlg, readExpandedSecret(hashLength)) : undefined;
    const clientEncKey = await crypto_1.crypto.importKey(cipher, readExpandedSecret(keyLength));
    const serverEncKey = await crypto_1.crypto.importKey(cipher, readExpandedSecret(keyLength));
    const clientIv = readExpandedSecret(ivLength);
    const serverIv = readExpandedSecret(ivLength);
    return {
        type: 'TLS1_2',
        masterSecret,
        clientMacKey,
        serverMacKey,
        clientEncKey,
        serverEncKey,
        clientIv,
        serverIv,
        serverSecret: masterSecret,
        clientSecret: masterSecret,
    };
    function readExpandedSecret(len) {
        const returnVal = expandedSecret
            .slice(0, len);
        expandedSecret = expandedSecret
            .slice(len);
        return returnVal;
    }
}
exports.computeSharedKeysTls12 = computeSharedKeysTls12;
async function generateMasterSecret({ preMasterSecret, clientRandom, serverRandom, cipherSuite }) {
    // all key derivation in TLS 1.2 uses SHA-256
    const hashAlgorithm = getPrfHashAlgorithm(cipherSuite);
    const preMasterKey = await crypto_1.crypto
        .importKey(hashAlgorithm, preMasterSecret);
    const seed = (0, generics_1.concatenateUint8Arrays)([
        TLS1_2_BASE_SEED,
        clientRandom,
        serverRandom
    ]);
    const a1 = await crypto_1.crypto.hmac(hashAlgorithm, preMasterKey, seed);
    const a2 = await crypto_1.crypto.hmac(hashAlgorithm, preMasterKey, a1);
    const p1 = await crypto_1.crypto.hmac(hashAlgorithm, preMasterKey, (0, generics_1.concatenateUint8Arrays)([
        a1,
        seed
    ]));
    const p2 = await crypto_1.crypto.hmac(hashAlgorithm, preMasterKey, (0, generics_1.concatenateUint8Arrays)([
        a2,
        seed
    ]));
    return (0, generics_1.concatenateUint8Arrays)([p1, p2])
        .slice(0, 48);
}
function computeUpdatedTrafficMasterSecret(masterSecret, cipherSuite) {
    const { hashAlgorithm, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    return hkdfExtractAndExpandLabel(hashAlgorithm, masterSecret, 'traffic upd', new Uint8Array(), hashLength);
}
exports.computeUpdatedTrafficMasterSecret = computeUpdatedTrafficMasterSecret;
async function computeSharedKeys({ hellos, masterSecret: masterKey, cipherSuite, secretType, earlySecret }) {
    const { hashAlgorithm, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const emptyHash = await crypto_1.crypto.hash(hashAlgorithm, new Uint8Array());
    const zeros = new Uint8Array(hashLength);
    let handshakeTrafficSecret;
    if (secretType === 'hs') {
        // some hashes
        earlySecret = earlySecret
            || await crypto_1.crypto.extract(hashAlgorithm, hashLength, zeros, '');
        const derivedSecret = await hkdfExtractAndExpandLabel(hashAlgorithm, earlySecret, 'derived', emptyHash, hashLength);
        handshakeTrafficSecret = await crypto_1.crypto.extract(hashAlgorithm, hashLength, masterKey, derivedSecret);
    }
    else {
        const derivedSecret = await hkdfExtractAndExpandLabel(hashAlgorithm, masterKey, 'derived', emptyHash, hashLength);
        handshakeTrafficSecret = await crypto_1.crypto.extract(hashAlgorithm, hashLength, zeros, derivedSecret);
    }
    return deriveTrafficKeys({
        hellos,
        cipherSuite,
        masterSecret: handshakeTrafficSecret,
        secretType
    });
}
exports.computeSharedKeys = computeSharedKeys;
async function deriveTrafficKeys({ masterSecret, cipherSuite, hellos, secretType, }) {
    const { hashAlgorithm, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const handshakeHash = await getHash(hellos, cipherSuite);
    const clientSecret = await hkdfExtractAndExpandLabel(hashAlgorithm, masterSecret, `c ${secretType} traffic`, handshakeHash, hashLength);
    const serverSecret = await hkdfExtractAndExpandLabel(hashAlgorithm, masterSecret, `s ${secretType} traffic`, handshakeHash, hashLength);
    const { encKey: clientEncKey, iv: clientIv } = await deriveTrafficKeysForSide(clientSecret, cipherSuite);
    const { encKey: serverEncKey, iv: serverIv } = await deriveTrafficKeysForSide(serverSecret, cipherSuite);
    return {
        type: 'TLS1_3',
        masterSecret,
        clientSecret,
        serverSecret,
        clientEncKey,
        serverEncKey,
        clientIv,
        serverIv,
    };
}
exports.deriveTrafficKeys = deriveTrafficKeys;
async function deriveTrafficKeysForSide(masterSecret, cipherSuite) {
    const { hashAlgorithm, keyLength, cipher, ivLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const encKey = await hkdfExtractAndExpandLabel(hashAlgorithm, masterSecret, 'key', new Uint8Array(), keyLength);
    const iv = await hkdfExtractAndExpandLabel(hashAlgorithm, masterSecret, 'iv', new Uint8Array(0), ivLength);
    return {
        masterSecret,
        encKey: await crypto_1.crypto.importKey(cipher, encKey),
        iv
    };
}
exports.deriveTrafficKeysForSide = deriveTrafficKeysForSide;
async function hkdfExtractAndExpandLabel(algorithm, secret, label, context, length) {
    const tmpLabel = `tls13 ${label}`;
    const lengthBuffer = new Uint8Array(2);
    const lengthBufferView = (0, generics_1.uint8ArrayToDataView)(lengthBuffer);
    lengthBufferView.setUint16(0, length);
    const hkdfLabel = (0, generics_1.concatenateUint8Arrays)([
        lengthBuffer,
        (0, packets_1.packWithLength)((0, generics_1.strToUint8Array)(tmpLabel)).slice(1),
        (0, packets_1.packWithLength)(context).slice(1)
    ]);
    const key = await crypto_1.crypto.importKey(algorithm, secret);
    return crypto_1.crypto.expand(algorithm, length, key, length, hkdfLabel);
}
exports.hkdfExtractAndExpandLabel = hkdfExtractAndExpandLabel;
async function getHash(msgs, cipherSuite) {
    if (Array.isArray(msgs) && !(msgs instanceof Uint8Array)) {
        const { hashAlgorithm } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
        return crypto_1.crypto.hash(hashAlgorithm, (0, generics_1.concatenateUint8Arrays)(msgs));
    }
    return msgs;
}
exports.getHash = getHash;
/**
 * Get the PRF algorithm for the given cipher suite
 * Relevant for TLS 1.2
 */
function getPrfHashAlgorithm(cipherSuite) {
    const opts = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    // all key derivation in TLS 1.2 uses min SHA-256
    return ('prfHashAlgorithm' in opts)
        ? opts.prfHashAlgorithm
        : opts.hashAlgorithm;
}
exports.getPrfHashAlgorithm = getPrfHashAlgorithm;
