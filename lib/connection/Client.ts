import { EventEmitter, WebSocket } from "ws";

import { Channel } from "../models/Channel";
import { Output } from "./Output";
import { Input } from "./Input";
import { Entity } from "../models/Entity";
import { Server } from "./Server";
import { TypedEmitter } from "tiny-typed-emitter";
import { DisconnectClientEvent, InputClientEvent, MessageClientEvent } from "../events/ClientEvent";

export class Client extends TypedEmitter<{
    disconnect: DisconnectClientEvent,
    input: InputClientEvent,
    message: MessageClientEvent,
}> {
    /**
     * List of channels this client is currently in
     */
    channels: Channel[] = [];

    /**
     * List of entities owned by this client
     */
    entities: Entity[] = [];

    constructor(public readonly server: Server, private readonly ws: WebSocket) {
        super();

        ws.on("close", () => {
            for (const channel of this.channels) {
                channel.removeClient(this);
            }
            this.channels.splice(0, this.channels.length);
    
            server.emit("disconnect", { client: this });
            this.emit("disconnect", { client: this });
    
            const index = server.clients.indexOf(this);
            if (index >= 0) server.clients.splice(index, 1);
        });

        ws.on("message", (data) => {
            try {
                const input = JSON.parse(data.toString()) as Input;

                server.emit("input", { input, client: this });
                this.emit("input", { input, client: this });

                const isInputValid = this.receive(input);

                if (!isInputValid) {
                    server.emit("message", { message: input, client: this });
                    this.emit("message", { message: input, client: this });
                }
            } catch (error) {
                console.error(error);
            }
        });

        server.emit("connect", { client: this });
        server.clients.push(this);
    }

    send(output: Output) {
        this.ws.send(JSON.stringify(output));
    }

    receive(input: Input): boolean {
        if (input.action === "join") {
            const channel = this.server.findOrCreateChannel(input.channelId);
            if (channel) this.joinChannel(channel);
            return true;
        }

        const channel = this.findJoinedChannelById(input.channelId);
        if (!channel || !this.isInChannel(channel)) return true;

        const entity = input.params?.entityId ? this.findOwnedEntityByKey(input.params.entityId) : undefined;

        switch (input.action) {
            case "leave": {
                this.leaveChannel(channel);
                break;
            }

            case "update": {
                if (entity) {
                    this.updateEntity(entity, input.params.values);
                }
                break;
            }
            
            case "create": {
                if (!entity) {
                    this.createEntity(channel, input.params.values, input.params.entityId);
                }
                break;
            }
            
            default:
                return false;
        }

        return true;
    }   

    findJoinedChannelById(channelId: string) {
        return this.channels.find(channel => channel.id === channelId);
    }

    findOwnedEntityByKey(entityKey: string) {
        return this.entities.find(entity => entity.key === entityKey);
    }

    findOwnedEntitiesByChannel(channel: Channel) {
        return this.entities.filter(entity => entity.channel === channel);
    }

    isInChannel(channel: Channel) {
        return !!this.channels.includes(channel);
    }

    ownsEntity(entity: Entity) {
        return entity.owner === this;
    }

    joinChannel(channel: Channel) {
        const success = channel.addClient(this);
        if (!success) return false;

        this.channels.push(channel);
        
        for (const entity of channel.entities) {
            this.send(Entity.generateCreateOutput(entity, this));
        }

        return true;
    }

    leaveChannel(channel: Channel) {
        const success = channel.removeClient(this);
        if (success) {
            const channelIndex = this.channels.indexOf(channel);
            if (channelIndex >= 0) this.channels.splice(channelIndex, 1);
        }

        return success;
    }

    createEntity<T extends Record<string, any>>(channel: Channel, values: Partial<T>, key?: string) {
        return new Entity<T>(channel, values, this, key);
    }

    deleteEntity(entity: Entity) {
        return entity.delete();
    }

    updateEntity<T extends Record<string, any>>(entity: Entity, values: Partial<T>) {
        return entity.update(values);
    }
    
    disconnect() {
        if (this.ws.readyState !== this.ws.CLOSED) this.ws.close();
    }
}