import { EventEmitter } from "node:events";
import { Client, Server, Entry, ProxyController } from ".";
import { CustomEvent, CustomEventEmitter, KeyValue } from "../.";

type SharedStateEvents = {
    write: (event: { entry: Entry, key: string, oldValue: any, newValue: any }) => void;
    delete: (event: { entry: Entry, key: string, oldValue: any }) => void;
    create: (event: { entry: Entry, key: string }) => void;
    change: (event: { changes: KeyValue }) => void;
};

export type SharedStateEvent<name extends keyof SharedStateEvents> = CustomEvent<SharedStateEvents, name>;

/**
 * Manages the server's shared state
 */
export class SharedState extends CustomEventEmitter<SharedStateEvents> {
    public readonly entries: KeyValue<Entry> = {};

    /**
     * Traces nested objects to prevent circular references
     */
    private readonly objectTracer: {object: Object, proxy: Object}[] = [];

    private changes: KeyValue = {};

    private get hasChanges() { return !!Object.keys(this.changes).length };

    constructor(public readonly server: Server) {
        super();
        this.setup();
    }

    private setup() {
        const dispatchChangeEvent = () => {
            if (!this.hasChanges) {
                process.nextTick(() => {
                    this.emit("change", { changes: this.changes });
                    this.changes = {};
                })
            }
        }

        this.on("write", ({ key, newValue }) => {
            dispatchChangeEvent();
            this.changes[key] = newValue;
        });
    }

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
        const filteredEntries = this.listEntries().filter(entry => !client || entry.hasSubscriber(client));

        return filteredEntries.reduce((obj, entry) => ({ ...obj, [entry.key]: entry.read() }), {});
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

        const findOrCreate = () => {
            let entry = this.entries[key];

            if (!entry) {
                this.entries[key] = entry = new Entry(key);
                this.emit("create", { entry, key: entry.key });
            }

            entry.on("change", event => this.emit("write", event));
            return entry;
        }

        if (value instanceof Object) {
            const _value = value as any;

            const proxyController = new ProxyController(key, _value, {
                get: (target, subkey: string) => {
                    const path: string = proxyController.applyPrefix(subkey);

                    if (proxyController.connected) return this.read(path) ?? target[subkey];
                    else return target[subkey];
                },
                set: (target, subkey: string, newValue: any) => {
                    const path: string = proxyController.applyPrefix(subkey);

                    try {
                        target[subkey] = newValue;
                    } catch (error) {
                        console.error(error);
                    }

                    if (proxyController.connected) {
                        this.entries[proxyController.key].update();
                        this.write(path, newValue);
                    }
                    return true;
                },
                deleteProperty: (target, subkey: string) => {
                    const path: string = proxyController.applyPrefix(subkey);

                    try {
                        delete target[subkey];
                    } catch (error) {
                        console.error(error);
                    }

                    if (proxyController.connected) {
                        this.entries[proxyController.key].update();
                        this.delete(path);
                    }
                    return true;
                }
            });

            const { proxy } = proxyController;

            this.objectTracer.push({ object: value, proxy });

            for (const subkey in value) {
                const subvalue = value[subkey];
                const circularRef = this.objectTracer.find(({ object }) => object === subvalue);

                if (!circularRef) {
                    const subproxy = this.write(applyPrefix(subkey), subvalue);
                    this.objectTracer.push({ object: subvalue, proxy: subproxy });
                    value[subkey] = subproxy;
                } else {
                    value[subkey] = circularRef.proxy as any;
                }
            }

            this.objectTracer.splice(0, this.objectTracer.length);

            const entry = findOrCreate();
            entry.proxy?.disconnect();
            entry.write(proxy);
            entry.proxy = proxyController;

            if (oldValue instanceof Object) {
                for (const subkey in oldValue) {
                    if (!Object.keys(value).includes(subkey)) this.delete(applyPrefix(subkey));
                }
            }

            returnedValue = proxy as T;
        } else {
            const entry = findOrCreate();
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
        this.removeAllListeners();

        for (const key in this.entries) {
            this.delete(key);
        }
        this.setup();
    }
}


