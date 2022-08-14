import { Client, Server, Entry, KeyValue, UUID, ProxyController } from ".";

/**
 * Manages the server's shared state
 */
export class State {
    public readonly entries: KeyValue<Entry> = {};

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
                if (value[subkey] !== this as any) {
                    this.write(applyPrefix(subkey), value[subkey]);
                }
            }

            const entry = this.entries[key] ??= new Entry(key, proxy);
            entry.proxy?.disconnect();
            entry.write(proxy);
            entry.proxy = proxyController;

            if (oldValue instanceof Object) {
                for (const subkey in oldValue) {
                    if (!Object.keys(value).includes(subkey)) this.delete(applyPrefix(subkey));
                }
            }

            return proxy as T;
        } else {
            const entry = this.entries[key] ??= new Entry(key, value);
            entry.write(value);

            if (oldValue instanceof Object) {
                for (const subkey in oldValue) {
                    this.delete(applyPrefix(subkey));
                }
            }

            return value;
        }
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

    constructor (public readonly server: Server) {}
}