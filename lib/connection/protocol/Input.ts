import { KeyValue } from "../..";

/**
 * Base interface for inputs
 */
export interface SharedIOBaseInput {
    type: "auth" | "ping" | "view" | "write" | "call" | "return" | "join" | "leave";
    id: string;
    data: KeyValue;
}

/**
 * Sends updates of the user view in a given channel
 */
 export interface WriteInput extends SharedIOBaseInput {
    type: "write";
    data: {
        changes: KeyValue
    }
}

export type Input =
    | WriteInput;