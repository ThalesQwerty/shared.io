import { Client, ClientList, HasId, Server, Entity, List, Flag } from "../";

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
     * Makes a client join this channel, if they're not already in.
     *
     * Returns `true` if the client successfully joined the channel, returns `false` otherwise.
     */
    public addClient(client: Client) {
        if (this.users.add(client)) {
            for (const entity of this.entities) {
                Flag.updateFlagScore(entity, client);
            }
        }
    }

    /**
     * Makes a client leave this channel, if they're not already out
     *
     * Returns `true` if the client successfully left the channel, returns `false` otherwise.
     */
    public removeClient(client: Client) {
        if (this.users.remove(client)) {
            for (const entity of this.entities) {
                Flag.revokeAllFlags(entity, client);
            }
        }
    }
}

export interface Channel {

}