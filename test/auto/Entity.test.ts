import { Channel, Client, Entity, Server } from "../../lib";
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

describe("Entity", () => {
    const server = new Server();
    const channel = new Channel(server);
    const { state } = server;

    beforeEach(() => {

    });

    afterEach(() => {
        state.clear();
    });

    describe("Default properties", () => {
        it("Assigns owner correctly", () => {
            const client = new Client(server);

            channel.addClient(client);

            const entity = new TestEntity(channel);
            const ownedEntity = new TestEntity(channel, client);

            expect(entity.owner).toBeNull();
            expect(ownedEntity.owner).toBe(client);

            channel.removeClient(client);
        });
    })

    describe("Proxy", () => {
        it("Writes new entities into state", () => {
            const entity = new TestEntity(channel);
            const { id } = entity;

            expect(state.entries).toHaveProperty(id);
            expect(state.read(id)).toBeTruthy();

            expect(state.read(`${id}.id`)).toBe(id);
            expect(state.read(`${id}.type`)).toBe("TestEntity");
            expect(state.read(`${id}.owner`)).toBeNull();
            expect(state.read(`${id}.um`)).toBe(1);
            expect(state.read(`${id}.dois`)).toBe(2);
            expect(state.read(`${id}.arrow`)).toBeInstanceOf(Function);
            expect(state.read(`${id}.test`)).toEqual({a: {b: {c: 0}}});
            expect(state.read(`${id}.test.a`)).toEqual({b: {c: 0}});
            expect(state.read(`${id}.test.a.b`)).toEqual({c: 0});
            expect(state.read(`${id}.test.a.b.c`)).toBe(0);
            expect(state.read(`${id}.array`)).toEqual(["zero", "one", "two"]);
            expect(state.read(`${id}.array.0`)).toEqual("zero");
            expect(state.read(`${id}.array.1`)).toEqual("one");
            expect(state.read(`${id}.array.2`)).toEqual("two");
        });

        it("Writes entity updates into state", () => {
            const entity = new TestEntity(channel);
            const { id } = entity;

            expect(state.read(`${id}.um`)).toBe(1);
            entity.um = 10;
            expect(state.read(`${id}.um`)).toBe(10);

            expect(state.read(`${id}.dois`)).toBe(2);
            entity.dois = 20;
            expect(state.read(`${id}.dois`)).toBe(20);

            expect(state.read(`${id}.test`)).toEqual({a: {b: {c: 0}}});
            entity.test.a.b.c = 30;
            expect(state.read(`${id}.test`)).toEqual({a: {b: {c: 30}}});
            expect(state.read(`${id}.test.a`)).toEqual({b: {c: 30}});
            expect(state.read(`${id}.test.a.b`)).toEqual({c: 30});
            expect(state.read(`${id}.test.a.b.c`)).toBe(30);

            expect(state.read(`${id}.test.newProperty`)).toBeUndefined();
            (entity.test as any).newProperty = "test";
            expect(state.read(`${id}.test`)).toEqual({a: {b: {c: 30}}, newProperty: "test"});
            expect(state.read(`${id}.test.newProperty`)).toBe("test");

            expect(state.read(`${id}.array.3`)).toBeUndefined();
            entity.array.push("three");
            expect(state.read(`${id}.array`)).toEqual(["zero", "one", "two", "three"]);
            expect(state.read(`${id}.array.3`)).toBe("three");
        });
    });
});