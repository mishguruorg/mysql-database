import { sync as globSync } from 'globby'
import { DataTypes } from 'sequelize'
import chalk from 'chalk'

type AnyModel = any

interface Entity {
  (sequelizeInstance: Sequelize, dataTypes: DataTypes): AnyModel,
  name: string,
  relationships: (self: AnyModel, models: Record<string, AnyModel>) => void,
  deprecatedNames: string[],
}

interface Sequelize {
  import: (name: string, entity: Entity) => AnyModel
}

type DeprecatedNameMap = Map<string, string>
type ModelMap = Map<string, AnyModel>

export type ModelMapProxy = Record<string, AnyModel>

const buildEntityPaths = (entitiesDirectory: string) => {
  const entityPaths = globSync(['*.(js|ts)', '!*.spec.(js|ts)'], {
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
    const self = modelMapProxy[entity.name]
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

const buildProxyGet = (modelMap: ModelMap, deprecatedNameMap: DeprecatedNameMap) => (
  target: object,
  prop: string
) => {
  if (modelMap.has(prop)) {
    return modelMap.get(prop)
  }

  if (deprecatedNameMap.has(prop)) {
    const realProp = deprecatedNameMap.get(prop)
    warnDeprecatedProp(prop, realProp)
    return modelMap.get(realProp)
  }

  return undefined
}

const buildProxyHas = (modelMap: ModelMap, deprecatedNameMap: DeprecatedNameMap) => (
  target: object,
  prop: string
) => {
  return modelMap.has(prop) || deprecatedNameMap.has(prop)
}

const buildProxySet = () => () => {
  throw new Error('Database models are immutable')
}

const buildProxyDeleteProperty = () => () => {
  throw new Error('Database models are immutable')
}

const buildProxyOwnKeys = (modelMap: ModelMap) => (): string[] => {
  return [...modelMap.keys()]
}

const buildGetOwnPropertyDescriptor = (modelMap: ModelMap) => (target: object, propSymbol: symbol) => {
  const prop = String(propSymbol)
  if (modelMap.has(prop)) {
    return {
      enumerable: true,
      configurable: true,
      value: modelMap.get(prop)
    }
  }
  return undefined
}

const buildModelMapProxy = (
  modelMap: ModelMap,
  deprecatedNameMap: DeprecatedNameMap,
): ModelMapProxy => {
  return new Proxy({}, {
    get: buildProxyGet(modelMap, deprecatedNameMap),
    has: buildProxyHas(modelMap, deprecatedNameMap),
    set: buildProxySet(),
    deleteProperty: buildProxyDeleteProperty(),
    ownKeys: buildProxyOwnKeys(modelMap),
    getOwnPropertyDescriptor: buildGetOwnPropertyDescriptor(modelMap)
  })
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
