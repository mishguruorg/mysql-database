import { directMySQLConnection } from './directMySQLConnection'
import validateTestDatabaseConfig from './validateTestDatabaseConfig'
import { DatabaseConfig } from './types'

const teardownTestDatabase = async (config: DatabaseConfig) => {
  if (validateTestDatabaseConfig(config) === false) {
    throw Error('Invalid test database config')
  }

  const { name } = config

  const connection = directMySQLConnection(config)

  const queryTableNames = `
      select table_name
      from information_schema.tables
      where
        table_schema = '${name}' and
        table_name != "schemaversion";
    `
  const rows = (await connection.query(queryTableNames)) as any

  const deleteAndAlterAllTables = rows.reduce((lines: string[], row: any) => {
    return [
      ...lines,
      `delete from ${name}.${row.table_name};`,
      `alter table ${name}.${row.table_name} auto_increment = 1;`,
    ]
  }, [])

  const tearDownQueries = [
    'set foreign_key_checks = 0;', // disable a foreign keys check
    ...deleteAndAlterAllTables,
    'set foreign_key_checks = 1;', // enable a foreign keys check
  ]

  for (const queryString of tearDownQueries) {
    await connection.query(queryString)
  }

  await connection.end()
}

export default teardownTestDatabase
