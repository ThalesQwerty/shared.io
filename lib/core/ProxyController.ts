import { HasId } from "./HasId";

export class ProxyController<T extends object = object> extends HasId {
    public readonly proxy: T;

    private _connected = true;
    public get connected() { return this._connected };

    constructor (public readonly key: string, ...[target, handler]: ConstructorParameters<typeof Proxy<T>>) {
        super();

        this.proxy = new Proxy(target, handler);
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