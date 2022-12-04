import { Entity, Server, Decorators, HasId, Client } from "../../lib";
import { Flag } from "../../lib/api/Flag";

const { input, output, hidden, inputIf, outputIf, hiddenIf, flag } = Decorators("ally");

class TestEntity extends Entity {
    @flag ally = new Flag(this);

    @input um = 1;

    @inputIf(f => f.ally && f.owner)
    @outputIf(f => true)
    dois = 2;

    method() {
        console.log("test");
    }

    arrow = () => {
        console.log("arrow");
    }
}

console.log("Oi!");

const server = new Server();

const entity = new TestEntity(server);

process.nextTick(() => {
    console.dir(TestEntity.schema, { depth: null });
});
