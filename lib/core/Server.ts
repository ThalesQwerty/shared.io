import { State } from ".";

/**
 * Creates a SharedIO server
 */
export class Server {
    /**
     * Current shared state of the server
     */
    public readonly state: State;

    public constructor() {
        this.state = new State(this);
    }
}