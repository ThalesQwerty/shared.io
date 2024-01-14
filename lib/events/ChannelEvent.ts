import { Client } from "../connection/Client";
import { Channel } from "../models/Channel";

export type CreateChannelEvent = (event: { channel: Channel }) => void;
export type DeleteChannelEvent = (event: { channel: Channel }) => void;
export type JoinChannelEvent = (event: { client: Client, channel: Channel }) => void;
export type LeaveChannelEvent = (event: { client: Client, channel: Channel }) => void;

export type ChannelEvent = 
    | CreateChannelEvent
    | DeleteChannelEvent
    | JoinChannelEvent
    | LeaveChannelEvent;