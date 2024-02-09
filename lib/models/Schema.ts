import { Client } from "../connection/Client"
import { Entity } from "./Entity"
import { Property, PropertyRecord } from "./Property"

export interface ServerSchema {
    entities: Record<string, EntitySchema>
}

export type SchemaProperty = string | number | boolean | null | any[] | Record<string | number | symbol, any> | ((client?: Client) => any);

export interface EntitySchema<EntityType extends string = string, Values extends Record<string, any> = Record<string, any>> {
    type: EntityType,

    /**
     * Define this entity's properties and its default values
     */
    props: {
        [Key in keyof Values]: Property<Values[Key], PropertyRecord<Values>> | Values[Key]
    },

    /**
     * Code for initializing this entity. Executed right before creation.
     */
    init?: (this: PropertyRecord<Values>, entity: Entity<PropertyRecord<Values>, EntityType>) => void

    /**
     * Executes once every server tick
     */
    tick?: (this: PropertyRecord<Values>, entity: Entity<PropertyRecord<Values>, EntityType>) => void
}