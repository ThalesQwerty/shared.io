import { Client } from ".";

/**
 * Manages a single entry of the server's shared state.
 *
 * Clients subscribed to an entry will receive updates whenever the stored value changes.
 */
export class Entry<T = any> {
    public readonly key: string;
    public readonly subscribers: Client[] = [];
    private value: T|null = null;

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
            if (broadcast) this.broadcast();
        }
    }

    /**
     * Notifies the subscribers of the current value of this entry
     */
    public broadcast() {
        this.subscribers.forEach(subscriber => {
            subscriber.send({
                // to-do
                key: this.key,
                value: this.value
            });
        });
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
        this.key = key;
        this.value = initialValue ?? null;
    }
}