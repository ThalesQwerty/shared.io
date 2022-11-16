import { Entity } from ".";
import { KeyValue } from "../utils";
import { EntitySchema, Schema } from "./Schema";

type FlagCombination<FlagName extends string = "owner"> = KeyValue<boolean, FlagName|"owner">;
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
        const whitelist: number[] = [];
        const blacklist: number[] = [-1];

        for (let score = 0; score < flagScores.length; score++) {
            const combination = flagScores[score];

            if (condition(combination)) {
                whitelist.push(score);
            } else {
                blacklist.push(score);
            }
        }

        return blacklist.length < whitelist.length ? blacklist : whitelist;
    }

    function addCondition(conditionType: "input"|"output", condition: DecoratorCondition<flag>) {
        return function <EntityType extends Entity>(
            entity: EntityType,
            propertyName: string,
        ) {
            const entitySchema: EntitySchema = Schema.entities[entity.type] ??= {
                type: entity.type,
                properties: {},
                flags: flagNames
            };

            const propertySchema = entitySchema.properties[propertyName] ??= {
                name: propertyName,
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
        inputIf(condition: DecoratorCondition<flag>) {
            return addCondition("input", condition);
        },

        outputIf(condition: DecoratorCondition<flag>) {
            return addCondition("output", condition);
        },

        hiddenIf(condition: DecoratorCondition<flag>) {
            return addCondition("output", flags => !condition(flags));
        },

        input<EntityType extends Entity>(entity: EntityType, propertyName: string) {
            addCondition("input", flags => flags.owner)(entity, propertyName);
        },

        output<EntityType extends Entity>(entity: EntityType, propertyName: string) {
            addCondition("output", () => true)(entity, propertyName);
        },

        hidden<EntityType extends Entity>(entity: EntityType, propertyName: string) {
            addCondition("output", flags => flags.owner)(entity, propertyName);
        },

        flag<EntityType extends Entity>(entity: EntityType, propertyName: flag) {
            implementedFlags.push(propertyName);
        }
    }
}