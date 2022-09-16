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

console.log("Oi!");

const server = new Server();

const entity = new TestEntity(server);

console.log("entries", server.state.entries);

entity.array.push("three");
entity.array.push("four");

entity.array.pop();
console.log(server.state.entries);
console.log(entity.array);