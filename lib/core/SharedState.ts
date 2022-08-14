import { EventEmitter } from "node:events";
import { Client, Server, Entry, ProxyController } from ".";
import { CustomEvent, CustomEventEmitter, KeyValue } from "../.";

type SharedStateEvents = {
    write: (parameters: {entry: Entry, key: string, oldValue: any, newValue: any}) => void;
    delete: (parameters: {entry: Entry, key: string, oldValue: any}) => void;
}

export type SharedStateEvent<name extends keyof SharedStateEvents> = CustomEvent<SharedStateEvents, name>;

/**
 * Manages the server's shared state
 */
export class SharedState extends CustomEventEmitter<SharedStateEvents> {
    public readonly entries: KeyValue<Entry> = {};

    /**
     * Traces nested objects to prevent circular references
     */
    private readonly objectTracer: Object[] = [];

    /**
     * Returns all the entries listed in an array
     */
    public listEntries() {
        return Object.keys(this.entries).map(key => this.entries[key]);
    }

    /**
     * Returns a key-value object reprensenting the current value of the entires
     * @param client If present, will filter out the entries the given client is not subscribed to
     */
    public view(client?: Client): KeyValue {
        const filteredEntries = this.listEntries().filter(entry => entry.isPrimitive && (!client || entry.hasSubscriber(client)));

        return filteredEntries.reduce((obj, entry) => ({...obj, [entry.key]: entry.read()}), {});
    }

    /**
     * Finds an entry by its key and returns its value. Returns `null` if entry is not found.
     */
    public read(key: string) {
        const entry = this.entries[key];

        return entry?.read() ?? null;
    }

    /**
     * Finds an entry by its key and writes a value into it. If entry is not present, creates a new entry containing this value.
     */
    public write<T = any>(key: string, value: T) {
        let returnedValue: T;

        const oldValue = this.read(key);

        const applyPrefix = (subkey: string, hasFallback: boolean = true) => {
            try {
                return `${key}.${subkey}`;
            } catch {
                return hasFallback ? subkey : "";
            }
        };

        if (value instanceof Object) {
            const _value = value as any;

            const proxyController = new ProxyController(_value, {
                get: (_, subkey: string) => {
                    const path = applyPrefix(subkey);

                    if (proxyController.connected) return this.read(path) ?? _value[subkey];
                    else return _value[subkey];
                },
                set: (_, subkey: string, newValue: any) => {
                    try {
                        _value[subkey] = newValue;
                    } catch {}

                    if (proxyController.connected) this.write(applyPrefix(subkey), newValue);
                    return true;
                },
                deleteProperty: (_, subkey: string) => {
                    try {
                        delete _value[subkey];
                    } catch {}

                    if (proxyController.connected) this.delete(applyPrefix(subkey));
                    return true;
                }
            });

            const { proxy } = proxyController;

            for (const subkey in value) {
                const subvalue = value[subkey];
                if (subvalue !== this as any && !this.objectTracer.includes(subvalue)) {
                    this.objectTracer.push(subvalue);
                    this.write(applyPrefix(subkey), subvalue);
                }
            }

            this.objectTracer.splice(0, this.objectTracer.length);

            const entry = this.entries[key] ??= new Entry(key);
            entry.proxy?.disconnect();
            entry.on("change", event => this.emit("write", event));
            entry.write(proxy);
            entry.proxy = proxyController;

            if (oldValue instanceof Object) {
                for (const subkey in oldValue) {
                    if (!Object.keys(value).includes(subkey)) this.delete(applyPrefix(subkey));
                }
            }

            returnedValue = proxy as T;
        } else {
            const entry = this.entries[key] ??= new Entry(key);
            entry.on("change", event => this.emit("write", event));
            entry.write(value);

            if (oldValue instanceof Object) {
                for (const subkey in oldValue) {
                    this.delete(applyPrefix(subkey));
                }
            }

            returnedValue = value;
        }

        return returnedValue;
    }

    /**
     * Finds an entry by its key and deletes it, setting its value to null and removing it from the entry list.
     */
    public delete(key: string) {
        const entry = this.entries[key];

        if (entry) {
            this.write(key, null);
            entry.delete();
            delete this.entries[key];
        }
    }

    /**
     * Deletes all entries and removes all event listeners associated with the shared state
     */
    public clear() {
        for (const key in this.entries) {
            this.delete(key);
        }
        this.removeAllListeners();
    }

    /**
     * FIlters the entry list by preffix;
     * @param preffix
     * @returns
     */
    public preffix(preffix: string) {
        const filteredEntries = { ...this.entries };

        for (const key in filteredEntries) {
            if (key.substring(0, preffix.length + 1) !== `${preffix}.`) delete filteredEntries[key];
        }

        return filteredEntries;
    }

    /**
     * Reads various entries and groups them into a key-value object
     * @param preffix The preffix to look for in the entry keys
     */
    public readMany(preffix: string) {
        const object: KeyValue = {...this.view()};

        for (const key in object) {
            if (key.substring(0, preffix.length + 1) !== `${preffix}.`) delete object[key];
        }

        return object;
    }

    constructor (public readonly server: Server) {
        super();
    }
}


