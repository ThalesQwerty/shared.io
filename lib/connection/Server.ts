import { WebSocketServer } from "ws";
import { TypedEmitter } from "tiny-typed-emitter";

import { Channel } from "../models/Channel";
import { Client } from "./Client";
import { StartServerEvent, StopServerEvent } from "../events/ServerEvent";
import { ConnectClientEvent, DisconnectClientEvent, InputClientEvent, MessageClientEvent } from "../events/ClientEvent";
import { CreateChannelEvent, DeleteChannelEvent } from "../events/ChannelEvent";

export interface ServerConfig {
    port: number
}

export class Server extends TypedEmitter<{
    start: StartServerEvent,
    stop: StopServerEvent,

    connect: ConnectClientEvent,
    disconnect: DisconnectClientEvent,
    input: InputClientEvent,
    message: MessageClientEvent,

    createChannel: CreateChannelEvent,
    deleteChannel: DeleteChannelEvent,
}> {
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
        });

        this.emit("start", { server: this });

        return this;
    }

    /**
     * Stops the server and forcefully disconnects all users
     */
    public stop() {
        this.wss?.close();
        this.wss?.removeAllListeners();

        this.emit("stop", { server: this });

        return this;
    }

    public findOrCreateChannel(id: string) {
        return this.channels.find(channel => channel.id === id) ?? this.createChannel(id);
    }

    public createChannel(id: string) {
        return new Channel(this, id);
    }
}