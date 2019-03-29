import Postgrator from 'postgrator'

import { DatabaseConfig } from './types'

const createPostgrator = (
  migrationDirectory: string,
  config: DatabaseConfig,
) => {
  const postgrator = new Postgrator({
    migrationDirectory,
    driver: 'mysql',
    host: config.host,
    port: config.port,
    database: config.name,
    username: config.user,
    password: config.pass,
    validateChecksums: false,
  })

  if (config.verbose) {
    postgrator.on('migration-started', (migration) => {
      process.stdout.write(`> ${migration.filename} ...`)
    })
    postgrator.on('migration-finished', (migration) => {
      console.log('done!')
    })
  }

  return postgrator
}

const checkMigrations = async (
  migrationDirectory: string,
  config: DatabaseConfig,
) => {
  const postgrator = createPostgrator(migrationDirectory, config)

  try {
    const maxVersion = await postgrator.getMaxVersion()
    const databaseVersion = await postgrator.getDatabaseVersion()

    if (maxVersion !== databaseVersion) {
      console.warn(
        [
          '*************************************************',
          '*************************************************',
          databaseVersion < maxVersion
            ? 'The database is out of date and needs to be migrated!'
            : 'The local database package is out of date and should be updated!',
          '*************************************************',
          `Latest migration version on database: ${databaseVersion}`,
          `Latest migration version available is: ${maxVersion}`,
          '*************************************************',
          '*************************************************',
        ].join('\n'),
      )
    }
  } catch (error) {
    console.warn(
      [
        '*************************************************',
        '*************************************************',
        'Could not check database schema version!',
        '*************************************************',
        '*************************************************',
      ].join('\n'),
    )
  }
}

const runMigrations = async (
  migrationDirectory: string,
  config: DatabaseConfig,
  version: string = 'max',
) => {
  const { verbose } = config
  const postgrator = createPostgrator(migrationDirectory, config)

  if (verbose) {
    console.log('Starting to run migrations...')
  }

  await postgrator.migrate(version)

  if (verbose) {
    console.log('Finished running migrations!')
  }
}

export { checkMigrations, runMigrations }
