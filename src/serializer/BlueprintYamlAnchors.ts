export class BlueprintYamlAnchors {
    public static extractAnchorNames(yamlString: string): Map<string, string> {
        const anchorMap: Map<string, string> = new Map<string, string>();
        const lines: string[] = yamlString.split('\n');
        let currentSection: string | null = null;

        for (const line of lines) {
            const typedLine: string = line;
            if (typedLine.match(/^node_statuses:\s*$/)) {
                currentSection = 'node_statuses';
                continue;
            }

            if (typedLine.match(/^edge_evolution_reasons:\s*$/)) {
                currentSection = 'edge_evolution_reasons';
                continue;
            }

            if (typedLine.match(/^nodes:\s*$/)) {
                currentSection = 'nodes';
                continue;
            }

            if (typedLine.match(/^[a-z_]+:\s*$/)) {
                currentSection = null;
                continue;
            }

            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                const anchorMatch: RegExpMatchArray | null = typedLine.match(/^  ([A-Z0-9_]+):\s*&(\S+)/);

                if (anchorMatch) {
                    const key: string = anchorMatch[1];
                    const anchor: string = anchorMatch[2];
                    const mapKey: string = `${currentSection}.${key}`;

                    anchorMap.set(mapKey, anchor);
                }
            }
        }

        return anchorMap;
    }

    public static postProcessYamlAnchors(
        yamlString: string,
        statusAnchorMap: Map<string, string>,
        reasonAnchorMap: Map<string, string>
    ): string {
        const anchorDefinitionRegex: RegExp = /^  ([a-zA-Z0-9_-]+):\s*&(ref_\d+)/gm;
        const replacements: Map<string, string> = new Map<string, string>();
        let match: RegExpExecArray | null = null;

        while ((match = anchorDefinitionRegex.exec(yamlString)) !== null) {
            const key: string = match[1];
            const ref: string = match[2];
            let targetAnchor: string | undefined = statusAnchorMap.get(key);

            if (!targetAnchor) {
                targetAnchor = reasonAnchorMap.get(key);
            }

            if (targetAnchor) {
                replacements.set(ref, targetAnchor);
            }
        }

        let result: string = yamlString;
        const sortedRefs: string[] = Array.from(replacements.keys()).sort(
            (referenceA: string, referenceB: string): number => referenceB.length - referenceA.length
        );

        for (const reference of sortedRefs) {
            const typedReference: string = reference;
            const newName: string = replacements.get(typedReference)!;
            result = result.replace(new RegExp(`&${typedReference}\\b`, 'g'), `&${newName}`);
            result = result.replace(new RegExp(`\\*${typedReference}\\b`, 'g'), `*${newName}`);
        }

        return result;
    }
}
