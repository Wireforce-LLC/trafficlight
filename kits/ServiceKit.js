const _ = require("lodash");
const {logger} = require("../src/Logger");

class SpawnedService {
  constructor({serviceFunction, name}) {
    this.function = serviceFunction
    this.name = name
    this.timeout = setTimeout(this.function, 100)

    logger.info(`Spawned '${name}' service (${this.timeout})`)

  }
}

class ServiceKit {
  services = [

  ]

  createService(name, serviceFunction) {
    this.services.push({
      name,
      serviceFunction
    })

    logger.info(`Created '${name}' service`)

    return this
  }

  createIntervalService(name, serviceFunction, interval = 1000) {
    this.services.push({
      name,
      serviceFunction: () => setInterval(serviceFunction, interval)
    })

    logger.info(`Created '${name}' interval (${interval}ms) service`)

    return this
  }

  spawnService(name) {
    const service = _.find(this.services, {name})

    return new SpawnedService({
      serviceFunction: service.serviceFunction,
      name: service.name,
    })
  }
  
}

const $serviceKit = new ServiceKit()

module.exports = {
  $serviceKit
}