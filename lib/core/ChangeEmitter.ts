import _ from "lodash";
import { CustomEventEmitter, KeyValue } from "../utils";
import { Entry, EntryEvent } from "./Entry";

export class ChangeEmitter extends CustomEventEmitter<{
    change: (event: { changes: ChangeEmitter["changes"] }) => void
}> {
    private changes: KeyValue = {};
    private get hasChanges() { return !!Object.keys(this.changes).length };

    public readonly watchedEntries: Entry[] = [];

    public watch (entry: Entry) {
        if (!this.watchedEntries.includes(entry)) {
            this.watchedEntries.push(entry);
            entry.on("change", change => this.addChange(change));
        }
    }

    public unwatch (entry: Entry) {
        if (this.watchedEntries.includes(entry)) {
            this.watchedEntries.splice(this.watchedEntries.indexOf(entry), 1);
            entry.removeListener("change", change => this.addChange(change));
        }
    }

    private addChange ({entry, key, newValue}: EntryEvent<"change">) {
        // if (!entry.isPrimitive) return;

        if (!this.hasChanges) {
            process.nextTick(() => {
                this.emit("change", { changes: _.cloneDeep(this.changes) });
                this.changes = {};
            })
        }
        this.changes[key] = newValue;
    }
}