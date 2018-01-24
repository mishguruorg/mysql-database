import postgrator from 'postgrator'
import { join } from 'path'
import Promise from 'bluebird'

const checkMigrations = (config) => {
  postgrator.setConfig({
    migrationDirectory: join(__dirname, 'migrations'),
    driver: 'mysql', // or pg.js, mysql, mssql, tedious
    host: config.host,
    database: config.name,
    username: config.user,
    password: config.pass,
    logProgress: config.verbose
  })
  postgrator.getVersions((err, versions) => {
    if (err) {
      console.warn('There was an error getting versions')
    } else {
      if (versions.current !== versions.max) {
        const errorMessage = [
          '*************************************************',
          '*************************************************',
          versions.current < versions.max
            ? 'The database is out of date and needs to be migrated!'
            : 'The @mishguru/data package is out of date and should be updated!',
          '*************************************************',
          `Database is on version: ${versions.current}`,
          `@mishguru/data is on version: ${versions.max}`,
          '*************************************************',
          '*************************************************'
        ].join('\n')
        console.warn(errorMessage)
      }
    }
  })
}

const runMigrations = (version, config) => {
  postgrator.setConfig({
    migrationDirectory: join(__dirname, 'migrations'),
    driver: 'mysql',
    host: config.host,
    database: config.name,
    username: config.user,
    password: config.pass,
    logProgress: config.verbose
  })

  version = version != null ? version : 'max'

  return new Promise((resolve, reject) => {
    postgrator.migrate(version, (err, migrations) => {
      if (err) {
        reject(err)
      }

      postgrator.endConnection(() => {
        resolve(version)
      })
    })
  })
}

export {
  checkMigrations,
  runMigrations
}
