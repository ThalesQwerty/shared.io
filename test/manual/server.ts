import SharedIO from "../..";
import { Entity, Server } from "../../lib";

const server = new Server({
    port: 3000
}).start();

class TestEntity extends Entity {
    name = "Thales";
    power = 9001;
    counter = 0;
}

const testEntity = new TestEntity(server);

server.on("connection", event => {
    console.log("New user connected! :)");
    server.state.setList("subscribers", testEntity.id).add(event.client);
    server.state.setList("publishers", testEntity.id).add(event.client);
});

server.on("disconnection", () => {
    console.log("User disconnected :(");
});

setInterval(() => {
    testEntity.counter ++;
    // console.log(server.state.entries);
}, 1000);
