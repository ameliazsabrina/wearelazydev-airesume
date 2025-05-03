import { RPCHandler, RPCType } from '../../types';
export declare const HANDLERS: {
    [T in RPCType]: RPCHandler<T>;
};
