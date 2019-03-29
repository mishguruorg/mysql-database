import sinon from 'sinon'

const Table = () => ({})

Table.deprecatedNames = ['oldTableName']

Table.relationships = sinon.stub()

export default Table
