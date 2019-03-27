import { sync as globSync } from 'globby'
import { Sequelize } from 'sequelize'
import chalk from 'chalk'

const WARNED = new Set<string>()

const buildModels = (
  entitiesDirectory: string,
  sequelizeInstance: Sequelize,
) => {
  const entityPaths = globSync(['*.js', '!*.spec.js'], {
    cwd: entitiesDirectory,
    absolute: true,
  })

  const deprecatedMap = new Map()

  const entities = entityPaths.map((entityPath) => {
    const entity = require(entityPath).default
    if (Object.hasOwnProperty.call(entity, 'deprecatedNames')) {
      for (const name of entity.deprecatedNames) {
        deprecatedMap.set(name, entity.name)
      }
    }
    return entity
  })

  const models = entities.reduce((models, entity) => {
    const model = sequelizeInstance.import(entity.name, entity)
    models[entity.name] = model
    return models
  }, {})

  const modelProxy = new Proxy(models, {
    get (target, propSymbol) {
      const prop = String(propSymbol)
      if (Object.hasOwnProperty.call(target, prop)) {
        return target[prop]
      }
      if (deprecatedMap.has(prop)) {
        const realProp = deprecatedMap.get(prop)
        if (WARNED.has(prop) === false) {
          console.warn(
            chalk.grey(
              `Deprecated: ${chalk.yellow(
                `db.${prop}`,
              )} has been replaced by ${chalk.green(`db.${realProp}`)}.`,
            ),
          )
          WARNED.add(prop)
        }
        return target[realProp]
      }
      console.log('COULD NOT FIND PROP', prop)
      return undefined
    },
    has (target, prop) {
      if (Object.hasOwnProperty.call(target, prop)) {
        return true
      }
      if (deprecatedMap.has(prop)) {
        return true
      }
      return false
    },
  })

  entities.forEach((entity) => {
    const self = models[entity.name]
    entity.relationships(self, modelProxy)
  })

  return modelProxy
}

export default buildModels
