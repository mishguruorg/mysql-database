import directMySQLQuery from './commands/directMySQLQuery'

const TEST_DB_PREFIX = 'mishguru_test_'

const destroyTestDbs = (config) => {
  console.warn('This method should be removed when Mocha tests are no longer being used')

  return new Promise((resolve, reject) => {
    const dbsToDrop = "SHOW DATABASES LIKE '" + TEST_DB_PREFIX + "%';"
    directMySQLQuery(dbsToDrop, config)
      .then((rows) => {
        const leftOverTestDatabases = []
        for (let i = 0; i < rows.length; i++) {
          leftOverTestDatabases.push(rows[i]['Database (' + TEST_DB_PREFIX + '%)'])
        }

        if (leftOverTestDatabases.length > 0) {
          const removeTestDatabasePromises = []
          for (let i = 0; i < leftOverTestDatabases.length; i++) {
            let removeTestDatabaseQuery = ' DROP DATABASE ' + leftOverTestDatabases[i] + ';'
            removeTestDatabasePromises.push(directMySQLQuery(removeTestDatabaseQuery, config))
          }
          return Promise.all(removeTestDatabasePromises).then(resolve)
        } else {
          resolve()
        }
      })
  })
}

export {
  TEST_DB_PREFIX,
  destroyTestDbs
}
