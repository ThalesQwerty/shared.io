import { EventEmitter } from "events";
import { v4 as UUID } from "uuid";
import { Server } from "./Server";
import { Client } from "./Client";
import { Output } from "./Output";

export class Channel extends EventEmitter {
    public readonly clients: Client[] = [];

    constructor(public readonly server: Server, public readonly id: string = UUID()) {
        super();

        server.channels.push(this);
    }

    broadcast(message: Output, origin?: Client) {
        this.clients.forEach(client => {
            if (client !== origin) {
                client.send(message);
            }
        })
    }

    addClient(client: Client) {
        if (!this.clients.includes(client)) {
            this.clients.push(client);
            return true;
        }      

        return false;
    }

    removeClient(client: Client) {
        const clientIndex = this.clients.findIndex(ws => ws === client);
        if (clientIndex >= 0) {
            this.clients.splice(clientIndex, 1);
            return true;
        }

        return false;
    }
}