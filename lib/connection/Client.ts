import { WebSocket } from "ws";

import { Channel } from "../models/Channel";
import { CreateOutput, Output, UpdateOutput } from "./Output";
import { Input } from "./Input";
import { Entity } from "../models/Entity";
import { Server } from "./Server";

export class Client {
    channels: Channel[] = [];
    entities: Record<string, Entity> = {};

    constructor(private readonly ws: WebSocket) {}

    send(output: Output) {
        this.ws.send(JSON.stringify(output));
    }

    receive(input: Input) {
        const channel = this.channels.find(channel => channel.id === input.channelId);
        if (!channel) return;

        switch (input.action) {
            case "leave": {
                channel.removeClient(this);
                break;
            }

            case "update": {
                const entity = this.entities[input.params.entityId];
                if (!entity) break;

                const output: UpdateOutput = {
                    action: "update",
                    channelId: channel.id,
                    params: {
                        entityId: entity.id,
                        values: input.params.values
                    }
                };

                channel.broadcast(output, this);
                break;
            }
            
            case "create": {
                if (this.entities[input.params.entityId]) break;

                const entity = new Entity(channel, this, input.params.entityId);

                const output: CreateOutput = {
                    action: "create",
                    channelId: channel.id,
                    params: {
                        entityId: entity.id,
                        values: input.params.values
                    }
                };

                const confirmationResponse: CreateOutput = {
                    action: "create",
                    channelId: channel.id,
                    params: {
                        entityId: entity.key,
                        values: input.params.values
                    }
                };

                channel.broadcast(output, this);
                this.send(confirmationResponse);

                break;
            }
            
            default:
                return false;
        }

        return true;
    }   

    join(channel: Channel) {
        const success = channel.addClient(this);
        if (success) this.channels.push(channel);

        return success;
    }

    leave(channel: Channel) {
        const success = channel.removeClient(this);
        if (success) {
            const channelIndex = this.channels.indexOf(channel);
            if (channelIndex >= 0) this.channels.splice(channelIndex, 1);
        }

        return success;
    }
    
    disconnect() {
        for (const channel of this.channels) {
            channel.removeClient(this);
        }
        this.channels.splice(0, this.channels.length);

        if (this.ws.readyState !== this.ws.CLOSED) this.ws.close();
    }
}