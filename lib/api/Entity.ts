import { Client, HasId, Server, Schema, Channel, ClientList } from "../";
import { EntityFlagName, Flag } from "./Flag";
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

    public channel: Channel|null = null;

    private readonly proxy: Writeable<this>;

    constructor(public readonly server: Server, owner: Client|null = null) {
        super();

        const { state, entities } = server;

        const proxy = state.write(this.id, {}) as this;
        this.proxy = proxy as Writeable<this>;

        this.proxy.id = this.id;
        this.proxy.type = this.type;
        this.proxy.owner = owner;

        entities.add(this);

        return proxy;
    }
}

export interface Entity {
    readonly owner: Client|null;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };