import { Channel } from "../../lib/models/Channel";
import { Server } from "../../lib/connection/Server";

const server = new Server({ port: 3000 });

server.on("createChannel", ({ channel }) => {
    channel.on("join", () => {
        console.log("+ user", channel.clients.length);
    });
    
    channel.on("leave", () => {
        console.log("- user", channel.clients.length);
    });
}); 

// server.on("input", e => console.dir(e.input, { depth: null }));

server.start();