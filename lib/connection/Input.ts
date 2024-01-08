export interface BaseInput {
    action: "join"|"leave"|"update"|"create";
    channelId: string;
    inputId: string;
    params?: Record<string, any>
}

export interface JoinInput extends BaseInput {
    action: "join",
    params: never
}

export interface LeaveInput extends BaseInput {
    action: "leave",
    params: never
}

export interface UpdateInput extends BaseInput {
    action: "update",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface CreateInput extends BaseInput {
    action: "create",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export type Input = 
    | JoinInput
    | LeaveInput
    | UpdateInput
    | CreateInput;