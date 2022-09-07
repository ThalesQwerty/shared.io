import { SharedState2 } from "../../lib/core/SharedState2";

describe("Shared state", () => {

    let state: SharedState2;

    beforeEach(() => {
        state = new SharedState2();
    });

    afterEach(() => {
        state.clear();
    });

    describe("Value assignment", () => {

        it("Writes primitives", () => {
            expect(state.entries).toEqual({});
            expect(state.read("a")).toBeUndefined();
            expect(state.read("b")).toBeUndefined();
            expect(state.read("c")).toBeUndefined();
            expect(state.read("d")).toBeUndefined();

            state.write("a", 1);
            state.write("b", "hello");
            state.write("c", false);

            expect(state.entries).toEqual({ a: 1, b: "hello", c: false });
            expect(state.read("a")).toBe(1);
            expect(state.read("b")).toBe("hello");
            expect(state.read("c")).toBe(false);
            expect(state.read("d")).toBeUndefined();

            state.write("a", 10);
            state.write("d", null);

            expect(state.entries).toEqual({ a: 10, b: "hello", c: false, d: null });
            expect(state.read("a")).toBe(10);
            expect(state.read("b")).toBe("hello");
            expect(state.read("c")).toBe(false);
            expect(state.read("d")).toBe(null);
        });

        it("Writes objects", () => {
            expect(state.entries).toEqual({});
            state.write("person1.name", "Alice");
            state.write("person1.age", 21);
            state.write("person2.name", "Bob");
            state.write("person2.age", 23);

            expect(state.entries).toEqual({ person1: { name: "Alice", age: 21 }, person2: { name: "Bob", age: 23 } });

            expect(state.read("person1")).toHaveProperty("name", "Alice");
            expect(state.read("person1")).toHaveProperty("age", 21);
            expect(state.read("person1.name")).toBe("Alice");
            expect(state.read("person1.age")).toBe(21);

            expect(state.read("person2")).toHaveProperty("name", "Bob");
            expect(state.read("person2")).toHaveProperty("age", 23);
            expect(state.read("person2.name")).toBe("Bob");
            expect(state.read("person2.age")).toBe(23);

            expect(state.read("person3")).toBeUndefined();

            state.write("person1.age", 22);
            state.write("person2.name", "Bob!");

            expect(state.entries).toEqual({ person1: { name: "Alice", age: 22 }, person2: { name: "Bob!", age: 23 } });

            expect(state.read("person1")).toHaveProperty("name", "Alice");
            expect(state.read("person1")).toHaveProperty("age", 22);
            expect(state.read("person1.name")).toBe("Alice");
            expect(state.read("person1.age")).toBe(22);

            expect(state.read("person2")).toHaveProperty("name", "Bob!");
            expect(state.read("person2")).toHaveProperty("age", 23);
            expect(state.read("person2.name")).toBe("Bob!");
            expect(state.read("person2.age")).toBe(23);

            expect(state.read("person3")).toBeUndefined();
        });

        it("Writes arrays", () => {
            state.write("array", []);
            expect(state.entries).toEqual({ array: [] });

            state.write("array.0", "first");
            expect(state.entries).toEqual({ array: ["first"] });
            expect(state.read("array.0")).toBe("first");

            state.write("array.1", "second");
            state.write("array.3", "fourth");
            expect(state.entries).toEqual({ array: ["first", "second", undefined, "fourth"] });
            expect(state.read("array.0")).toBe("first");
            expect(state.read("array.1")).toBe("second");
            expect(state.read("array.2")).toBeUndefined();
            expect(state.read("array.3")).toBe("fourth");
        });

    })

    describe("Proxy handling", () => {
        it("Proxies objects", () => {
            const test = state.write("test", { a: 1, b: 2, c: 3 }) as any;
            expect(state.entries).toEqual({ test: { a: 1, b: 2, c: 3 } });

            test.a = 3;
            expect(state.entries).toEqual({ test: { a: 3, b: 2, c: 3 } });

            test.newValue = "hello!";
            expect(state.entries).toEqual({ test: { a: 3, b: 2, c: 3, newValue: "hello!" } });

            delete test.newValue;
            expect(state.entries).toEqual({ test: { a: 3, b: 2, c: 3 } });
        });

        it("Proxies arrays", () => {
            const test = state.write("test", [1, 2, 3]);
            expect(state.entries).toEqual({ test: [1, 2, 3] });

            test.push(4, 5, 6);
            expect(state.entries).toEqual({ test: [1, 2, 3, 4, 5, 6] });

            test.unshift(0);
            expect(state.entries).toEqual({ test: [0, 1, 2, 3, 4, 5, 6] });

            test.pop();
            test.shift();
            expect(state.entries).toEqual({ test: [1, 2, 3, 4, 5] });

            test.splice(1, 3);
            expect(state.entries).toEqual({ test: [1, 5] });

            test.reverse();
            expect(state.entries).toEqual({ test: [5, 1] });

            test[3] = 0;
            expect(state.entries).toEqual({ test: [5, 1, undefined, 0] });
        });

        it("Proxies new nested objects", () => {
            const test = state.write("test", { a: 1 }) as any;
            expect(state.entries).toEqual({ test: { a: 1 } });

            test.b = {};
            expect(state.entries).toEqual({ test: { a: 1, b: {} } });

            test.b.c = 0;
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0 } } });

            test.b.d = 10;
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0, d: 10 } } });

            test.b.x = { y: 2 };
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0, d: 10, x: { y: 2 } } } });

            test.b.x.y = 3;
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0, d: 10, x: { y: 3 } } } });

            test.b.x.z = 4;
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0, d: 10, x: { y: 3, z: 4 } } } });
        });

        it("Proxies existing nested objects", () => {
            const test = state.write("test", { a: 1, b: { x: { y: 2 } } }) as any;
            expect(state.entries).toEqual({ test: { a: 1, b: { x: { y: 2 } } } });

            test.b.c = 0;
            expect(state.entries).toEqual({ test: { a: 1, b: { x: { y: 2 }, c: 0 } } });

            test.b.d = 10;
            expect(state.entries).toEqual({ test: { a: 1, b: { x: { y: 2 }, c: 0, d: 10 } } });

            test.b.x.y = 3;
            expect(state.entries).toEqual({ test: { a: 1, b: { x: { y: 3 }, c: 0, d: 10 } } });

            test.b.x.z = 4;
            expect(state.entries).toEqual({ test: { a: 1, b: { x: { y: 3, z: 4 }, c: 0, d: 10 } } });
        });

        it("Disconnects proxies on object reassignment", () => {
            const first = state.write("test", { a: 1, b: 2, c: 3 }) as any;
            expect(state.entries).toEqual({ test: { a: 1, b: 2, c: 3 } });

            first.a = 10;
            expect(state.entries).toEqual({ test: { a: 10, b: 2, c: 3 } });

            const second = state.write("test", { x: 1, y: 2, z: 3 }) as any;
            expect(state.entries).toEqual({ test: { x: 1, y: 2, z: 3 } });

            second.y = 20;
            expect(state.entries).toEqual({ test: { x: 1, y: 20, z: 3 } });

            first.c = 30;
            expect(state.entries).toEqual({ test: { x: 1, y: 20, z: 3 } });

            second.z = 30;
            expect(state.entries).toEqual({ test: { x: 1, y: 20, z: 30 } });
        });

        it("Disconnects deep proxies on object reassignment", () => {
            const test = state.write("test", { a: 1, b: {} }) as any;
            expect(state.entries).toEqual({ test: { a: 1, b: {} } });

            const first = test.b;
            expect(state.entries).toEqual({ test: { a: 1, b: {} } });

            first.c = 0;
            expect(state.entries).toEqual({ test: { a: 1, b: { c: 0 } } });

            const second = test.b = {} as any;
            expect(state.entries).toEqual({ test: { a: 1, b: {} } });

            second.d = 10;
            expect(state.entries).toEqual({ test: { a: 1, b: { d: 10 } } });

            first.c = 1;
            expect(state.entries).toEqual({ test: { a: 1, b: { d: 10 } } });

            second.e = { f: 2 };
            expect(state.entries).toEqual({ test: { a: 1, b: { d: 10, e: { f: 2 } } } });
        });
    })
});