export const BlueprintPayloadType = {
    FULL_BLUEPRINT: 'full_blueprint',
    PARTIAL_DICTIONARIES: 'partial_dictionaries',
    NODE: 'node',
    NODE_ARRAY: 'node_array'
} as const;


export type BlueprintPayloadType = typeof BlueprintPayloadType[keyof typeof BlueprintPayloadType];
