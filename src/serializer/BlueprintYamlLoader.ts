import yaml from 'js-yaml';


export class BlueprintYamlLoader {
    public static parse(yamlString: string): unknown {
        try {
            return yaml.load(yamlString, { schema: yaml.JSON_SCHEMA });
        } catch (error: unknown) {
            throw new Error(`YAML Parse Error: ${(error as Error).message}`);
        }
    }
}
