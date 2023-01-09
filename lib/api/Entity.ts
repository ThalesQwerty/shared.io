import { Client, HasId, Schema, Channel, ClientList, SharedStateEvent } from "../";
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

    /**
     * Calls a function in an entity
     */
    public static call<EntityType extends Entity, MethodName extends EntityMethodName<EntityType>>(entity: Entity, methodName: MethodName, ...parameters: Parameters<EntityMethods<EntityType>[MethodName]>) {
        const proxy = entity.proxy;
        const method = (proxy as any)[methodName] as Function;

        method.call(proxy, ...parameters);
    }

    /**
     * Retrieves the server state key for a given entity's property
     */
    public static key<EntityType extends Entity>(entity: EntityType, propertyName?: keyof EntityType) {
        const preffix = entity.id;
        return propertyName ? `${preffix}.${propertyName.toString()}` : preffix;
    }

    /**
     * Lists all client lists associated with an entity's flags
     */
    public static getClientLists<EntityType extends Entity>(entity: EntityType) {
        return Object.keys(ClientList.all).filter(key => key.split("/")[0] === entity.id).map(key => ClientList.all[key]);
    }

    private readonly proxy: Writeable<this>;

    constructor(public readonly channel: Channel, owner: Client | null = null) {
        super();

        const { state, entities } = channel.server;
        state.setList("subscribers", this.id, channel.id);

        const proxy = state.write(Entity.key(this), { ...this.constructor.prototype }) as this;
        channel.entities.push(proxy);
        entities[this.id] = proxy;

        this.proxy = proxy as Writeable<this>;
        this.proxy.id = this.id;
        this.proxy.type = this.type;
        this.proxy.schema = this.schema;
        this.proxy.owner = owner;

        /**
         * Sets up the client lists associated with a given property of this entity
         */
        const setClientLists = (propertyName: string) => {
            const { properties } = this.schema;
            const { id } = this;

            const propertyKey = Entity.key<any>(this, propertyName);
            const publisherListId = properties[propertyName]?.input.join("-");
            const subscriberListId = properties[propertyName]?.output.join("-");

            //console.log("INIT", propertyName, "PUB", publisherListId, "SUB", subscriberListId);

            if (publisherListId) state.setList("publishers", propertyKey, `${id}/${publisherListId}`);
            if (subscriberListId) state.setList("subscribers", propertyKey, `${id}/${subscriberListId}`);
        }

        for (const methodName in proxy) {
            console.log("method", methodName, this.schema.properties[methodName]);
            if (methodName !== "constructor") {
                setClientLists(methodName);
            }
        }

        for (const propertyName in this.schema.properties) {
            setClientLists(propertyName);
        }

        const definedFlags: string[] = ["owner"];
        const updateFlags = () => this.channel.users.forEach(client => Flag.updateFlagScore(proxy, client));

        state.on("write", ({ key }) => {
            const path = key.split(".");
            const [entityId, propertyName] = path;

            const { flags } = this.schema;

            if (propertyName !== "owner" && entityId === this.id && flags.includes(propertyName) && !definedFlags.includes(propertyName)) {
                definedFlags.push(propertyName);

                const done = flags.reduce((continues, flagName) => continues && definedFlags.includes(flagName), true);

                if (done) {
                    updateFlags();
                }
            }
        });

        if (this.schema.flags.length <= 1) {
            updateFlags();
        }

        return proxy;
    }
}

export interface Entity {
    readonly owner: Client | null;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export type EntityMethods<EntityType extends Entity> = {
    [key in keyof EntityType as EntityType[key] extends ((...args: any[]) => any) ? key extends string ? key : never : never]: any
};

export type EntityProperties<EntityType extends Entity> = {
    [key in keyof EntityType as EntityType[key] extends ((...args: any[]) => any) ? never : key extends string ? key : never]: any
};

export type EntityMethodName<EntityType extends Entity> = keyof EntityMethods<EntityType>;
export type EntityPropertyName<EntityType extends Entity> = keyof EntityProperties<EntityType>;
