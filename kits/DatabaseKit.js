const { MongoClient } = require("mongodb");
const { logger } = require("../src/Logger");
const moment = require("moment/moment");
const { $configuratorKit } = require("./ConfiguratorKit");
const { $loggerKit } = require("./LoggerKit");

class DatabaseClient {
  static ip = $configuratorKit.get("databases.mongodb.ip", "127.0.0.1");
  static port = $configuratorKit.get("databases.mongodb.port", "27017");

  constructor() {
    const url = `mongodb://${DatabaseClient.ip}:${DatabaseClient.port}`;
    logger.debug(
      `A database connection client has been created using connection data '${url}'`,
    );
    this.client = new MongoClient(url);
  }

  getReadyClient() {
    return this.client;
  }
}

class DatabaseKit {
  constructor({ databaseClient }) {
    if (!databaseClient) {
      throw Error("The 'databaseClient' parameter is not passed");
    }

    this.databaseClient = databaseClient;
  }
}

class DatabaseProxy extends DatabaseKit {
  static _pathDb_traffic = $configuratorKit.getDbPath("db/traffic");
  static _pathDb_trafficRouters =
    $configuratorKit.getDbPath("db/traffic/routers");

  constructor(props) {
    super(props);

    $loggerKit
      .getLogger()
      .debug(
        `A proxy client for connecting to the database with route data has been created:`,
      );
    $loggerKit.getLogger().debug({
      db: DatabaseProxy._pathDb_traffic,
      collectionTraffic: DatabaseProxy._pathDb_trafficRouters,
    });
  }

  async pushHttpRequest(httpRequest) {
    $loggerKit.getLogger().debug("Pushed http request in analytic database");

    return await this.databaseClient
      .getReadyClient()
      .db(DatabaseProxy._pathDb_traffic)
      .collection(DatabaseProxy._pathDb_trafficRouters)
      .insertOne(httpRequest);
  }

  async countHttpRequest(
    query,
    {
      startTime = moment(new Date(1999, 1, 1)).toISOString(),
      endTime = moment(new Date(3000, 1, 1)).toISOString(),
    },
  ) {
    return await this.databaseClient
      .getReadyClient()
      .db(DatabaseProxy._pathDb_traffic)
      .collection(DatabaseProxy._pathDb_trafficRouters)
      .countDocuments({
        ...query,
        clickAt: {
          $gt: moment(Date.parse(startTime)).toDate(),
          $lte: moment(Date.parse(endTime)).toDate(),
        },
      });
  }

  async findHttpRequests(
    query,
    {
      startTime = moment(new Date(1999, 1, 1)).toISOString(),
      endTime = moment(new Date(3000, 1, 1)).toISOString(),
      sort = 1,
      limit = 512,
    },
  ) {
    return await this.databaseClient
      .getReadyClient()
      .db(DatabaseProxy._pathDb_traffic)
      .collection(DatabaseProxy._pathDb_trafficRouters)
      .find({
        ...query,
        clickAt: {
          $gt: moment(Date.parse(startTime)).toDate(),
          $lte: moment(Date.parse(endTime)).toDate(),
        },
      })
      .sort({ _id: sort === 1 ? 1 : -1 })
      .limit(limit)
      .toArray();
  }

  async findAndRemoveHttpRequests(
    query,
    {
      startTime = moment(new Date(1999, 1, 1)).toISOString(),
      endTime = moment(new Date(3000, 1, 1)).toISOString(),
    },
  ) {
    return await this.databaseClient
      .getReadyClient()
      .db(DatabaseProxy._pathDb_traffic)
      .collection(DatabaseProxy._pathDb_trafficRouters)
      .deleteMany({
        ...query,
        clickAt: {
          $gt: moment(Date.parse(startTime)).toDate(),
          $lte: moment(Date.parse(endTime)).toDate(),
        },
      });
  }
}

const databaseClient = new DatabaseClient();
const $databaseKit = new DatabaseKit({ databaseClient });
const $databaseKitProxy = new DatabaseProxy({ databaseClient });

module.exports = { $databaseKit: $databaseKitProxy };
