import test from 'ava'
import { join } from 'path'

import { checkMigrations, runMigrations } from './postgrator'
import { directMySQLQuery } from './directMySQLConnection'

const config = {
  name: 'mishguru_test_migrate',
  user: 'root',
  pass: '',
  host: '127.0.0.1',
  port: 3306,
  ssl: false,
  verbose: true,
}

const migrationDirectory = join(__dirname, './testHelpers/migrations')

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
  await runMigrations(migrationDirectory, config)
  t.pass()
})

test.serial('checkMigrations (afterwards)', async (t) => {
  await checkMigrations(migrationDirectory, config)
  t.pass()
})

test.serial('runMigrations (with number)', async (t) => {
  await runMigrations(migrationDirectory, config, '1')
  t.pass()
})
