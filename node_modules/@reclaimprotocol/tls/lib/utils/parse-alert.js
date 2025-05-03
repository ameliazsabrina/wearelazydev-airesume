"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTlsAlert = void 0;
const constants_1 = require("./constants");
const generics_1 = require("./generics");
const ALERT_LEVEL_ENTRIES = Object
    .entries(constants_1.ALERT_LEVEL);
const ALERT_DESCRIPTION_ENTRIES = Object
    .entries(constants_1.ALERT_DESCRIPTION);
/**
 * Parse a TLS alert message
 */
function parseTlsAlert(buffer) {
    const view = (0, generics_1.uint8ArrayToDataView)(buffer);
    const level = view.getUint8(0);
    const description = view.getUint8(1);
    const levelStr = ALERT_LEVEL_ENTRIES
        .find(([, value]) => value === level)?.[0];
    if (!levelStr) {
        throw new Error(`Unknown alert level ${level}`);
    }
    const descriptionStr = ALERT_DESCRIPTION_ENTRIES
        .find(([, value]) => value === description)?.[0];
    if (!descriptionStr) {
        throw new Error(`Unknown alert description ${description}`);
    }
    return {
        level: levelStr,
        description: descriptionStr
    };
}
exports.parseTlsAlert = parseTlsAlert;
