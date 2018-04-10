import Postgrator from 'postgrator'

const initPostgrator = (migrationDirectory, config) => {
  const postgrator = new Postgrator({
    migrationDirectory,
    driver: 'mysql',
    host: config.host,
    port: config.port,
    database: config.name,
    username: config.user,
    password: config.pass,
    validateChecksums: false
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

const checkMigrations = async (migrationDirectory, config) => {
  const postgrator = initPostgrator(migrationDirectory, config)

  try {
    const maxVersion = await postgrator.getMaxVersion()
    const databaseVersion = await postgrator.getDatabaseVersion()

    if (maxVersion !== databaseVersion) {
      console.warn([
        '*************************************************',
        '*************************************************',
        databaseVersion < maxVersion
          ? 'The database is out of date and needs to be migrated!'
          : 'The @mishguru/data package is out of date and should be updated!',
        '*************************************************',
        `Database is on version: ${databaseVersion}`,
        `@mishguru/data is on version: ${maxVersion}`,
        '*************************************************',
        '*************************************************'
      ].join('\n'))
    }
  } catch (error) {
    console.warn([
      '*************************************************',
      '*************************************************',
      'Could not check database schema version!',
      '*************************************************',
      '*************************************************'
    ].join('\n'))
  }
}

const runMigrations = async (migrationDirectory, version, config) => {
  const postgrator = initPostgrator(migrationDirectory, config)

  version = version != null ? version : 'max'
  version = version.toString()

  await postgrator.migrate(version)
}

export {
  checkMigrations,
  runMigrations
}
