import { runMigrations } from './postgrator'
import { DatabaseConfig } from './types'
import { directMySQLConnection } from './directMySQLConnection'
import validateTestDatabaseConfig from './validateTestDatabaseConfig'

const createTestDatabase = async (
  migrationDirectory: string,
  config: DatabaseConfig,
) => {
  if (validateTestDatabaseConfig(config) === false) {
    throw Error('Invalid test database config')
  }

  const { name } = config

  const createTestDbQuery = `CREATE DATABASE IF NOT EXISTS ${name};`
  const setupTestDbQuery = `SET GLOBAL sql_mode='';`

  const connection = directMySQLConnection(config)
  await connection.query(createTestDbQuery)
  await connection.query(setupTestDbQuery)
  await connection.end()

  await runMigrations(migrationDirectory, config, 'max')
}

export default createTestDatabase
