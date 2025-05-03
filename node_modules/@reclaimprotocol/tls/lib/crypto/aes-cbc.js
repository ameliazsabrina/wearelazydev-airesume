"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptAesCbc = void 0;
/**
 * Temporary solution for AES-CBC decryption
 */
const crypto_1 = require("crypto");
const generics_1 = require("../utils/generics");
function decryptAesCbc(key, iv, buf) {
    const cipherName = key.length === 16 ? 'aes-128-cbc' : 'aes-256-cbc';
    const cipher = (0, crypto_1.createDecipheriv)(cipherName, key, iv);
    cipher.setAutoPadding(false);
    return (0, generics_1.concatenateUint8Arrays)([
        cipher.update(buf),
        cipher.final()
    ]);
}
exports.decryptAesCbc = decryptAesCbc;
