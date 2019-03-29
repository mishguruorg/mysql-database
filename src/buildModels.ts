import { sync as globSync } from 'globby'
import { Sequelize, DataTypes } from 'sequelize'
import chalk from 'chalk'

type AnyModel = any

interface Entity {
  (sequelizeInstance: Sequelize, dataTypes: DataTypes): AnyModel,
  name: string,
  relationships: (self: AnyModel, models: Record<string, AnyModel>) => void,
  deprecatedNames: string[],
}

type DeprecatedNameMap = Map<string, string>
type ModelMap = Map<string, AnyModel>
interface ModelMapProxy {
  get(prop: string): AnyModel,
  has(prop: string): boolean,
}

const buildEntityPaths = (entitiesDirectory: string) => {
  const entityPaths = globSync(['*.js', '!*.spec.js'], {
    cwd: entitiesDirectory,
    absolute: true,
  })
  return entityPaths
}

const buildEntities = (entityPaths: string[]): Entity[] => {
  const entities = entityPaths.map((entityPath) => {
    const entity = require(entityPath).default as Entity
    return entity
  })
  return entities
}

const buildDeprecatedNameMap = (entities: Entity[]): DeprecatedNameMap => {
  return entities.reduce((map, entity) => {
    if (entity.deprecatedNames != null) {
      entity.deprecatedNames.forEach((deprecatedName) => {
        map.set(deprecatedName, entity.name)
      })
    }
    return map
  }, new Map<string, string>())
}

const buildModelMap = (
  entities: Entity[],
  sequelizeInstance: Sequelize,
): ModelMap => {
  return entities.reduce((map, entity) => {
    const model = sequelizeInstance.import(entity.name, entity)
    map.set(entity.name, model)
    return map
  }, new Map<string, AnyModel>())
}

const connectEntityRelationships = (
  entities: Entity[],
  modelMapProxy: ModelMapProxy,
) => {
  entities.forEach((entity) => {
    const self = modelMapProxy.get(entity.name)
    entity.relationships(self, modelMapProxy)
  })
}

const WARNED = new Set<string>()

const warnDeprecatedProp = (oldProp: string, newProp: string) => {
  if (WARNED.has(oldProp) === true) {
    return
  }
  console.warn(
    chalk.grey(
      `Deprecated: ${chalk.yellow(
        `db.${oldProp}`,
      )} has been replaced by ${chalk.green(`db.${newProp}`)}.`,
    ),
  )
  WARNED.add(oldProp)
}

const buildProxyGet = (deprecatedNameMap: DeprecatedNameMap) => (
  target: ModelMap,
  propSymbol: symbol,
) => {
  const prop = String(propSymbol)

  if (target.has(prop)) {
    return target.get(prop)
  }

  if (deprecatedNameMap.has(prop)) {
    const realProp = deprecatedNameMap.get(prop)
    warnDeprecatedProp(prop, realProp)
    return target.get(realProp)
  }

  console.log('', prop)
  return undefined
}

const buildProxyHas = (deprecatedNameMap: DeprecatedNameMap) => (
  target: ModelMap,
  propSymbol: symbol,
) => {
  const prop = String(propSymbol)
  return target.has(prop) || deprecatedNameMap.has(prop)
}

const buildModelMapProxy = (
  modelMap: ModelMap,
  deprecatedNameMap: DeprecatedNameMap,
) => {
  const modelProxy = new Proxy(modelMap, {
    get: buildProxyGet(deprecatedNameMap),
    has: buildProxyHas(deprecatedNameMap),
  })
  return modelProxy
}

const buildModels = (
  entitiesDirectory: string,
  sequelizeInstance: Sequelize,
) => {
  const entityPaths = buildEntityPaths(entitiesDirectory)
  const entities = buildEntities(entityPaths)
  const deprecatedNameMap = buildDeprecatedNameMap(entities)
  const modelMap = buildModelMap(entities, sequelizeInstance)
  const modelMapProxy = buildModelMapProxy(modelMap, deprecatedNameMap)

  connectEntityRelationships(entities, modelMapProxy)

  return modelMapProxy
}

export default buildModels
