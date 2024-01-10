export interface BaseInput {
    action: string;
    channelId: string;
    inputId: string;
    params?: Record<string, any>
}

export interface JoinInput extends BaseInput {
    action: "join",
    params?: never
}

export interface LeaveInput extends BaseInput {
    action: "leave",
    params?: never
}

export interface CreateInput extends BaseInput {
    action: "create",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface ReadInput extends BaseInput {
    action: "read",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface UpdateInput extends BaseInput {
    action: "update",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};


export interface DeleteInput extends BaseInput {
    action: "delete",
    params: {
        entityId: string
    }
};

export type Input = 
    | JoinInput
    | LeaveInput
    | CreateInput
    | ReadInput
    | UpdateInput
    | DeleteInput;