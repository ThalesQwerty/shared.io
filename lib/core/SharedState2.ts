import { ClientList } from ".";
import { KeyValue, UUID } from "..";
import _ from "lodash";

type ClientLists = {
    publishers: KeyValue<ClientList|null>,
    subscribers: KeyValue<ClientList|null>,
}

type Entries = KeyValue;

export class SharedState2 {
    public readonly clientLists: ClientLists = {
        publishers: {},
        subscribers: {}
    };

    private readonly proxies: KeyValue<{id: string, proxy: KeyValue}> = {};

    public get entries() {
        const copy = _.cloneDeep(this._entries);
        return Object.freeze(copy);
    }
    private readonly _entries: Entries = {};

    /**
     * Resets the whole state
     */
    public clear() {
        for (const key in this.proxies) {
            delete this.proxies[key];
        }
        for (const key in this.clientLists.publishers) {
            delete this.clientLists.publishers[key];
        }
        for (const key in this.clientLists.subscribers) {
            delete this.clientLists.subscribers[key];
        }
        for (const key in this._entries) {
            delete this._entries[key];
        }
    }

    /**
     * Creates an object that will act as an proxy for keys on the state with a given preffix.
     * @param preffix
     * @param object
     * @param overwrite If a proxy for this preffix already exists,
     * disables the old proxy and overwrites it with a new one if this parameter is set to `true`,
     * or returns the existing one if this parameter is set to `false`.
     */
    private proxy<T extends Object>(preffix: string, object: T, overwrite: boolean = true): T {
        if (this.proxies[preffix] && !overwrite) {
            return this.proxies[preffix].proxy as T;
        }

        const id = UUID();
        const active = () => this.proxies[preffix]?.id === id;
        const key = (subkey: string) => `${preffix}.${subkey}`;

        const proxy = new Proxy(object, {
            get: (target: any, subkey: string) => {
                if (active()) {
                    return this.read(key(subkey));
                } else {
                    return target[subkey];
                }
            },
            set: (target: any, subkey: string, newValue: any) => {
                if (active()) {
                    this.write(key(subkey), newValue);
                    return true;
                } else {
                    target[subkey] = newValue;
                    return true;
                }
            },
            deleteProperty: (target: any, subkey: string) => {
                if (active()) {
                    return this.delete(key(subkey));
                } else {
                    delete target[subkey];
                    return true;
                }
            }
        });
        this.proxies[preffix] = {id, proxy};
        return proxy;
    }

    /**
     * Writes a new value into the state
     * @param key
     * @param value
     */
    public write<T>(key: string, value: T): T {
        const _write = <T>(object: any, key: string, value: T): T => {
            const path = key.split(".");

            if (path.length > 1) {
                const child = () => object[path[0]];
                const subkey = path.slice(1).join(".");

                if (!(child() instanceof Object)) {
                    _write(object, path[0], {});
                }
                return _write(child(), subkey, value);
            } else {
                object[key] = value;
                return value instanceof Object ?
                    this.proxy(key, value, true)
                    : value;
            }
        }
        return _write<T>(this._entries, key, value);
    }

    /**
     * Reads a value on the state
     * @param key
     * @returns The value, if the key exists. Returns `undefined` otherwise.
     */
    public read<T = any>(key: string): T {
        const _read = <T = any>(object: any, key: string): T => {
            const path = key.split(".");

            if (path.length > 1) {
                const child = object[path[0]];
                const subkey = path.slice(1).join(".");
                return _read(child, subkey);
            } else {
                const value = object[key];
                return value instanceof Object ?
                    this.proxy(key, value, false)
                    : object[key];
            }
        }
        return _read<T>(this._entries, key);
    }

    /**
     * Deletes an existing key on the state
     * @param key
     * @returns `true` if the key existed before deletion, `false` otherwise.
     */
    public delete(key: string): boolean {
        const _delete = (object: any, key: string): boolean => {
            const path = key.split(".");

            if (path.length > 1) {
                const child = object[path[0]];
                const subkey = path.slice(1).join(".");
                if (!child) return false;

                return _delete(child, subkey);
            } else {
                if (!Object.keys(object).includes(key)) {
                    delete object[key];
                    return false;
                } else {
                    delete object[key];
                    return true;
                }
            }
        }
        return _delete(this._entries, key);
    }
}