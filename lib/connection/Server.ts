import { WebSocketServer } from "ws";
import { EventEmitter } from "node:events";

import { Input } from "./Input";
import { Channel } from "../models/Channel";
import { Client } from "./Client";

export interface ServerConfig {
    port: number
}

export class Server extends EventEmitter {
    clients: Client[] = [];
    channels: Channel[] = [];

    private wss?: WebSocketServer;

    constructor(public readonly config: ServerConfig) {
        super();
    }

    /**
     * Starts the server
     */
    public start() {
        this.wss = new WebSocketServer({
            port: this.config.port,
        });

        console.log(`SharedIO server listening on port ${this.config.port}`);

        this.wss.on("connection", ws => {
            new Client(this, ws);
        });

        this.wss.on("close", () => {
            this.stop();
        })

        return this;
    }

    /**
     * Stops the server and forcefully disconnects all users
     */
    public stop() {
        this.wss?.close();
        this.wss?.removeAllListeners();

        this.emit("stop", {});

        return this;
    }

    
    public findOrCreateChannel(id: string) {
        return this.channels.find(channel => channel.id === id) ?? this.createChannel(id);
    }

    public createChannel(id: string) {
        return new Channel(this, id);
    }
}