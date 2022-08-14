import { EventEmitter } from "node:events";
import { Client, KeyValue, ProxyController } from ".";

/**
 * Manages a single entry of the server's shared state.
 *
 * Clients subscribed to an entry will receive updates whenever the stored value changes.
 */
export class Entry<T = any> extends EventEmitter {
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
    public write(newValue: T, broadcast: boolean = true) {
        const oldValue = this.value;
        const hasChanged = newValue !== oldValue;

        if (hasChanged) {
            this.value = newValue ?? null;
            this.emit("change", { entry: this, oldValue, newValue });

            if (broadcast) this.broadcast();
        }
    }

    /**
     * Deletes this entry and sets its value to null
     */
    public delete() {
        const oldValue = this.value;
        this.write(null as any);
        this.emit("delete", { entry: this, oldValue });
    }

    /**
     * Notifies the subscribers of the current value of this entry
     */
    public broadcast() {
        for (const subscriber of this.subscribers) {
            subscriber.send({
                // to-do
                key: this.key,
                value: this.value
            });
        }
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
        if (subscriberIndex < 0) return false;

        this.subscribers.splice(subscriberIndex, 1);
        return true;
    }

    constructor(key: string, initialValue?: T) {
        super();
        this.key = key;
        this.value = initialValue ?? null;
    }
}

export interface Entry<T = any> extends EventEmitter {
    on: <K extends keyof EntryEvents<T>>(event: K, listener: EntryEvents<T>[K]) => this;
    once: <K extends keyof EntryEvents<T>>(event: K, listener: EntryEvents<T>[K]) => this;
    removeListener: <K extends keyof EntryEvents<T>>(event: K, listener: EntryEvents[K]) => this;
    emit: (event: keyof EntryEvents<T>, parameters: EntryEvent<typeof event>) => boolean;
    removeAllListeners: (event?: keyof EntryEvents<T>) => this;
}

export type EntryEvent<name extends keyof EntryEvents> = Parameters<EntryEvents[name]>[0];

type EntryEvents<T = any> = {
    change: (parameters: {entry: Entry, oldValue: T|null, newValue: T|null}) => void;
    delete: (parameters: {entry: Entry, oldValue: T|null}) => void;
}