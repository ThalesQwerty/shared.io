import pino from "pino";

const Logger = pino();

Logger.level = "info";

export {
    Logger
};

