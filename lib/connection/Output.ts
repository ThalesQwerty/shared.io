export interface BaseOutput {
    action: "join"|"leave"|"update"|"create";
    channelId: string;
    outputId?: string;
    params?: Record<string, any>
}

export interface JoinOutput extends BaseOutput {
    action: "join",
    params: never
}

export interface LeaveOutput extends BaseOutput {
    action: "leave",
    params: never
}

export interface UpdateOutput extends BaseOutput {
    action: "update",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export interface CreateOutput extends BaseOutput {
    action: "create",
    params: {
        entityId: string,
        values: Record<string, any>
    }
};

export type Output = 
    | JoinOutput
    | LeaveOutput
    | UpdateOutput
    | CreateOutput;