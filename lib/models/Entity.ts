import { v4 as UUID } from "uuid";

import { Client } from "../connection/Client";
import { Channel } from "./Channel";
import { CreateOutput, DeleteOutput, UpdateOutput } from "../connection/Output";
import { removeArrayItem } from "../utils/removeArrayItem";
import { TypedEmitter } from "tiny-typed-emitter";
import { DeleteEntityEvent, UpdateEntityEvent } from "../events/EntityEvent";

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

    public readonly id = UUID();

    public get active() {
        return this._active;
    }
    private _active: boolean = null as any;

    public state: Partial<Values> = {};

    public get schema() {
        return this.channel.server.schema.entities[this.type];
    }

    constructor(public readonly channel: Channel, public readonly type: Type, initialState: Partial<Values> = {}, public readonly owner?: Client, public readonly key = UUID()) {
        super();

        if (!this.schema) {
            this._active = false;
            return;
        }
        
        for (const key in this.schema.props) {
            (this.state as any)[key] = initialState[key] ?? this.schema.props[key];
        }

        this.schema?.init?.({ entity: this });

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