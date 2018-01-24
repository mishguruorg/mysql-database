import Promise from 'bluebird'

const buildSequelizeConfig = (config) => {
  const sequelizeOptions = {
    host: config.host,
    port: config.port,
    dialectOptions: {
      charset: 'utf8mb4'
    },
    define: {
      // Stop sequilze from changing table names
      freezeTableName: true
    },
    logging: (str) => {
      // Set db verbose to true in the config file to log SQL statements
      if (config.verbose) {
        console.log(str)
      }
    }
  }

  if (config.ssl) {
    sequelizeOptions.dialectOptions.ssl = 'Amazon RDS'
  }

  return sequelizeOptions
}

const RETRYCONNECTLIMIT = 10
const BACKOFFWAITTIME = 20

const waitXSeconds = (seconds = 10) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), seconds * 1000)
  })
}

const authenticate = (sequelizeInstance, attemptCount = 0) => {
  return sequelizeInstance.authenticate()
    .catch((err) => {
      console.error(`Caught ${err} on attempt ${attemptCount} when trying to connect to db, waiting ${BACKOFFWAITTIME} before retrying...`)
      if (attemptCount > RETRYCONNECTLIMIT) {
        throw err
      }

      return waitXSeconds(BACKOFFWAITTIME)
        .then(() => authenticate(sequelizeInstance, ++attemptCount))
    })
}

export {
  buildSequelizeConfig,
  authenticate
}
