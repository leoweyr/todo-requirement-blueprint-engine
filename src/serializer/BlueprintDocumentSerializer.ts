import { type BlueprintRegistry } from '../registry';
import { BlueprintSchemaProvider } from '../infra';
import {
    BlueprintObjectAssembler,
    BlueprintSchemaValidator,
    type BlueprintValidationResult,
    BlueprintVersionPolicy,
    BlueprintYamlAnchors,
    BlueprintYamlComments,
    BlueprintYamlEmitter,
    BlueprintYamlFormatter,
    BlueprintYamlLoader,
    BlueprintPayloadType,
    type SerializedBlueprint,
    type SerializedNode,
    type SerializedEdge
} from './';


export class BlueprintDocumentSerializer {
    public static async fromYaml(
        yamlString: string,
        registry: BlueprintRegistry,
        trbVersion?: string,
        blueprintName?: string,
        overwrite: boolean = false
    ): Promise<void> {
        if (blueprintName) {
            registry.blueprintName = blueprintName;
        }

        const anchorMap: Map<string, string> = BlueprintYamlAnchors.extractAnchorNames(yamlString);

        BlueprintYamlComments.extractInlineComments(yamlString, registry);

        const parsedData: unknown = BlueprintYamlLoader.parse(yamlString);
        const resolvedVersion: string = BlueprintVersionPolicy.resolveVersion(
            trbVersion,
            yamlString,
            registry.trbVersion,
            overwrite
        );

        if (
            overwrite &&
            registry.trbVersion &&
            resolvedVersion !== registry.trbVersion &&
            !BlueprintVersionPolicy.isVersionCompatible(resolvedVersion, registry.trbVersion)
        ) {
            throw new Error(
                `Incompatible Todo Requirement Blueprint versions. Current: ${registry.trbVersion}, Incoming: ${resolvedVersion}. Merge operation cancelled.`
            );
        }

        if (!overwrite || !registry.trbVersion) {
            registry.trbVersion = resolvedVersion;
        }

        const schema: unknown = await BlueprintSchemaProvider.resolveSchema(registry, resolvedVersion, overwrite);
        const validationResult: BlueprintValidationResult = BlueprintSchemaValidator.validateAndClassify(parsedData, schema);

        if (
            validationResult.payloadType === BlueprintPayloadType.FULL_BLUEPRINT ||
            validationResult.payloadType === BlueprintPayloadType.PARTIAL_DICTIONARIES
        ) {
            BlueprintDocumentSerializer._rememberBlueprintOrder(
                validationResult.blueprintData!,
                registry,
                validationResult.payloadType,
                overwrite
            );

            await BlueprintObjectAssembler.processBlueprint(
                validationResult.blueprintData!,
                registry,
                overwrite,
                anchorMap
            );

            return;
        }

        if (
            validationResult.payloadType === BlueprintPayloadType.NODE ||
            validationResult.payloadType === BlueprintPayloadType.NODE_ARRAY
        ) {
            BlueprintDocumentSerializer._rememberNodesOrder(
                validationResult.nodesData!,
                registry,
                overwrite
            );

            await BlueprintObjectAssembler.processNodes(validationResult.nodesData!, registry, overwrite);

            return;
        }

        throw new Error('Unknown content type. Clipboard data must be a valid Blueprint, Node List, Single Node, or Enum Dictionary.');
    }

    public static toYaml(registry: BlueprintRegistry): string {
        if (!registry.trbVersion) {
            throw new Error('TRB Schema version is not set in registry. Cannot serialize blueprint.');
        }

        const emittedBlueprintResult: {
            serializedBlueprint: Parameters<typeof BlueprintYamlEmitter.emitYaml>[0];
            statusAnchorMap: Map<string, string>;
            reasonAnchorMap: Map<string, string>;
        } = BlueprintYamlEmitter.buildSerializableBlueprint(registry);

        BlueprintDocumentSerializer._sortSerializedBlueprintByRememberedOrder(
            emittedBlueprintResult.serializedBlueprint,
            registry
        );

        const rawYaml: string = BlueprintYamlEmitter.emitYaml(emittedBlueprintResult.serializedBlueprint);

        const anchorProcessedYaml: string = BlueprintYamlAnchors.postProcessYamlAnchors(
            rawYaml,
            emittedBlueprintResult.statusAnchorMap,
            emittedBlueprintResult.reasonAnchorMap
        );

        const formattedYaml: string = BlueprintYamlFormatter.formatSpacing(anchorProcessedYaml);
        const commentedYaml: string = BlueprintYamlComments.restoreInlineComments(formattedYaml, registry);
        const schemaUrl: string = BlueprintVersionPolicy.buildSchemaUrl(registry.trbVersion);
        const header: string = `# yaml-language-server: $schema=${schemaUrl}\n\n\n`;

        return header + commentedYaml;
    }

    private static _rememberBlueprintOrder(
        blueprintData: SerializedBlueprint,
        registry: BlueprintRegistry,
        payloadType: BlueprintPayloadType,
        overwrite: boolean
    ): void {
        const isFullBlueprint: boolean = payloadType === BlueprintPayloadType.FULL_BLUEPRINT;

        if (isFullBlueprint && !overwrite) {
            registry.nodeStatusOrder = [];
            registry.edgeEvolutionReasonOrder = [];
            registry.nodeOrder = [];
        }

        if (blueprintData.node_statuses) {
            const statusKeys: string[] = [];

            for (const key in blueprintData.node_statuses) {
                if (Object.prototype.hasOwnProperty.call(blueprintData.node_statuses, key)) {
                    const statusName: string = blueprintData.node_statuses[key].name;
                    statusKeys.push(statusName);
                }
            }

            if (overwrite) {
                for (const statusName of statusKeys) {
                    if (registry.nodeStatusOrder.indexOf(statusName) === -1) {
                        registry.nodeStatusOrder.push(statusName);
                    }
                }
            } else {
                registry.nodeStatusOrder = statusKeys;
            }
        }

        if (blueprintData.edge_evolution_reasons) {
            const reasonKeys: string[] = [];

            for (const key in blueprintData.edge_evolution_reasons) {
                if (Object.prototype.hasOwnProperty.call(blueprintData.edge_evolution_reasons, key)) {
                    const reasonName: string = blueprintData.edge_evolution_reasons[key].name;
                    reasonKeys.push(reasonName);
                }
            }

            if (overwrite) {
                for (const reasonName of reasonKeys) {
                    if (registry.edgeEvolutionReasonOrder.indexOf(reasonName) === -1) {
                        registry.edgeEvolutionReasonOrder.push(reasonName);
                    }
                }
            } else {
                registry.edgeEvolutionReasonOrder = reasonKeys;
            }
        }

        if (blueprintData.nodes) {
            BlueprintDocumentSerializer._rememberNodesOrder(blueprintData.nodes, registry, overwrite);
        }
    }

    private static _rememberNodesOrder(
        nodesData: SerializedNode[],
        registry: BlueprintRegistry,
        overwrite: boolean
    ): void {
        for (const nodeData of nodesData) {
            const nodeId: string = nodeData.id;

            if (registry.nodeOrder.indexOf(nodeId) === -1) {
                registry.nodeOrder.push(nodeId);
            }

            if (nodeData.edges) {
                const edgeIds: string[] = nodeData.edges.map(
                    (edge: { id: string }): string => edge.id
                );

                const existingEdgeOrder: string[] | undefined = registry.getNodeEdgeOrder(nodeId);

                if (existingEdgeOrder && overwrite) {
                    for (const edgeId of edgeIds) {
                        if (existingEdgeOrder.indexOf(edgeId) === -1) {
                            existingEdgeOrder.push(edgeId);
                        }
                    }
                } else {
                    registry.setNodeEdgeOrder(nodeId, edgeIds);
                }
            }
        }
    }

    private static _sortSerializedBlueprintByRememberedOrder(
        serializedBlueprint: SerializedBlueprint,
        registry: BlueprintRegistry
    ): void {
        if (serializedBlueprint.node_statuses && registry.nodeStatusOrder.length > 0) {
            serializedBlueprint.node_statuses = BlueprintDocumentSerializer._sortStatusRecordByRememberedOrder(
                serializedBlueprint.node_statuses,
                registry.nodeStatusOrder
            );
        }

        if (serializedBlueprint.edge_evolution_reasons && registry.edgeEvolutionReasonOrder.length > 0) {
            serializedBlueprint.edge_evolution_reasons = BlueprintDocumentSerializer._sortReasonRecordByRememberedOrder(
                serializedBlueprint.edge_evolution_reasons,
                registry.edgeEvolutionReasonOrder
            );
        }

        if (serializedBlueprint.nodes && registry.nodeOrder.length > 0) {
            serializedBlueprint.nodes = BlueprintDocumentSerializer._sortArrayByRememberedOrder(
                serializedBlueprint.nodes,
                registry.nodeOrder,
                (node: SerializedNode): string => node.id
            );

            for (const node of serializedBlueprint.nodes) {
                const edgeOrder: string[] | undefined = registry.getNodeEdgeOrder(node.id);

                if (node.edges && edgeOrder && edgeOrder.length > 0) {
                    node.edges = BlueprintDocumentSerializer._sortEdgeArrayByRememberedOrder(
                        node.edges,
                        edgeOrder
                    );
                }
            }
        }
    }

    private static _sortStatusRecordByRememberedOrder(
        record: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }>,
        order: string[]
    ): Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> {
        const sortedRecord: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};
        const keyToRecordKey: Map<string, string> = new Map<string, string>();
        const recordKeys: string[] = [];

        for (const recordKey in record) {
            if (Object.prototype.hasOwnProperty.call(record, recordKey)) {
                const itemKey: string = record[recordKey].name;
                keyToRecordKey.set(itemKey, recordKey);
                recordKeys.push(recordKey);
            }
        }

        for (const itemKey of order) {
            const recordKey: string | undefined = keyToRecordKey.get(itemKey);

            if (recordKey !== undefined) {
                sortedRecord[recordKey] = record[recordKey];
            }
        }

        for (const recordKey of recordKeys) {
            const itemKey: string = record[recordKey].name;

            if (order.indexOf(itemKey) === -1) {
                sortedRecord[recordKey] = record[recordKey];
            }
        }

        return sortedRecord;
    }

    private static _sortReasonRecordByRememberedOrder(
        record: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }>,
        order: string[]
    ): Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> {
        const sortedRecord: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};
        const keyToRecordKey: Map<string, string> = new Map<string, string>();
        const recordKeys: string[] = [];

        for (const recordKey in record) {
            if (Object.prototype.hasOwnProperty.call(record, recordKey)) {
                const itemKey: string = record[recordKey].name;
                keyToRecordKey.set(itemKey, recordKey);
                recordKeys.push(recordKey);
            }
        }

        for (const itemKey of order) {
            const recordKey: string | undefined = keyToRecordKey.get(itemKey);

            if (recordKey !== undefined) {
                sortedRecord[recordKey] = record[recordKey];
            }
        }

        for (const recordKey of recordKeys) {
            const itemKey: string = record[recordKey].name;

            if (order.indexOf(itemKey) === -1) {
                sortedRecord[recordKey] = record[recordKey];
            }
        }

        return sortedRecord;
    }

    private static _sortArrayByRememberedOrder<T>(
        array: T[],
        order: string[],
        getId: (item: T) => string
    ): T[] {
        const sortedArray: T[] = [];
        const idToItem: Map<string, T> = new Map<string, T>();
        const allIds: string[] = [];

        for (const item of array) {
            const id: string = getId(item);
            idToItem.set(id, item);
            allIds.push(id);
        }

        for (const id of order) {
            const item: T | undefined = idToItem.get(id);

            if (item !== undefined) {
                sortedArray.push(item);
            }
        }

        for (const id of allIds) {
            if (order.indexOf(id) === -1) {
                const item: T | undefined = idToItem.get(id);

                if (item !== undefined) {
                    sortedArray.push(item);
                }
            }
        }

        return sortedArray;
    }

    private static _sortEdgeArrayByRememberedOrder(
        array: SerializedEdge[],
        order: string[]
    ): SerializedEdge[] {
        const sortedArray: SerializedEdge[] = [];
        const idToItem: Map<string, SerializedEdge> = new Map<string, SerializedEdge>();
        const allIds: string[] = [];

        for (const item of array) {
            const id: string = item.id;
            idToItem.set(id, item);
            allIds.push(id);
        }

        for (const id of order) {
            const item: SerializedEdge | undefined = idToItem.get(id);

            if (item !== undefined) {
                sortedArray.push(item);
            }
        }

        for (const id of allIds) {
            if (order.indexOf(id) === -1) {
                const item: SerializedEdge | undefined = idToItem.get(id);

                if (item !== undefined) {
                    sortedArray.push(item);
                }
            }
        }

        return sortedArray;
    }
}
