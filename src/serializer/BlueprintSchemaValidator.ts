import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import { type SerializedBlueprint, type SerializedNode, type BlueprintValidationResult, BlueprintPayloadType } from './';


export class BlueprintSchemaValidator {
    public static validateAndClassify(data: unknown, schema: unknown): BlueprintValidationResult {
        const jsonValidator: Ajv = new Ajv();

        addFormats(jsonValidator);

        const rootValidator: ValidateFunction = jsonValidator.compile(schema as object);
        const isFullBlueprint: boolean = BlueprintSchemaValidator._isFullBlueprint(data);
        const isPartialDictionaries: boolean = BlueprintSchemaValidator._isPartialDictionaries(data);
        const isNode: boolean = BlueprintSchemaValidator._isNode(data);
        const isNodeArray: boolean = BlueprintSchemaValidator._isNodeArray(data);

        if (isFullBlueprint) {
            if (!rootValidator(data)) {
                throw new Error(
                    `Schema Validation Error: ${BlueprintSchemaValidator._buildValidationError(rootValidator.errors ?? [])}`
                );
            }

            return {
                payloadType: BlueprintPayloadType.FULL_BLUEPRINT,
                blueprintData: data as SerializedBlueprint
            };
        }

        if (isPartialDictionaries) {
            const fakeBlueprint: unknown = { ...(data as object), nodes: [] };

            if (!rootValidator(fakeBlueprint)) {
                throw new Error(
                    `Dictionary Schema Validation Error: ${BlueprintSchemaValidator._buildValidationError(rootValidator.errors ?? [])}`
                );
            }

            return {
                payloadType: BlueprintPayloadType.PARTIAL_DICTIONARIES,
                blueprintData: { ...(data as SerializedBlueprint), nodes: [] }
            };
        }

        const nodeValidator: ValidateFunction = BlueprintSchemaValidator._buildNodeValidator(jsonValidator, schema);

        if (isNode) {
            if (!nodeValidator(data)) {
                throw new Error(
                    `Node Schema Validation Error: ${BlueprintSchemaValidator._buildValidationError(nodeValidator.errors ?? [])}`
                );
            }

            return {
                payloadType: BlueprintPayloadType.NODE,
                nodesData: [data as SerializedNode]
            };
        }

        if (isNodeArray) {
            const nodesList: SerializedNode[] = data as SerializedNode[];

            for (const nodeItem of nodesList) {
                const typedNodeItem: SerializedNode = nodeItem;
                if (!nodeValidator(typedNodeItem)) {
                    throw new Error(
                        `Node Array Schema Validation Error: ${BlueprintSchemaValidator._buildValidationError(nodeValidator.errors ?? [])}`
                    );
                }
            }

            return {
                payloadType: BlueprintPayloadType.NODE_ARRAY,
                nodesData: nodesList
            };
        }

        throw new Error('Unknown content type. Clipboard data must be a valid Blueprint, Node List, Single Node, or Enum Dictionary.');
    }


    private static _isFullBlueprint(data: unknown): boolean {
        return typeof data === 'object' && data !== null && 'nodes' in data;
    }

    private static _isPartialDictionaries(data: unknown): boolean {
        return (
            typeof data === 'object' &&
            data !== null &&
            !('nodes' in data) &&
            ('node_statuses' in data || 'edge_evolution_reasons' in data)
        );
    }

    private static _isNode(data: unknown): boolean {
        return (
            typeof data === 'object' &&
            data !== null &&
            'id' in data &&
            'description' in data &&
            'status' in data
        );
    }

    private static _isNodeArray(data: unknown): boolean {
        return (
            Array.isArray(data) &&
            data.length > 0 &&
            typeof data[0] === 'object' &&
            data[0] !== null &&
            'id' in data[0] &&
            'description' in data[0] &&
            'status' in data[0]
        );
    }

    private static _buildNodeValidator(jsonValidator: Ajv, schema: unknown): ValidateFunction {
        const schemaObject: { definitions?: { node: object }; $defs?: { node: object } } =
            schema as { definitions?: { node: object }; $defs?: { node: object } };

        return jsonValidator.compile(
            schemaObject.definitions?.node || schemaObject.$defs?.node || {}
        );
    }

    private static _buildValidationError(validationErrors: ErrorObject[]): string {
        return validationErrors
            .map((validationError: ErrorObject): string => `${validationError.instancePath} ${validationError.message}`)
            .join(', ');
    }
}
