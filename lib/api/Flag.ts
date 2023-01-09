import { Client, ClientList, Entity, KeyValue } from "..";

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
    public static updateFlagScore(entity: Entity, client: Client) {
        const { schema } = entity;
        let currentScore = 0;

        // Get the client lists and names them according to the flag scores they include

        const clientLists: KeyValue<ClientList> = {};

        for (const propertyName in schema.properties) {
            const propertySchema = schema.properties[propertyName];
            for (const conditionType of ["input", "output"] as ("input"|"output")[]) {
                const allowedScores = propertySchema[conditionType];
                const listName = allowedScores.join("-");

                if (listName) clientLists[listName] ??= ClientList.findOrCreate(`${entity.id}/${listName}`);
            }
        }

        // Calculates the flag score for this client

        for (let index = 0; index < schema.flags.length; index++) {
            const flagName = schema.flags[index];
            const flagValue = Math.pow(2, index);

            const flag = (entity as any)[flagName] as Flag;
            const hasFlag = flagName === "owner" ? !!entity.owner?.is(client) : flag.clients.includes(client);

            if (hasFlag) {
                currentScore += flagValue;
            }
        }

        // For each list, adds or removes the client, based on the flag score

        for (const listName in clientLists) {
            const list = clientLists[listName];
            const includedScores = listName.split("-").map(string => parseInt(string));

            if (includedScores.includes(currentScore)) {
                // console.log("ADD", client.id, listName);
                list.add(client);
            } else {
                // console.log("REMOVE", client.id, listName);
                list.remove(client);
            }
        }

        return currentScore;
    }

    /**
     * Revokes all entity flags from a given client
     */
    public static revokeAllFlags(entity: Entity, client: Client) {
        const { schema } = entity;

        for (const flagName of schema.flags) {
            const flag = (entity as any)[flagName] as Flag;
            flag.revokeFrom(client);
        }
    }

    /**
     * Assigns this flag to a given client. Returns `true` if the client didn't have this flag already, returns `false` otherwise.
     */
    public assignTo(client: Client) {
        const success = this.clients.add(client);

        if (success) {
            Flag.updateFlagScore(this.entity, client);
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
            Flag.updateFlagScore(this.entity, client);
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