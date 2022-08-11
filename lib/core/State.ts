import { Client, Server, Entry, KeyValue } from ".";

/**
 * Manages the server's shared state
 */
export class State {
    public readonly entries: KeyValue<Entry> = {};

    /**
     * Returns a key-value object reprensenting the current value of the entires
     * @param client If present, will filter out the entries the given client is not subscribed to
     */
    public view(client?: Client): KeyValue {
        const filteredEntries = Object.keys(this.entries).map(key => this.entries[key]).filter(entry => !client || entry.hasSubscriber(client));

        return filteredEntries.reduce((obj, entry) => ({...obj, [entry.key]: entry.read()}), {});
    }

    /**
     * Finds an entry by its key and returns its value. Returns `null` if entry is not found.
     */
    public read(key: string) {
        const entry = this.entries[key];
        return entry?.read() ?? null;
    }

    /**
     * Finds an entry by its key and writes a value into it. If entry is not present, creates a new entry containing this value.
     */
    public write<T = any>(key: string, value?: T) {
        const entry = this.entries[key] ??= new Entry(key, value);
        entry.write(value);
    }

    /**
     * Finds an entry by its key and deletes it, setting its value to null and removing it from the entry list.
     */
    public delete(key: string) {
        const entry = this.entries[key];

        if (entry) {
            entry.write(null);
            delete this.entries[key];
        }
    }

    constructor (public readonly server: Server) {}
}