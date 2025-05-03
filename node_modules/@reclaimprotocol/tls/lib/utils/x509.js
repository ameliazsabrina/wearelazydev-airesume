"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadX509FromDer = exports.loadX509FromPem = void 0;
const peculiar = __importStar(require("@peculiar/x509"));
const x509_1 = require("@peculiar/x509");
const webcrypto_1 = require("./webcrypto");
peculiar.cryptoProvider.set(webcrypto_1.webcrypto);
function loadX509FromPem(pem) {
    let cert;
    try {
        cert = new peculiar.X509Certificate(pem);
    }
    catch (e) {
        throw new Error(`Unsupported certificate: ${e}`);
    }
    return {
        internal: cert,
        isWithinValidity() {
            const now = new Date();
            return now > cert.notBefore && now < cert.notAfter;
        },
        getSubjectField(name) {
            return cert.subjectName.getField(name);
        },
        getAlternativeDNSNames() {
            //search for names in SubjectAlternativeNameExtension
            const ext = cert.extensions.find(e => e.type === '2.5.29.17'); //subjectAltName
            if (ext instanceof x509_1.SubjectAlternativeNameExtension) {
                return ext.names.items.filter(n => n.type === 'dns').map(n => n.value);
            }
            return [];
        },
        isIssuer({ internal: ofCert }) {
            var i = ofCert.issuer;
            var s = cert.subject;
            return i === s;
        },
        getPublicKeyAlgorithm() {
            return cert.publicKey.algorithm;
        },
        getPublicKey() {
            return new Uint8Array(cert.publicKey.rawData);
        },
        verifyIssued(otherCert) {
            return otherCert.internal.verify({
                publicKey: cert.publicKey
            });
        },
        serialiseToPem() {
            return cert.toString('pem');
        },
    };
}
exports.loadX509FromPem = loadX509FromPem;
function loadX509FromDer(der) {
    // const PEM_PREFIX = '-----BEGIN CERTIFICATE-----\n'
    // const PEM_POSTFIX = '-----END CERTIFICATE-----'
    // const splitText = der.toString('base64').match(/.{0,64}/g)!.join('\n')
    // const pem = `${PEM_PREFIX}${splitText}${PEM_POSTFIX}`
    return loadX509FromPem(der);
}
exports.loadX509FromDer = loadX509FromDer;
