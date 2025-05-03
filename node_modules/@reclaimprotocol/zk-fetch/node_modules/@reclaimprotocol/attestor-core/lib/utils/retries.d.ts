import { Logger } from '../types';
type RetryLoopOptions = {
    maxRetries?: number;
    logger: Logger;
    shouldRetry: (error: Error) => boolean;
};
/**
 * Execute a function, and upon failure -- retry
 * based on specified options.
 */
export declare function executeWithRetries<T>(code: (attempt: number) => Promise<T>, { maxRetries, shouldRetry, logger, }: RetryLoopOptions): Promise<T>;
export {};
