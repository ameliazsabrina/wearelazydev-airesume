"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMessageProcessor = exports.packWithLength = exports.expectReadWithLength = exports.readWithLength = exports.packWith3ByteLength = exports.packPacket = exports.packPacketHeader = void 0;
const constants_1 = require("./constants");
const generics_1 = require("./generics");
function packPacketHeader(dataLength, { type, version = 'TLS1_2' }) {
    const lengthBuffer = new Uint8Array(2);
    const dataView = (0, generics_1.uint8ArrayToDataView)(lengthBuffer);
    dataView.setUint16(0, dataLength);
    return (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([constants_1.PACKET_TYPE[type]]),
        constants_1.TLS_PROTOCOL_VERSION_MAP[version],
        lengthBuffer
    ]);
}
exports.packPacketHeader = packPacketHeader;
function packPacket(opts) {
    return (0, generics_1.concatenateUint8Arrays)([
        packPacketHeader(opts.data.length, opts),
        opts.data
    ]);
}
exports.packPacket = packPacket;
/**
 * Packs data prefixed with the length of the data;
 * Length encoded UInt24 big endian
 */
function packWith3ByteLength(data) {
    return (0, generics_1.concatenateUint8Arrays)([
        new Uint8Array([0x00]),
        packWithLength(data)
    ]);
}
exports.packWith3ByteLength = packWith3ByteLength;
function readWithLength(data, lengthBytes = 2) {
    const dataView = (0, generics_1.uint8ArrayToDataView)(data);
    const length = lengthBytes === 1
        ? dataView.getUint8(0)
        : dataView.getUint16(lengthBytes === 3 ? 1 : 0);
    if (data.length < lengthBytes + length) {
        return undefined;
    }
    return data.slice(lengthBytes, lengthBytes + length);
}
exports.readWithLength = readWithLength;
/**
 * Read a prefix of the data, that is prefixed with the length of
 * said data. Throws an error if the data is not long enough
 *
 * @param data total data to read from
 * @param lengthBytes number of bytes to read the length from.
 * Default is 2 bytes
 */
function expectReadWithLength(data, lengthBytes = 2) {
    const result = readWithLength(data, lengthBytes);
    if (!result) {
        throw new Error(`Expected packet to have at least ${data.length + lengthBytes} bytes, got ${data.length}`);
    }
    return result;
}
exports.expectReadWithLength = expectReadWithLength;
/**
 * Packs data prefixed with the length of the data;
 * Length encoded UInt16 big endian
 */
function packWithLength(data) {
    const buffer = new Uint8Array(2 + data.length);
    const dataView = (0, generics_1.uint8ArrayToDataView)(buffer);
    dataView.setUint16(0, data.length);
    buffer.set(data, 2);
    return buffer;
}
exports.packWithLength = packWithLength;
// const SUPPORTED_PROTO_VERSIONS = [
// 	LEGACY_PROTOCOL_VERSION,
// 	CURRENT_PROTOCOL_VERSION,
// ]
/**
 * Processes an incoming stream of TLS packets
 */
function makeMessageProcessor(logger) {
    let currentMessageType = undefined;
    let currentMessageHeader = undefined;
    let buffer = new Uint8Array(0);
    let bytesLeft = 0;
    return {
        getPendingBuffer() {
            return buffer;
        },
        /**
         * @param packet TLS packet;
         * can be multiple packets concatenated
         * or incomplete packet
         * or a single packet
         * @param onChunk handle a complete packet
         */
        onData(packet, onChunk) {
            buffer = (0, generics_1.concatenateUint8Arrays)([buffer, packet]);
            while (buffer.length) {
                // if we already aren't processing a packet
                // this is the first byte
                if (!currentMessageType) {
                    if (buffer.length < 5) {
                        // we don't have enough bytes to process the header
                        // wait for more bytes
                        break;
                    }
                    // bytes[0] tells us which packet type we're processing
                    // bytes[1:2] tell us the protocol version
                    // bytes[3:4] tell us the length of the packet
                    const packTypeNum = buffer[0];
                    currentMessageType = packTypeNum;
                    // get the number of bytes we need to process
                    // to complete the packet
                    const buffDataView = (0, generics_1.uint8ArrayToDataView)(buffer);
                    bytesLeft = buffDataView.getUint16(3);
                    currentMessageHeader = buffer.slice(0, 5);
                    // const protoVersion = currentMessageHeader.slice(1, 3)
                    // const isSupportedVersion = SUPPORTED_PROTO_VERSIONS
                    // 	.some((v) => areUint8ArraysEqual(v, protoVersion))
                    // if(!isSupportedVersion) {
                    // 	throw new Error(`Unsupported protocol version (${protoVersion})`)
                    // }
                    // remove the packet header
                    buffer = buffer.slice(5);
                    logger.trace({ bytesLeft, type: currentMessageType }, 'starting processing packet');
                }
                if (buffer.length < bytesLeft) {
                    // we don't have enough bytes to process the packet
                    // wait for more bytes
                    break;
                }
                const body = buffer.slice(0, bytesLeft);
                logger.trace({ type: currentMessageType }, 'got complete packet');
                onChunk(currentMessageType, {
                    header: currentMessageHeader,
                    content: body
                });
                currentMessageType = undefined;
                // if the current chunk we have still has bytes left
                // then that means we have another packet in the chunk
                // this will be processed in the next iteration of the loop
                buffer = buffer.slice(body.length);
            }
        },
        reset() {
            currentMessageType = undefined;
            currentMessageHeader = undefined;
            buffer = new Uint8Array(0);
            bytesLeft = 0;
        }
    };
}
exports.makeMessageProcessor = makeMessageProcessor;
