import { ProxyController } from ".";
import { CustomEventEmitter, CustomEvent, ClientList } from "../";

type EntryEvents<T = any> = {
    change: (event: { entry: Entry, key: string, oldValue: T | null, newValue: T | null }) => void;
    delete: (event: { entry: Entry, key: string, oldValue: T | null }) => void;
}

export type EntryEvent<name extends keyof EntryEvents> = CustomEvent<EntryEvents, name>;

/**
 * Manages a single entry of the server's shared state.
 *
 * Clients subscribed to an entry will receive updates whenever the stored value changes.
 */
export class Entry<T = any> extends CustomEventEmitter<EntryEvents<T>> {
    public readonly key: string;

    public value: T | null = null;
    public proxy: ProxyController<T extends object ? T : object> | null = null;

    /**
     * Does this entry store a primitive value type?
     */
    public get isPrimitive() {
        return !(this.value instanceof Object);
    }

    [Symbol.toPrimitive]() {
        return this.value;
    }

    /**
     * Gets the current value of this entry
     */
    public read() {
        return this.value;
    }

    /**
     * Writes a new value of this entry
     */
    public write(newValue: T | null) {
        const oldValue = this.value;
        const hasChanged = newValue !== oldValue;

        if (hasChanged) {
            this.value = newValue ?? null;
            this.update(oldValue);
        }
    }

    /**
     * Forcefully emits a "change" event, with the current value as the new value
     * @param oldValue What was the previous value? If omitted, uses the current value.
     */
    public update(oldValue: T | null = this.value) {
        this.subscribers.forEach(subscriber => subscriber.view.update(this.key, this.value));

        this.emit("change", { entry: this, key: this.key, oldValue, newValue: this.value });
    }

    /**
     * Deletes this entry and sets its value to null
     */
    public delete() {
        const oldValue = this.value;
        this.write(null as any);
        this.emit("delete", { entry: this, key: this.key, oldValue });
        this.removeAllListeners();
    }

    constructor(key: string,
    /**
     * Which clients will be notified when this entry gets its value changed?
     */
        public subscribers: ClientList = new ClientList(),
    /**
     * Which clients are allowed to change the value of this entry?
     */
        public publishers: ClientList = new ClientList()
    ) {
        super();
        this.key = key;
    }
}