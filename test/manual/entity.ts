import { Entity, Server } from "../../lib";

class TestEntity extends Entity {
    um = 1;
    dois = 2;

    method() {
        console.log("test");
    }

    arrow = () => {
        console.log("arrow");
    }

    test = {
        a: {
            b: {
                c: 0
            }
        }
    }

    array = ["zero", "one", "two"];
}

const server = new Server();

const entity = new TestEntity(server);

console.log(server.state.view());

entity.array.push("three");
entity.array.push("four");

const four = server.state.entries[`${entity.id}.array.4`];

entity.array.pop();
console.log(server.state.view());
console.log(four.read());
console.log(entity.array);