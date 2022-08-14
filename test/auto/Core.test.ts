import _ from "lodash";
import { Client, EntryEvent, KeyValue, nextTick, Server } from "../../lib";

describe("Shared state", () => {
    const server = new Server();
    const state = server.state;
    const { entries } = state;

    afterEach(() => {
        state.clear();
    });

    describe("Entries", () => {
        it ("Lists the entries", () => {
            state.write("name", "Thales");
            state.write("age", 21);
            state.write("gender", "Male");
            state.write("verified", true);
            state.write("nothing", null);

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
            expect(Object.keys(state.entries)).toEqual([]);

            state.write("name", "Thales");

            const nameEntry = state.entries.name;

            expect(Object.keys(state.entries)).toEqual(["name"]);
            expect(nameEntry.read()).toBe("Thales");

            state.delete("name");

            expect(Object.keys(state.entries)).toEqual([]);
            expect(nameEntry.read()).toBeNull();
        });
    });

    describe("Subscribers", () => {
        it ("Adds and removes subscribers", () => {
            const alice = new Client(server);
            const bob = new Client(server);
            const charles = new Client(server);

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
            const alice = new Client(server);
            const bob = new Client(server);

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

        it ("Dispatches the send method on subscribers", async () => {
            const alice = new Client(server);
            const bob = new Client(server);

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
            await nextTick();
            expect(messagesSent.alice).toBe(1);
            expect(messagesSent.bob).toBe(1);

            entries.aliceOnly.write(1);
            await nextTick();
            expect(messagesSent.alice).toBe(2);
            expect(messagesSent.bob).toBe(1);

            entries.bobOnly.write(1);
            await nextTick();
            expect(messagesSent.alice).toBe(2);
            expect(messagesSent.bob).toBe(2);

            entries.secret.write(1);
            await nextTick();
            expect(messagesSent.alice).toBe(2);
            expect(messagesSent.bob).toBe(2);
        });
    });

    describe("Events", () => {
        it ("Knows when entries actually change on write", () => {
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

            state.write("entry", 0);
            expect(totalChanges).toBe(0);
            expect(oldValue).toBe(0);
            expect(newValue).toBe(0);

            state.write("entry", 1);
            expect(totalChanges).toBe(1);
            expect(oldValue).toBe(0);
            expect(newValue).toBe(1);

            state.write("entry", 0);
            expect(totalChanges).toBe(2);
            expect(oldValue).toBe(1);
            expect(newValue).toBe(0);

            state.write("entry", "0");
            expect(totalChanges).toBe(3);
            expect(oldValue).toBe(0);
            expect(newValue).toBe("0");

            state.write("entry", false);
            expect(totalChanges).toBe(4);
            expect(oldValue).toBe("0");
            expect(newValue).toBe(false);

            state.write("entry", false);
            expect(totalChanges).toBe(4);
            expect(oldValue).toBe("0");
            expect(newValue).toBe(false);

            state.write("entry", false);
            expect(totalChanges).toBe(4);
            expect(oldValue).toBe("0");
            expect(newValue).toBe(false);

            state.write("entry", null);
            expect(totalChanges).toBe(5);
            expect(oldValue).toBe(false);
            expect(newValue).toBe(null);
        });

        it ("Constructs the client view", async () => {
            const client = new Client(server);

            state.on("create", ({ entry }) => entry.addSubscriber(client))

            let clientView: KeyValue = {};

            client.watcher.on("change", ({ changes }) => {
                clientView = {
                    ...clientView,
                    ...changes
                }
            });

            state.write("a", 1);
            await nextTick();
            expect(clientView).toEqual({
                a: 1
            });

            state.write("b", "test");
            await nextTick();
            expect(clientView).toEqual({
                a: 1,
                b: "test"
            });

            const c: KeyValue = state.write("c", {x: 1, y: 2, z: 3});
            await nextTick();
            expect(clientView).toEqual({
                a: 1,
                b: "test",
                c: {x: 1, y: 2, z: 3},
                "c.x": 1, "c.y": 2, "c.z": 3
            });

            const d: KeyValue = state.write("d", [1, 2, 3, 4, 5]);
            await nextTick();
            expect(clientView).toEqual({
                a: 1,
                b: "test",
                c: {x: 1, y: 2, z: 3},
                "c.x": 1, "c.y": 2, "c.z": 3,
                d: [1, 2, 3, 4, 5],
                "d.0": 1, "d.1": 2, "d.2": 3, "d.3": 4, "d.4": 5
            });

            state.write("b", false);
            state.write("a", 10);
            await nextTick();
            expect(clientView).toEqual({
                a: 10,
                b: false,
                c: {x: 1, y: 2, z: 3},
                "c.x": 1, "c.y": 2, "c.z": 3,
                d: [1, 2, 3, 4, 5],
                "d.0": 1, "d.1": 2, "d.2": 3, "d.3": 4, "d.4": 5
            });

            c.y = 20;
            c.w = [];
            await nextTick();
            expect(clientView).toEqual({
                a: 10,
                b: false,
                c: {x: 1, y: 20, z: 3, w: []},
                "c.x": 1, "c.y": 20, "c.z": 3, "c.w": [],
                d: [1, 2, 3, 4, 5],
                "d.0": 1, "d.1": 2, "d.2": 3, "d.3": 4, "d.4": 5
            });

            state.delete("a");
            state.delete("b");
            state.delete("c");
            state.delete("d");
            await nextTick();
            expect(clientView).toEqual({
                a: null,
                b: null,
                c: null,
                "c.x": null, "c.y": null, "c.z": null, "c.w": null,
                d: null,
                "d.0": null, "d.1": null, "d.2": null, "d.3": null, "d.4": null
            });
        });
    });
});