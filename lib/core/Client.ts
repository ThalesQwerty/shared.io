import { HasId } from ".";
import { KeyValue } from "../.";

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