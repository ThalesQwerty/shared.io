import { List, HasId } from ".";

export class IdList<T extends HasId> extends List<T> {
    /**
     * Lists the elements IDs
     */
    get ids() {
        return this.map(element => element.id) as string[];
    }

     /**
     * Attempts to find an element by its ID
     * @param id
     * @returns The element, if it's been found; `undefined` otherwise.
     */
    findById(id: string) {
        return this.find(element => element.id === id);
    }

    constructor(...items: Array<T>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, IdList.prototype);
    }
}