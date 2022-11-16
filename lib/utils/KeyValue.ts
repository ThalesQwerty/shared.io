export type KeyValue<T = any, K extends string|number|symbol = string> = {
    [key in K]: T
}