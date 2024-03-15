const mime = require("node-mime-types");
const fs = require("node:fs");
const YAML = require("yaml");
const _ = require("lodash");
const path0 = require("node:path");

class RouterKit {
  getRouterContent(name) {
    const path = `${process.cwd()}/router/${name}.yml`

    if (!this.isRouterExists(name)) {
      return null
    }

    if (mime.getMIMEType(path) !== 'text/yaml') {
      return null
    }

    const data = String(fs.readFileSync(path))

    return YAML.parse(data)
  }

  isRouterExists(name) {
    return fs.existsSync(`${process.cwd()}/router/${name}.yml`)
  }

  getAllExistsRoutes() {
    const path = process.cwd() + '/router'

    if (!fs.existsSync(path)) {
      return null
    }

    return _.uniq(
      fs
        .readdirSync(path)
        .map(i => {
          if (mime.getMIMEType(i) === 'text/yaml') {
            return path0.basename(i).replace(path0.extname(path0.basename(i)), "")
          }

          return null
        })
    ).filter(i => _.isString(i))
  }

  getAllExistsRoutesContents() {
    return this.getAllExistsRoutes().map(router => {
      const raw = this.getRouterContent(router)

      return _.assign({
        ...raw
      }, {
        meta: {
          ...raw.meta,
          name: router
        }
      })
    })
  }

  getAllFolders() {
    return _.filter(_.uniq(this.getAllExistsRoutesContents().map(router => _.get(router, 'meta.group'))), _.isString)
  }

  getAllRoutersAsNestedFolders() {
    const routers = this.getAllExistsRoutesContents()

    return _.groupBy(routers, 'meta.group')
  }
}

const $routerKit = new RouterKit()

module.exports = { $routerKit }