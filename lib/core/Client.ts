import _ from "lodash";
import { HasId, Server } from ".";
import { KeyValue } from "..";
import { ChangeEmitter } from "./ChangeEmitter";

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client extends HasId {
    public readonly watcher: ChangeEmitter;
    public get view() { return this.server.state.view(this); };
    public get viewedEntries() { return this.watcher.watchedEntries };

    /**
     * Sends a message via websocket to this client
     */
    send (message: KeyValue) {
        // to-do
        // console.log(`Sending to ${this.id}:`, message);
    }

    constructor(public readonly server: Server) {
        super();
        this.watcher = new ChangeEmitter();

        this.watcher.on("change", ({ changes }) => {
            this.send({
                changes
            });
        });
    }
}