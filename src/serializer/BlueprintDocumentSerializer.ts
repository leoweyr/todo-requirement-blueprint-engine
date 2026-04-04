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
    BlueprintPayloadType
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
}
