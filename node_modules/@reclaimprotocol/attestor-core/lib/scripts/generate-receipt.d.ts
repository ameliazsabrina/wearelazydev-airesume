import '../server/utils/config-env';
import { ProviderName, ProviderParams, ProviderSecretParams } from '..';
type ProviderReceiptGenerationParams<P extends ProviderName> = {
    name: P;
    params: ProviderParams<P>;
    secretParams: ProviderSecretParams<P>;
};
export declare function main<T extends ProviderName>(receiptParams?: ProviderReceiptGenerationParams<T>): Promise<void>;
export {};
