import { Entity } from "../models/Entity";

export type CreateEntityEvent<Type extends string = string, Values extends Record<string, any> = Record<string, any>> = (event: { entity: Entity<Values, Type> }) => void;
export type DeleteEntityEvent<Type extends string = string, Values extends Record<string, any> = Record<string, any>> = (event: { entity: Entity<Values, Type> }) => void;
export type UpdateEntityEvent<Type extends string = string, Values extends Record<string, any> = Record<string, any>> = (event: { entity: Entity<Values, Type>, values: Partial<Values> }) => void;

export type EntityEvent<Type extends string = string, Values extends Record<string, any> = Record<string, any>> =
    | CreateEntityEvent<Type, Values>
    | DeleteEntityEvent<Type, Values>
    | UpdateEntityEvent<Type, Values>;