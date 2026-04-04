import { type SerializedEdgeHistory } from './';


export interface SerializedEdge {
    id: string;
    demand_description: string;
    history: SerializedEdgeHistory[];
}
