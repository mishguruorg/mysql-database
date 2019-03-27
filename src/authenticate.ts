import delay from 'delay'

const RETRY_CONNECT_LIMIT = 10
const BACK_OFF_WAIT_TIME = 20 * 1000

const authenticate = async (
  sequelizeInstance: any,
  previousAttempts: number = 0,
): Promise<void> => {
  try {
    await sequelizeInstance.authenticate()
  } catch (error) {
    if (previousAttempts > RETRY_CONNECT_LIMIT) {
      throw error
    }

    console.error(
      `Error: Could not connect to database! Attempt #${previousAttempts}. Will retry connecting in ${BACK_OFF_WAIT_TIME}ms.`,
    )
    console.error(error)

    await delay(BACK_OFF_WAIT_TIME)
    return authenticate(sequelizeInstance, previousAttempts + 1)
  }
}

export default authenticate
