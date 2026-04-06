import { Edge } from '@todo-requirement-blueprint/domain';
import { EdgeEvolutionReason } from '@todo-requirement-blueprint/domain';
import { EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';
import { NodeStatus } from '@todo-requirement-blueprint/domain';


export class BlueprintRegistry {
    private readonly _nodes: Map<string, Node>;
    private readonly _nodeStatuses: Map<string, NodeStatus>;
    private readonly _edgeEvolutionReasons: Map<string, EdgeEvolutionReason>;
    private readonly _yamlComments: Map<string, string>;

    private _blueprintName: string = 'Untitled Blueprint';
    private _trbVersion: string = '';
    private _schema: unknown = null;
    private _nodeStatusOrder: string[] = [];
    private _edgeEvolutionReasonOrder: string[] = [];
    private _nodeOrder: string[] = [];
    private _nodeEdgeOrder: Map<string, string[]> = new Map<string, string[]>();

    public constructor() {
        this._nodes = new Map<string, Node>();
        this._nodeStatuses = new Map<string, NodeStatus>();
        this._edgeEvolutionReasons = new Map<string, EdgeEvolutionReason>();
        this._yamlComments = new Map<string, string>();
    }

    public get blueprintName(): string {
        return this._blueprintName;
    }

    public set blueprintName(name: string) {
        this._blueprintName = name;
    }

    public get trbVersion(): string {
        return this._trbVersion;
    }

    public set trbVersion(version: string) {
        this._trbVersion = version;
    }

    public get schema(): unknown {
        return this._schema;
    }

    public set schema(schema: unknown) {
        this._schema = schema;
    }

    public getSchemaDefinition(key: string): unknown {
        if (!this._schema || typeof this._schema !== 'object') {
            return undefined;
        }

        const schemaObject: Record<string, unknown> = this._schema as Record<string, unknown>;
        const definitions: unknown = schemaObject.definitions || schemaObject.$defs;

        if (!definitions || typeof definitions !== 'object') {
            return undefined;
        }

        return (definitions as Record<string, unknown>)[key];
    }

    public registerNode(node: Node, overwrite: boolean = false): void {
        if (overwrite || !this._nodes.has(node.id)) {
            this._nodes.set(node.id, node);
        }
    }

    public getNode(id: string): Node | undefined {
        return this._nodes.get(id);
    }

    public getAllNodes(): Node[] {
        return Array.from(this._nodes.values());
    }

    public updateNode(nodeId: string, updates: { description?: string; version?: string; statusName?: string; metadata?: string | Record<string, unknown> }): void {
        const node: Node | undefined = this.getNode(nodeId);

        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        if (updates.description !== undefined) {
            node.description = updates.description;
        }

        if (updates.version !== undefined && updates.version !== node.version) {
            node.version = updates.version;
            node.updatedAt = new Date().toISOString();
        }

        if (updates.statusName !== undefined) {
            const status: NodeStatus | undefined = this.getNodeStatus(updates.statusName);

            if (!status) {
                throw new Error(`Node Status ${updates.statusName} not found.`);
            }

            node.status = status;
        }

        if (updates.metadata !== undefined) {
            node.metadata = updates.metadata;
        }
    }

    public deleteNode(nodeId: string): void {
        if (!this._nodes.has(nodeId)) {
            return;
        }

        this._nodes.delete(nodeId);
        this._nodeEdgeOrder.delete(nodeId);
        const orderIndex: number = this._nodeOrder.indexOf(nodeId);

        if (orderIndex !== -1) {
            this._nodeOrder.splice(orderIndex, 1);
        }

        this._nodes.forEach((node: Node): void => {
            const edgesToRemove: Edge[] = [];

            node.edges.forEach((edge: Edge): void => {
                if (edge.history.length > 0) {
                    const latestRecord: EdgeHistoryRecord = edge.history[edge.history.length - 1];

                    if (latestRecord.targetUpstream.id === nodeId) {
                        edgesToRemove.push(edge);
                    }
                }
            });

            edgesToRemove.forEach((edge: Edge): void => {
                node.removeEdge(edge);
            });
        });
    }

    public clear(): void {
        this._nodes.clear();
        this._nodeStatuses.clear();
        this._edgeEvolutionReasons.clear();
        this._yamlComments.clear();
        this._blueprintName = 'Untitled Blueprint';
        this._trbVersion = '';
        this._schema = null;
        this._nodeStatusOrder = [];
        this._edgeEvolutionReasonOrder = [];
        this._nodeOrder = [];
        this._nodeEdgeOrder.clear();
    }

    public get allNodes(): Node[] {
        return Array.from(this._nodes.values());
    }

    public registerNodeStatus(status: NodeStatus, overwrite: boolean = false): void {
        if (overwrite || !this._nodeStatuses.has(status.name)) {
            this._nodeStatuses.set(status.name, status);
        }
    }

    public getNodeStatus(name: string): NodeStatus | undefined {
        return this._nodeStatuses.get(name);
    }

    public deleteNodeStatus(name: string): void {
        this._nodeStatuses.delete(name);
        const orderIndex: number = this._nodeStatusOrder.indexOf(name);

        if (orderIndex !== -1) {
            this._nodeStatusOrder.splice(orderIndex, 1);
        }
    }

    public updateNodeStatus(oldName: string, newStatus: NodeStatus): void {
        const existingStatus: NodeStatus | undefined = this._nodeStatuses.get(oldName);

        if (!existingStatus) {
            throw new Error(`Node Status '${oldName}' not found.`);
        }

        if (oldName !== newStatus.name && this._nodeStatuses.has(newStatus.name)) {
            throw new Error(`Node Status '${newStatus.name}' already exists.`);
        }

        existingStatus.update(newStatus.name, newStatus.description, newStatus.metadata);

        if (oldName !== newStatus.name) {
            this._nodeStatuses.delete(oldName);
            this._nodeStatuses.set(newStatus.name, existingStatus);
        }
    }

    public get allNodeStatuses(): NodeStatus[] {
        return Array.from(this._nodeStatuses.values());
    }

    public registerEdgeEvolutionReason(reason: EdgeEvolutionReason, overwrite: boolean = false): void {
        if (overwrite || !this._edgeEvolutionReasons.has(reason.name)) {
            this._edgeEvolutionReasons.set(reason.name, reason);
        }
    }

    public getEdgeEvolutionReason(name: string): EdgeEvolutionReason | undefined {
        return this._edgeEvolutionReasons.get(name);
    }

    public get allEdgeEvolutionReasons(): EdgeEvolutionReason[] {
        return Array.from(this._edgeEvolutionReasons.values());
    }

    public deleteEdgeEvolutionReason(name: string): void {
        this._edgeEvolutionReasons.delete(name);
        const orderIndex: number = this._edgeEvolutionReasonOrder.indexOf(name);

        if (orderIndex !== -1) {
            this._edgeEvolutionReasonOrder.splice(orderIndex, 1);
        }
    }

    public updateEdgeEvolutionReason(oldName: string, newReason: EdgeEvolutionReason): void {
        const existingReason: EdgeEvolutionReason | undefined = this._edgeEvolutionReasons.get(oldName);

        if (!existingReason) {
            throw new Error(`Edge Evolution Reason '${oldName}' not found.`);
        }

        if (oldName !== newReason.name && this._edgeEvolutionReasons.has(newReason.name)) {
            throw new Error(`Edge Evolution Reason '${newReason.name}' already exists.`);
        }

        existingReason.update(newReason.name, newReason.description, newReason.metadata);

        if (oldName !== newReason.name) {
            this._edgeEvolutionReasons.delete(oldName);
            this._edgeEvolutionReasons.set(newReason.name, existingReason);
        }
    }

    public setYamlComment(key: string, comment: string): void {
        this._yamlComments.set(key, comment);
    }

    public getYamlComment(key: string): string | undefined {
        return this._yamlComments.get(key);
    }

    public get allYamlComments(): Map<string, string> {
        return this._yamlComments;
    }

    public get nodeStatusOrder(): string[] {
        return this._nodeStatusOrder;
    }

    public set nodeStatusOrder(order: string[]) {
        this._nodeStatusOrder = order;
    }

    public get edgeEvolutionReasonOrder(): string[] {
        return this._edgeEvolutionReasonOrder;
    }

    public set edgeEvolutionReasonOrder(order: string[]) {
        this._edgeEvolutionReasonOrder = order;
    }

    public get nodeOrder(): string[] {
        return this._nodeOrder;
    }

    public set nodeOrder(order: string[]) {
        this._nodeOrder = order;
    }

    public getNodeEdgeOrder(nodeId: string): string[] | undefined {
        return this._nodeEdgeOrder.get(nodeId);
    }

    public setNodeEdgeOrder(nodeId: string, order: string[]): void {
        this._nodeEdgeOrder.set(nodeId, order);
    }

    public get allNodeEdgeOrders(): Map<string, string[]> {
        return this._nodeEdgeOrder;
    }
}
