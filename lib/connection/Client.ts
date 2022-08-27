import _ from "lodash";
import { HasId, KeyValue, View } from "..";
import { Output, Server } from ".";

/**
 * Represents a websocket client connected to a SharedIO server
 */
export class Client extends HasId {
    public readonly view: View;

    /**
     * Sends an arbitrary message via websocket to this client
     */
    sendRaw (message: KeyValue) {
        // to-do
    }

    /**
     * Emits an output via websocket to this client
     */
    send (output: Output|Omit<Output, "id">) {
        const outputWithId: Output = {
            id: HasId.new(),
            ...output
        };

        this.sendRaw(outputWithId);
    }

    constructor(public readonly server: Server) {
        super();
        this.view = new View();

        this.view.on("update", ({ changes }) => {
            this.send({
                type: "view",
                data: {
                    changes
                }
            });
        });

        this.view.on("reload", ({ view }) => {
            this.send({
                type: "view",
                data: {
                    changes: view
                }
            });
        });
    }
}