import _ from "lodash";
import { HasId_Mixin, KeyValue, View, CustomEvent, CustomEventEmitter, UUID, Channel, ExecutionQueue, Entity, EntityMethodName, EntityMethods } from "..";
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

    private readonly queues: KeyValue<ExecutionQueue, "input"|"output"> = {
        output: new ExecutionQueue<KeyValue>(output => this.sendView(output)),
        input: new ExecutionQueue<Input>(input => this.input(input))
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
        const outputWithId = {
            id: UUID(),
            ...output
        } as Output;

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

    /**
     * Attempts to write values into an entity's properties
     */
    write<EntityType extends Entity>(entity: EntityType, changes: Partial<EntityType>) {
        const newChanges = Object.keys(changes).reduce((obj, key) => ({
            ...obj,
            [`${entity.id}.${key}`]: changes[key as keyof EntityType]
        }), {}) as KeyValue;

        return this.input({
            type: "write",
            id: UUID(),
            data: {
                changes: newChanges
            }
        });
    }

    /**
     * Attempts to call an entity's method on behalf of this client
     */
    call<EntityType extends Entity, MethodName extends EntityMethodName<EntityType>>(entity: EntityType, methodName: MethodName, ...parameters: Parameters<EntityMethods<EntityType>[MethodName]>) {
        return this.input({
            type: "call",
            id: UUID(),
            data: {
                entityId: entity.id,
                methodName: methodName as string,
                parameters
            }
        });
    }

    /**
     * Executes an input
     * @param input
     */
    private input(input: Input) {
        const { view, server } = this;

        switch (input.type) {
            case "write":
                for (const key in input.data.changes) {
                    const value = input.data.changes[key];

                    view.update(key, value, false);
                    server.state.write(key, value, this);
                }
                break;
            case "call":
                const entity = server.entities[input.data.entityId];

                if (entity) {
                    const method = (entity as any)[input.data.methodName];

                    if (typeof method === "function") {
                        const returnedValue = method(...input.data.parameters, this);

                        if (returnedValue !== undefined && typeof returnedValue !== "function") {
                            this.send({
                                type: "return",
                                data: {
                                    inputId: input.id,
                                    returnedValue
                                }
                            });
                        }
                    }
                }
                break;
        }
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