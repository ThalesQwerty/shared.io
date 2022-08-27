import { v4 } from "uuid";

/**
 * Generates a random unique universal identifier string
 */
export function UUID() {
    return v4();
}

export class HasId {
    /**
     * Generates a random unique universal identifier string
     */
    static new() {
        return UUID();
    }

    /**
     * Random unique universal identifier string associated with this object
     */
    public readonly id: string;

    /**
     * Verifies if this object is the same as another one by comparing its IDs
     */
    public is<T extends HasId>(object: T) {
        return this.id === object.id;
    }

    constructor() {
        this.id = HasId.new();
    }
}