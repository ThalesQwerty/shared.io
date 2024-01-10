export interface BaseOutput {
    action: string;
    channelId: string;
    outputId?: string;
    params?: Record<string, any>
}

export interface JoinOutput extends BaseOutput {
    action: "join",
    params?: never
}

export interface LeaveOutput extends BaseOutput {
    action: "leave",
    params?: never
}

export interface CreateOutput extends BaseOutput {
    action: "create",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface ReadOutput extends BaseOutput {
    action: "read",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface UpdateOutput extends BaseOutput {
    action: "update",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface DeleteOutput extends BaseOutput {
    action: "delete",
    params: {
        entityId: string
    }
};


export type Output = 
    | JoinOutput
    | LeaveOutput
    | CreateOutput
    | ReadOutput
    | UpdateOutput
    | DeleteOutput;