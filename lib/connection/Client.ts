import _ from "lodash";
import { HasId_Mixin, KeyValue, View, CustomEvent, CustomEventEmitter, UUID } from "..";
import { Output, Input, Server } from ".";
import { WebSocket } from "ws";

type ClientEvents = {
    close: (event: { client: Client }) => void;
}

export type ClientEvent<name extends keyof ClientEvents> = CustomEvent<ClientEvents, name>;

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client extends HasId_Mixin<new () => CustomEventEmitter<ClientEvents>>(CustomEventEmitter) {
    public readonly view: View;

    public get connected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Sends an arbitrary message via websocket to this client
     */
    sendRaw(message: KeyValue) {
        if (this.connected) {
            this.ws?.send(JSON.stringify(message));
        }
    }

    /**
     * Emits an output via websocket to this client
     */
    send(output: Output|Omit<Output, "id">) {
        const outputWithId: Output = {
            id: UUID(),
            ...output
        };

        this.sendRaw(outputWithId);
    }

    private sendView(changes: KeyValue) {
        return this.send({
            type: "view",
            data: {
                changes
            }
        });
    }

    constructor(public readonly server: Server, private readonly ws?: WebSocket) {
        super();
        this.view = new View();

        this.view.on("update", ({ changes }) => this.sendView(changes));
        this.view.on("reload", ({ view }) => this.sendView(view));

        if (ws) {
            ws.on("close", () => {
                this.emit("close", { client: this });
            })

            ws.on("message", (message) => {
                try {
                    const input = JSON.parse(message.toString()) as Input;

                    switch (input.type) {
                        case "write":
                            for (const key in input.data.changes) {
                                const value = input.data.changes[key];

                                this.server.state.write(key, value, this);
                            }
                            break;
                    }
                } catch {}
            })
        }
    }
}