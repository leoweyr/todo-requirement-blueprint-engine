import { Edge } from '@todo-requirement-blueprint/domain';
import { EdgeEvolutionReason } from '@todo-requirement-blueprint/domain';
import { EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';
import { NodeStatus } from '@todo-requirement-blueprint/domain';

import { type BlueprintRegistry } from '../registry';
import { type SerializedBlueprint, type SerializedEdge, type SerializedEdgeHistory, type SerializedNode } from './';


export class BlueprintObjectAssembler {
    public static async processBlueprint(
        blueprintData: SerializedBlueprint,
        registry: BlueprintRegistry,
        overwrite: boolean,
        anchorMap: Map<string, string>
    ): Promise<void> {
        if (blueprintData.node_statuses) {
            for (const nodeStatusEntry of Object.entries(
                blueprintData.node_statuses
            )) {
                const typedNodeStatusEntry: [string, { name: string; description: string; metadata?: Record<string, unknown> }] = nodeStatusEntry;
                const key: string = typedNodeStatusEntry[0];
                const value: { name: string; description: string; metadata?: Record<string, unknown> } = typedNodeStatusEntry[1];
                const statusName: string = value.name;
                const statusDescription: string = value.description;
                const statusMetadata: Record<string, unknown> | undefined = value.metadata;
                const anchorKey: string = `node_statuses.${key}`;
                const originalAnchor: string | undefined = anchorMap.get(anchorKey);

                if (overwrite || !registry.getNodeStatus(statusName)) {
                    const status: NodeStatus = new NodeStatus(statusName, statusDescription, statusMetadata, originalAnchor);
                    registry.registerNodeStatus(status, overwrite);
                } else {
                    const existingStatus: NodeStatus | undefined = registry.getNodeStatus(statusName);

                    if (existingStatus && !existingStatus.anchorName && originalAnchor) {
                        existingStatus.anchorName = originalAnchor;
                    }
                }
            }
        }

        if (blueprintData.edge_evolution_reasons) {
            for (const reasonEntry of Object.entries(
                blueprintData.edge_evolution_reasons
            )) {
                const typedReasonEntry: [string, { name: string; description: string; metadata?: Record<string, unknown> }] = reasonEntry;
                const key: string = typedReasonEntry[0];
                const value: { name: string; description: string; metadata?: Record<string, unknown> } = typedReasonEntry[1];
                const reasonName: string = value.name;
                const reasonDescription: string = value.description;
                const reasonMetadata: Record<string, unknown> | undefined = value.metadata;
                const anchorKey: string = `edge_evolution_reasons.${key}`;
                const originalAnchor: string | undefined = anchorMap.get(anchorKey);

                if (overwrite || !registry.getEdgeEvolutionReason(reasonName)) {
                    const reason: EdgeEvolutionReason = new EdgeEvolutionReason(
                        reasonName,
                        reasonDescription,
                        reasonMetadata,
                        originalAnchor
                    );

                    registry.registerEdgeEvolutionReason(reason, overwrite);
                } else {
                    const existingReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(reasonName);

                    if (existingReason && !existingReason.anchorName && originalAnchor) {
                        existingReason.anchorName = originalAnchor;
                    }
                }
            }
        }

        if (blueprintData.nodes) {
            await BlueprintObjectAssembler.processNodes(blueprintData.nodes, registry, overwrite);
        }
    }

    public static async processNodes(
        nodesData: SerializedNode[],
        registry: BlueprintRegistry,
        overwrite: boolean
    ): Promise<void> {
        for (const serializedNode of nodesData) {
            const typedSerializedNode: SerializedNode = serializedNode;
            const nodeData: SerializedNode = typedSerializedNode;
            let nodeStatus: NodeStatus | undefined = registry.getNodeStatus(nodeData.status.name);

            if (!nodeStatus || overwrite) {
                nodeStatus = new NodeStatus(
                    nodeData.status.name,
                    nodeData.status.description,
                    nodeData.status.metadata
                );

                registry.registerNodeStatus(nodeStatus, overwrite);
            }

            const node: Node = new Node(
                nodeData.id,
                nodeData.description,
                nodeData.version,
                nodeData.updated_at,
                nodeStatus,
                nodeData.metadata || {}
            );

            registry.registerNode(node, overwrite);
        }

        for (const serializedNode of nodesData) {
            const typedSerializedNode: SerializedNode = serializedNode;
            const nodeData: SerializedNode = typedSerializedNode;
            const node: Node | undefined = registry.getNode(nodeData.id);

            if (node && nodeData.edges) {
                nodeData.edges.forEach((edgeData: SerializedEdge): void => {
                    const history: EdgeHistoryRecord[] = edgeData.history.map(
                        (historyRecord: SerializedEdgeHistory): EdgeHistoryRecord => {
                            const upstream: Node | undefined = registry.getNode(historyRecord.target_upstream_id);

                            if (!upstream) {
                                throw new Error(
                                    `Upstream node '${historyRecord.target_upstream_id}' not found in registry. Ensure it is loaded before parsing '${nodeData.id}'.`
                                );
                            }

                            let evolutionReason: EdgeEvolutionReason | undefined =
                                registry.getEdgeEvolutionReason(historyRecord.evolution_reason.name);

                            if (!evolutionReason) {
                                evolutionReason = new EdgeEvolutionReason(
                                    historyRecord.evolution_reason.name,
                                    historyRecord.evolution_reason.description,
                                    historyRecord.evolution_reason.metadata
                                );

                                registry.registerEdgeEvolutionReason(evolutionReason);
                            }

                            return new EdgeHistoryRecord(
                                historyRecord.version,
                                historyRecord.updated_at,
                                historyRecord.type,
                                historyRecord.status,
                                upstream,
                                evolutionReason
                            );
                        }
                    );

                    const edge: Edge = new Edge(edgeData.id, edgeData.demand_description, history);

                    node.addEdge(edge);
                });
            }
        }
    }
}
