import { Client, Server } from "../../lib";

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