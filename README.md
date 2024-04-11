# w/trafficlight

The TrafficLight project is a comprehensive tool for managing and directing internet traffic, similar to Keitaro. It allows for the routing of traffic based on various criteria, such as IP addresses, geolocation, and device type. The project offers extensive capabilities for analyzing and optimizing data flows.

## Getting Started
To download and start the TrafficLight project, as well as configure it using `pm2` or `Docker Compose`, follow these instructions.

1. Clone the repository using the command:
   ```bash
   git clone https://github.com/Wireforce-LLC/trafficlight.git
   ```
2. Move to the project's root directory:
   ```bash
   cd trafficlight
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

### Meta Section

```yaml
meta:
  group: Group Name
```

- **group**: Identifies the group or category this router configuration belongs to. In this example, it's set to "Group Name".

### Conditional Filtering (If Section)

```yaml
if:
  filters:
    - NOT_APPLE_IP
  tools:
    - IP:
        country: ["US", "UK"]
```

This section specifies the conditions under which the `then` action will be triggered.

- **filters**: Lists the filters applied to incoming traffic. Here it checks for traffic that does not originate from an Apple IP address (`NOT_APPLE_IP`).
- **tools**: Defines additional tools or checks to apply. In this case, it checks if the incoming IP is from USA or UK. The commented lines show examples of how to add more countries.

### Then Section

```yaml
then:
  type: JSON
  data:
    raw:
      ...
```

This section defines the actions to take if the `if` conditions are met.

- **type**: Specifies the type of response or action to be taken. Here, it is set to JSON.

- **data(raw)**: The data to be returned or the action to be executed. It includes settings such as allowing the traffic (`allow: true`) and routing it through a specified proxy URL.

### Else Section

```yaml
else:
  also:
   - axios:
      url: "https://p4p3r.com/..."
  type: JSON
  data:
    raw:
     ...
```

Defines alternative actions if the `if` conditions are not met.

- **also**: Additional actions or commands to execute. Here, it's making a call to a specified URL using `axios`.

- **type & data**: Similar to the `then` section, specifies the response or action type and details. Though `data` is empty here, typically this would be where alternative data or commands are specified.

## Project Structure

The project consists of several key components and modules:
- `hello.js` — the entry point of the project, responsible for initializing and launching the traffic light simulation.
- Modules for processing HTTP requests, including the `Router` module for routing and `Http` for working with HTTP responses.
- A filtering system for managing traffic based on IP addresses and other request parameters.
- Auxiliary utilities and configuration files.
