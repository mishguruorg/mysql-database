import * as mysql from 'mysql'
import { promisify } from 'util'

import { DatabaseConfig } from './types'

const directMySQLConnection = (config: DatabaseConfig) => {
  const { host, user, pass } = config

  const connection = mysql.createConnection({
    host,
    user,
    password: pass,
  })

  const query = promisify(connection.query.bind(connection))
  const end = promisify(connection.end.bind(connection))

  return {
    query,
    end,
  }
}

const directMySQLQuery = async (
  queryString: string,
  config: DatabaseConfig,
) => {
  const connection = directMySQLConnection(config)
  const rows = await connection.query(queryString)
  await connection.end()
  return rows
}

export { directMySQLConnection, directMySQLQuery }
