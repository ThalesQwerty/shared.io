import { Entity, Server, Decorators } from "../../lib";

const { input, output, inputIf, outputIf, hidden, hiddenIf, flag } = Decorators("ally", "test");

class TestEntity extends Entity {
    @flag ally = true;
    @flag test = false;

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
