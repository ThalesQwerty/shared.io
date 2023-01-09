import { Client, Server, Decorators, Entity, Flag, KeyValue, Channel } from "../../lib";

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

    add(a = 0, b = 0) {
        console.log("add", a, b);
        return this.lastAddResult = a + b;
    }
}

class DecoratedEntity2 extends Entity {
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

    @input add(a = 0, b = 0) {
        console.log("add", a, b);
        return this.lastAddResult = a + b;
    }
}

const server = new Server({
    port: 3000
}).start();

const channel = new Channel(server);
const [entity1, entity2] = [new DecoratedEntity(channel), new DecoratedEntity2(channel)];

console.dir(entity1.schema, { depth: null });
console.dir(entity2.schema, { depth: null });