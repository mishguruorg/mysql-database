import test from 'ava'
import { join } from 'path'
import { getDbCredentialsForEnv } from '@mishguru/commandquery'

import { checkMigrations, runMigrations } from './migrate'
import directMySQLQuery from './commands/directMySQLQuery'

const migrationDirectory = join(__dirname, './testHelpers/migrations')
const config = getDbCredentialsForEnv(process.env.NODE_ENV)

config.name = 'mishguru_test_migrate'
config.verbose = true

test.before(async (t) => {
  const createTestDbQuery = `
  CREATE DATABASE IF NOT EXISTS ${config.name};
  `
  await directMySQLQuery(createTestDbQuery, config)
})

test.after(async (t) => {
  const createTestDbQuery = `
  DROP DATABASE ${config.name};
  `
  await directMySQLQuery(createTestDbQuery, config)
})

test.serial('checkMigrations (initial)', async (t) => {
  await checkMigrations(migrationDirectory, config)
  t.pass()
})

test.serial('runMigrations', async (t) => {
  await runMigrations(migrationDirectory, 'max', config)
  t.pass()
})

test.serial('checkMigrations (afterwards)', async (t) => {
  await checkMigrations(migrationDirectory, config)
  t.pass()
})

test.serial('runMigrations (with number)', async (t) => {
  await runMigrations(migrationDirectory, 1, config)
  t.pass()
})
