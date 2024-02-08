import { Client } from "../connection/Client";

export type PropertyValue<Type> = Type extends Property<infer T> ? PropertyValue<T> : Type extends Property<infer U>["get"] ? PropertyValue<U> : Type;

export type PropertyRecord<Schema extends Record<string, any>> = {
    [Key in keyof Schema]: PropertyValue<Schema[Key]>;
};
export interface Property<Type = any, Values extends Record<string, any> = Record<string, any>> {
    value?: Type | null;
    get?: (this: Values, client?: Client) => Type | null | void;
    set?: (this: Values, newValue: Type | null, client?: Client) => Type | null | void;
}

function isProperty(value: any): boolean {
    if (!value || typeof value !== "object") return false;

    const keys = Object.keys(value);
    const propertyKeys: (keyof Property)[] = ["value", "get", "set"];

    return keys.every(key => propertyKeys.includes(key as any))
}

export function getPropertyValue(property: any) {
    if (isProperty(property)) return (property as Property).value;
    return property;
}

export const PropertyPresets = {
    readonly<T>(value: T | null): Property<PropertyValue<T>> {
        return isProperty(value) ? 
            {
                ...value,
                set() {}
            }
            : {
                value: value as any,
                set() {}
            }
    },
    secret<T>(value: T | null): Property<PropertyValue<T>> {
        return isProperty(value) ? 
            {
                ...value,
                get() {}
            }
            : {
                value: value as any,
                get() {}
            }
    },
}

const { readonly, secret } = PropertyPresets;

export { readonly, secret };