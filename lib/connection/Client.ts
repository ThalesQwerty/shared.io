import _ from "lodash";
import { HasId_Mixin, KeyValue, View, CustomEvent, CustomEventEmitter, UUID, Channel, ExecutionQueue, Entity, EntityMethodName, EntityMethods } from "..";
import { Output, Input, Server } from ".";
import { WebSocket } from "ws";

type ClientEvents = {
    close: (event: { client: Client }) => void;
}

export type ClientEvent<name extends keyof ClientEvents> = CustomEvent<ClientEvents, name>;

type PromisedItem<T extends KeyValue> = T & { resolve?: Function }

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client extends HasId_Mixin<new () => CustomEventEmitter<ClientEvents>>(CustomEventEmitter) {
    readonly view: View;

    private readonly queues: KeyValue<ExecutionQueue, "input" | "output"> = {
        output: new ExecutionQueue<PromisedItem<{ output: Output }>>(({ output, resolve }) => {
            this.send(output);
            resolve?.();
        }),
        input: new ExecutionQueue<PromisedItem<{ input: Input }>>(({ input, resolve }) => {
            this.receive(input);
            resolve?.();
        })
    };

    get connected() {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Emits an output via websocket to this client on the next synchronization
     */
    output(output: Output | Omit<Output, "id">) {
        return new Promise<void>(resolve => {
            this.queues.output.add({
                output: {
                    id: UUID(),
                    ...output
                },
                resolve
            })
        });
    }

    /**
     * Simulates an input received from this client
     */
    input(input: Input | Omit<Input, "id">) {
        return new Promise<void>(resolve => {
            this.queues.input.add({
                input: {
                    id: UUID(),
                    ...input
                } as Input,
                resolve
            });
        });
    }

    /**
     * Syncrhonizes the current server's state and this client's state
     */
    sync() {
        this.queues.input.execute();
        this.queues.output.execute();
    }

    /**
     * Attempts to write values into an entity's properties
     */
    write<EntityType extends Entity>(entity: EntityType, changes: Partial<EntityType>) {
        const newChanges = (Object.keys(changes) as (keyof EntityType)[]).reduce((obj, key) => ({
            ...obj,
            [Entity.key(entity, key)]: changes[key]
        }), {} as Partial<EntityType>);

        return this.input({
            type: "write",
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
            data: {
                entityId: entity.id,
                methodName: methodName as string,
                parameters
            }
        });
    }

    /**
     * Attempts to read the value of a given key on the server state and updates the view
     * @param key
     */
    read<T = any>(key: string): T | undefined {
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
    send(output: Output | Omit<Output, "id">) {
        const outputWithId = {
            id: UUID(),
            ...output
        } as Output;

        this.sendRaw(outputWithId);
    }

    /**
     * Executes an input received from the client
     * @param input
     */
    private receive(input: Input) {
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
                    const method = (entity as any)[input.data.methodName] as Function;

                    if (typeof method === "function") {
                        const publishers = server.state.getList("publishers", Entity.key<any>(entity, input.data.methodName));
                        const authorized = !!publishers?.includes(this);
                        console.log("authorized", publishers?.length);

                        if (authorized) {
                            const subscribers = server.state.getList("subscribers", Entity.key<any>(entity, input.data.methodName));

                            const rawReturnedValue = Entity.call<any, any>(entity, input.data.methodName, ...input.data.parameters, this);
                            const returnedValue = typeof rawReturnedValue !== "function" ? rawReturnedValue : undefined

                            this.output({
                                type: "return",
                                data: {
                                    inputId: input.id,
                                    returnedValue
                                }
                            });

                            subscribers?.output({
                                type: "call",
                                data: {
                                    inputId: input.id,
                                    entityId: entity.id,
                                    methodName: input.data.methodName,
                                    parameters: input.data.parameters,
                                    returnedValue
                                }
                            });
                        } else {
                            this.output({
                                type: "return",
                                data: {
                                    inputId: input.id,
                                    returnedValue: undefined
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

        const updateView = (view: KeyValue) => {
            return this.output({
                type: "view",
                data: {
                    changes: view
                }
            })
        }

        this.view.on("update", ({ changes }) => updateView(changes));
        this.view.on("reload", ({ view }) => updateView(view));

        if (ws) {
            ws.on("close", () => {
                this.emit("close", { client: this });
            });

            ws.on("message", (message) => {
                try {
                    const input = JSON.parse(message.toString()) as Input;
                    this.queues.input.add({ input });
                } catch { }
            });
        }
    }
}