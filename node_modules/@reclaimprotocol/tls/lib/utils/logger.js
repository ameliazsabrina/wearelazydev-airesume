"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    trace: () => { },
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};
