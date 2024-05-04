const _ = require("lodash");
const YAML = require("yaml");
const fs = require("node:fs")

const { json } = require("../src/NewHttp").response;
const middleware = require("../src/NewHttp").middleware;

const { Router } = require("../src/Router");

const schema = {
  meta: {
    required: false,
    type: "object",
    properties: {
      group: { type: "string", required: true },
      noindex: { type: "boolean", required: true }
    }
  },
  if: {
    required: true,
    type: "object",
    properties: {
      tools: { type: "array", required: true }
    }
  },
  then: {
    required: true,
    type: "object",
    properties: {
      type: { type: "string", required: true },
      data: {
        type: "object",
        properties: {
          raw: { required: true }
        },
        required: true
      }
    }
  },
  else: {
    required: false,
    type: "object",
    properties: {
      type: { type: "string", required: true },
      data: {
        type: "object",
        properties: {
          raw: { required: true }
        },
        required: true
      }
    }
  }
};

/**
 * Validates an object against a given schema.
 * @param {Object} object The object to validate.
 * @param {Object} schema The schema to validate against.
 * @param {string} [path=""] The base path for error reporting.
 * @returns {Array} An array of error messages, empty if no errors.
 */
function validateObject(object, schema, path = "") {
  const errors = [];

  if (typeof object !== "object" || Array.isArray(object) || object === null) {
    errors.push(`${path} must be an object.`);
    return errors;
  }

  for (const key in schema.properties) {
    const prop = schema.properties[key];
    const propPath = path ? `${path}.${key}` : key;

    if (prop.required && !(key in object)) {
      errors.push(`${propPath} is required.`);
    } else if (key in object) {
      if (prop.type === "object") {
        errors.push(...validateObject(object[key], prop, propPath));
      } else if (prop.type === "array" && !Array.isArray(object[key])) {
        errors.push(`${propPath} must be an array.`);
      } else if (prop.type === "string" && typeof object[key] !== "string") {
        errors.push(`${propPath} must be a string.`);
      } else if (prop.type === "boolean" && typeof object[key] !== "boolean") {
        errors.push(`${propPath} must be a boolean.`);
      }
    }
  }

  return errors;
}

module.exports = (router) => {
  router.get(
    "/system/health",

    async (req, res) => {
      return json({ req, res }, {
        statusCode: 200,
        data: {}
      })
    },
  );

  router.get(
    "/system/ping",

    middleware.authByScheme('admins'),
    async (req, res) => {
      return json({ req, res }, {
        statusCode: 200,
        data: {
          message: "Pong!"
        }
      })
    },
  );

  router.get(
    "/system/routers/nested",

    middleware.authByScheme('admins'),
    async (req, res) => {
      const content = Router.getAllRoutersAsNestedFolders()

      return json({ req, res }, {
        statusCode: 200,
        data: content
      })
    }
  );

  router.get(
    "/system/routers/folders",

    middleware.authByScheme('admins'),
    async (req, res) => {
      const content = Router.getAllFolders()

      return json({ req, res }, {
        statusCode: 200,
        data: content
      })
    }
  );

  router.get(
    "/system/routers",

    middleware.authByScheme('admins'),
    async (req, res) => {
      const type = _.get(req, "query.type", "plain");

      switch (type) {
        case "nested": {
          const content = Router.getAllRoutersAsNestedFolders();

          return json({ req, res }, {
            statusCode: 200,
            data: content
          })
        }

        case "folders": {
          const content = Router.getAllFolders();

          return json({ req, res }, {
            statusCode: 200,
            data: content
          })
        }

        case "contents": {
          const content = Router.getAllExistsRoutesContents();

          return json({ req, res }, {
            statusCode: 200,
            data: content
          })
        }

        default: {
          const content = Router.getAllExistsRoutes();

          return json({ req, res }, {
            statusCode: 200,
            data: content
          })
        }
      }
    }
  );

  router.get(
    "/system/router/raw/:router",

    middleware.authByScheme('admins'),
    async (req, res) => {
      if (!req.params.router || typeof req.params.router !== 'string' || /[\s\d]/.test(req.params.router)) {
        return json({ req, res }, {
          statusCode: 400,
          data: "Invalid router name. Must be a string without spaces and numbers."
        })
      }

      const content = Router.useRouter(req.params.router);

      return json({ req, res }, {
        statusCode: 200,
        data: content
      })
    },
  );

  router.post(
    "/system/router/raw/:router",

    middleware.authByScheme('admins'),
    async (req, res) => {
      if (!req.params.router || typeof req.params.router !== 'string' || /[\s\d]/.test(req.params.router)) {
        return json({ req, res }, {
          statusCode: 400,
          data: "Invalid router name. Must be a string without spaces and numbers."
        })
      }

      const content = YAML.stringify(req.body)
      const routerPath = `${process.cwd()}/router/${req.params.router}.yml`

      const errors = validateObject(req.body, schema);

      if (errors.length > 0) {
        return json({ req, res }, {
          statusCode: 400,
          data: errors
        })
      }

      if (!fs.existsSync(`${process.cwd()}/router`)) {
        fs.mkdirSync(`${process.cwd()}/router`);
      }

      if (fs.existsSync(routerPath)) {
        return json({ req, res }, {
          statusCode: 409,
          data: "File already exists. To overwrite it, pass GET parameter force=1"
        })
      }

      fs.writeFileSync(routerPath, content);

      return json({ req, res }, {
        statusCode: 201,
        data: "Router created"
      })
    },
  );
};
