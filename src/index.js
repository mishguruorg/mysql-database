import Promise from 'bluebird'
import Sequelize from 'sequelize'
import delay from 'delay'
import { toPairs } from 'ramda'

import { runMigrations, checkMigrations } from './migrate'
import { authenticate, buildSequelizeConfig } from './sequelize-tools'
import { directMySQLConnection, directMySQLQuery } from './commands/directMySQLQuery'
import { destroyTestDbs, TEST_DB_PREFIX } from './test-tools'

const parseConfig = (config) => {
  const preparedConfig = Object.assign({}, config)
  preparedConfig.ssl = config.ssl || false
  preparedConfig.port = config.port || 3306
  preparedConfig.verbose = config.verbose || false

  if (preparedConfig.verbose) {
    console.log('Initialising database, config contains: ')

    toPairs(config).forEach(([key, value]) => {
      console.log(`  ${key}: ${/pass/.test(key) ? '**********' : value}`)
    })
  }

  return preparedConfig
}

class MySQLDatabase {
  _saveConfig (config) {
    this.config = parseConfig(config)
    return this.config
  }

  _createAndSetupDb (config) {
    this._saveConfig(config)

    if (this.testDbName.startsWith(this.acceptableDbNamePrefix) === false) {
      throw new Error(`Not allowed to create a test DB with the name '${this.testDbName}'.
Name has to start with '${this.acceptableDbNamePrefix}'.`)
    }

    const createTestDbQuery = `CREATE DATABASE IF NOT EXISTS ${this.testDbName};`
    const setupTestDbQuery = 'SET GLOBAL sql_mode=\'\';'

    // Create test database, migrate it forward and then init it like normal
    return directMySQLQuery(createTestDbQuery, this.config)
      .then(() => directMySQLQuery(setupTestDbQuery, this.config))
      .then(() => this.migrate())
      .then(() => {
        if (this.sequelize) {
          this.sequelize.close() // Sequelize does not return anything
        }
        return Promise.resolve()
      })
      .then(() => {
        this.initialised = false
        return this.init(config)
      })
  }

  constructor (options) {
    this.initialised = false

    this.buildModels = options.buildModels
    if (typeof this.buildModels !== 'function') {
      throw new Error('buildModels must be a function')
    }

    this.testDbName = options.testDbName
    if (typeof this.testDbName !== 'string' || this.testDbName.trim().length === 0) {
      throw new Error('testDbName must be a non-empty string')
    }

    this.acceptableDbNamePrefix = options.acceptableDbNamePrefix
    if (typeof this.acceptableDbNamePrefix !== 'string' || this.acceptableDbNamePrefix.trim().length === 0) {
      throw new Error('acceptableDbNamePrefix must be a non-empty string')
    }

    this.migrationDirectory = options.migrationDirectory
    if (typeof this.migrationDirectory !== 'string' || this.migrationDirectory.trim().length === 0) {
      throw new Error('migrationDirectory must be a non-empty string')
    }
  }

  /**
   * Sets up a sequelize connection to the database and initialises sequelise with all the correct
   * models and relations
   */
  init (config) {
    this._saveConfig(config)

    if (this.initialised === false) {
      const sequelizeOptions = buildSequelizeConfig(this.config)
      const sequelizeInstance = new Sequelize(
        this.config.name,
        this.config.user,
        this.config.pass,
        sequelizeOptions
      )

      const models = this.buildModels(sequelizeInstance)

      // These values are available throughout the Mish repos that use this data module
      this.initialised = true
      this.Sequelize = Sequelize
      this.sequelize = sequelizeInstance

      toPairs(models).forEach(([name, model]) => {
        this[name] = model
      })
    } else if (this.config.verbose) {
      console.warn('Ignoring call to initialise database, already initialised')
    }

    return authenticate(this.sequelize)
      .then(() => checkMigrations(this.migrationDirectory, this.config))
  }

  /**
   * Runs the migrations to either the specified version, or to all version
   * @param  {Number} version Specific version to migrate to
   * @return {Promise}
   *
   */
  migrate (version) {
    return runMigrations(this.migrationDirectory, version, this.config)
  }

  initTestDb (config) {
    console.warn('Deprecated: initTestDb should not be used. Replace with setupTestDb')
    console.warn('initTestDb should be removed when Mocha tests are no longer being used')

    this.testDbName = TEST_DB_PREFIX + Math.random().toString(36).substr(2, 5)
    config.name = this.testDbName

    return this._createAndSetupDb(config)
  }

  /**
   * Creates a test database that is shared between integration tests. This test database has a consistent
   * name so that once setup, any test can quickly find and connect to it without needing to know the
   * randomly generated test database name.
   *
   * teardownTestDb is used to destroy the test database
   */
  setupTestDb (config) {
    config.name = this.testDbName
    config.verbose = false
    return this._createAndSetupDb(config)
  }

  connectToTestDb (config) {
    config.name = this.testDbName
    return this.init(config)
  }

  destroyTestDb () {
    console.warn('Deprecated: destroyTestDb should not be used. Replace with teardownTestDb \n')
    console.warn('destroyTestDb returns a promise that performs NoOp')
    return Promise.resolve()
  }

  destroyAllTestDbs () {
    console.warn('Deprecated: destroyAllTestDbs should not be used. Replace with teardownTestDb \n')
    return destroyTestDbs(this.config)
  }

  teardownTestDb () {
    const queryTableNames = `
      select table_name
      from information_schema.tables
      where
        table_schema = '${this.testDbName}' and
        table_name != "schemaversion";
    `
    return directMySQLQuery(queryTableNames, this.config)
      .then((rows) => {
        const deleteAndAlterAllTables = rows.reduce((lines, row) => {
          return [
            ...lines,
            `delete from ${this.testDbName}.${row.table_name};`,
            `alter table ${this.testDbName}.${row.table_name} auto_increment = 1;`
          ]
        }, [])

        const tearDownQueries = [
          'set foreign_key_checks = 0;', // disable a foreign keys check
          ...deleteAndAlterAllTables,
          'set foreign_key_checks = 1;' // enable a foreign keys check
        ]

        const connection = directMySQLConnection(this.config)
        const runQuery = Promise.promisify(connection.query, { context: connection })
        const endConnection = Promise.promisify(connection.end, { context: connection })

        return Promise.each(tearDownQueries, (query) => runQuery(query))
          .then(() => endConnection())
      })
  }

  directMySQLQuery (query) {
    return directMySQLQuery(query, this.config)
  }

  withTransaction (fn, options = {}) {
    const { minDelay = 100, maxDelay = 1000} = options

    if (typeof fn !== 'function') {
      throw new Error('Must pass a function to withTransaction')
    }

    return this.sequelize.transaction(fn).catch(async (error) => {
      if (error.message.startsWith('ER_LOCK_DEADLOCK')) {
        await delay(random.int(MIN_DELAY, MAX_DELAY))
        return this.withTransaction(fn)
      }
      throw error
    })
  }
}

export default MySQLDatabase
