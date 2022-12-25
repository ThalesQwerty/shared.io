import { Client, Entity, Channel, Server, Decorators, Flag, nextTick, KeyValue, ClientList } from "../../lib";

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
}

class TestChannel extends Channel {}

describe("Entity", () => {
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
});