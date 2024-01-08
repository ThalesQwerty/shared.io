import { WebSocket } from "ws";
import { v4 as UUID } from "uuid";

import { Channel } from "./Channel";
import { Output } from "./Output";
import { Input } from "./Input";

export class Client {
    channels: Channel[] = [];
    entityIds: Record<string, string> = {};

    constructor(private readonly ws: WebSocket) {}

    send(message: Output) {
        this.ws.send(JSON.stringify(message));
    }

    receive(message: Input) {
        const channel = this.channels.find(channel => channel.id === message.channelId);

        switch (message.action) {
            case "leave": {
                channel?.removeClient(this);
                break;
            }
            case "update": {
                const output: Output = {...message};
                const publicId = this.entityIds[output.params.entityId];

                if (!publicId) break;

                output.params.entityId = publicId;
                delete (output as any)["inputId"];

                channel?.broadcast(output, this);
                break;
            }
            case "create": {
                const output: Output = {...message};
                const publicId = this.entityIds[output.params.entityId];

                if (publicId) break;

                output.params.entityId = this.entityIds[output.params.entityId] = UUID();
                delete (output as any)["inputId"];

                channel?.broadcast(output, this);
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

        this.ws.close();
    }
}