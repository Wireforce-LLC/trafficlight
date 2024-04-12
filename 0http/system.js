const _ = require("lodash");
const YAML = require("yaml");
const fs = require("node:fs")

const { Http } = require("../src/Http");
const { Router } = require("../src/Router");
const { logger } = require("../src/Logger");


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
    "/system/ping",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      Http.of(req, res).sendJsonObject(Http.positive("pong"));
    },
  );

  router.get(
    "/system/routers/nested",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      const content = Router.getAllRoutersAsNestedFolders()

      Http.of(req, res).sendJsonObject(
        Http.positive(content),
      );
    },
  );

  router.get(
    "/system/routers/folders",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      Http.of(req, res).sendJsonObject(Http.positive(Router.getAllFolders()));
    },
  );

  router.get(
    "/system/routers",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      const type = _.get(req, "query.type", "plain");

      switch (type) {
        case "nested": {
          const content = Router.getAllRoutersAsNestedFolders();

          return Http.of(req, res).sendJsonObject(Http.positive(content));
        }

        case "folders": {
          const content = Router.getAllFolders();

          return Http.of(req, res).sendJsonObject(Http.positive(content));
        }

        case "contents": {
          const content = Router.getAllExistsRoutesContents();

          return Http.of(req, res).sendJsonObject(Http.positive(content));
        }

        default: {
          const content = Router.getAllExistsRoutes();

          return Http.of(req, res).sendJsonObject(Http.positive(content));
        }
      }
    },
  );

  router.get(
    "/system/router/raw/:router",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      if (!req.params.router || typeof req.params.router !== 'string' || /[\s\d]/.test(req.params.router)) {
        return Http.of(req, res).statusCode(400).sendJsonObject(
          Http.negative("Invalid router name. Must be a string without spaces and numbers.", 400)
        );
      }

      const content = Router.useRouter(req.params.router);

      Http.of(req, res).sendJsonObject(Http.positive(content));
    },
  );

  router.post(
    "/system/router/raw/:router",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      if (!req.params.router || typeof req.params.router !== 'string' || /[\s\d]/.test(req.params.router)) {
        return Http.of(req, res).statusCode(400).sendJsonObject(
          Http.negative("Invalid router name. Must be a string without spaces and numbers.", 400)
        );
      }

      const content = YAML.stringify(req.body)
      const routerPath = `${process.cwd()}/router/${req.params.router}.yml`

      const errors = validateObject(req.body, schema);

      if (errors.length > 0) {
        return Http.of(req, res).sendJsonObject(Http.negative({ errors }));
      }

      if (!fs.existsSync(`${process.cwd()}/router`)) {
        fs.mkdirSync(`${process.cwd()}/router`);
      }

      if (fs.existsSync(routerPath)) {
        Http.of(req, res).statusCode(409).sendJsonObject(
          Http.negative("File already exists. To overwrite it, pass GET parameter force=1", 409)
        );
      }

      fs.writeFileSync(routerPath, content);

      return Http.of(req, res).statusCode(201).sendJsonObject(
        Http.positive(true, 201)
      );
    },
  );
};
