import { EdgeType } from '@todo-requirement-blueprint/domain';
import { EdgeStatus } from '@todo-requirement-blueprint/domain';

export interface SerializedEdgeHistory {
    version: string;
    updated_at: string;
    type: EdgeType;
    status: EdgeStatus;
    target_upstream_id: string;
    evolution_reason: { name: string; description: string; metadata?: Record<string, unknown> };
}
