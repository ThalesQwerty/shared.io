import { Server } from "../connection/Server";

export type StartServerEvent = (event: { server: Server }) => void;
export type StopServerEvent = (event: { server: Server }) => void;

export type ServerEvent = 
    | StartServerEvent 
    | StopServerEvent;