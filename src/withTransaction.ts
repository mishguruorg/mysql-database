import delay from 'delay'
import { Random } from 'random-js'
import { Sequelize } from 'sequelize'

interface Transaction {
  LOCK: {
    UPDATE: any,
  },
}

export type TransactionCallback<T> = (transaction: Transaction) => Promise<T>

export interface WithTransactionOptions {
  minDelay?: number,
  maxDelay?: number,
}

const random = new Random()

const withTransaction = async <T>(
  sequelizeInstance: Sequelize,
  fn: TransactionCallback<T>,
  options: WithTransactionOptions = {},
): Promise<T> => {
  const { minDelay = 100, maxDelay = 1000 } = options

  if (typeof fn !== 'function') {
    throw new Error('Must pass a function to withTransaction')
  }

  try {
    const result = await sequelizeInstance.transaction(fn)
    return result
  } catch (error) {
    if (error.message.startsWith('ER_LOCK_DEADLOCK')) {
      await delay(random.real(minDelay, maxDelay))
      return withTransaction(sequelizeInstance, fn, options)
    }
    throw error
  }
}

export default withTransaction
