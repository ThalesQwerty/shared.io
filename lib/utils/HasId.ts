import { v4 } from "uuid";

/**
 * Generates a random unique universal identifier string
 */
export function UUID() {
    return v4();
}


type Class = new (...args: any[]) => any;

export function HasId_Mixin<Base extends Class>(base: Base) {
    return class HasId extends base {
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

        constructor(...args: any[]) {
            super(...args);
            this.id = UUID();
        }
    } as Base & (new (...args: any[]) => {
        readonly id: string;
        is: <T extends HasId>(object: T) => boolean
    });
}

export class HasId extends HasId_Mixin(class {}) {};