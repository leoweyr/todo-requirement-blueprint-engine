import { type BlueprintRegistry } from '../registry';


export class BlueprintYamlComments {
    public static extractInlineComments(yamlString: string, registry: BlueprintRegistry): void {
        const lines: string[] = yamlString.split('\n');
        let currentSection: string | null = null;
        let currentEnumKey: string | null = null;
        let currentNodeId: string | null = null;
        let currentEdgeId: string | null = null;

        for (const line of lines) {
            const typedLine: string = line;
            const comment: string | null = BlueprintYamlComments.extractCommentFromLine(typedLine);

            if (typedLine.match(/^node_statuses:/)) {
                currentSection = 'node_statuses';
                currentEnumKey = null;

                if (comment) {
                    registry.setYamlComment('node_statuses', comment);
                }

                continue;
            }

            if (typedLine.match(/^edge_evolution_reasons:/)) {
                currentSection = 'edge_evolution_reasons';
                currentEnumKey = null;

                if (comment) {
                    registry.setYamlComment('edge_evolution_reasons', comment);
                }

                continue;
            }

            if (typedLine.match(/^nodes:/)) {
                currentSection = 'nodes';
                currentNodeId = null;
                currentEdgeId = null;

                if (comment) {
                    registry.setYamlComment('nodes', comment);
                }

                continue;
            }

            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                const enumKeyMatch: RegExpMatchArray | null = typedLine.match(/^  ([a-zA-Z0-9_-]+):/);

                if (enumKeyMatch) {
                    currentEnumKey = enumKeyMatch[1];

                    if (comment) {
                        registry.setYamlComment(`${currentSection}.${currentEnumKey}`, comment);
                    }

                    continue;
                }

                if (currentEnumKey) {
                    const propertyMatch: RegExpMatchArray | null = typedLine.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (propertyMatch && comment) {
                        registry.setYamlComment(`${currentSection}.${currentEnumKey}.${propertyMatch[1]}`, comment);
                    }
                }
            } else if (currentSection === 'nodes') {
                const nodeIdMatch: RegExpMatchArray | null = typedLine.match(/^  - id:\s*(\S+)/);

                if (nodeIdMatch) {
                    currentNodeId = nodeIdMatch[1];
                    currentEdgeId = null;

                    if (comment) {
                        registry.setYamlComment(`nodes.${currentNodeId}`, comment);
                    }

                    continue;
                }

                if (currentNodeId) {
                    const nodePropertyMatch: RegExpMatchArray | null = typedLine.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (nodePropertyMatch) {
                        const propertyName: string = nodePropertyMatch[1];

                        if (propertyName === 'edges') {
                            currentEdgeId = null;
                        }

                        if (comment) {
                            registry.setYamlComment(`nodes.${currentNodeId}.${propertyName}`, comment);
                        }

                        continue;
                    }

                    const edgeIdMatch: RegExpMatchArray | null = typedLine.match(/^      - id:\s*(\S+)/);

                    if (edgeIdMatch) {
                        currentEdgeId = edgeIdMatch[1];

                        if (comment) {
                            registry.setYamlComment(`nodes.${currentNodeId}.edges.${currentEdgeId}`, comment);
                        }

                        continue;
                    }

                    if (currentEdgeId) {
                        const edgePropertyMatch: RegExpMatchArray | null = typedLine.match(/^        ([a-zA-Z0-9_-]+):/);

                        if (edgePropertyMatch) {
                            const propertyName: string = edgePropertyMatch[1];

                            if (comment) {
                                registry.setYamlComment(
                                    `nodes.${currentNodeId}.edges.${currentEdgeId}.${propertyName}`,
                                    comment
                                );
                            }

                            continue;
                        }

                        const historyMatch: RegExpMatchArray | null = typedLine.match(/^          - version:\s*(\S+)/);

                        if (historyMatch && comment) {
                            registry.setYamlComment(
                                `nodes.${currentNodeId}.edges.${currentEdgeId}.history.${historyMatch[1]}`,
                                comment
                            );
                        }
                    }
                }
            }
        }
    }

    public static restoreInlineComments(yamlString: string, registry: BlueprintRegistry): string {
        const lines: string[] = yamlString.split('\n');
        const result: string[] = [];
        let currentSection: string | null = null;
        let currentEnumKey: string | null = null;
        let currentNodeId: string | null = null;
        let currentEdgeId: string | null = null;

        for (const line of lines) {
            const typedLine: string = line;
            let outputLine: string = line;

            if (line.match(/^node_statuses:\s*$/)) {
                currentSection = 'node_statuses';
                currentEnumKey = null;
                const comment: string | undefined = registry.getYamlComment('node_statuses');

                if (comment) {
                    outputLine = BlueprintYamlComments.appendComment(line, comment);
                }

                result.push(outputLine);
                continue;
            }

            if (line.match(/^edge_evolution_reasons:\s*$/)) {
                currentSection = 'edge_evolution_reasons';
                currentEnumKey = null;
                const comment: string | undefined = registry.getYamlComment('edge_evolution_reasons');

                if (comment) {
                    outputLine = BlueprintYamlComments.appendComment(line, comment);
                }

                result.push(outputLine);
                continue;
            }

            if (line.match(/^nodes:\s*$/)) {
                currentSection = 'nodes';
                currentNodeId = null;
                currentEdgeId = null;
                const comment: string | undefined = registry.getYamlComment('nodes');

                if (comment) {
                    outputLine = BlueprintYamlComments.appendComment(line, comment);
                }

                result.push(outputLine);
                continue;
            }

            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                const enumKeyMatch: RegExpMatchArray | null = typedLine.match(/^  ([a-zA-Z0-9_-]+):/);

                if (enumKeyMatch) {
                    currentEnumKey = enumKeyMatch[1];
                    const comment: string | undefined = registry.getYamlComment(`${currentSection}.${currentEnumKey}`);

                    if (comment) {
                        outputLine = BlueprintYamlComments.appendComment(line, comment);
                    }

                    result.push(outputLine);
                    continue;
                }

                if (currentEnumKey) {
                    const propertyMatch: RegExpMatchArray | null = typedLine.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (propertyMatch) {
                        const comment: string | undefined = registry.getYamlComment(
                            `${currentSection}.${currentEnumKey}.${propertyMatch[1]}`
                        );

                        if (comment) {
                            outputLine = BlueprintYamlComments.appendComment(line, comment);
                        }
                    }
                }
            } else if (currentSection === 'nodes') {
                const nodeIdMatch: RegExpMatchArray | null = typedLine.match(/^  - id:\s*(\S+)/);

                if (nodeIdMatch) {
                    currentNodeId = nodeIdMatch[1];
                    currentEdgeId = null;
                    const comment: string | undefined = registry.getYamlComment(`nodes.${currentNodeId}`);

                    if (comment) {
                        outputLine = BlueprintYamlComments.appendComment(line, comment);
                    }

                    result.push(outputLine);

                    continue;
                }

                if (currentNodeId) {
                    const nodePropertyMatch: RegExpMatchArray | null = typedLine.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (nodePropertyMatch) {
                        const propertyName: string = nodePropertyMatch[1];

                        if (propertyName === 'edges') {
                            currentEdgeId = null;
                        }

                        const comment: string | undefined = registry.getYamlComment(`nodes.${currentNodeId}.${propertyName}`);

                        if (comment) {
                            outputLine = BlueprintYamlComments.appendComment(line, comment);
                        }

                        result.push(outputLine);

                        continue;
                    }

                    const edgeIdMatch: RegExpMatchArray | null = typedLine.match(/^      - id:\s*(\S+)/);

                    if (edgeIdMatch) {
                        currentEdgeId = edgeIdMatch[1];

                        const comment: string | undefined = registry.getYamlComment(
                            `nodes.${currentNodeId}.edges.${currentEdgeId}`
                        );

                        if (comment) {
                            outputLine = BlueprintYamlComments.appendComment(line, comment);
                        }

                        result.push(outputLine);

                        continue;
                    }

                    if (currentEdgeId) {
                        const edgePropertyMatch: RegExpMatchArray | null = typedLine.match(/^        ([a-zA-Z0-9_-]+):/);

                        if (edgePropertyMatch) {
                            const comment: string | undefined = registry.getYamlComment(
                                `nodes.${currentNodeId}.edges.${currentEdgeId}.${edgePropertyMatch[1]}`
                            );

                            if (comment) {
                                outputLine = BlueprintYamlComments.appendComment(line, comment);
                            }
                        }
                    }
                }
            }

            result.push(outputLine);
        }

        return result.join('\n');
    }

    private static extractCommentFromLine(line: string): string | null {
        const commentMatch: RegExpMatchArray | null = line.match(/\s+#\s*(.*)$/);

        if (!commentMatch) {
            return null;
        }

        if (commentMatch[1].startsWith('yaml-language-server:')) {
            return null;
        }

        return commentMatch[1].trim();
    }

    private static appendComment(line: string, comment: string): string {
        const trimmedLine: string = line.replace(/\s+$/, '');

        return `${trimmedLine}  # ${comment}`;
    }
}
