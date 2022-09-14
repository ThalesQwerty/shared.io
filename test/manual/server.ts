import SharedIO from "../..";
import { ClientList } from "../../lib";

const server = new SharedIO.Server({
    port: 3000
}).start();

server.state.write("test", 0);
server.state.clientLists.publishers["test"] = server.state.clientLists.subscribers["test"] = new ClientList();

server.on("connection", event => {
    console.log("New user connected! :)");
    server.state.clientLists.subscribers["test"]!.add(event.client);
})

server.on("disconnection", () => {
    console.log("User disconnected :(");
})

setInterval(() => {
    console.log(server.state.entries);
}, 1000);
