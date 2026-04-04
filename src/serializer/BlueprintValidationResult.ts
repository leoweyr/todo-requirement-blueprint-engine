import { type SerializedBlueprint, type SerializedNode, type BlueprintPayloadType } from './';


export interface BlueprintValidationResult {
    payloadType: BlueprintPayloadType;
    blueprintData?: SerializedBlueprint;
    nodesData?: SerializedNode[];
}
