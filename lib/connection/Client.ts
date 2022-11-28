import _ from "lodash";
import { HasId_Mixin, KeyValue, View, CustomEvent, CustomEventEmitter, UUID, Channel, ExecutionQueue, Entity, ClientList, List } from "..";
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
    readonly view: View;
    readonly channels: List<Channel> = new List<Channel>();

    private readonly queues: KeyValue<ExecutionQueue, "input"|"output"> = {
        output: new ExecutionQueue<KeyValue>(output => this.sendView(output)),
        input: new ExecutionQueue<Input>(input => this.handleInput(input))
    };

    get connected() {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
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

    /**
     * Attempts to read the value of a given key on the server state and updates the view
     * @param key
     */
    read<T = any>(key: string): T|undefined {
        const value = this.server.state.read(key, this);
        this.view.update(key, value);
        return value;
    }

    /**
     * Verifies whether or not this client is in a channel
     * @param channel
     */
    isInChannel(channel: Channel) {
        return channel.users.includes(this);
    }

    /**
     * Syncrhonizes the current server's state and this client's state
     */
    sync() {
        this.queues.input.execute();
        this.queues.output.execute();
    }

    private sendView(changes: KeyValue) {
        return this.send({
            type: "view",
            data: {
                changes
            }
        });
    }

    private handleInput(input: Input) {
        switch (input.type) {
            case "write":
                for (const key in input.data.changes) {
                    const value = input.data.changes[key];

                    this.view.update(key, value, false);
                    this.server.state.write(key, value, this);
                }
                break;
        }
    }

    updateFlags(entity: Entity) {
        const { schema } = entity;
        let currentScore = 0;

        const numFlags = schema.flags.length;
        const numLists = Math.pow(2, numFlags);

        const lists = new Array(numLists).fill(null).map((_, score) => ClientList.id(`${entity.id}/${score}`));

        for (let index = 0; index < numFlags; index++) {
            const flagName = schema.flags[index];
            const flagValue = Math.pow(2, index);

            const flag = entity[flagName];
            const hasFlag = typeof flag === "function" ? flag(this) : flag;

            if (hasFlag) {
                currentScore += flagValue;
            }
        }

        for (let score = 0; score < numLists; score++) {
            const currentList = lists[score];
            if (score === currentScore) {
                currentList.add(this);
            } else {
                currentList.remove(this);
            }
        }

        return currentScore;
    }

    constructor(public readonly server: Server, private readonly ws?: WebSocket) {
        super();
        this.view = new View();

        this.view.on("update", ({ changes }) => this.queues.output.add(changes));
        this.view.on("reload", ({ view }) => this.queues.output.add(view));

        if (ws) {
            ws.on("close", () => {
                this.emit("close", { client: this });
            });

            ws.on("message", (message) => {
                try {
                    const input = JSON.parse(message.toString()) as Input;
                    this.queues.input.add(input);
                } catch {}
            });
        }
    }
}