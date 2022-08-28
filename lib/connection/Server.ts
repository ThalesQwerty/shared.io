import { WebSocketServer } from "ws";
import { SharedState } from "../core";
import { Client } from ".";
import { CustomEvent, CustomEventEmitter, ClientList } from "..";

const DEFAULT_CONFIG: ServerConfig = {
    port: 3000
};

type ServerEvents = {
    connection: (event: { client: Client }) => void;
    disconnection: (event: { client: Client }) => void;
}

export type ServerEvent<name extends keyof ServerEvents> = CustomEvent<ServerEvents, name>;

/**
 * Creates a SharedIO server
 */
export class Server extends CustomEventEmitter<ServerEvents> {
    /**
     * Current shared state of the server
     */
    public readonly state: SharedState;

    private wss?: WebSocketServer;

    public readonly clients: ClientList = new ClientList();

    public constructor(public readonly config: ServerConfig = DEFAULT_CONFIG) {
        super();
        this.state = new SharedState(this);
    }

    /**
     * Starts the server
     */
    public start() {
        this.wss = new WebSocketServer({
            port: this.config.port
        });

        console.log(`SharedIO server listening on port ${this.config.port}`);

        this.wss.on("connection", ws => {
            const client = new Client(this, ws);
            this.clients.add(client);

            this.emit("connection", { client });

            client.on("close", () => {
                this.emit("disconnection", { client });
            })
        });

        return this;
    }

    /**
     * Stops the server and forcefully disconnects all users
     */
    public stop() {
        this.wss?.close();
        this.wss?.removeAllListeners();

        return this;
    }
}

export interface ServerConfig {
    port: number
}