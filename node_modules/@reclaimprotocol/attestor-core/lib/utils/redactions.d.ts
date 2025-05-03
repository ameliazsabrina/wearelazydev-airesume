import type { ArraySlice } from '../types';
export declare const REDACTION_CHAR = "*";
export declare const REDACTION_CHAR_CODE: number;
/**
 * Check if a redacted string is congruent with the original string.
 * @param redacted the redacted content, redacted content is replaced by '*'
 * @param original the original content
 */
export declare function isRedactionCongruent<T extends string | Uint8Array>(redacted: T, original: T): boolean;
/**
 * Is the string fully redacted?
 */
export declare function isFullyRedacted<T extends string | Uint8Array>(redacted: T): boolean;
/**
 * Given some plaintext blocks and a redaction function, return the blocks that
 * need to be revealed to the other party
 *
 * Use case: we get the response for a request in several blocks, and want to redact
 * pieces that go through multiple blocks. We can use this function to get the
 * blocks that need to be revealed to the other party
 *
 * @example if we received ["secret is 12","345","678. Thanks"]. We'd want
 * to redact the "12345678" and reveal the rest. We'd pass in the blocks and
 * the redact function will return the redactions, namely [10,19].
 * The function will return the blocks ["secret is **","***. Thanks"].
 * The middle block is fully redacted, so it's not returned
 *
 * @param blocks blocks to reveal
 * @param redact function that returns the redactions
 * @returns blocks to reveal
 */
export declare function getBlocksToReveal<T extends {
    plaintext: Uint8Array;
}>(blocks: T[], redact: (total: Uint8Array) => ArraySlice[]): {
    block: T;
    redactedPlaintext: Uint8Array;
}[] | "all";
/**
 * Redact the following slices from the total
 */
export declare function redactSlices(total: Uint8Array, slices: ArraySlice[]): Uint8Array;
