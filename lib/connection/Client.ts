import { WebSocket } from "ws";

import { Channel } from "../models/Channel";
import { Output } from "./Output";
import { Input } from "./Input";
import { Entity } from "../models/Entity";

export class Client {
    channels: Channel[] = [];
    entities: Partial<Record<string, Entity>> = {};

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
                entity?.update(input.params.values);

                break;
            }
            
            case "create": {
                if (!this.entities[input.params.entityId]) {
                    new Entity(channel, input.params.values, this, input.params.entityId);
                }

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