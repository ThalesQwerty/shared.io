import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "node:events";
import { Input } from "./Input";
import { Channel } from "./Channel";
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

    public findOrCreateChannel(id: string) {
        return this.channels.find(channel => channel.id === id) ?? new Channel(this, id);
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
            const client = new Client(ws);

            this.clients.push(client);

            this.emit("connect", { client });

            ws.on("close", () => {
                this.emit("disconnect", { client });

                const index = this.clients.indexOf(client);
                if (index >= 0) this.clients.splice(index, 1);

                client.disconnect();
            });

            ws.on("message", (data) => {
                try {
                    const input = JSON.parse(data.toString()) as Input;
                    
                    if (input.action === "join") {
                        const channel = this.findOrCreateChannel(input.channelId);
                        client.join(channel);
                    } else {
                        if (!client.receive(input)) {
                            this.emit("message", input);
                        }
                    }

                    this.emit("input", input);
                } catch (error) {
                    console.error(error);
                }
            });
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
}