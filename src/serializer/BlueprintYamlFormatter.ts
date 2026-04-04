export class BlueprintYamlFormatter {
    public static formatSpacing(yamlString: string): string {
        const lines: string[] = yamlString.split('\n');
        const result: string[] = [];
        let currentSection: string | null = null;
        let previousLineWasContent: boolean = false;

        for (let index: number = 0; index < lines.length; index++) {
            const line: string = lines[index];

            if (line.match(/^node_statuses:\s*$/)) {
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'node_statuses';
                previousLineWasContent = false;
                continue;
            }

            if (line.match(/^edge_evolution_reasons:\s*$/)) {
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'edge_evolution_reasons';
                previousLineWasContent = false;
                continue;
            }

            if (line.match(/^nodes:\s*$/)) {
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'nodes';
                previousLineWasContent = false;
                continue;
            }

            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                if (line.match(/^  [a-zA-Z0-9_-]+:/)) {
                    if (previousLineWasContent) {
                        result.push('');
                    }

                    result.push(line);
                    previousLineWasContent = true;

                    continue;
                }
            } else if (currentSection === 'nodes') {
                if (line.match(/^  - id:/)) {
                    if (previousLineWasContent) {
                        result.push('');
                    }

                    result.push(line);
                    previousLineWasContent = true;
                    continue;
                }
            }

            if (line.trim() !== '') {
                previousLineWasContent = true;
            }

            result.push(line);
        }

        return result.join('\n');
    }
}
