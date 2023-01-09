import { Entity, EntityMethodName } from ".";
import { KeyValue } from "../utils";
import { EntitySchema, Schema } from "./Schema";

type FlagCombination<FlagName extends string = "owner"> = {
    /**
     * Returns `true` if the current client has this flag assigned to it. Returns `false` otherwise.
     */
    [key in FlagName|"owner"]: boolean;
};

type DecoratorCondition<FlagName extends string = "owner"> = (flags: FlagCombination<FlagName>) => boolean;
/**
 * Generates decorators
 * @param flagNames
 */
export function Decorators<FlagName extends string = "owner">(...flagNames: (FlagName|"owner")[]) {
    type flag = (typeof flagNames)[number];
    if (!flagNames.includes("owner")) flagNames.unshift("owner");

    const implementedFlags: flag[] = ["owner"];

    const blank = flagNames.reduce((object, flag) => ({...object, [flag]: false}), {} as KeyValue<boolean, flag>);

    const flagScores: FlagCombination<flag>[] = new Array(Math.pow(2, flagNames.length)).fill(null).map((_, score) => {
        const flags = {...blank};

        for (let i = 0; i < flagNames.length; i++) {
            const currentFlag = flagNames[i];
            const divider = Math.pow(2, i + 1);
            const minRemainder = Math.pow(2, i);

            if (score % divider >= minRemainder) {
                flags[currentFlag] = true;
            }
        }

        return flags;
    });

    function testAllCombinations(condition: DecoratorCondition<flag>): number[] {
        const allowedScores: number[] = [];

        for (let score = 0; score < flagScores.length; score++) {
            const combination = flagScores[score];

            if (condition(combination)) {
                allowedScores.push(score);
            }
        }

        return allowedScores;
    }

    function addCondition(conditionType: "input"|"output", condition: DecoratorCondition<flag>) {
        return function <EntityType extends Entity>(
            entity: EntityType,
            propertyName: keyof EntityType,
        ) {
            const entitySchema: EntitySchema = entity.schema;
            if (!entitySchema.flags.length) entitySchema.flags = flagNames;

            const value = entity[propertyName] as unknown;

            const propertySchema = entitySchema.properties[propertyName as string] ??= {
                name: propertyName as string,
                type: "any",
                parameters: null,
                input: [],
                output: []
            };

            propertySchema[conditionType] = testAllCombinations(condition);
        };
    }

    process.nextTick(() => {
        for (const flag of flagNames) {
            if (!implementedFlags.includes(flag)) {
                throw new Error(`Flag "${flag}" was not correctly implemented. You have to declare on the entity a property or method called "${flag}" and use the @flag decorator on it.`);
            }
        }
    });

    return {
        /**
         * Defines if this property or method will be writable/callable to each user based on which flags are activated or not
         */
        inputIf(condition: DecoratorCondition<flag>) {
            return addCondition("input", condition);
        },

        /**
         * Defines if this property or method will be visible to each user based on which flags are activated or not
         */
        outputIf(condition: DecoratorCondition<flag>) {
            return addCondition("output", condition);
        },

        /**
         * Defines if this property or method will be hidden from each user based on which flags are activated or not
         */
        hiddenIf(condition: DecoratorCondition<flag>) {
            return addCondition("output", flags => !condition(flags));
        },

        /**
         * Only the entity owner can alter this property or call this method
         */
        input<EntityType extends Entity>(entity: EntityType, propertyName: keyof EntityType) {
            addCondition("input", flags => flags.owner)(entity, propertyName);
            addCondition("output", flags => flags.owner)(entity, propertyName);
        },

        /**
         * Every user can view this property or listen to this method's calls
         */
        output<EntityType extends Entity>(entity: EntityType, propertyName: keyof EntityType) {
            addCondition("output", () => true)(entity, propertyName);
        },

        /**
         * Only the entity's owner can view this property or listen to this method's calls
         */
        hidden<EntityType extends Entity>(entity: EntityType, propertyName: keyof EntityType) {
            addCondition("output", flags => flags.owner)(entity, propertyName);
        },

        flag<EntityType extends Entity>(entity: EntityType, propertyName: flag) {
            implementedFlags.push(propertyName);
        }
    }
}