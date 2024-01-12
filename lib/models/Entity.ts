import { v4 as UUID } from "uuid";
import { EventEmitter } from "node:events";

import { Client } from "../connection/Client";
import { Channel } from "./Channel";
import { CreateOutput } from "../connection/Output";

export class Entity<T extends Record<string, any> = Record<string, any>> extends EventEmitter {
    public readonly id = UUID();

    public get active() {
        return this._active;
    }
    private _active = true;

    public state: Partial<T>;

    constructor(public readonly channel: Channel, initialState: Partial<T> = {}, public readonly owner?: Client, public readonly key = UUID()) {
        super();

        this.state = {...initialState};

        if (owner) {
            owner.entities[key] = this;

            const confirmationResponse: CreateOutput = {
                action: "create",
                channelId: channel.id,
                params: {
                    entityId: key,
                    values: this.state
                }
            };
            
            owner.send(confirmationResponse);
        }

        const output: CreateOutput = {
            action: "create",
            channelId: channel.id,
            params: {
                entityId: this.id,
                values: this.state
            }
        };

        this.channel.broadcast(output, this.owner);
        this.channel.emit("createEntity", { entity: this });
    }

    update(values: Partial<T>) {
        for (const key in values) {
            this.state[key] = values[key];
        }

        this.channel.broadcast({
            action: "update",
            channelId: this.channel.id,
            params: {
                entityId: this.id,
                values
            }
        }, this.owner);
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