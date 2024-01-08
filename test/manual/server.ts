import { Server } from "../../lib/connection/Server";

const server = new Server({ port: 3000 });

server.start();