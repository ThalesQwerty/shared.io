import { Client, HasId, Server, Schema } from "../";
export class Entity extends HasId {
    public get type() {
        return this.constructor.name;
    }

    public get schema() {
        return Schema.entities[this.type];
    }

    public static get schema() {
        return Schema.entities[this.prototype.constructor.name];
    }

    private readonly proxy: Writeable<this>;

    constructor(public readonly server: Server, owner: Client|null = null) {
        super();

        const { state } = server;

        const proxy = state.write(this.id, {}) as this;
        this.proxy = proxy as Writeable<this>;

        this.proxy.id = this.id;
        this.proxy.type = this.type;
        this.proxy.owner = owner;

        return proxy;
    }
}

export interface Entity {
    readonly owner: Client|null;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };