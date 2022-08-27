import { KeyValue } from "../..";

/**
 * Base interface for inputs
 */
export interface SharedIOBaseInput {
    type: "auth" | "ping" | "view" | "write" | "call" | "return" | "join" | "leave";
    id: string;
    data: KeyValue;
}
