import { WebSocketServer } from "ws";
import { TypedEmitter } from "tiny-typed-emitter";

import { Channel } from "../models/Channel";
import { Client } from "./Client";
import { StartServerEvent, StopServerEvent } from "../events/ServerEvent";
import { ConnectClientEvent, DisconnectClientEvent, InputClientEvent, MessageClientEvent } from "../events/ClientEvent";
import { CreateChannelEvent, DeleteChannelEvent } from "../events/ChannelEvent";
import { Entity } from "../models/Entity";
import { ServerSchema, EntitySchema } from "../models/Schema";
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

    public readonly schema: ServerSchema = {
        entities: {}
    };

    public get port() {
        return this._port;
    }
    private _port = 3000;

    constructor() {
        super();
    }

    /**
     * Defines an entity type
     */
    define<EntityType extends string, Values extends Record<string, any>>(type: EntityType, blueprint: Partial<Omit<EntitySchema<EntityType, Values>, "type">>) {
        this.schema.entities[type] = ({
            type,
            ...blueprint,
            props: blueprint.props ?? {},
        } satisfies {
            [key in keyof EntitySchema]: any
        }) as any;
        
        return this;
    }

    /**
     * Starts the server
     */
    public listen(port: number) {
        this._port = port;

        this.wss = new WebSocketServer({
            port: this.port,
        });

        console.log(`SharedIO server listening on port ${this.port}`);

        this.wss.on("connection", ws => {
            new Client(this, ws);
        });

        this.wss.on("close", () => {
            this.close();
        });

        this.emit("start", { server: this });

        return this;
    }

    /**
     * Stops the server and forcefully disconnects all users
     */
    public close() {
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