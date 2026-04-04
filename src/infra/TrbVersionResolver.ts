import { type BlueprintRegistry } from '../registry';


export class TrbVersionResolver {
    public static async fetchLatestVersionAndSchema(registry: BlueprintRegistry): Promise<void> {
        const response: Response = await fetch(
            'https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/refs/heads/master/README.md'
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch TRB Spec README for version check: ${response.status} ${response.statusText}`
            );
        }

        const text: string = await response.text();
        const match: RegExpMatchArray | null = text.match(/https:\/\/img\.shields\.io\/badge\/version-(v?[\d.]+)-blue\.svg/);

        if (!match || !match[1]) {
            throw new Error('Failed to parse TRB version from README badge.');
        }

        let latestVersion: string = match[1];

        if (!latestVersion.startsWith('v')) {
            latestVersion = `v${latestVersion}`;
        }

        if (registry.trbVersion === '') {
            registry.trbVersion = latestVersion;
        }

        if (registry.schema) {
            return;
        }

        const versionPath: string = registry.trbVersion.startsWith('v') ? registry.trbVersion : `v${registry.trbVersion}`;
        const schemaUrl: string = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;

        try {
            const schemaResponse: Response = await fetch(schemaUrl);

            if (schemaResponse.ok) {
                registry.schema = await schemaResponse.json();
            }
        } catch (error: unknown) {
            console.error('Failed to auto-fetch schema during init:', error);
        }
    }
}
