import { SharedState } from "../core";

/**
 * Creates a SharedIO server
 */
export class Server {
    /**
     * Current shared state of the server
     */
    public readonly state: SharedState;

    public constructor() {
        this.state = new SharedState(this);
    }
}