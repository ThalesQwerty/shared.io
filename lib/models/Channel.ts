import { EventEmitter } from "events";
import { v4 as UUID } from "uuid";

import { Server } from "../connection/Server";
import { Client } from "../connection/Client";
import { Output } from "../connection/Output";
import { Entity } from "./Entity";

export class Channel extends EventEmitter {
    public readonly clients: Client[] = [];
    public readonly entities: Entity[] = [];

    constructor(public readonly server: Server, public readonly id: string = UUID()) {
        super();

        server.channels.push(this);
        server.emit("createChannel", { channel: this });
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

    addClient(client: Client) {
        if (!this.clients.includes(client)) {
            this.clients.push(client);

            client.send({
                action: "join",
                channelId: this.id
            });

            this.emit("join", { client });
            return true;
        }

        return false;
    }

    removeClient(client: Client, reason?: string) {
        const clientIndex = this.clients.indexOf(client);
        if (clientIndex >= 0) {
            this.clients.splice(clientIndex, 1);

            client.send({
                action: "leave",
                channelId: this.id,
                params: {
                    reason
                }
            });

            this.emit("leave", { client });

            for (const entity of client.entities) {
                if (entity.channel === this) {
                    entity.emit("ownerLeave", { reason });
                }
            }

            return true;
        }

        return false;
    }

    delete() {
        for (const client of this.clients) {
            this.removeClient(client);
        }
    }
}