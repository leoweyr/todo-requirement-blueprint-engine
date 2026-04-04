import yaml from 'js-yaml';
import { Edge } from '@todo-requirement-blueprint/domain';
import { EdgeEvolutionReason } from '@todo-requirement-blueprint/domain';
import { EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';
import { NodeStatus } from '@todo-requirement-blueprint/domain';

import { type BlueprintRegistry } from '../registry';
import { type SerializedBlueprint, type SerializedEdge, type SerializedEdgeHistory, type SerializedNode } from './';


export class BlueprintYamlEmitter {
    public static buildSerializableBlueprint(
        registry: BlueprintRegistry
    ): {
        serializedBlueprint: SerializedBlueprint;
        statusAnchorMap: Map<string, string>;
        reasonAnchorMap: Map<string, string>;
    } {
        const nodeList: Node[] = registry.allNodes;
        const currentVersion: string = registry.trbVersion;
        const versionNumber: string = currentVersion.replace(/^v/, '');
        const versionParts: string[] = versionNumber.split('.');
        const major: number = parseInt(versionParts[0], 10);
        const minor: number = parseInt(versionParts[1], 10);
        const supportsEnumMetadata: boolean = (major > 1) || (major === 1 && minor >= 1);
        const plainDefinitionsStatus: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};
        const plainDefinitionsReason: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};
        const statusAnchorMap: Map<string, string> = new Map<string, string>();
        const reasonAnchorMap: Map<string, string> = new Map<string, string>();

        const getStatusDefinition: (item: NodeStatus) => { name: string; description: string; metadata?: Record<string, unknown> } = (
            item: NodeStatus
        ): { name: string; description: string; metadata?: Record<string, unknown> } => {
            if (!plainDefinitionsStatus[item.name]) {
                const statusObject: { name: string; description: string; metadata?: Record<string, unknown> } = item.toObject();

                if (!supportsEnumMetadata) {
                    delete statusObject.metadata;
                }

                plainDefinitionsStatus[item.name] = statusObject;
                const anchorName: string = item.anchorName || `ref_node_status_${item.name.toLowerCase()}`;
                statusAnchorMap.set(item.name, anchorName);
            }

            return plainDefinitionsStatus[item.name];
        };

        const getReasonDefinition: (item: EdgeEvolutionReason) => { name: string; description: string; metadata?: Record<string, unknown> } = (
            item: EdgeEvolutionReason
        ): { name: string; description: string; metadata?: Record<string, unknown> } => {
            if (!plainDefinitionsReason[item.name]) {
                const reasonObject: { name: string; description: string; metadata?: Record<string, unknown> } = item.toObject();

                if (!supportsEnumMetadata) {
                    delete reasonObject.metadata;
                }

                plainDefinitionsReason[item.name] = reasonObject;
                const anchorName: string = item.anchorName || `ref_edge_evolution_reason_${item.name.toLowerCase()}`;
                reasonAnchorMap.set(item.name, anchorName);
            }

            return plainDefinitionsReason[item.name];
        };

        registry.allNodeStatuses.forEach((status: NodeStatus): void => {
            getStatusDefinition(status);
        });

        registry.allEdgeEvolutionReasons.forEach((reason: EdgeEvolutionReason): void => {
            getReasonDefinition(reason);
        });

        const serializedNodes: SerializedNode[] = nodeList.map((node: Node): SerializedNode => {
            const nodeObject: SerializedNode = node.toObject();

            if (node.status) {
                nodeObject.status = getStatusDefinition(node.status);
            }

            if (nodeObject.edges) {
                nodeObject.edges.forEach((edge: SerializedEdge, edgeIndex: number): void => {
                    const domainEdge: Edge = node.edges[edgeIndex];

                    if (domainEdge) {
                        edge.history.forEach((historyRecord: SerializedEdgeHistory, historyIndex: number): void => {
                            const domainHistoryRecord: EdgeHistoryRecord = domainEdge.history[historyIndex];

                            if (domainHistoryRecord && domainHistoryRecord.evolutionReason) {
                                historyRecord.evolution_reason = getReasonDefinition(domainHistoryRecord.evolutionReason);
                            }
                        });
                    }
                });
            }

            return nodeObject;
        });

        return {
            serializedBlueprint: {
                node_statuses: Object.keys(plainDefinitionsStatus).length > 0 ? plainDefinitionsStatus : undefined,
                edge_evolution_reasons: Object.keys(plainDefinitionsReason).length > 0 ? plainDefinitionsReason : undefined,
                nodes: serializedNodes
            },
            statusAnchorMap,
            reasonAnchorMap
        };
    }

    public static emitYaml(serializedBlueprint: SerializedBlueprint): string {
        return yaml.dump(serializedBlueprint, { noRefs: false });
    }
}
