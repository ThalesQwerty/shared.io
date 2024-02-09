import { v4 as UUID } from "uuid";
import { WatchedObject } from "watched-object";

import { Client } from "../connection/Client";
import { Channel } from "./Channel";
import { CreateOutput, DeleteOutput, UpdateOutput } from "../connection/Output";
import { removeArrayItem } from "../utils/removeArrayItem";
import { TypedEmitter } from "tiny-typed-emitter";
import { DeleteEntityEvent, UpdateEntityEvent } from "../events/EntityEvent";
import { getProperty, getPropertyValue } from "./Property";
export class Entity<Values extends Record<string, any> = Record<string, any>, Type extends string = string> extends TypedEmitter<{
    delete: DeleteEntityEvent<Type, Values>,
    update: UpdateEntityEvent<Type, Values>
}> {
    static generateId(entity: Entity, client?: Client): string {
        return client && client.ownsEntity(entity) ? entity.key : entity.id;
    }

    static generateCreateOutput(entity: Entity, client?: Client): CreateOutput {
        return {
            action: "create",
            channelId: entity.channel.id,
            params: {
                values: entity.state,
                type: entity.type,
                entityId: Entity.generateId(entity, client),
            }
        };
    }

    static generateDeleteOutput(entity: Entity, client?: Client): DeleteOutput {
        return {
            action: "delete",
            channelId: entity.channel.id,
            params: {
                entityId: Entity.generateId(entity, client),
            }
        };
    }

    static generateUpdateOutput<Values extends Record<string, any> = Record<string, any>>(entity: Entity<Values>, values: Partial<Values>, client?: Client): UpdateOutput {
        return {
            action: "update",
            channelId: entity.channel.id,
            params: {
                values,
                entityId: Entity.generateId(entity, client),
            }
        };
    }

    static property<Values extends Record<string, any>, Type extends string>(entity: Entity<Values, Type>, propertyName: keyof Values) {
        return getProperty(entity.schema.props[propertyName as string]);
    }

    /**
     * Write new values into an entity's state
     * @param entity Target entity
     * @param values Desired new values
     * @param client The client attempting to write values
     */
    static write<Values extends Record<string, any>>(entity: Entity<Values>, values: Partial<Values>, client?: Client) {
        const difference: Partial<Values> = {};

        if (client) {
            if (!client.ownsEntity(entity)) return;

            for (const key in values) {
                const desiredValue = values[key];
                const previousValue = entity.rawState[key];
                const property = Entity.property(entity, key);

                if (property?.set) {
                    const resultingValue = property.set.call({...entity.state, [key]: entity.rawState[key]}, desiredValue, client);
                    if (resultingValue !== void 0) {
                        entity.rawState[key] = resultingValue;
                        if (resultingValue !== desiredValue) difference[key] = resultingValue;
                    } else if (resultingValue !== previousValue) {
                        difference[key] = previousValue;
                    }
                } else {
                    entity.rawState[key] = desiredValue;
                }
            }

            if (Object.keys(difference).length) {
                client.send({
                    action: "update",
                    channelId: entity.channel.id,
                    params: {
                        entityId: entity.key,
                        values: difference
                    }
                });
            }
        } else {
            for (const key in values) {
                entity.state[key] = values[key];
            }
        }
    }

    /**
     * Write new values into an entity's state
     * @param entity Target entity
     * @param values Desired new values
     * @param client The client attempting to write values
     */
    static read<Values extends Record<string, any>>(entity: Entity<Values>, keys: (keyof Values)[] | keyof Values, client?: Client) {
        const keyList = typeof keys === "object" ? keys : [keys];
        const result: Partial<Values> = {};

        for (const key of keyList) {
            const property = Entity.property(entity, key);

            if (property?.get) {
                const computedValue = property.get.call({...entity.state, [key]: entity.rawState[key]}, client);
                if (computedValue !== void 0) {
                    result[key] = computedValue;
                }
            } else {
                result[key] = entity.state[key];
            }
        }

        return result;
    }

    public readonly id = UUID();

    public get active() {
        return this._active;
    }
    private _active: boolean = null as any;

    public readonly state: Partial<Values>;
    private readonly rawState: Partial<Values> = {};

    public get schema() {
        return this.channel.server.schema.entities[this.type];
    }

    constructor(public readonly channel: Channel, public readonly type: Type, initialState: Partial<Values> = {}, public readonly owner?: Client, public readonly key = UUID()) {
        super();

        const { schema } = this;

        if (!schema) {
            this.state = {};
            this._active = false;
            return;
        }

        const computedState = new Proxy(this.rawState, {
            get(state, propertyName: string) {
                const property = getProperty(schema.props[propertyName]);

                if (property?.get) {
                    return property.get();
                }
                return state[propertyName];
            },
            set(state, propertyName: string, newValue: unknown) {
                const property = getProperty(schema.props[propertyName]);

                if (property?.get) {
                    return property.get();
                }
                return state[propertyName];
            }
        });

        const { proxy, watcher, source: state } = new WatchedObject<Record<string, any>>(computedState);
        this.state = proxy as Partial<Values>;

        watcher.on("write", ({ propertyName, oldValue, newValue }) => {
            const property = getProperty(schema.props[propertyName]);

            if (property?.set) {
                state[propertyName] = property.set(newValue);
            }
        });

        for (const key in schema.props) {
            (this.rawState as any)[key] = initialState[key] ?? getPropertyValue(schema.props[key]);
        }

        schema?.init?.call(this.state, this);

        if (this.active === false) return;
        this._active = true;

        if (this.owner) {
            this.owner.entities.push(this);
            this.owner.send(Entity.generateCreateOutput(this, this.owner));
        }

        this.channel.entities.push(this);
        this.channel.broadcast(Entity.generateCreateOutput(this), this.owner);
        this.channel.emit("createEntity", { entity: this });
    }

    update(values: Partial<Values>) {
        for (const key in values) {
            if (key in this.schema.props) {
                this.state[key] = values[key];
            }
        }

        this.emit("update", { entity: this, values });
        this.channel.broadcast(Entity.generateUpdateOutput(this, values), this.owner);
    }

    delete() {
        if (!this.active) { // might be null
            this._active = false;
            return;
        }

        this._active = false;

        this.channel.broadcast(Entity.generateDeleteOutput(this), this.owner);
        this.owner?.send(Entity.generateDeleteOutput(this, this.owner));

        if (this.owner) removeArrayItem(this.owner.entities, this);
        removeArrayItem(this.channel.entities, this);

        this.emit("delete", { entity: this });
        this.channel.emit("deleteEntity", { entity: this });

        const channelIndex = this.channel.entities.indexOf(this);
        if (channelIndex >= 0) this.channel.entities.splice(channelIndex, 1);
    }
}