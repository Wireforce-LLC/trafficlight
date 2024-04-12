const _ = require("lodash");
const { logger } = require("../src/Logger");

/**
 * Represents a service that is spawned with a delay.
 */
class SpawnedService {
  /**
   * Creates an instance of SpawnedService.
   * @param {Object} param0
   * @param {Function} param0.serviceFunction The function to be executed by the service.
   * @param {string} param0.name The name of the service.
   */
  constructor({ serviceFunction, name }) {
    this.function = serviceFunction;
    this.name = name;
    this.timeout = setTimeout(this.function, 100);

    logger.info(`Spawned '${name}' service (${this.timeout})`);
  }
}

/**
 * Manages and spawns services.
 */
class ServiceKit {
  services = [];

  /**
   * Creates a service that can be spawned later.
   * @param {string} name The name of the service.
   * @param {Function} serviceFunction The function to be executed by the service.
   * @returns {ServiceKit} The instance of ServiceKit for chaining.
   */
  createService(name, serviceFunction) {
    this.services.push({
      name,
      serviceFunction,
    });

    logger.info(`Created '${name}' service`);

    return this;
  }

  /**
   * Creates a service that runs at specified intervals.
   * @param {string} name The name of the service.
   * @param {Function} serviceFunction The function to be executed at each interval.
   * @param {number} [interval=1000] The interval at which the service function should be executed.
   * @returns {ServiceKit} The instance of ServiceKit for chaining.
   */
  createIntervalService(name, serviceFunction, interval = 1000) {
    this.services.push({
      name,
      serviceFunction: () => setInterval(serviceFunction, interval),
    });

    logger.info(`Created '${name}' interval (${interval}ms) service`);

    return this;
  }

  /**
   * Spawns a service by name.
   * @param {string} name The name of the service to spawn.
   * @returns {SpawnedService} The spawned service instance.
   */
  spawnService(name) {
    const service = _.find(this.services, { name });

    return new SpawnedService({
      serviceFunction: service.serviceFunction,
      name: service.name,
    });
  }
}

const $serviceKit = new ServiceKit();

module.exports = {
  $serviceKit,
};
