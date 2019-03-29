import anyTest, {TestInterface} from 'ava'
import { join } from 'path'
import sinon, { SinonStub } from 'sinon'

import buildModels, { ModelMapProxy } from './buildModels'
import TableEntity from './testHelpers/entities/table'

const TABLE_NAME = TableEntity.name
const DEPRECATED_TABLE_NAME = TableEntity.deprecatedNames[0]

const test = anyTest as TestInterface<{
  sequelizeInstance: {
    import: SinonStub,
  },
  models: ModelMapProxy
}>;

const TEST_DIR = join(__dirname, 'testHelpers/entities')

test.before((t) => {
  const sequelizeInstance = {
    import: sinon.stub().callsFake((x) => x)
  }

  const models = buildModels(TEST_DIR, sequelizeInstance)

  t.context = {
    sequelizeInstance,
    models
  }
})

test('Object.keys() should only return real table names', (t) => {
  const { models } = t.context
  const keys = Object.keys(models)
  t.deepEqual(keys, [TABLE_NAME])
})

test('should be able to access table by real name', (t) => {
  const { models } = t.context
  t.truthy(models[TABLE_NAME])
})

test('should be able to detect table by real name', (t) => {
  const { models } = t.context
  t.true(TABLE_NAME in models)
})

test('should be able to access table by deprecated name', (t) => {
  const { models } = t.context
  t.truthy(models[DEPRECATED_TABLE_NAME])
})

test('should be able to detect table by deprecated name', (t) => {
  const { models } = t.context
  t.true(DEPRECATED_TABLE_NAME in models)
})

test('should return undefined for tables that do not exist', (t) => {
  const { models } = t.context
  t.is(models.undefined, undefined)
})

test('should return false for tables that do not exist', (t) => {
  const { models } = t.context
  t.false('undefined' in models)
})

test('should not be able to set a property on the model', (t) => {
  const { models } = t.context
  t.throws(() => {
    models.newTable = {}
  }, Error)
})

test('should not be able to delete a property on the model', (t) => {
  const { models } = t.context
  t.throws(() => {
    delete models[TABLE_NAME]
  }, Error)
})

test('should import entity()', (t) => {
  const { sequelizeInstance, models } = t.context
  t.true(sequelizeInstance.import.calledOnce)
  t.true(sequelizeInstance.import.calledWith(TABLE_NAME, TableEntity))
})

test('should call entity.relationships', (t) => {
  const { models } = t.context
  t.true(TableEntity.relationships.calledOnce)
  t.true(TableEntity.relationships.calledWith(models[TABLE_NAME], models))
})
