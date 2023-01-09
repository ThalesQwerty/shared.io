import { Entity, Server, Decorators, HasId, Client, Channel } from "../../lib";
import { Flag } from "../../lib/api/Flag";

const { input, output, hidden, inputIf, outputIf, hiddenIf, flag } = Decorators("ally");

class TestEntity extends Entity {
    @flag ally = new Flag(this);

    @input um = 1;

    @inputIf(f => f.ally && f.owner)
    @outputIf(f => true)
    @output dois = 2;

    @input
    method(client?: Client) {
        console.log(client ? `Method called by client ${client.id}` : "Method called by server");
    }

    @input
    arrow = () => {
        console.log("arrow");
    }
}

class TestChannel extends Channel {}

const server = new Server({
    port: 3000
}).start();

const testChannel = new TestChannel(server);
const testEntity = new TestEntity(testChannel);

console.dir(testEntity.schema, { depth: null });

server.on("connection", ({ client }) => {
    testChannel.addClient(client);
    console.log("New user connected! :)");
});

server.on("disconnection", ({ client }) => {
    testChannel.removeClient(client);
    console.log("User disconnected :(");
});