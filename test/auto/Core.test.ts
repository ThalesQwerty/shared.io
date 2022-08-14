import { Client, EntryEvent, KeyValue, Server } from "../../lib";

describe("Shared state", () => {
    it ("Lists the entries", () => {
        const state = new Server().state;

        state.write("name", "Thales");
        state.write("age", 21);
        state.write("gender", "Male");
        state.write("verified", true);
        state.write("nothing", null);

        const { entries } = state;

        expect(entries.name.key).toBe("name");
        expect(entries.name.read()).toBe("Thales");

        expect(entries.age.key).toBe("age");
        expect(entries.age.read()).toBe(21);

        expect(entries.gender.key).toBe("gender");
        expect(entries.gender.read()).toBe("Male");

        expect(entries.verified.key).toBe("verified");
        expect(entries.verified.read()).toBe(true);

        expect(entries.nothing.key).toBe("nothing");
        expect(entries.nothing.read()).toBeNull();

        expect(entries).not.toHaveProperty("whatever");
        expect(entries).not.toHaveProperty("random");
    });

    it ("Adds and removes entries", () => {
        const state = new Server().state;

        expect(Object.keys(state.entries)).toEqual([]);

        state.write("name", "Thales");

        const nameEntry = state.entries.name;

        expect(Object.keys(state.entries)).toEqual(["name"]);
        expect(nameEntry.read()).toBe("Thales");

        state.delete("name");

        expect(Object.keys(state.entries)).toEqual([]);
        expect(nameEntry.read()).toBeNull();
    });

    it ("Deals correctly with objects", () => {
        const state = new Server().state;
        const { entries } = state;

        const object = {a: 1, b: 2, c: 3, deep: { nested: 4 }};
        let lastChange:EntryEvent<"change">|null = null;

        const proxy:KeyValue= state.write("object", object);

        expect(entries.object.read()).toEqual({a: 1, b: 2, c: 3, deep: { nested: 4 }});
        expect(entries["object.a"].read()).toBe(1);
        expect(entries["object.b"].read()).toBe(2);
        expect(entries["object.c"].read()).toBe(3);
        expect(entries["object.deep"].read()).toEqual({ nested: 4 });
        expect(entries["object.deep.nested"].read()).toBe(4);

        state.listEntries().forEach(entry => entry.on("change", event => lastChange = event));

        proxy.a = 10;
        expect(lastChange).toEqual({ entry: state.entries["object.a"], oldValue: 1, newValue: 10 });

        const entryB = state.entries["object.b"];
        delete proxy.b;
        expect(lastChange).toEqual({ entry: entryB, oldValue: 2, newValue: null });
        expect(entries["object.b"]).toBeUndefined()

        proxy.deep.nested = 40;
        expect(lastChange).toEqual({ entry: state.entries["object.deep.nested"], oldValue: 4, newValue: 40 });

        proxy.deep.new = 50;
        expect(entries["object.deep.new"].read()).toBe(50);

        delete proxy.deep;
        expect(entries["object.deep"]).toBeUndefined();
        expect(entries["object.deep.nested"]).toBeUndefined();
        expect(entries["object.deep.new"]).toBeUndefined();

        expect(entries.object.read()).toEqual({a: 10, c: 3});

        const newObject: KeyValue = {x: 1, y: 2, z: 3};

        const newProxy = state.write("object", newObject);
        expect(entries.object.read()).toEqual({x: 1, y: 2, z: 3});
        expect(entries["object.a"]).toBeUndefined();
        expect(entries["object.c"]).toBeUndefined();
        expect(entries["object.x"].read()).toBe(1);
        expect(entries["object.y"].read()).toBe(2);
        expect(entries["object.z"].read()).toBe(3);

        state.listEntries().forEach(entry => entry.on("change", event => lastChange = event));

        newProxy.x = 10;
        expect(lastChange).toEqual({ entry: state.entries["object.x"], oldValue: 1, newValue: 10 });

        const entryY = state.entries["object.y"];
        delete newProxy.y;
        expect(lastChange).toEqual({ entry: entryY, oldValue: 2, newValue: null });

        newProxy.z = {
            a: 1
        };
        expect(lastChange).toEqual({ entry: state.entries["object.z"], oldValue: 3, newValue: { a: 1 } });
        expect(entries["object.z"].read()).toEqual({ a: 1 });
        expect(entries["object.z.a"].read()).toBe(1);

        state.listEntries().forEach(entry => entry.on("change", event => lastChange = event));

        newProxy.z.a = 10;
        expect(lastChange).toEqual({ entry: state.entries["object.z.a"], oldValue: 1, newValue: 10 });

        // old proxy should be revoked
        proxy.a = 30;
        expect(entries["object.a"]).toBeUndefined();
        expect(lastChange).toEqual({ entry: state.entries["object.z.a"], oldValue: 1, newValue: 10 });
    });

    it ("Deals correctly with arrays", () => {
        const state = new Server().state;
        const { entries } = state;

        const array = [0, 1, 2, 3, 4];

        const proxy = state.write("array", array);
        expect(entries.array.read()).toEqual([0, 1, 2, 3, 4]);
        expect(entries["array.0"].read()).toBe(0);
        expect(entries["array.1"].read()).toBe(1);
        expect(entries["array.2"].read()).toBe(2);
        expect(entries["array.3"].read()).toBe(3);
        expect(entries["array.4"].read()).toBe(4);
        expect(entries["array.5"]).toBeUndefined();

        proxy.push(5);
        expect(entries.array.read()).toEqual([0, 1, 2, 3, 4, 5]);
        expect(entries["array.0"].read()).toBe(0);
        expect(entries["array.1"].read()).toBe(1);
        expect(entries["array.2"].read()).toBe(2);
        expect(entries["array.3"].read()).toBe(3);
        expect(entries["array.4"].read()).toBe(4);
        expect(entries["array.5"].read()).toBe(5);

        proxy.unshift(-1);
        expect(entries.array.read()).toEqual([-1, 0, 1, 2, 3, 4, 5]);
        expect(entries["array.0"].read()).toBe(-1);
        expect(entries["array.1"].read()).toBe(0);
        expect(entries["array.2"].read()).toBe(1);
        expect(entries["array.3"].read()).toBe(2);
        expect(entries["array.4"].read()).toBe(3);
        expect(entries["array.5"].read()).toBe(4);
        expect(entries["array.6"].read()).toBe(5);

        proxy.pop();
        expect(entries.array.read()).toEqual([-1, 0, 1, 2, 3, 4]);
        expect(entries["array.0"].read()).toBe(-1);
        expect(entries["array.1"].read()).toBe(0);
        expect(entries["array.2"].read()).toBe(1);
        expect(entries["array.3"].read()).toBe(2);
        expect(entries["array.4"].read()).toBe(3);
        expect(entries["array.5"].read()).toBe(4);

        proxy.shift();
        expect(entries.array.read()).toEqual([0, 1, 2, 3, 4]);
        expect(entries["array.0"].read()).toBe(0);
        expect(entries["array.1"].read()).toBe(1);
        expect(entries["array.2"].read()).toBe(2);
        expect(entries["array.3"].read()).toBe(3);
        expect(entries["array.4"].read()).toBe(4);

        proxy.reverse();
        expect(entries.array.read()).toEqual([4, 3, 2, 1, 0]);
        expect(entries["array.0"].read()).toBe(4);
        expect(entries["array.1"].read()).toBe(3);
        expect(entries["array.2"].read()).toBe(2);
        expect(entries["array.3"].read()).toBe(1);
        expect(entries["array.4"].read()).toBe(0);

        const newArray = [1.69, 3.14, 2.78, 1.41];
        const newProxy = state.write("array", newArray);

        expect(entries.array.read()).toEqual([1.69, 3.14, 2.78, 1.41]);
        expect(entries["array.0"].read()).toBe(1.69);
        expect(entries["array.1"].read()).toBe(3.14);
        expect(entries["array.2"].read()).toBe(2.78);
        expect(entries["array.3"].read()).toBe(1.41);
        expect(entries["array.4"]).toBeUndefined();

        newProxy.sort();
        expect(entries.array.read()).toEqual([1.41, 1.69, 2.78, 3.14]);
        expect(entries["array.0"].read()).toBe(1.41);
        expect(entries["array.1"].read()).toBe(1.69);
        expect(entries["array.2"].read()).toBe(2.78);
        expect(entries["array.3"].read()).toBe(3.14);

        newProxy.splice(1, 2);
        expect(entries.array.read()).toEqual([1.41, 3.14]);
        expect(entries["array.0"].read()).toBe(1.41);
        expect(entries["array.1"].read()).toBe(3.14);
        expect(entries["array.2"]).toBeUndefined();
        expect(entries["array.3"]).toBeUndefined();
    });

    it ("Adds and removes subscribers", () => {
        const state = new Server().state;
        const { entries } = state;

        const alice = new Client();
        const bob = new Client();
        const charles = new Client();

        state.write("entry", 0);
        const { entry } = entries;

        expect(entry.subscribers).toEqual([]);

        entry.addSubscriber(alice);
        expect(entry.subscribers.map(client => client.id)).toEqual([alice.id]);

        entry.addSubscriber(bob);
        expect(entry.subscribers.map(client => client.id)).toEqual([alice.id, bob.id]);

        entry.removeSubscriber(alice);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id]);

        entry.addSubscriber(alice);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id, alice.id]);

        entry.addSubscriber(charles);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id, alice.id, charles.id]);

        // Shouldn't add duplicate subscribers
        entry.addSubscriber(bob);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id, alice.id, charles.id]);

        entry.addSubscriber(alice);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id, alice.id, charles.id]);

        entry.addSubscriber(charles);
        expect(entry.subscribers.map(client => client.id)).toEqual([bob.id, alice.id, charles.id]);
        // -------------------------------

        entry.removeSubscriber(bob);
        expect(entry.subscribers.map(client => client.id)).toEqual([alice.id, charles.id]);

        entry.removeSubscriber(charles);
        expect(entry.subscribers.map(client => client.id)).toEqual([alice.id]);

        entry.removeSubscriber(alice);
        expect(entry.subscribers.map(client => client.id)).toEqual([]);
    });

    it ("Filters view based on subscribers", () => {
        const state = new Server().state;
        const { entries } = state;

        const alice = new Client();
        const bob = new Client();

        state.write("public", 0);
        state.write("aliceOnly", 1);
        state.write("bobOnly", 2);
        state.write("secret", 3);

        entries.public.addSubscriber(alice);
        entries.public.addSubscriber(bob);

        entries.aliceOnly.addSubscriber(alice);

        entries.bobOnly.addSubscriber(bob);

        expect(state.view()).toEqual({
            public: 0,
            aliceOnly: 1,
            bobOnly: 2,
            secret: 3
        });

        expect(state.view(alice)).toEqual({
            public: 0,
            aliceOnly: 1,
        });

        expect(state.view(bob)).toEqual({
            public: 0,
            bobOnly: 2,
        });
    });

    it ("Dispatches the send method on subscribers", () => {
        const state = new Server().state;
        const { entries } = state;

        const alice = new Client();
        const bob = new Client();

        const messagesSent = {
            alice: 0,
            bob: 0
        };

        alice.send = function(...params: Parameters<Client["send"]>) {
            messagesSent.alice ++;
            // Client.prototype.send.call(this, ...params);
        }

        bob.send = function(...params: Parameters<Client["send"]>) {
            messagesSent.bob ++;
            // Client.prototype.send.call(this, ...params);
        }

        state.write("public", 0);
        state.write("aliceOnly", 0);
        state.write("bobOnly", 0);
        state.write("secret", 0);

        entries.public.addSubscriber(alice);
        entries.public.addSubscriber(bob);

        entries.aliceOnly.addSubscriber(alice);

        entries.bobOnly.addSubscriber(bob);

        entries.public.write(1);
        expect(messagesSent.alice).toBe(1);
        expect(messagesSent.bob).toBe(1);

        entries.aliceOnly.write(1);
        expect(messagesSent.alice).toBe(2);
        expect(messagesSent.bob).toBe(1);

        entries.bobOnly.write(1);
        expect(messagesSent.alice).toBe(2);
        expect(messagesSent.bob).toBe(2);

        entries.secret.write(1);
        expect(messagesSent.alice).toBe(2);
        expect(messagesSent.bob).toBe(2);
    });

    it ("Knows when entries actually change on write", () => {
        const state = new Server().state;

        let totalChanges = 0;
        let oldValue = 0;
        let newValue = 0;

        state.write("entry", 0);
        const { entry } = state.entries;

        entry.on("change", event => {
            totalChanges ++;
            oldValue = event.oldValue;
            newValue = event.newValue;
        });

        expect(totalChanges).toBe(0);

        entry.write(0);
        expect(totalChanges).toBe(0);
        expect(oldValue).toBe(0);
        expect(newValue).toBe(0);

        entry.write(1);
        expect(totalChanges).toBe(1);
        expect(oldValue).toBe(0);
        expect(newValue).toBe(1);

        entry.write(0);
        expect(totalChanges).toBe(2);
        expect(oldValue).toBe(1);
        expect(newValue).toBe(0);

        entry.write("0");
        expect(totalChanges).toBe(3);
        expect(oldValue).toBe(0);
        expect(newValue).toBe("0");

        entry.write(false);
        expect(totalChanges).toBe(4);
        expect(oldValue).toBe("0");
        expect(newValue).toBe(false);

        entry.write(false);
        expect(totalChanges).toBe(4);
        expect(oldValue).toBe("0");
        expect(newValue).toBe(false);

        entry.write(false);
        expect(totalChanges).toBe(4);
        expect(oldValue).toBe("0");
        expect(newValue).toBe(false);

        entry.write(null);
        expect(totalChanges).toBe(5);
        expect(oldValue).toBe(false);
        expect(newValue).toBe(null);
    });
});