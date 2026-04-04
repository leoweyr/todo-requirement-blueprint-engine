import { type BlueprintRegistry } from '../registry';
import { BlueprintVersionPolicy } from '../serializer';


export class BlueprintSchemaProvider {
    public static async resolveSchema(
        registry: BlueprintRegistry,
        targetVersion: string,
        overwrite: boolean
    ): Promise<unknown> {
        let schema: unknown = registry.schema;
        const shouldFetch: boolean = !schema || (registry.trbVersion !== targetVersion && !overwrite);

        if (!shouldFetch) {
            return schema;
        }

        const schemaUrl: string = BlueprintVersionPolicy.buildSchemaUrl(targetVersion);
        const response: Response = await fetch(schemaUrl);

        if (!response.ok) {
            throw new Error(
                `Remote schema not found or inaccessible: ${schemaUrl} (${response.status} ${response.statusText})`
            );
        }

        schema = await response.json();
        registry.schema = schema;

        return schema;
    }
}
