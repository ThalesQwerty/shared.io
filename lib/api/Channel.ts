import { Client, ClientList, HasId, Server, Entity, List } from "../";

export class Channel extends HasId {
    public get type() {
        return this.constructor.name;
    }

    public readonly users: ClientList;
    public readonly entities: List<Entity> = new List<Entity>();

    constructor(public readonly server: Server) {
        super();
        this.users = new ClientList(this.id);
        server.channels.add(this);
    }

    /**
     * Creates an entity inside this channel
     */
    public createEntity<EntityType extends Entity = Entity>(entityType: new (...args: ConstructorParameters<typeof Entity>) => EntityType, owner?: Client|null): EntityType {
        const newEntity = new entityType(this.server, owner);

        this.server.state.setList("subscribers", newEntity.id, this.id);
        this.entities.push(newEntity);

        return newEntity;
    }

    /**
     * Makes a client join this channel, if they're not already in.
     *
     * Returns `true` if the client successfully joined the channel, returns `false` otherwise.
     */
    public addClient(client: Client) {
        return this.users.add(client);
    }

    /**
     * Makes a client leave this channel, if they're not already out
     *
     * Returns `true` if the client successfully left the channel, returns `false` otherwise.
     */
    public removeClient(client: Client) {
        return this.users.remove(client);
    }
}

export interface Channel {

}