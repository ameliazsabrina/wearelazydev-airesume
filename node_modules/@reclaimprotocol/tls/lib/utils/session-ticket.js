"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPskFromTicket = exports.parseSessionTicket = void 0;
const crypto_1 = require("../crypto");
const decryption_utils_1 = require("../utils/decryption-utils");
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
function parseSessionTicket(data) {
    const lifetimeS = read(4).getUint32(0);
    const ticketAgeAddMs = read(4).getUint32(0);
    const nonce = readWLength(1);
    const ticket = readWLength(2);
    const extensions = readWLength(2);
    const sessionTicket = {
        ticket,
        lifetimeS,
        ticketAgeAddMs,
        nonce,
        expiresAt: new Date(Date.now() + lifetimeS * 1000),
        extensions
    };
    return sessionTicket;
    function read(bytes) {
        const result = data.slice(0, bytes);
        data = data.slice(bytes);
        return (0, generics_1.uint8ArrayToDataView)(result);
    }
    function readWLength(bytesLength = 2) {
        const content = (0, packets_1.expectReadWithLength)(data, bytesLength);
        data = data.slice(content.length + bytesLength);
        return content;
    }
}
exports.parseSessionTicket = parseSessionTicket;
async function getPskFromTicket(ticket, { masterKey, hellos, cipherSuite }) {
    const { hashAlgorithm, hashLength } = constants_1.SUPPORTED_CIPHER_SUITE_MAP[cipherSuite];
    const handshakeHash = await (0, decryption_utils_1.getHash)(hellos, cipherSuite);
    const resumeMasterSecret = await (0, decryption_utils_1.hkdfExtractAndExpandLabel)(hashAlgorithm, masterKey, 'res master', handshakeHash, hashLength);
    const psk = await (0, decryption_utils_1.hkdfExtractAndExpandLabel)(hashAlgorithm, resumeMasterSecret, 'resumption', ticket.nonce, hashLength);
    const emptyHash = await crypto_1.crypto.hash(hashAlgorithm, new Uint8Array());
    const earlySecret = await crypto_1.crypto.extract(hashAlgorithm, hashLength, psk, '');
    const binderKey = await (0, decryption_utils_1.hkdfExtractAndExpandLabel)(hashAlgorithm, earlySecret, 'res binder', emptyHash, hashLength);
    // const clientEarlyTrafficSecret = hkdfExtractAndExpandLabel(hashAlgorithm, earlySecret, 'c e traffic', new Uint8Array(), hashLength)
    const finishKey = await (0, decryption_utils_1.hkdfExtractAndExpandLabel)(hashAlgorithm, binderKey, 'finished', new Uint8Array(), hashLength);
    const ticketAge = Math.floor(ticket.lifetimeS / 1000 + ticket.ticketAgeAddMs);
    return {
        identity: ticket.ticket,
        ticketAge,
        finishKey: await crypto_1.crypto.importKey(hashAlgorithm, finishKey),
        resumeMasterSecret,
        earlySecret,
        cipherSuite,
    };
}
exports.getPskFromTicket = getPskFromTicket;
