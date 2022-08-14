import { Server } from "../../lib";

const state = new Server().state;

state.on("change", event => console.log(event));

state.write("test", 4);
state.write("power", 8);

process.nextTick(() => {
    state.delete("test");
});