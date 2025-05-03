import { ProviderName, ProviderParams } from '../types';
export declare function assertValidateProviderParams<T extends ProviderName>(name: T, params: unknown): asserts params is ProviderParams<T>;
