const moment = require("moment");
const _ = require("lodash")

const { MongoClient } = require("mongodb");
const { logger } = require("../src/Logger");
const { $configuratorKit } = require("./ConfiguratorKit");
const { $loggerKit } = require("./LoggerKit");
const { isMoment } = require("moment/moment");

const MIN_DATE = moment(new Date(1999, 1, 1)).toDate()
const MAX_DATE = moment(new Date(3000, 1, 1)).toDate()

/**
 * Generates a MongoDB time range based on the given configuration.
 * If no start or end time is specified, the default range is from
 * 1999-01-01 to 3000-01-01.
 *
 * @param {Object} config - The configuration containing start and end times.
 * @param {string} [config.startTime] - The start time for the range.
 * @param {string} [config.endTime] - The end time for the range.
 * @returns {Object} The MongoDB time range.
 */
function getTimeRangeByConfig(config) {
  if (!config) {
    throw new TypeError("config is null or undefined");
  }
  let startTime = config.startTime;
  if (!startTime) {
    startTime = MIN_DATE;
  } else if (typeof startTime !== "string") {
    throw new TypeError("config.startTime is not a string");
  } else {
    startTime = moment(isMoment(startTime) ? startTime : Date.parse(startTime));
    if (!startTime.isValid()) {
      throw new TypeError("config.startTime is not a valid date");
    }
    startTime = startTime.toDate();
  }

  let endTime = config.endTime;
  if (!endTime) {
    endTime = MAX_DATE;
  } else if (typeof endTime !== "string") {
    throw new TypeError("config.endTime is not a string");
  } else {
    endTime = moment(isMoment(endTime) ? endTime : Date.parse(endTime));
    if (!endTime.isValid()) {
      throw new TypeError("config.endTime is not a valid date");
    }
    endTime = endTime.toDate();
  }

  return {$gt: startTime, $lte: endTime};
}

/**
 * Represents a database client specifically for MongoDB.
 */
class DatabaseClient {
  static ip = $configuratorKit.get("databases.mongodb.ip");
  static port = $configuratorKit.get("databases.mongodb.port");

  /**
   * Constructs the DatabaseClient instance.
   * Ensures MongoDB IP and port are specified in the configurator.
   * @throws {Error} If the MongoDB IP or port is not specified in the configurator.
   */
  constructor() {
    // Check if MongoDB IP is specified in the configurator.
    if (!DatabaseClient.ip) {
      throw new Error("MongoDB IP not specified in the configurator.");
    } else if (typeof DatabaseClient.ip !== "string") {
      throw new TypeError("MongoDB IP is not a string.");
    }

    // Check if MongoDB port is specified in the configurator.
    if (!DatabaseClient.port) {
      throw new Error("MongoDB port not specified in the configurator.");
    } else if (typeof DatabaseClient.port !== "number") {
      throw new TypeError("MongoDB port is not a number.");
    }

    // Construct the MongoDB connection URL using the IP and port.
    const url = `mongodb://${DatabaseClient.ip}:${DatabaseClient.port}`;

    // Log the MongoDB connection details.
    $loggerKit.getLogger().debug(
      `A database connection client has been created using connection data '${url}'.`,
    );

    // Create a new MongoClient instance using the connection URL.
    this.client = new MongoClient(url, {
      // Use a connection pool to reduce latency and improve performance.
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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
   * @throws {Error} If the 'databaseClient' parameter is not passed or is null.
   */
  constructor({ databaseClient }) {
    if (!databaseClient) {
      throw new ReferenceError("The 'databaseClient' parameter is not passed");
    } else if (databaseClient === null) {
      throw new TypeError("The 'databaseClient' parameter is null");
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
    if (!httpRequest) {
      throw new ReferenceError("The 'httpRequest' parameter is not passed");
    } else if (httpRequest === null) {
      throw new TypeError("The 'httpRequest' parameter is null");
    }

    try {
      $loggerKit.getLogger().debug("Pushed http request in analytic database");

      const client = await this.databaseClient.getReadyClient();
      if (!client) {
        throw new ReferenceError("The database client is not ready");
      }

      const db = client.db(DatabaseProxy._pathDb_traffic);
      if (!db) {
        throw new ReferenceError("The database is not found");
      }

      const collection = db.collection(DatabaseProxy._pathDb_trafficRouters);
      if (!collection) {
        throw new ReferenceError("The collection is not found");
      }

      return await collection.insertOne(httpRequest);
    } catch (error) {
      $loggerKit.getLogger().error(
        `Error while pushing http request in analytic database: ${error.message}`,
        error,
      );

      throw error;
    }
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
    config = undefined,
  ) {
    // Check if the config parameter is null or undefined.
    if (config === null || config === undefined) {
      $loggerKit.getLogger().debug("The 'config' parameter is null or undefined");
    }

    try {
      // Get the ready database client.
      const client = await this.databaseClient.getReadyClient();

      // Check if the client is null.
      if (client === null) {
        throw new ReferenceError("The database client is null");
      }

      // Get the database instance.
      const db = client.db(DatabaseProxy._pathDb_traffic);

      // Check if the database is null.
      if (db === null) {
        throw new ReferenceError("The database is null");
      }

      // Get the collection instance.
      const collection = db.collection(DatabaseProxy._pathDb_trafficRouters);

      // Check if the collection is null.
      if (collection === null) {
        throw new ReferenceError("The collection is null");
      }

      // Count the documents matching the query and time range.
      const count = await collection.countDocuments({
        ...query,
        clickAt: getTimeRangeByConfig(config),
      });

      // Check if the count is null or undefined.
      if (count === null || count === undefined) {
        throw new TypeError("The count is null or undefined");
      }

      return count;
    } catch (error) {
      // Log the error message and re-throw the error.
      $loggerKit.getLogger().error(
        `Error while counting HTTP requests in analytic database: ${error.message}`,
        error,
      );

      // Re-throw the error so it can be caught by the user.
      throw error;
    }
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
    config = undefined,
  ) {
    const finalConfig = Object.assign({
      limit: 512,
      sort: 1
    }, config)

    try {
      // Get the ready database client.
      const client = await this.databaseClient.getReadyClient();
      if (client === null) {
        throw new ReferenceError("The database client is null");
      }

      // Get the database instance.
      const db = client.db(DatabaseProxy._pathDb_traffic);
      if (db === null) {
        throw new ReferenceError("The database is null");
      }

      // Get the collection instance.
      const collection = db.collection(DatabaseProxy._pathDb_trafficRouters);
      if (collection === null) {
        throw new ReferenceError("The collection is null");
      }

      // Find and return the documents matching the query and time range.
      const cursor = collection.find({
        ...query,
        clickAt: getTimeRangeByConfig(config),
      }).sort({ _id: finalConfig.sort === 1 ? 1 : -1 })
        .limit(finalConfig.limit);
      if (cursor === null) {
        throw new ReferenceError("The cursor is null");
      }

      return await cursor.toArray();
    } catch (error) {
      // Log the error message and re-throw the error.
      $loggerKit.getLogger().error(
        `Error while finding HTTP requests in analytic database: ${error.message}`,
        error,
      );

      // Re-throw the error so it can be caught by the user.
      throw error;
    }
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
    config,
  ) {
    try {
      // Get the ready database client.
      const client = await this.databaseClient.getReadyClient();
      if (client === null) {
        throw new ReferenceError("The database client is null");
      }

      // Get the database instance.
      const db = client.db(DatabaseProxy._pathDb_traffic);
      if (db === null) {
        throw new ReferenceError("The database is null");
      }

      // Get the collection instance.
      const collection = db.collection(DatabaseProxy._pathDb_trafficRouters);
      if (collection === null) {
        throw new ReferenceError("The collection is null");
      }

      // Delete the documents matching the query and time range.
      const result = await collection.deleteMany({
        ...query,
        clickAt: getTimeRangeByConfig(config),
      });
      return result;
    } catch (error) {
      // Log the error message and re-throw the error.
      $loggerKit.getLogger().error(
        `Error while finding and removing HTTP requests in analytic database: ${error.message}`,
        error,
      );

      // Re-throw the error so it can be caught by the user.
      throw error;
    }
  }

}

const databaseClient = new DatabaseClient();
const $databaseKitProxy = new DatabaseProxy({ databaseClient });

module.exports = { $databaseKit: $databaseKitProxy };
