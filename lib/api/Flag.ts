import { Client, ClientList, Entity } from "..";

export class Flag {
    /**
     * List of clients which currently have this flag
     */
    readonly clients: ClientList = new ClientList();

    /**
     * Creates a boolean flag for this entity
     * @param entity The entity to which this flag will be associated
     * @param onChange A callback function to be called whenever the value of this flag changes for a client
     * @returns
     */
    constructor (private readonly entity: Entity, private readonly onChange: (currentClient: Client, currentValue: boolean) => void = () => {}) {}

    /**
     * Updates the flag score for a given client
     * @returns The new flag score
     */
    private updateFlagScore(client: Client) {
        const { entity } = this;
        const { schema } = entity;
        let currentScore = 0;

        const numFlags = schema.flags.length;
        const numLists = Math.pow(2, numFlags);

        const lists = new Array(numLists).fill(null).map((_, score) => ClientList.id(`${entity.id}/${score}`));

        for (let index = 0; index < numFlags; index++) {
            const flagName = schema.flags[index];
            const flagValue = Math.pow(2, index);

            const flag = (entity as any)[flagName] as Flag;
            const hasFlag = flagName === "owner" ? !!entity.owner?.is(client) : flag.clients.includes(client);

            if (hasFlag) {
                currentScore += flagValue;
            }
        }

        for (let score = 0; score < numLists; score++) {
            const currentList = lists[score];
            if (score === currentScore) {
                currentList.add(client);
            } else {
                currentList.remove(client);
            }
        }

        return currentScore;
    }


    /**
     * Assigns this flag to a given client. Returns `true` if the client didn't have this flag already, returns `false` otherwise.
     */
    public assignTo(client: Client) {
        const success = this.clients.add(client);

        if (success) {
            this.updateFlagScore(client);
            this.onChange(client, true);
        }

        return success;
    }

    /**
     * Revokes this flag from a given client. Returns `false` if the client didn't have this flag already, returns `true` otherwise.
     */
    public revokeFrom(client: Client) {
        const success = this.clients.remove(client);

        if (success) {
            this.updateFlagScore(client);
            this.onChange(client, false);
        }

        return success;
    }

    /**
     * Verifies if a given client has this flag
     */
    public isAssignedTo(client: Client) {
        return this.clients.includes(client);
    }
}

export type EntityFlagName<EntityType extends Entity> = "owner" | keyof {
    [key in keyof EntityType as EntityType[key] extends Flag ? key extends string ? key : never : never]: any
}