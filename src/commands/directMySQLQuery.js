import mysql from 'mysql'
import Promise from 'bluebird'

export const directMySQLConnection = ({ host, user, pass }) => {
  return mysql.createConnection({
    host,
    user,
    password: pass
  })
}

export const directMySQLQuery = (query, config) => {
  const connection = directMySQLConnection(config)

  return new Promise((resolve, reject) => {
    connection.query(query, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        connection.end((err) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        })
      }
    })
  })
}

export default directMySQLQuery
