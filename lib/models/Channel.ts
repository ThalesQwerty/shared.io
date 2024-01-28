import { EventEmitter } from "events";
import { v4 as UUID } from "uuid";

import { Server } from "../connection/Server";
import { Client } from "../connection/Client";
import { Output } from "../connection/Output";
import { Entity } from "./Entity";
import { TypedEmitter } from "tiny-typed-emitter";
import { DeleteChannelEvent, JoinChannelEvent, LeaveChannelEvent } from "../events/ChannelEvent";
import { CreateEntityEvent, DeleteEntityEvent } from "../events/EntityEvent";

export class Channel extends TypedEmitter<{
    delete: DeleteChannelEvent,
    join: JoinChannelEvent,
    leave: LeaveChannelEvent,

    createEntity: CreateEntityEvent,
    deleteEntity: DeleteEntityEvent
}> {
    public readonly clients: Client[] = [];
    public readonly entities: Entity[] = [];

    constructor(public readonly server: Server, public readonly id: string = UUID()) {
        super();

        server.channels.push(this);
        server.emit("createChannel", { channel: this });
    }

    createEntity<EntityType extends string, Values extends Record<string, any>>(type: EntityType, initialState: Partial<Values> = {}, owner?: Client, key: string = UUID()) {
        const entity = new Entity<Values, EntityType>(this, type, initialState, owner, key);
        if (entity.active) return entity;
    }

    broadcast(message: Output, origin?: Client) {
        this.clients.forEach(client => {
            if (client !== origin) {
                client.send({
                    ...message,
                    channelId: this.id
                });
            }
        });
    }

    delete() {
        for (const client of this.clients) {
            this.removeClient(client);
        }

        for (const entity of this.entities) {
            entity.delete();
        }

        this.emit("delete", { channel: this });
    } 

    addClient(client: Client) {
        if (!this.clients.includes(client)) {
            this.clients.push(client);

            client.send({
                action: "join",
                channelId: this.id
            });

            this.emit("join", { client, channel: this });
            return true;
        }

        return false;
    }

    removeClient(client: Client) {
        const clientIndex = this.clients.indexOf(client);
        if (clientIndex >= 0) {
            this.clients.splice(clientIndex, 1);

            client.send({
                action: "leave",
                channelId: this.id,
            });

            this.emit("leave", { client, channel: this });

            return true;
        }

        return false;
    }
}