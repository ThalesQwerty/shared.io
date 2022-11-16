import SharedIO from "../..";
import { Entity, Server, Channel } from "../../lib";

const server = new Server({
    port: 3000
}).start();

class TestEntity extends Entity {
    name = "Thales";
    power = 9001;
    counter = 0;
}

class TestChannel extends Channel {

}

const testChannel = new TestChannel(server);
const testEntity = testChannel.createEntity(TestEntity);

server.on("connection", ({ client }) => {
    testChannel.addClient(client);
    console.log("New user connected! :)");

    setInterval(() => {
        if (client.connected) {
            if (client.isInChannel(testChannel)) {
                console.log("Removed user from channel");
                testChannel.removeClient(client);
            } else {
                console.log("Added user to channel");
                testChannel.addClient(client);
            }
        }
    }, 3000);
});

server.on("disconnection", ({ client }) => {
    testChannel.removeClient(client);
    console.log("User disconnected :(");
});

setInterval(() => {
    testEntity.counter ++;
}, 1000);
