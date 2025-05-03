export declare function generateTsFromYamlSchema(name: string, type: 'parameters' | 'secret-parameters'): Promise<{
    ts: string;
    schemaTitle: any;
    jsonTitle: string;
}>;
