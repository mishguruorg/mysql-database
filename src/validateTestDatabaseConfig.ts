import { DatabaseConfig } from './types'

const REQUIRED_PREFIX = 'mishguru_test_'

const validateTestDatabaseConfig = (config: DatabaseConfig) => {
  const { name, host, port, user, pass } = config

  if (host !== '127.0.0.1' || port !== 3306 || user !== 'root' || pass !== '') {
    throw new Error(
      `Error: The database you are trying to connect to is not a test database!
There is a high risk of data loss if you run the tests on an Internal or Production database.
Please check your database config:
${JSON.stringify(config, null, 2)}`,
    )
  }

  if (name.startsWith(REQUIRED_PREFIX) === false) {
    throw new Error(
      `Cannot use database with name: "${name}" for testing. The database name must begin with "${REQUIRED_PREFIX}".`,
    )
  }

  return true
}

export default validateTestDatabaseConfig
