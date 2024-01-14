import { Entity } from "../models/Entity";

export type CreateEntityEvent = (event: { entity: Entity }) => void;
export type DeleteEntityEvent = (event: { entity: Entity }) => void;
export type UpdateEntityEvent = <T extends Record<string, any>>(event: { entity: Entity<T>, values: Partial<T> }) => void;

export type EntityEvent = 
    | CreateEntityEvent
    | DeleteEntityEvent
    | UpdateEntityEvent;