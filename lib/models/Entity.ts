import { v4 as UUID } from "uuid";
import { EventEmitter } from "node:events";

import { Client } from "../connection/Client";
import { Channel } from "./Channel";
import { CreateOutput, DeleteOutput, UpdateOutput } from "../connection/Output";
import { removeArrayItem } from "../utils/removeArrayItem";

export class Entity<T extends Record<string, any> = Record<string, any>> extends EventEmitter {
    static generateId(entity: Entity, client?: Client): string {
        return client && client.ownsEntity(entity) ? entity.key : entity.id;
    }

    static generateCreateOutput(entity: Entity, client?: Client): CreateOutput {
        return {
            action: "create",
            channelId: entity.channel.id,
            params: {
                values: entity.state,
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

    static generateUpdateOutput<T extends Record<string, any> = Record<string, any>>(entity: Entity<T>, values: Partial<T>, client?: Client): UpdateOutput {
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
    private _active = true;

    public state: Partial<T>;

    constructor(public readonly channel: Channel, initialState: Partial<T> = {}, public readonly owner?: Client, public readonly key = UUID()) {
        super();

        this.state = { ...initialState };

        if (owner) {
            owner.entities.push(this);
            owner.send(Entity.generateCreateOutput(this, owner));
        }

        this.channel.entities.push(this);
        this.channel.broadcast(Entity.generateCreateOutput(this), owner);
        this.channel.emit("createEntity", { entity: this });
    }

    update(values: Partial<T>) {
        for (const key in values) {
            this.state[key] = values[key];
        }

        this.channel.broadcast(Entity.generateUpdateOutput(this, values), this.owner);
    }

    delete() {
        this._active = false;

        this.channel.broadcast(Entity.generateDeleteOutput(this), this.owner);
        this.owner?.send(Entity.generateDeleteOutput(this, this.owner));

        if (this.owner) removeArrayItem(this.owner.entities, this);
        removeArrayItem(this.channel.entities, this);

        this.emit("delete");
        this.channel.emit("deleteEntity", { entity: this });

        const channelIndex = this.channel.entities.indexOf(this);
        if (channelIndex >= 0) this.channel.entities.splice(channelIndex, 1);
    }
}