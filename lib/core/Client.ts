import { v4 as uuid } from "uuid";
import { HasId } from "./Id";
import { KeyValue } from "./KeyValue";

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client extends HasId {
    /**
     * Sends a message via websocket to this client
     */
    send (message: KeyValue) {
        // to-do
        console.log(`Sending to ${this.id}: ${JSON.stringify(message)}`);
    }
}