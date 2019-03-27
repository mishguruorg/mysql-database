import { directMySQLConnection } from './directMySQLConnection'

import { DatabaseConfig } from './types'

const REQUIRED_SUFFIX = '_test'

const teardownTestDatabase = async (config: DatabaseConfig) => {
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
      `Cannot teardown test database with name: "${name}". The database name must end with "${REQUIRED_SUFFIX}".`,
    )
  }

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
