import { runMigrations } from './postgrator'
import { DatabaseConfig } from './types'
import { directMySQLConnection } from './directMySQLConnection'

const REQUIRED_SUFFIX = '_test'

const createTestDatabase = async (
  migrationDirectory: string,
  config: DatabaseConfig,
) => {
  const { name, host, port, user, pass } = config

  if (host !== '127.0.0.1' || port !== 3306 || user !== 'root' || pass !== '') {
    console.error('WARNING:')
    console.error(
      'THE DATABASE YOU ARE TRYING TO CONNECT TO IS NOT A TEST DATABASE!',
    )
    console.error('CHECK YOUR ENVIRONMENT VARIABLES!')
    console.dir(config, { depth: 2, color: true })
    process.exit(1)
    throw new Error('')
  }

  if (name.endsWith(REQUIRED_SUFFIX) === false) {
    throw new Error(
      `Cannot create test database with name: "${name}". The database name must end with "${REQUIRED_SUFFIX}".`,
    )
  }

  const createTestDbQuery = `CREATE DATABASE IF NOT EXISTS ${name};`
  const setupTestDbQuery = `SET GLOBAL sql_mode='';`

  const connection = directMySQLConnection(config)
  await connection.query(createTestDbQuery)
  await connection.query(setupTestDbQuery)
  await connection.end()

  await runMigrations(migrationDirectory, config, 'max')
}

export default createTestDatabase
