import { Client, Server } from "../../lib";

const server = new Server({
    port: 3000
}).start();

const { state } = server;

const client = new Client(server);

state.write("test", 1);
state.setList("subscribers", "test", "a");

console.dir(state.clientLists, { depth: null });

const list = state.getList("subscribers", "test");
list!.add(client);

console.log("subscribers", list);