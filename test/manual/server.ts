import { Channel } from "../../lib/connection/Channel";
import { Server } from "../../lib/connection/Server";

const server = new Server({ port: 3000 });

const channel = new Channel(server, "wololo");

channel.on("join", () => {
    console.log("+ user", channel.clients.length);
});

channel.on("leave", () => {
    console.log("- user", channel.clients.length);
});

server.on("input", e => console.dir(e, { depth: null }));

server.start();