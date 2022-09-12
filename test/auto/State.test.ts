import { KeyValue } from "../../lib";
import { SharedState } from "../../lib/core/SharedState";

describe("Shared state", () => {

    let state: SharedState;

    beforeEach(() => {
        state = new SharedState();
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

    describe("Proxy assignment", () => {
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
    })

    describe("Proxy reassignment", () => {
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
    }),

    describe("Cirular references", () => {

        let object: KeyValue = {};
        let newObject: KeyValue = {};
        let circularObject: KeyValue = {};

        beforeEach(() => {
            const generateCircularObject = (circularObjectParent: KeyValue = {child: null, a: 1, b: 2, c: 3}) => {
                const generateCircularObjectChild = (parent: typeof circularObject) => ({ parent, x: 1, y: 2, z: 3 });
                circularObjectParent.child = generateCircularObjectChild(circularObjectParent);
                return circularObjectParent;
            }

            object = {a: 1, b: 2, c: 3, deep: { nested: 4 }};
            newObject = {x: 1, y: 2, z: 3};
            circularObject = generateCircularObject();
        });

        it ("Handles circular references", () => {
            state.write("circular", circularObject);

            expect(state.read("circular")).toBeTruthy();
            expect(state.read("circular.a")).toBe(1);
            expect(state.read("circular.b")).toBe(2);
            expect(state.read("circular.c")).toBe(3);
            expect(state.read("circular.x")).toBeUndefined();
            expect(state.read("circular.y")).toBeUndefined();
            expect(state.read("circular.z")).toBeUndefined();

            expect(state.read("circular.child")).toBeTruthy();
            expect(state.read("circular.child.x")).toBe(1);
            expect(state.read("circular.child.y")).toBe(2);
            expect(state.read("circular.child.z")).toBe(3);
            expect(state.read("circular.child.a")).toBeUndefined();
            expect(state.read("circular.child.b")).toBeUndefined();
            expect(state.read("circular.child.c")).toBeUndefined();

            expect(state.read("circular.child.parent")).toBeTruthy();
            expect(state.read("circular.child.parent.a")).toBe(1);
            expect(state.read("circular.child.parent.b")).toBe(2);
            expect(state.read("circular.child.parent.c")).toBe(3);
            expect(state.read("circular.child.parent.x")).toBeUndefined();
            expect(state.read("circular.child.parent.y")).toBeUndefined();
            expect(state.read("circular.child.parent.z")).toBeUndefined();

            expect(state.read("circular.child.parent.child")).toBeTruthy();
            expect(state.read("circular.child.parent.child.x")).toBe(1);
            expect(state.read("circular.child.parent.child.y")).toBe(2);
            expect(state.read("circular.child.parent.child.z")).toBe(3);
            expect(state.read("circular.child.parent.child.a")).toBeUndefined();
            expect(state.read("circular.child.parent.child.b")).toBeUndefined();
            expect(state.read("circular.child.parent.child.c")).toBeUndefined();

            expect(state.read("circular.child.parent.child.parent")).toBeTruthy();
            expect(state.read("circular.child.parent.child.parent.a")).toBe(1);
            expect(state.read("circular.child.parent.child.parent.b")).toBe(2);
            expect(state.read("circular.child.parent.child.parent.c")).toBe(3);
            expect(state.read("circular.child.parent.child.parent.x")).toBeUndefined();
            expect(state.read("circular.child.parent.child.parent.y")).toBeUndefined();
            expect(state.read("circular.child.parent.child.parent.z")).toBeUndefined();
        });

        it ("Proxies circular references", () => {
            const circular = state.write("circular", circularObject);

            expect(circular).toBeTruthy();
            expect(circular.child).toBeTruthy();
            expect(circular.child.parent).toBeTruthy();
            expect(circular.child.parent.child).toBeTruthy();
            expect(circular.child.parent.child.parent).toBeTruthy();
            expect(circular.child.parent.child.parent.child).toBeTruthy();
            expect(circular.child.parent.child.parent.child.parent).toBeTruthy();
            expect(circular.child.parent.child.parent.child.parent.child).toBeTruthy();
            expect(circular.child.parent.child.parent.child.parent.child.parent).toBeTruthy();
            expect(circular.child.parent.child.parent.child.parent.child.parent.child).toBeTruthy();

            expect(circular.a).toBe(1);
            expect(circular.b).toBe(2);
            expect(circular.c).toBe(3);
            expect(circular.child.x).toBe(1);
            expect(circular.child.y).toBe(2);
            expect(circular.child.z).toBe(3);
            expect(circular.child.parent.a).toBe(1);
            expect(circular.child.parent.b).toBe(2);
            expect(circular.child.parent.c).toBe(3);
            expect(circular.child.parent.child.x).toBe(1);
            expect(circular.child.parent.child.y).toBe(2);
            expect(circular.child.parent.child.z).toBe(3);
            expect(circular.child.parent.child.parent.a).toBe(1);
            expect(circular.child.parent.child.parent.b).toBe(2);
            expect(circular.child.parent.child.parent.c).toBe(3);
            expect(circular.child.parent.child.parent.child.x).toBe(1);
            expect(circular.child.parent.child.parent.child.y).toBe(2);
            expect(circular.child.parent.child.parent.child.z).toBe(3);

            circular.a = 10;
            expect(state.read("circular.a")).toBe(10);

            circular.child.x = 10;
            expect(state.read("circular.child.x")).toBe(10);

            circular.child.parent.b = 20;
            expect(state.read("circular.b")).toBe(20);

            circular.child.parent.child.y = 20;
            expect(state.read("circular.child.y")).toBe(20);
        });
    });
});