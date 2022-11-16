import { ClientList } from ".";
import { KeyValue, UUID, Logger, Client } from "..";
import _ from "lodash";

type ClientLists = {
    publishers: KeyValue<ClientList|undefined>,
    subscribers: KeyValue<ClientList|undefined>,
}

type Entries = KeyValue;

export class SharedState {
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
     * Attempts to find a client list of a given key. If not found, attempts to find on its antecessors. If still not found, returns `undefined`.
     * @param type Should it look for a subscriber list or a publisher list?
     * @param key
     */
    public getList(type: keyof typeof this.clientLists, key: string) {
        const path = key.split(".");
        const levels = path.reduce<string[]>((previous, current) => previous.length ? [...previous, `${previous.pop()}.${current}`] : [current], []).reverse();

        const list = levels.reduce<ClientList|undefined>((found, currentLevel) => {
            return found || this.clientLists[type][currentLevel];
        }, undefined);

        return list;
    }

    /**
     * Creates and returns a new list for a given key, if it doesn't already exists (otherwise simply returns the existant list).
     * @param type Should it create a subscriber list or a publisher list?
     * @param key WHich key does this list apply for?
     * @param id Should it use an already existing client list?
     */
    public setList(type: keyof typeof this.clientLists, key: string, id?: string) {
        const list = this.clientLists[type][key] ??= id ? ClientList.findOrCreate(id) : new ClientList();
        list.watchedKeys.add(key);
        return list;
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
                if (active() && typeof subkey === "string") {
                    return this.read(key(subkey));
                } else {
                    return target[subkey];
                }
            },
            set: (target: any, subkey: string, newValue: any) => {
                if (active() && typeof subkey === "string") {
                    this.write(key(subkey), newValue);
                    return true;
                } else {
                    target[subkey] = newValue;
                    return true;
                }
            },
            deleteProperty: (target: any, subkey: string) => {
                if (active() && typeof subkey === "string") {
                    return this.delete(key(subkey));
                } else {
                    delete target[subkey];
                    return true;
                }
            }
        });

        Logger.trace(`proxy %s${this.proxies[preffix] ? " (overwritten)" : ""}`, preffix);

        this.proxies[preffix] = {id, proxy};
        return proxy;
    }

    /**
     * Writes a new value into the state
     * @param key
     * @param value
     * @param client The client who's attempting to change this value
     */
    public write<T>(key: string, value: T, client: Client): T|undefined;

    /**
     * Writes a new value into the state
     * @param key
     * @param value
     */
    public write<T>(key: string, value: T): T;

    public write<T>(key: string, value: T, client?: Client): T|undefined {
        Logger.trace("write %s %o", key, value);

        const publishers = this.getList("publishers", key);

        if (client && !publishers?.includes(client)) {
            return this.read<T>(key);
        }

        const _write = <T>(object: any, key: string, value: T, preffix: string = ""): T => {
            const path = key.split(".");
            const superkey = (subkey: string) => preffix ? `${preffix}.${subkey}` : subkey;

            if (path.length > 1) {
                const child = () => object[path[0]];
                const subkey = path.slice(1).join(".");

                if (!(child() instanceof Object)) {
                    _write(object, path[0], {});
                }
                return _write(child(), subkey, value, superkey(path[0]));
            } else {
                const previousValue = object[key];
                object[key] = value;

                const completeKey = superkey(key);

                if (!_.isEqual(previousValue, value)) {
                    const list = this.getList("subscribers", completeKey);
                    list?.forEach(client => client.view.update(completeKey, value));
                }

                return value instanceof Object ?
                    this.proxy(completeKey, value, true)
                    : value;
            }
        }
        return _write<T>(this._entries, key, value);
    }

    /**
     * Reads a value on the state
     * @param key
     * @param client The client who's attempting to read this property. Default is `undefined`
     * @returns The value, if the key exists. Returns `undefined` otherwise.
     */
    public read<T = any>(key: string, client?: Client): T|undefined {
        const subscribers = this.getList("subscribers", key);

        if (client && !subscribers?.includes(client)) {
            return undefined;
        }

        const _read = <T = any>(object: any, key: string, preffix: string = ""): T|undefined => {
            if (!object) return undefined;
            const superkey = (subkey: string) => preffix ? `${preffix}.${subkey}` : subkey;

            const path = key.split(".");

            if (path.length > 1) {
                const child = object[path[0]];
                const subkey = path.slice(1).join(".");
                return _read(child, subkey, superkey(path[0]));
            } else {
                const value = object[key];
                return value instanceof Object ?
                    this.proxy(superkey(key), value, false)
                    : value;
            }
        }
        const value = _read<T>(this._entries, key);
        Logger.trace("read %s %o", key, value);

        return value;
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
        const success = _delete(this._entries, key);
        Logger.trace("delete %s %s", key, success);
        return success;
    }
}