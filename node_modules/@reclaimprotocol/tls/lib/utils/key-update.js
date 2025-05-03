"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packKeyUpdateRecord = void 0;
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const packets_1 = require("./packets");
function packKeyUpdateRecord(type) {
    const encoded = (0, packets_1.packWithLength)(new Uint8Array([constants_1.KEY_UPDATE_TYPE_MAP[type]]));
    const packet = (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([
            constants_1.SUPPORTED_RECORD_TYPE_MAP.KEY_UPDATE,
            0x00,
        ]),
        encoded
    ]);
    return packet;
}
exports.packKeyUpdateRecord = packKeyUpdateRecord;
