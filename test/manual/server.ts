import { Server } from "../../lib/connection/Server";
import { Channel } from "../../lib/models/Channel";

const server = new Server({ port: 3000 });

server.on("createChannel", ({ channel }) => {
    channel.on("leave", (event: any) => {
        for (const entity of event.client.findOwnedEntitiesByChannel(channel)) {
            entity.delete();
        }
    });
}); 

server.start();