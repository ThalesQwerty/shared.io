import { KeyValue } from "../utils";

export type PrimitivePropertyType = "string"|"number"|"boolean"|"void"|"any";
export type PropertyType = PrimitivePropertyType|`${PrimitivePropertyType}[]`;

export interface EntitySchema {
    type: string;
    properties: KeyValue<EntityPropertySchema>;
    flags: string[];
}

export interface EntityPropertySchema {
    /**
     * Name of the property
     */
    name: string;

    /**
     * Type of the property
     */
    type: PropertyType;

    /**
     * The name and type of the parameters this method accepts.
     *
     * If this is not a method, the value will be `null`
     */
    parameters: null|KeyValue<PropertyType>;

    /**
     * Which flag scores allows user input?
     */
    input: number[];

    /**
     * Which flag scores allows user output?
     */
    output: number[];
}

export class Schema {
    public static readonly entities: KeyValue<EntitySchema> = {};
}