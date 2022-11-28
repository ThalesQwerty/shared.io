import { WebSocketServer } from "ws";
import { SharedState } from "../core";
import { Client } from ".";
import { CustomEvent, CustomEventEmitter, ClientList, List, Entity, Channel } from "..";

const DEFAULT_CONFIG: ServerConfig = {
    port: 3000,
    syncRate: 64
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
    public readonly channels: List<Channel> = new List<Channel>();
    public readonly entities: List<Entity> = new List<Entity>();

    public readonly config: ServerConfig = DEFAULT_CONFIG;

    private syncInterval: NodeJS.Timer | null = null;

    public constructor(config: Partial<ServerConfig> = {}) {
        super();

        this.config = { ...this.config, ...config };
        this.state = new SharedState();
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

            client.view.reload();

            this.emit("connection", { client });

            client.on("close", () => {
                this.emit("disconnection", { client });
            })
        });

        if (this.syncInterval) clearInterval(this.syncInterval);
        setInterval(() => this.sync(), Math.round(1000 / this.config.syncRate));

        return this;
    }

    /**
 * Stops the server and forcefully disconnects all users
 */
    public stop() {
        this.wss?.close();
        this.wss?.removeAllListeners();
        if (this.syncInterval) clearInterval(this.syncInterval);

        return this;
    }

    public sync() {
        for (const channel of this.channels) {
            for (const client of channel.users) {
                for (const entity of channel.entities) {
                    client.updateFlags(entity);
                }
            }
        }

        for (const client of this.clients) {
            client.sync();
        }
    }
}

export interface ServerConfig {
    port: number,

    /**
     * How many times per second will clients synchronize with the server? (Default is 64)
     */
    syncRate: number
}