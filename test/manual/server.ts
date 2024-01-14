import { Server } from "../../lib/connection/Server";

const server = new Server({ port: 3000 });

server.on("createChannel", ({ channel }) => {
    channel.on("leave", (event: any) => {
        for (const entity of event.client.findOwnedEntitiesByChannel(channel)) {
            entity.delete();
        }
    });
}); 

server.start();