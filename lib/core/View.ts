import _ from "lodash";
import { CustomEventEmitter, KeyValue, CustomEvent, ExecutionQueue } from "..";

type ViewEvents = {
    update: (event: { changes: KeyValue }) => void;
    reload: (event: { view: KeyValue }) => void;
    write: (event: { key: string, oldValue: unknown, newValue: unknown }) => void;
}

export type ViewEvent<name extends keyof ViewEvents> = CustomEvent<ViewEvents, name>;

export class View extends CustomEventEmitter<ViewEvents> {
    public readonly state: KeyValue = {};

    private changes: KeyValue = {};
    private get hasChanges() {
        return !!Object.keys(this.changes).length;
    }

    /**
     * Changes a value in this view
     * @param key
     * @param value
     * @param shouldEmitEvent Should it emit an "update" event?
     */
    public update<T = unknown>(key: string, value: T, shouldEmitEvent: boolean = true) {
        const alreadyHadChanges = this.hasChanges;

        const oldValue = this.state[key];
        this.state[key] = value;

        if (!_.isEqual(oldValue, value)) {
            if (shouldEmitEvent) {
                this.changes[key] = value ?? null;
                this.emit("write", { key, oldValue, newValue: value });
                if (!alreadyHadChanges) {
                    process.nextTick(() => {
                        this.emit("update", {
                            changes: this.changes
                        });
                        this.changes = {};
                    });
                }
            }
        }
    }

    /**
     * Emits a reload event with the current state
     */
    public reload() {
        this.emit("reload", {
            view: this.state
        });
    }
}