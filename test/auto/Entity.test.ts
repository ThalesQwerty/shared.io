import { Client, nextTick, Output, Server, UUID } from "../../lib";

describe("Entity", () => {
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


})