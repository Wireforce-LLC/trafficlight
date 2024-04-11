
# w/trafficlight

<img src="https://i.ibb.co/7g17JrQ/Frame-6-1.png" align="right" width="80" height="80">

The **TrafficLight** project is a comprehensive tool for managing and directing internet traffic, similar to Keitaro. It allows for the routing of traffic based on various criteria, such as IP addresses, geolocation, and device type. The project offers extensive capabilities for analyzing and optimizing data flows.

![JavaScript](https://img.shields.io/badge/javascript-yellow?style=for-the-badge&logo=javascript&logoColor=white)
![Bash](https://img.shields.io/badge/bash-black?style=for-the-badge&logo=zsh&logoColor=white)

## Getting Started
To download and start the TrafficLight project, as well as configure it using `pm2` or `Docker Compose`, follow these instructions.

1. Clone the repository using the command:
   ```bash
   git clone https://github.com/Wireforce-LLC/trafficlight.git
   ```

### Configuration with PM2

For long-term operation of the project in the background, use [PM2](http://pm2.keymetrics.io/), a process manager for Node.js.

1. If PM2 is not yet installed, install it globally using npm:
   ```bash
   npm install pm2 -g
   ```
2. Start the TrafficLight project with PM2:
   ```bash
   pm2 start hello.js --name trafficlight
   ```
3. To automatically start your application after a reboot with PM2, use:
   ```bash
   pm2 startup
   ```
4. To save the settings of the processes running through PM2 so that they automatically restart after system reboot, execute the command:
   ```bash
   pm2 save
   ```

### Configuration with Docker Compose

If you prefer containerization, you can run TrafficLight using Docker Compose.

1. Start the project with the command:
   ```bash
   docker-compose up -d
   ```
  The ` -d` key will run your container in the background.


## Configuration Overview

The configuration is divided into several key sections: `meta`, `if`, `then`, and `else`. Each section performs a unique role in determining how traffic is routed based on the defined conditions.

### First router

```yaml
meta:
  group: Group Name
  noindex: false

if:
  tools: []

then:
  type: JSON
  data:
    raw:
      ...

else:
  type: JSON
  data:
    raw:
     ...
```

## Project Structure

The project consists of several key components and modules:
- `hello.js` — the entry point of the project, responsible for initializing and launching the traffic light simulation.
- Modules for processing HTTP requests, including the `Router` module for routing and `Http` for working with HTTP responses.
- A filtering system for managing traffic based on IP addresses and other request parameters.
- Auxiliary utilities and configuration files.
