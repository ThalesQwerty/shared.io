import { IdList, KeyValue, HasId, UUID, Client, View, List } from "..";

export class ClientList extends IdList<Client> {
    /**
     * Lists all client lists
     */
    static readonly all: KeyValue<ClientList> = {};

    public readonly watchedKeys = new List<string>();

    /**
     * Verifies if this object is the same as another one by comparing its IDs
     */
    public is<T extends HasId>(object: T) {
        return this.id === object.id;
    }

    /**
     * Sends a message to all clients on this list on the next synchronization
     */
    public output(...params: Parameters<Client["output"]>) {
        return Promise.all(this.map(client => client.output(...params)));
    }

    private forcefullyUpdateKeys(client: Client) {
        for (const key of this.watchedKeys) {
            client.read(key);
        }
    }

    public override add(client: Client) {
        if (!this.includes(client)) {
            super.add(client);
            this.forcefullyUpdateKeys(client);
            return true;
        }
        return false;
    }

    public override remove(client: Client) {
        if (this.includes(client)) {
            super.remove(client);
            this.forcefullyUpdateKeys(client);
            return true;
        }
        return false;
    }

    public readonly view = new View();

    /**
     * Attemps to find and return a client list with a given ID. If not found, creates a new one.
     */
    public static findOrCreate(id: string) {
        return ClientList.all[id] ?? new ClientList(id);
    }

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