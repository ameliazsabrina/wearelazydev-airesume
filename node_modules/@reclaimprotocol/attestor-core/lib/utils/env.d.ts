export type TransportType = 'node' | 'react-native' | 'browser';
export declare function detectEnvironment(): TransportType;
export declare function getEnvVariable(name: string): string | undefined;
