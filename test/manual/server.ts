import SharedIO from "../..";

const server = new SharedIO.Server({
    port: 3000
}).start();

server.state.write("test", 0);
const testEntry = server.state.entries["test"];

server.on("connection", event => {
    console.log("New user connected! :)");
    testEntry.subscribers.add(event.client);
})

server.on("disconnection", () => {
    console.log("User disconnected :(");
})

setInterval(() => {
    server.state.write("test", server.state.read("test") + 1);
}, 1000);
