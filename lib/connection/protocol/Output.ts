import { KeyValue } from "../..";

/**
 * Base interface for outputs
 */
export interface SharedIOBaseOutput {
    type: "auth" | "ping" | "view" | "write" | "call" | "return" | "join" | "leave";
    id: string;
    data: KeyValue;
}

/**
 * Sends updates of the user view in a given channel
 */
export interface ViewOutput extends SharedIOBaseOutput {
    type: "view";
    data: {
        changes: KeyValue
    }
}

export type Output =
    | ViewOutput;