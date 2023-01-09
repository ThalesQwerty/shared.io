import { Client, Entity, Channel, Server, Decorators, Flag, nextTick, KeyValue, ClientList, UUID } from "../../lib";

const { input, output, hidden, inputIf, outputIf, hiddenIf, flag } = Decorators("ally", "watched");

class DecoratedEntity extends Entity {
    @flag ally = new Flag(this);
    @flag watched = new Flag(this, (client, newValue) => {
        this.watchedFlagRegistry[client.id] = newValue;
    });

    watchedFlagRegistry: KeyValue<boolean> = {};

    @output normal = 0;
    @hidden ownerOnly = 0;

    @outputIf(f => f.ally)
    allyOnly = 0;

    @outputIf(f => f.watched)
    watchedOnly = 0;

    @outputIf(f => f.ally && f.watched)
    watchedAllyOnly = 0;

    @outputIf(f => f.ally || f.watched)
    watchedOrAllyOnly = 0;

    @hiddenIf(f => f.ally)
    noAlly = 0;

    @hiddenIf(f => f.watched)
    noWatched = 0;

    @hiddenIf(f => f.ally && f.watched)
    noWatchedAlly = 0;

    @hiddenIf(f => f.ally || f.watched)
    noWatchedOrAlly = 0;

    @input input = 0;

    @inputIf(f => f.ally)
    inputAllyOnly = 0;

    @inputIf(f => f.watched)
    inputWatchedOnly = 0;

    @inputIf(f => f.ally && f.watched)
    inputWatchedAllyOnly = 0;

    @inputIf(f => f.ally || f.watched)
    inputWatchedOrAllyOnly = 0;

    @inputIf(f => !f.ally)
    inputNoAlly = 0;

    @inputIf(f => !f.watched)
    inputNoWatched = 0;

    @inputIf(f => !(f.ally && f.watched))
    inputNoWatchedAlly = 0;

    @inputIf(f => !(f.ally || f.watched))
    inputNoWatchedOrAlly = 0;

    @inputIf(f => true)
    inputPublic = 0;

    lastAddResult = 0;

    @input notDefined: any;

    @input add(a = 0, b = 0) {
        console.log("add", a, b);
        return this.lastAddResult = a + b;
    }
}

class TestChannel extends Channel { }

describe("Decorators", () => {
    const server: Server = new Server();
    const { state } = server;
    const channel = new TestChannel(server);

    let clientA: Client;
    let clientB: Client;
    let clientC: Client;
    let clientD: Client;

    beforeEach(() => {
        clientA = new Client(server);
        clientB = new Client(server);
        clientC = new Client(server);
        clientD = new Client(server);
    });

    afterEach(() => {
        state.clear();
    });

    describe("Flags", () => {
        it("Calculates flag score correctly", async () => {
            const clients = [clientA, clientB, clientC, clientD];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);

            expect(clients.map(client => Flag.updateFlagScore(entity, client))).toEqual([1, 0, 0, 0]);

            entity.ally.assignTo(clientA);
            entity.watched.assignTo(clientB);
            entity.ally.assignTo(clientC);
            entity.watched.assignTo(clientC);

            expect(clients.map(client => Flag.updateFlagScore(entity, client))).toEqual([3, 4, 6, 0]);

            entity.ally.revokeFrom(clientA);
            entity.watched.revokeFrom(clientC);

            expect(clients.map(client => Flag.updateFlagScore(entity, client))).toEqual([1, 4, 2, 0]);
        });
    });

    describe("Lists", () => {
        it("Generates expected lists", async () => {
            const clients = [clientA, clientB, clientC, clientD];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);
            const lists = Entity.getClientLists(entity);
            const listNames = lists.map(list => list.id);
            const key = (listName: string) => `${entity.id}/${listName}`;

            expect(listNames).toContain(key("0-1-2-3-4-5-6-7")); // f => true
            expect(listNames).toContain(key("1-3-5-7")); // f => f.owner
            expect(listNames).toContain(key("2-3-6-7")); // f => f.ally
            expect(listNames).toContain(key("4-5-6-7")); // f => f.watched
            expect(listNames).toContain(key("2-3-4-5-6-7")); // f => f.ally || f.watched
            expect(listNames).toContain(key("6-7")); // f => f.ally && f.watched
            expect(listNames).not.toContain(key("0-2-4-6")); // f => !f.owner
            expect(listNames).toContain(key("0-1-4-5")); // f => !f.ally
            expect(listNames).toContain(key("0-1-2-3")); // f => !f.watched
            expect(listNames).toContain(key("0-1")); // f => !(f.ally || f.watched)
            expect(listNames).toContain(key("0-1-2-3-4-5")); // f => !(f.ally && f.watched)
        });

        it("Allocates clients into lists correctly", async () => {
            const clients = [clientA, clientB, clientC, clientD];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);
            const list = (listName: string) => ClientList.all[`${entity.id}/${listName}`] ?? [];

            entity.ally.assignTo(clientA);
            entity.watched.assignTo(clientB);
            entity.ally.assignTo(clientC);
            entity.watched.assignTo(clientC);

            clients.forEach(client => client.sync());

            let currentList: ClientList;

            currentList = list("0-1-2-3-4-5-6-7"); // f => true
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(true);
            expect(currentList.includes(clientC)).toBe(true);
            expect(currentList.includes(clientD)).toBe(true);

            currentList = list("1-3-5-7"); // f => f.owner
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(false);
            expect(currentList.includes(clientC)).toBe(false);
            expect(currentList.includes(clientD)).toBe(false);

            currentList = list("2-3-6-7"); // f => f.ally
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(false);
            expect(currentList.includes(clientC)).toBe(true);
            expect(currentList.includes(clientD)).toBe(false);

            currentList = list("4-5-6-7"); // f => f.watched
            expect(currentList.includes(clientA)).toBe(false);
            expect(currentList.includes(clientB)).toBe(true);
            expect(currentList.includes(clientC)).toBe(true);
            expect(currentList.includes(clientD)).toBe(false);

            currentList = list("2-3-4-5-6-7"); // f => f.ally || f.watched
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(true);
            expect(currentList.includes(clientC)).toBe(true);
            expect(currentList.includes(clientD)).toBe(false);

            currentList = list("6-7"); // f => f.ally && f.watched
            expect(currentList.includes(clientA)).toBe(false);
            expect(currentList.includes(clientB)).toBe(false);
            expect(currentList.includes(clientC)).toBe(true);
            expect(currentList.includes(clientD)).toBe(false);

            currentList = list("0-1-4-5"); // f => !f.ally
            expect(currentList.includes(clientA)).toBe(false);
            expect(currentList.includes(clientB)).toBe(true);
            expect(currentList.includes(clientC)).toBe(false);
            expect(currentList.includes(clientD)).toBe(true);

            currentList = list("0-1-2-3"); // f => !f.watched
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(false);
            expect(currentList.includes(clientC)).toBe(false);
            expect(currentList.includes(clientD)).toBe(true);

            currentList = list("0-1"); // f => !(f.ally || f.watched)
            expect(currentList.includes(clientA)).toBe(false);
            expect(currentList.includes(clientB)).toBe(false);
            expect(currentList.includes(clientC)).toBe(false);
            expect(currentList.includes(clientD)).toBe(true);

            currentList = list("0-1-2-3-4-5"); // f => !(f.ally && f.watched)
            expect(currentList.includes(clientA)).toBe(true);
            expect(currentList.includes(clientB)).toBe(true);
            expect(currentList.includes(clientC)).toBe(false);
            expect(currentList.includes(clientD)).toBe(true);
        });
    });

    describe("Output", () => {
        it("Applies owner flag correctly", async () => {
            const clients = [clientA, clientB];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);
            const { id } = entity;

            await nextTick();
            clients.forEach(client => client.sync());

            expect(clientA.view.state[`${id}.ownerOnly`]).toBe(0);
            expect(clientB.view.state[`${id}.ownerOnly`]).toBeUndefined();
        });

        it("Applies custom flags correctly", async () => {
            const clients = [clientA, clientB, clientC, clientD];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel);
            const { id } = entity;

            entity.ally.assignTo(clientA);
            entity.watched.assignTo(clientB);
            entity.ally.assignTo(clientC);
            entity.watched.assignTo(clientC);

            await nextTick();
            clients.forEach(client => client.sync());

            expect(clientA.view.state[`${id}.allyOnly`]).toBe(0);
            expect(clientB.view.state[`${id}.allyOnly`]).toBeUndefined();
            expect(clientC.view.state[`${id}.allyOnly`]).toBe(0);
            expect(clientD.view.state[`${id}.allyOnly`]).toBeUndefined();

            expect(clientA.view.state[`${id}.watchedOnly`]).toBeUndefined();
            expect(clientB.view.state[`${id}.watchedOnly`]).toBe(0);
            expect(clientC.view.state[`${id}.watchedOnly`]).toBe(0);
            expect(clientD.view.state[`${id}.watchedOnly`]).toBeUndefined();

            expect(clientA.view.state[`${id}.watchedAllyOnly`]).toBeUndefined();
            expect(clientB.view.state[`${id}.watchedAllyOnly`]).toBeUndefined();
            expect(clientC.view.state[`${id}.watchedAllyOnly`]).toBe(0);
            expect(clientD.view.state[`${id}.watchedAllyOnly`]).toBeUndefined();

            expect(clientA.view.state[`${id}.watchedOrAllyOnly`]).toBe(0);
            expect(clientB.view.state[`${id}.watchedOrAllyOnly`]).toBe(0);
            expect(clientC.view.state[`${id}.watchedOrAllyOnly`]).toBe(0);
            expect(clientD.view.state[`${id}.watchedOrAllyOnly`]).toBeUndefined();

            expect(clientA.view.state[`${id}.noAlly`]).toBeUndefined();
            expect(clientB.view.state[`${id}.noAlly`]).toBe(0);
            expect(clientC.view.state[`${id}.noAlly`]).toBeUndefined();
            expect(clientD.view.state[`${id}.noAlly`]).toBe(0);

            expect(clientA.view.state[`${id}.noWatched`]).toBe(0);
            expect(clientB.view.state[`${id}.noWatched`]).toBeUndefined();
            expect(clientC.view.state[`${id}.noWatched`]).toBeUndefined();
            expect(clientD.view.state[`${id}.noWatched`]).toBe(0);

            expect(clientA.view.state[`${id}.noWatchedAlly`]).toBe(0);
            expect(clientB.view.state[`${id}.noWatchedAlly`]).toBe(0);
            expect(clientC.view.state[`${id}.noWatchedAlly`]).toBeUndefined();
            expect(clientD.view.state[`${id}.noWatchedAlly`]).toBe(0);

            expect(clientA.view.state[`${id}.noWatchedOrAlly`]).toBeUndefined();
            expect(clientB.view.state[`${id}.noWatchedOrAlly`]).toBeUndefined();
            expect(clientC.view.state[`${id}.noWatchedOrAlly`]).toBeUndefined();
            expect(clientD.view.state[`${id}.noWatchedOrAlly`]).toBe(0);
        });
    });

    describe("Input", () => {
        it("Applies owner flag correctly", async () => {
            const clients = [clientA, clientB];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);
            expect(entity.input).toBe(0);

            clientA.write(entity, { input: 1 });
            clientB.write(entity, { input: 2 });

            clients.forEach(client => client.sync());
            expect(entity.input).toBe(1);
        });

        it("Applies custom flags correctly", async () => {
            const clients = [clientA, clientB, clientC, clientD];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel);

            entity.ally.assignTo(clientA);
            entity.watched.assignTo(clientB);
            entity.ally.assignTo(clientC);
            entity.watched.assignTo(clientC);

            await nextTick();
            clients.forEach(client => client.sync());

            clients.forEach((client, index) => { client.write(entity, { inputPublic: entity.inputPublic + Math.pow(2, index) }); client.sync() });
            expect(entity.inputPublic).toBe(15);

            clients.forEach((client, index) => { client.write(entity, { inputAllyOnly: entity.inputAllyOnly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputAllyOnly).toBe(5);

            clients.forEach((client, index) => { client.write(entity, { inputWatchedOnly: entity.inputWatchedOnly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputWatchedOnly).toBe(6);

            clients.forEach((client, index) => { client.write(entity, { inputWatchedAllyOnly: entity.inputWatchedAllyOnly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputWatchedAllyOnly).toBe(4);

            clients.forEach((client, index) => { client.write(entity, { inputWatchedOrAllyOnly: entity.inputWatchedOrAllyOnly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputWatchedOrAllyOnly).toBe(7);

            clients.forEach((client, index) => { client.write(entity, { inputNoAlly: entity.inputNoAlly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputNoAlly).toBe(10);

            clients.forEach((client, index) => { client.write(entity, { inputNoWatched: entity.inputNoWatched + Math.pow(2, index) }); client.sync() });
            expect(entity.inputNoWatched).toBe(9);

            clients.forEach((client, index) => { client.write(entity, { inputNoWatchedAlly: entity.inputNoWatchedAlly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputNoWatchedAlly).toBe(11);

            clients.forEach((client, index) => { client.write(entity, { inputNoWatchedOrAlly: entity.inputNoWatchedOrAlly + Math.pow(2, index) }); client.sync() });
            expect(entity.inputNoWatchedOrAlly).toBe(8);
        });
    });

    describe("Watch", () => {
        it("Watches flag changes", () => {
            const clients = [clientA, clientB, clientC];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel);
            expect(entity.watchedFlagRegistry).toEqual({});

            entity.watched.assignTo(clientA);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: true
            });

            entity.watched.assignTo(clientB);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: true,
                [clientB.id]: true,
            });

            entity.watched.revokeFrom(clientA);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: false,
                [clientB.id]: true,
            });

            entity.watched.revokeFrom(clientC);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: false,
                [clientB.id]: true,
            });

            entity.watched.assignTo(clientC);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: false,
                [clientB.id]: true,
                [clientC.id]: true,
            });

            entity.watched.assignTo(clientA);
            expect(entity.watchedFlagRegistry).toEqual({
                [clientA.id]: true,
                [clientB.id]: true,
                [clientC.id]: true,
            });
        });
    });

    describe.only("Methods", () => {
        it("Applies input rules correctly", async () => {
            const clients = [clientA, clientB];
            clients.forEach(client => channel.addClient(client));

            const entity = new DecoratedEntity(channel, clientA);
            expect(entity.lastAddResult).toBe(0);

            clientA.call(entity, "add", 2, 5);
            clientA.sync();
            expect(entity.lastAddResult).toBe(7);

            clientB.call(entity, "add", 2, 2);
            clientB.sync();
            expect(entity.lastAddResult).toBe(7);
        });
    });
});