import { HasId } from "./Id";

export class ProxyController<T extends object = object> extends HasId {
    public readonly proxy: T;

    private _connected = true;
    public get connected() { return this._connected };

    constructor (...[target, handler]: ConstructorParameters<typeof Proxy<T>>) {
        super();

        this.proxy = new Proxy(target, handler);
    }

    connect() {
        this._connected = true;
    }

    disconnect() {
        this._connected = false;
    }
}