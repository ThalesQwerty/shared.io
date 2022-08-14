import { Client, EntryEvent, KeyValue, Server } from "../../lib";

describe("Proxy Controller", () => {

    describe("Objects", () => {

        const state = new Server().state;
        let lastChange: Omit<EntryEvent<"change">, "entry">|null = null;

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

            state.on("write", ({ key, oldValue, newValue }) => lastChange = {key, oldValue, newValue});
        });

        afterEach(() => {
            state.clear();
        });

        it ("Stores keys with preffixes", () => {
            state.write("object", object);

            expect(state.read("object")).toEqual({a: 1, b: 2, c: 3, deep: { nested: 4 }});
            expect(state.read("object.a")).toBe(1);
            expect(state.read("object.b")).toBe(2);
            expect(state.read("object.c")).toBe(3);
            expect(state.read("object.deep")).toEqual({ nested: 4 });
            expect(state.read("object.deep.nested")).toBe(4);
        });

        it ("Detects changes correctly", () => {
            const proxy = state.write("object", object);

            proxy.a = 10;
            expect(lastChange).toEqual({ key: "object.a", oldValue: 1, newValue: 10 });

            delete proxy.b;
            expect(lastChange).toEqual({ key: "object.b", oldValue: 2, newValue: null });
            expect(state.read("object.b")).toBeNull()

            proxy.deep.nested = 40;
            expect(lastChange).toEqual({ key: "object.deep.nested", oldValue: 4, newValue: 40 });

            proxy.deep.new = 50;
            expect(state.read("object.deep.new")).toBe(50);

            delete proxy.deep;
            expect(state.read("object.deep")).toBeNull();
            expect(state.read("object.deep.nested")).toBeNull();
            expect(state.read("object.deep.new")).toBeNull();

            expect(state.read("object")).toEqual({a: 10, c: 3});
        });

        it ("Overwrites objects correctly", () => {
            const newProxy = state.write("object", newObject);

            expect(state.read("object")).toEqual({x: 1, y: 2, z: 3});
            expect(state.read("object.a")).toBeNull();
            expect(state.read("object.c")).toBeNull();
            expect(state.read("object.x")).toBe(1);
            expect(state.read("object.y")).toBe(2);
            expect(state.read("object.z")).toBe(3);

            newProxy.x = 10;
            expect(lastChange).toEqual({ key: "object.x", oldValue: 1, newValue: 10 });

            delete newProxy.y;
            expect(lastChange).toEqual({ key: "object.y", oldValue: 2, newValue: null });

            newProxy.z = {
                a: 1
            };
            expect(lastChange).toEqual({ key: "object.z", oldValue: 3, newValue: { a: 1 } });
            expect(state.read("object.z")).toEqual({ a: 1 });
            expect(state.read("object.z.a")).toBe(1);

            newProxy.z.a = 10;
            expect(lastChange).toEqual({ key: "object.z.a", oldValue: 1, newValue: 10 });
        });

        it ("Disconnects overwritten objects' proxy", () => {
            const oldProxy = state.write("object", object);
            oldProxy.a = 10;
            expect(state.read("object.a")).toBe(10);
            expect(lastChange).toEqual({ key: "object.a", oldValue: 1, newValue: 10 });

            const newProxy = state.write("object", newObject);

            newProxy.z = 30;
            oldProxy.a = 100;
            expect(state.read("object.a")).toBeNull();
            expect(lastChange).toEqual({ key: "object.z", oldValue: 3, newValue: 30 });
        });

        it ("Detects circular references", () => {
            const parent = state.write("circular", circularObject);

            expect(state.read("circular")).toBeTruthy();
            expect(state.read("circular.a")).toBe(1);
            expect(state.read("circular.b")).toBe(2);
            expect(state.read("circular.c")).toBe(3);
            expect(state.read("circular.x")).toBeNull();
            expect(state.read("circular.y")).toBeNull();
            expect(state.read("circular.z")).toBeNull();

            expect(state.read("circular.child")).toBeTruthy();
            expect(state.read("circular.child.x")).toBe(1);
            expect(state.read("circular.child.y")).toBe(2);
            expect(state.read("circular.child.z")).toBe(3);
            expect(state.read("circular.child.a")).toBeNull();
            expect(state.read("circular.child.b")).toBeNull();
            expect(state.read("circular.child.c")).toBeNull();

            expect(state.read("circular.child.parent")).toBeTruthy();
            expect(state.read("circular.child.parent.a")).toBe(1);
            expect(state.read("circular.child.parent.b")).toBe(2);
            expect(state.read("circular.child.parent.c")).toBe(3);
            expect(state.read("circular.child.parent.x")).toBeNull();
            expect(state.read("circular.child.parent.y")).toBeNull();
            expect(state.read("circular.child.parent.z")).toBeNull();

            expect(state.read("circular.child.parent.child")).toBeNull();
            expect(state.read("circular.child.parent.child.x")).toBeNull();
            expect(state.read("circular.child.parent.child.y")).toBeNull();
            expect(state.read("circular.child.parent.child.z")).toBeNull();
            expect(state.read("circular.child.parent.child.a")).toBeNull();
            expect(state.read("circular.child.parent.child.b")).toBeNull();
            expect(state.read("circular.child.parent.child.c")).toBeNull();

            expect(state.read("circular.child.parent.child.parent")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.a")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.b")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.c")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.x")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.y")).toBeNull();
            expect(state.read("circular.child.parent.child.parent.z")).toBeNull();
        });
    });

    describe("Arrays", () => {
        const state = new Server().state;
        let lastChange: Omit<EntryEvent<"change">, "entry">|null = null;

        let proxy: any[] = [];

        beforeEach(() => {
            proxy = state.write("array", [0, 1, 2, 3, 4]);

            state.on("write", ({ key, oldValue, newValue }) => lastChange = {key, oldValue, newValue});
        });

        afterEach(() => {
            state.clear();
        });

        it ("Maps the indexes correctly", () => {
            expect(state.read("array")).toEqual([0, 1, 2, 3, 4]);
            expect(state.read("array.0")).toBe(0);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);
            expect(state.read("array.4")).toBe(4);
            expect(state.read("array.5")).toBeNull();
            expect(state.read("array.-1")).toBeNull();
            expect(state.read("array.a")).toBeNull();
        });

        it ("Handles element changes via index setting", () => {
            proxy[0] = 50;
            expect(state.read("array")).toEqual([50, 1, 2, 3, 4]);
            expect(state.read("array.0")).toBe(50);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);
            expect(state.read("array.4")).toBe(4);
            expect(lastChange).toEqual({ key: "array.0", oldValue: 0, newValue: 50 });

            proxy[6] = 100;
            expect(state.read("array")).toEqual([50, 1, 2, 3, 4,, 100]);
            expect(state.read("array.0")).toBe(50);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);
            expect(state.read("array.4")).toBe(4);
            expect(state.read("array.5")).toBeNull();
            expect(state.read("array.6")).toBe(100);
            expect(lastChange).toEqual({ key: "array.6", oldValue: null, newValue: 100 });
        });

        it ("Handles new elements via push() and unshift()", () => {
            proxy.push(5);
            expect(state.read("array")).toEqual([0, 1, 2, 3, 4, 5]);
            expect(state.read("array.0")).toBe(0);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);
            expect(state.read("array.4")).toBe(4);

            proxy.unshift(-1);
            expect(state.read("array")).toEqual([-1, 0, 1, 2, 3, 4, 5]);
            expect(state.read("array.0")).toBe(-1);
            expect(state.read("array.1")).toBe(0);
            expect(state.read("array.2")).toBe(1);
            expect(state.read("array.3")).toBe(2);
            expect(state.read("array.4")).toBe(3);
            expect(state.read("array.5")).toBe(4);
            expect(state.read("array.6")).toBe(5);
        });

        it ("Handles deletions via pop() and shift()", () => {
            proxy.pop();
            expect(state.read("array")).toEqual([0, 1, 2, 3]);
            expect(state.read("array.0")).toBe(0);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);

            proxy.shift();
            expect(state.read("array")).toEqual([1, 2, 3]);
            expect(state.read("array.0")).toBe(1);
            expect(state.read("array.1")).toBe(2);
            expect(state.read("array.2")).toBe(3);
        });

        it ("Handles reverse() and sort()", () => {
            proxy.reverse();
            expect(state.read("array")).toEqual([4, 3, 2, 1, 0]);
            expect(state.read("array.0")).toBe(4);
            expect(state.read("array.1")).toBe(3);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(1);
            expect(state.read("array.4")).toBe(0);

            proxy.sort();
            expect(state.read("array")).toEqual([0, 1, 2, 3, 4]);
            expect(state.read("array.0")).toBe(0);
            expect(state.read("array.1")).toBe(1);
            expect(state.read("array.2")).toBe(2);
            expect(state.read("array.3")).toBe(3);
            expect(state.read("array.4")).toBe(4);
        });

        it ("Overwrites array", () => {
            const newProxy = state.write("array", [1.41, 3.14, 2.78]);
            expect(state.read("array")).toEqual([1.41, 3.14, 2.78]);
            expect(state.read("array.0")).toBe(1.41);
            expect(state.read("array.1")).toBe(3.14);
            expect(state.read("array.2")).toBe(2.78);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();

            newProxy[2] = -1;
            expect(state.read("array")).toEqual([1.41, 3.14, -1]);
            expect(state.read("array.0")).toBe(1.41);
            expect(state.read("array.1")).toBe(3.14);
            expect(state.read("array.2")).toBe(-1);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();

            newProxy.sort();
            expect(state.read("array")).toEqual([-1, 1.41, 3.14]);
            expect(state.read("array.0")).toBe(-1);
            expect(state.read("array.1")).toBe(1.41);
            expect(state.read("array.2")).toBe(3.14);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();

            newProxy.push(2.78);
            expect(state.read("array")).toEqual([-1, 1.41, 3.14, 2.78]);
            expect(state.read("array.0")).toBe(-1);
            expect(state.read("array.1")).toBe(1.41);
            expect(state.read("array.2")).toBe(3.14);
            expect(state.read("array.3")).toBe(2.78);
            expect(state.read("array.4")).toBeNull();
        });

        it ("Disconnects old proxy on overwrite", () => {
            const newProxy = state.write("array", [1.41, 3.14, 2.78]);
            expect(state.read("array")).toEqual([1.41, 3.14, 2.78]);
            expect(state.read("array.0")).toBe(1.41);
            expect(state.read("array.1")).toBe(3.14);
            expect(state.read("array.2")).toBe(2.78);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();

            proxy[0] = 42;
            expect(state.read("array")).toEqual([1.41, 3.14, 2.78]);
            expect(state.read("array.0")).toBe(1.41);
            expect(state.read("array.1")).toBe(3.14);
            expect(state.read("array.2")).toBe(2.78);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();

            newProxy[0] = 42;
            expect(state.read("array")).toEqual([42, 3.14, 2.78]);
            expect(state.read("array.0")).toBe(42);
            expect(state.read("array.1")).toBe(3.14);
            expect(state.read("array.2")).toBe(2.78);
            expect(state.read("array.3")).toBeNull();
            expect(state.read("array.4")).toBeNull();
        });
    });

})