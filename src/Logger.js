/**
 * @deprecated
 * @type {*|Logger<never>}
 */
const logger = require("pino")({
  level: "trace",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

module.exports = { logger };
