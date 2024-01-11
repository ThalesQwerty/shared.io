import { v4 as UUID } from "uuid";
import { EventEmitter } from "node:events";

import { Client } from "../connection/Client";
import { Channel } from "./Channel";

export class Entity extends EventEmitter {
    public readonly id = UUID();

    public get active() {
        return this._active;
    }
    private _active = true;

    constructor(public readonly channel: Channel, public readonly owner?: Client, public readonly key = UUID()) {
        super();

        if (owner) {
            owner.entities[this.key] = this;
        }
        
        this.channel.emit("createEntity", { entity: this });
    }

    delete() {
        this._active = false;

        this.channel.broadcast({
            action: "delete",
            channelId: this.channel.id,
            params: {
                entityId: this.id
            }
        }, this.owner);

        this.owner?.send({
            action: "delete",
            channelId: this.channel.id,
            params: {
                entityId: this.key
            }
        });
        
        this.emit("delete");
        this.channel.emit("deleteEntity", { entity: this });
    }
}