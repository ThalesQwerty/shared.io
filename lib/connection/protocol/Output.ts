import { KeyValue } from "../..";

/**
 * Base interface for outputs
 */
export interface SharedIOBaseOutput {
    type: "auth" | "ping" | "view" | "return" | "write" | "call" | "return" | "join" | "leave";
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

/**
 * Broadcasts a method call to other clients
 */
export interface CallOutput extends SharedIOBaseOutput {
    type: "call",
    data: {
        inputId: string,
        entityId: string,
        methodName: string,
        parameters: unknown[],
        returnedValue: unknown
    }
}

/**
 * Sends the return of a function to the client which called it
 */
export interface ReturnOutput extends SharedIOBaseOutput {
    type: "return";
    data: {
        inputId: string;
        returnedValue: unknown;
    }
}

export type Output =
    | ViewOutput
    | CallOutput
    | ReturnOutput;