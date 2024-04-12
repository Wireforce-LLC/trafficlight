const moment = require("moment");
const { MongoClient } = require("mongodb");
const { logger } = require("../src/Logger");
const { $configuratorKit } = require("./ConfiguratorKit");
const { $loggerKit } = require("./LoggerKit");

/**
 * Represents a database client specifically for MongoDB.
 */
class DatabaseClient {
  static ip = $configuratorKit.get("databases.mongodb.ip");
  static port = $configuratorKit.get("databases.mongodb.port");

  /**
   * Constructs the DatabaseClient instance, ensuring MongoDB IP and port are specified.
   * @throws {Error} If the IP or port for MongoDB is not specified.
   */
  constructor() {
    if (!DatabaseClient.ip) {
      throw new Error("MongoDB IP not specified. Please provide a valid IP in the configurator.");
    }

    if (!DatabaseClient.port) {
      throw new Error("MongoDB port not specified. Please provide a valid port in the configurator.");
    }

    const url = `mongodb://${DatabaseClient.ip}:${DatabaseClient.port}`;

    logger.debug(
      `A database connection client has been created using connection data '${url}'`,
    );

    this.client = new MongoClient(url);
  }

  /**
   * Gets the ready-to-use MongoClient instance.
   * @returns {MongoClient} The MongoClient instance.
   */
  getReadyClient() {
    return this.client;
  }
}

/**
 * Encapsulates database client handling.
 */
class DatabaseKit {
  /**
   * Creates an instance of DatabaseKit.
   * @param {Object} param0 - The parameter object.
   * @param {DatabaseClient} param0.databaseClient - The database client.
   * @throws {Error} If the 'databaseClient' parameter is not passed.
   */
  constructor({ databaseClient }) {
    if (!databaseClient) {
      throw Error("The 'databaseClient' parameter is not passed");
    }

    this.databaseClient = databaseClient;
  }
}

/**
 * Acts as a proxy to the database, specifically for handling traffic data.
 */
class DatabaseProxy extends DatabaseKit {
  static _pathDb_traffic = $configuratorKit.getDbPath("db/traffic");
  static _pathDb_trafficRouters =
    $configuratorKit.getDbPath("db/traffic/routers");

  /**
   * Constructs the DatabaseProxy instance.
   * @param {Object} props - The properties passed to the DatabaseKit constructor.
   */
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

  /**
   * Pushes an HTTP request into the analytic database.
   * @param {Object} httpRequest - The HTTP request to push.
   * @returns {Promise} The result of the insert operation.
   */
  async pushHttpRequest(httpRequest) {
    $loggerKit.getLogger().debug("Pushed http request in analytic database");

    return await this.databaseClient
      .getReadyClient()
      .db(DatabaseProxy._pathDb_traffic)
      .collection(DatabaseProxy._pathDb_trafficRouters)
      .insertOne(httpRequest);
  }

  /**
   * Counts HTTP requests based on the provided query and time range.
   * @param {Object} query - The query to match documents.
   * @param {Object} param1 - The parameters for time range and filtering.
   * @param {String} param1.startTime - The start time for filtering.
   * @param {String} param1.endTime - The end time for filtering.
   * @returns {Promise} The count of documents matching the criteria.
   */
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

  /**
   * Finds HTTP requests based on the provided query and time range.
   * @param {Object} query - The query to match documents.
   * @param {Object} param1 - The parameters for time range, sorting, and limiting.
   * @param {String} param1.startTime - The start time for filtering.
   * @param {String} param1.endTime - The end time for filtering.
   * @param {Number} param1.sort - The sort order (1 for ascending, -1 for descending).
   * @param {Number} param1.limit - The maximum number of documents to return.
   * @returns {Promise} The documents matching the criteria.
   */
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

  /**
   * Finds and removes HTTP requests based on the provided query and time range.
   * @param {Object} query - The query to match documents for deletion.
   * @param {Object} param1 - The parameters for time range.
   * @param {String} param1.startTime - The start time for filtering.
   * @param {String} param1.endTime - The end time for filtering.
   * @returns {Promise} The result of the delete operation.
   */
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
const $databaseKitProxy = new DatabaseProxy({ databaseClient });

module.exports = { $databaseKit: $databaseKitProxy };
