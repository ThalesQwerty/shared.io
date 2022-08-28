import { EventEmitter } from "node:events";

export type GenericEventList = {[event: string|symbol]: ((parameters: any) => void)};

export class CustomEventEmitter<EventList extends GenericEventList> extends EventEmitter {}

export interface CustomEventEmitter<EventList extends GenericEventList> extends EventEmitter {
    on: <name extends keyof EventList>(event: name, listener: EventList[name]) => this;
    once: <name extends keyof EventList>(event: name, listener: EventList[name]) => this;
    addListener: <name extends keyof EventList>(event: name, listener: EventList[name]) => this;
    removeListener: <name extends keyof EventList>(event: name, listener: EventList[name]) => this;
    prependListener: <name extends keyof EventList>(event: name, listener: EventList[name]) => this;
    emit: (event: keyof EventList, parameters: (Parameters<EventList[typeof event]>[0])) => boolean;
    removeAllListeners: (event?: keyof EventList) => this;
}

export type CustomEvent<CustomEventList extends GenericEventList, name extends keyof CustomEventList> = Parameters<CustomEventList[name]>[0];
