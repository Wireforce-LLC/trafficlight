require("pino-pretty");

class LoggerKit {
  getLogger() {
    return require("pino")({
      level: "trace",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
  }
}

const $loggerKit = new LoggerKit();

module.exports = { $loggerKit };
