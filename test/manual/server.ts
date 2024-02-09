import { Server } from "../../lib/connection/Server";
import { Channel } from "../../lib/models/Channel";
import { readonly, secret } from "../../lib/models/Property";

const server = new Server();

server.define("Square", {
    props: {
        position: {
            x: 0,
            y: 0
        },
        color: readonly("#ffffff"),
    },
    init() {
        this.color;
    }
});

server.on("createChannel", ({ channel }) => {
    channel.on("leave", (event: any) => {
        for (const entity of event.client.findOwnedEntitiesByChannel(channel)) {
            entity.delete();
        }
    });
});

server.listen(3000);