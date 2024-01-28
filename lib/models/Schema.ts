import { Client } from "../connection/Client"
import { Entity } from "./Entity"

export interface ServerSchema {
    entities: Record<string, EntitySchema>
}

export interface EntitySchema<EntityType extends string = string, Values extends Record<string, any> = Record<string, any>> {
    type: EntityType,

    /**
     * Define this entity's properties and its default values
     */
    props: Values,

    /**
     * Code for initializing this entity. Executed right before creation.
     */
    init?: (params: { entity: Entity<Values, EntityType> }) => void

    /**
     * Executes once every server tick
     */
    tick?: (params: { entity: Entity<Values, EntityType> }) => void

    /**
     * Defines how this entity's properties will be seem by other clients besides the owner
     */
    view?: (params: { entity: Entity<Values, EntityType>, values: Partial<Values>, client: Client }) => Partial<Values>

    /**
     * Validation rules for the property values
     */
    rules?: {
        [Key in keyof Values]?: (params: { entity: Entity<Values, EntityType>, oldValue: Values[Key], newValue: Values[Key], client: Client }) => Values[Key] | undefined | void;
    }
}