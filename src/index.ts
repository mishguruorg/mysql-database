import Sequelize from 'sequelize'

import createTestDatabase from './createTestDatabase'
import teardownTestDatabase from './teardownTestDatabase'

import authenticate from './authenticate'
import buildModels from './buildModels'
import withTransaction from './withTransaction'
import { directMySQLQuery } from './directMySQLConnection'
import { runMigrations, checkMigrations } from './postgrator'

import { CreateDatabaseOptions, DatabaseConfig, Database } from './types'

async function backwardsCompatibleInit (
  entitiesDirectory: string,
  migrationDirectory: string,
  config: DatabaseConfig,
) {
  if (this.initialised === true) {
    return
  }

  this.config = config
  const { name, user, pass, host, port, verbose } = this.config

  const sequelizeInstance = new Sequelize(name, user, pass, {
    host,
    port,
    dialectOptions: { charset: 'utf8mb4' },
    define: {
      // Stop sequilze from changing table names
      freezeTableName: true,
    },
    logging: (message: string) => {
      if (verbose) {
        console.log(message)
      }
    },
  })

  this.models = buildModels(entitiesDirectory, sequelizeInstance)

  this.initialised = true
  this.sequelize = sequelizeInstance

  await authenticate(this.sequelize)
  await checkMigrations(migrationDirectory, this.config)
}

const createDatabase = (options: CreateDatabaseOptions): Database => {
  const { migrationDirectory, entitiesDirectory, customMethods } = options

  if (
    typeof migrationDirectory !== 'string' ||
    migrationDirectory.trim().length === 0
  ) {
    throw new Error('migrationDirectory must be a non-empty string')
  }

  if (
    typeof entitiesDirectory !== 'string' ||
    entitiesDirectory.trim().length === 0
  ) {
    throw new Error('entitiesDirectory must be a non-empty string')
  }

  const db: Database = {
    initialised: false,
    config: undefined,
    models: {},
    init: (config: DatabaseConfig) => {
      return backwardsCompatibleInit.call(
        db,
        entitiesDirectory,
        migrationDirectory,
        config,
      )
    },
    migrate: (version: string) => {
      return runMigrations(migrationDirectory, db.config, version)
    },
    setupTestDb: async (config: DatabaseConfig) => {
      await createTestDatabase(migrationDirectory, config)
      return db.init(config)
    },
    connectToTestDb: (config: DatabaseConfig) => {
      return db.init(config)
    },
    teardownTestDb: () => {
      return teardownTestDatabase(db.config)
    },
    directMySQLQuery: (queryString: string) => {
      return directMySQLQuery(queryString, db.config)
    },
    withTransaction,
    Sequelize,
  }

  const dbProxy = new Proxy(db, {
    get (target, propSymbol) {
      const prop = String(propSymbol)
      if (prop in target) {
        return target[prop]
      }
      if (prop in db.models) {
        return db.models[prop]
      }
      if (prop in customMethods) {
        return customMethods[prop]
      }
      return undefined
    },
  })

  return dbProxy
}

export { createDatabase }
