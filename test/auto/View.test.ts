import { Client, ClientList, nextTick, Output, Server, UUID, ViewOutput } from "../../lib";
import { SharedState } from "../../lib/core/SharedState";

describe("Shared state", () => {

    const server: Server = new Server();
    const { state } = server;
    let clientA: Client;
    let clientB: Client;

    beforeEach(() => {
        clientA = new Client(server);
        clientB = new Client(server);
    });

    afterEach(() => {
        state.clear();
    });

    describe("View", () => {
        it ("Notifies current subscribers", () => {
            const list = state.setList("subscribers", "test");
            list.add(clientA);

            state.write("test", 0);
            expect(clientA.view.state).toEqual({ test: 0 });

            state.write("test", 1);
            expect(clientA.view.state).toEqual({ test: 1 });
        });

        it ("Notifies new subscribers", () => {
            const list = state.setList("subscribers", "test");

            state.write("test", 0);
            expect(clientA.view.state).toEqual({});

            list.add(clientA);
            expect(clientA.view.state).toEqual({ test: 0 });

            state.write("test", 1);
            expect(clientA.view.state).toEqual({ test: 1 });
        });

        it ("Differentiates subscribers", () => {
            const list = state.setList("subscribers", "test");
            list.add(clientA);

            state.write("test", 0);
            expect(clientA.view.state).toEqual({ test: 0 });
            expect(clientB.view.state).toEqual({});

            state.write("test", 1);
            expect(clientA.view.state).toEqual({ test: 1 });
            expect(clientB.view.state).toEqual({});

            list.add(clientB);
            state.write("test", 2);
            expect(clientA.view.state).toEqual({ test: 2 });
            expect(clientB.view.state).toEqual({ test: 2 });
        });
    });

    describe("Client", () => {
        let originalSend = Client.prototype.send;
        let messagesSent:Output[] = [];
        const getLastMessage = () => messagesSent[messagesSent.length - 1]

        beforeEach(() => {
            messagesSent = [];
            clientA.send = function(...args: Parameters<Client["send"]>) {
                const output = args[0];

                const outputWithId: Output = {
                    id: UUID(),
                    ...output
                };

                messagesSent.push(outputWithId);
            };
        });

        afterEach(() => {
            messagesSent = [];
            clientA.send = originalSend;
        });

        it ("Sends view updates", async () => {
            const list = new ClientList();
            list.add(clientA);

            expect(getLastMessage()).toBeUndefined();

            state.clientLists.subscribers["test"] = list;
            state.write("test", 0);

            await nextTick();

            const lastMessage = messagesSent.pop();
            expect(lastMessage).toBeDefined();
            expect(lastMessage!.id).toBeTruthy();
            expect(lastMessage!.type).toBe("view");
            expect(lastMessage!.data).toEqual({ changes: { test: 0 }});
        });

        it ("Detects changes correctly", async () => {
            const list = new ClientList();
            list.add(clientA);

            expect(getLastMessage()).toBeUndefined();

            state.clientLists.subscribers["test"] = list;
            state.write("test", 0);

            await nextTick();
            let lastMessage = messagesSent.pop();
            expect(lastMessage).toBeDefined();
            expect(lastMessage!.id).toBeTruthy();
            expect(lastMessage!.type).toBe("view");
            expect(lastMessage!.data).toEqual({ changes: { test: 0 }});

            state.write("test", 0);

            await nextTick();
            lastMessage = messagesSent.pop();
            expect(lastMessage).toBeUndefined();

            state.write("test", 1);

            await nextTick();
            lastMessage = messagesSent.pop();
            expect(lastMessage).toBeDefined();
            expect(lastMessage!.id).toBeTruthy();
            expect(lastMessage!.type).toBe("view");
            expect(lastMessage!.data).toEqual({ changes: { test: 1 }});
        });
    })
});