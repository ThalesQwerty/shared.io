import { HasId } from "..";
import { SharedState } from ".";

export class ProxyController<T extends object = object> extends HasId {
    public readonly proxy: T;

    private _connected = true;
    public get connected() { return this._connected };

    constructor (state: SharedState, public readonly key: string, target: T) {
        super();

        this.proxy = new Proxy(target, {
            get: (target, _subkey: string) => {
                const subkey = _subkey as keyof T;
                const path: string = this.applyPrefix(_subkey);

                if (this.connected) return state.read(path) ?? target[subkey];
                else return target[subkey];
            },
            set: (target, _subkey: string, newValue: any) => {
                const subkey = _subkey as keyof T;
                const path: string = this.applyPrefix(_subkey);

                try {
                    target[subkey] = newValue;
                } catch (error) {
                    console.error(error);
                }

                if (this.connected) {
                    state.entries[key].update();
                    state.write(path, newValue);
                }
                return true;
            },
            deleteProperty: (target, _subkey: string) => {
                const subkey = _subkey as keyof T;
                const path: string = this.applyPrefix(_subkey);

                try {
                    delete target[subkey];
                } catch (error) {
                    console.error(error);
                }

                if (this.connected) {
                    state.entries[key].update();
                    state.delete(path);
                }
                return true;
            }
        });
    }

    connect() {
        this._connected = true;
    }

    disconnect() {
        this._connected = false;
    }

    applyPrefix (subkey: string, hasFallback: boolean = true) {
        try {
            return `${this.key}.${subkey}`;
        } catch {
            return hasFallback ? subkey : "";
        }
    };
}