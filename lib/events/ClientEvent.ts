import { Client } from "../connection/Client";
import { Input } from "../connection/Input";

export type ConnectClientEvent = (event: { client: Client }) => void;
export type DisconnectClientEvent = (event: { client: Client }) => void;
export type InputClientEvent = (event: { input: Input, client: Client }) => void;
export type MessageClientEvent = (event: { message: Input, client: Client }) => void;

export type ClientEvent = 
    | ConnectClientEvent
    | DisconnectClientEvent
    | InputClientEvent
    | MessageClientEvent;