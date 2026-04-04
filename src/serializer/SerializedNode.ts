import { type SerializedEdge } from './';


export interface SerializedNode {
    id: string;
    description: string;
    version: string;
    updated_at: string;
    status: { name: string; description: string; metadata?: Record<string, unknown> };
    metadata: Record<string, unknown>;
    edges: SerializedEdge[];
}
