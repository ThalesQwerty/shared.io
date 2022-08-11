import { v4 as uuid } from "uuid";
import { KeyValue } from "./KeyValue";

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client {
    /**
     * An unique identifier of this client
     */
    public readonly id: string;

    /**
     * Verifies equality between two clients
     */
    is (client: Client) {
        return this.id === client.id;
    }

    /**
     * Sends a message via websocket to this client
     */
    send (message: KeyValue) {
        // to-do
        console.log(`Sending to ${this.id}: ${JSON.stringify(message)}`);
    }

    constructor() {
        this.id = uuid();
    }
}