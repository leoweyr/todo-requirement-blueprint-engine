export class BlueprintVersionPolicy {
    public static resolveVersion(
        explicitVersion: string | undefined,
        yamlString: string,
        registryVersion: string,
        overwrite: boolean
    ): string {
        let resolvedVersion: string | undefined = explicitVersion;

        if (!resolvedVersion) {
            const schemaCommentMatch: RegExpMatchArray | null = yamlString.match(
                /#\s*yaml-language-server:\s*\$schema=.*\/schemas\/(v[\d.]+)\/trb\.schema\.json/
            );

            if (schemaCommentMatch && schemaCommentMatch[1]) {
                resolvedVersion = schemaCommentMatch[1];
            }
        }

        if (!resolvedVersion && overwrite && registryVersion) {
            resolvedVersion = registryVersion;
        }

        if (!resolvedVersion) {
            throw new Error(
                'TRB Schema version not provided and could not be inferred from YAML content (missing or invalid $schema).'
            );
        }

        return resolvedVersion;
    }

    public static isVersionCompatible(incomingVersion: string, currentVersion: string): boolean {
        const incomingVersionParts: string[] = incomingVersion.replace(/^v/, '').split('.');
        const currentVersionParts: string[] = currentVersion.replace(/^v/, '').split('.');

        if (incomingVersionParts.length < 1 || currentVersionParts.length < 1) {
            return true;
        }

        const incomingMajorVersion: number = parseInt(incomingVersionParts[0], 10);
        const currentMajorVersion: number = parseInt(currentVersionParts[0], 10);

        return incomingMajorVersion === currentMajorVersion;
    }

    public static buildSchemaUrl(version: string): string {
        const versionPath: string = version.startsWith('v') ? version : `v${version}`;

        return `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;
    }
}
