import { Client, HasId, Server, Schema, Channel, ClientList, SharedStateEvent } from "../";
import { EntityFlagName, Flag } from "./Flag";

function blankSchema(type: string) {
    return {
        type: type,
        properties: {},
        flags: []
    };
}
export class Entity extends HasId {
    public get type() {
        return this.constructor.name;
    }

    public get schema() {
        const { type } = this;
        return Schema.entities[type] ??= blankSchema(type);
    }

    public static get schema() {
        const type = this.prototype.constructor.name;
        return Schema.entities[type] ??= blankSchema(type);
    }

    private readonly proxy: Writeable<this>;

    constructor(public readonly channel: Channel, owner: Client|null = null) {
        super();

        const { state, entities } = channel.server;
        state.setList("subscribers", this.id, channel.id);

        const proxy = state.write(this.id, {}) as this;
        channel.entities.push(proxy);

        this.proxy = proxy as Writeable<this>;

        this.proxy.id = this.id;
        this.proxy.type = this.type;
        this.proxy.schema = this.schema;
        this.proxy.owner = owner;

        entities[this.id] = this;

        const decoratedProperties: string[] = [];

        const applyClientLists = ({ key }: SharedStateEvent<"write">) => {
            const path = key.split(".");
            const entityId = path[0];
            const propertyName = path[1];

            const { properties } = this.schema;
            const propertyNameList = Object.keys(properties);

            if (entityId === this.id && propertyNameList.includes(propertyName) && !decoratedProperties.includes(propertyName)) {
                const propertyKey = `${entityId}.${propertyName}`;
                const publisherListId = properties[propertyName].input.join("-");
                const subscriberListId = properties[propertyName].output.join("-")

                if (publisherListId) state.setList("publishers", propertyKey, `${entityId}/${publisherListId}`);
                if (subscriberListId) state.setList("subscribers", propertyKey, `${entityId}/${subscriberListId}`);

                decoratedProperties.push(propertyName);

                if (decoratedProperties.length >= propertyNameList.length) {
                    state.removeListener("write", applyClientLists);

                    for (const client of this.channel.users) {
                        Flag.updateFlagScore(proxy, client);
                    }
                }
            }
        }

        state.on("write", applyClientLists);

        return proxy;
    }
}

export interface Entity {
    readonly owner: Client|null;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };