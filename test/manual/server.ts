import { Server } from "../../lib/connection/Server";
import { Channel } from "../../lib/models/Channel";

const server = new Server();

server.define("Square", {
    props: {
        position: {
            x: 0,
            y: 0
        },
        color: "gray"
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