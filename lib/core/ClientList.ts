import { IdList, KeyValue, HasId, UUID, Client, View, List } from "..";

export class ClientList extends IdList<Client> {
    protected static readonly all: KeyValue<ClientList> = {};

    public readonly watchedKeys = new List<string>();

    /**
     * Gets a client list by its ID, or creates a new one, if not found.
     */
    public static id(id: string) {
        return this.all[id] || new ClientList(id);
    }

    /**
     * Verifies if this object is the same as another one by comparing its IDs
     */
    public is<T extends HasId>(object: T) {
        return this.id === object.id;
    }

    /**
     * Sends a message to all clients on this list
     */
    public send(...params: Parameters<Client["send"]>) {
        this.forEach(client => client.send(...params));
    }

    public override add(client: Client) {
        if (!this.includes(client)) {
            super.add(client);
            for (const key of this.watchedKeys) {
                client.read(key);
            }
            return true;
        }
        return false;
    }

    public readonly view = new View();

    constructor(
        /**
         * Random unique universal identifier string associated with this client list
         */
        public readonly id: string = UUID(),
        ...items: Client[]
    ) {
        super(...items);
        ClientList.all[id] = this;
        Object.setPrototypeOf(this, ClientList.prototype);
    }
};