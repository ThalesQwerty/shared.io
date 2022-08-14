import { Client, ProxyController } from ".";
import { CustomEventEmitter, CustomEvent } from "../.";

type EntryEvents<T = any> = {
    change: (event: {entry: Entry, key: string, oldValue: T|null, newValue: T|null}) => void;
    delete: (event: {entry: Entry, key: string, oldValue: T|null}) => void;
}

export type EntryEvent<name extends keyof EntryEvents> = CustomEvent<EntryEvents, name>;

/**
 * Manages a single entry of the server's shared state.
 *
 * Clients subscribed to an entry will receive updates whenever the stored value changes.
 */
export class Entry<T = any> extends CustomEventEmitter<EntryEvents<T>> {
    public readonly key: string;
    public readonly subscribers: Client[] = [];
    private value: T|null = null;
    public proxy: ProxyController<T extends object ? T : object>|null = null;

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
     * @param broadcast Should it notify the subscribers right afterwards? Default is `true`.
     */
    public write(newValue: T|null) {
        const oldValue = this.value;
        const hasChanged = newValue !== oldValue;

        if (hasChanged) {
            this.value = newValue ?? null;
            this.emit("change", { entry: this, key: this.key, oldValue, newValue });
        }
    }

    /**
     * Forcefully emits a "change" event, with the current value as the new value
     * @param oldValue What was the previous value? If omitted, uses the current value.
     */
    public update(oldValue: T|null = this.value) {
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

    public hasSubscriber(client: Client) {
        return !!this.subscribers.find(subscriber => subscriber.is(client));
    }

    /**
     * Gets a given subscriber index on the subscriber array. Returns `-1` if it's not found.
     */
    public getSubscriberIndex(client: Client) {
        return this.subscribers.findIndex(subscriber => subscriber.is(client));
    }

    /**
     * Subscribes a client to this entry, if it's not already subscribed.
     * Returns `true` if client has been successfully subscribed, returns `false` if it was already a subscriber.
     */
    public addSubscriber(client: Client) {
        if (!this.hasSubscriber(client)) {
            this.subscribers.push(client);
            client.watcher.watch(this);
            return true;
        }
        return false;
    }

    /**
     * Unsubscribes a client to this entry, if it's a subscriber.
     * Returns `true` if client has been successfully unsubscribed, returns `false` if it wasn't a subscriber.
     */
    public removeSubscriber(client: Client) {
        const subscriberIndex = this.getSubscriberIndex(client);
        if (subscriberIndex >= 0) {
            this.subscribers.splice(subscriberIndex, 1);
            client.watcher.unwatch(this);
            return true;
        }
        return false;
    }

    constructor(key: string) {
        super();
        this.key = key;
    }
}