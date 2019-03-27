import delay from 'delay'
import { Random } from 'random-js'

interface Transaction {
  LOCK: {
    UPDATE: any,
  },
}

type TransactionCallback<T> = (transaction: Transaction) => Promise<T>

interface Options {
  minDelay?: number,
  maxDelay?: number,
}

const random = new Random()

const withTransaction = async <T>(
  fn: TransactionCallback<T>,
  options: Options = {},
): Promise<T> => {
  const { minDelay = 100, maxDelay = 1000 } = options

  if (typeof fn !== 'function') {
    throw new Error('Must pass a function to withTransaction')
  }

  try {
    const result = await this.sequelize.transaction(fn)
    return result
  } catch (error) {
    if (error.message.startsWith('ER_LOCK_DEADLOCK')) {
      await delay(random.real(minDelay, maxDelay))
      return withTransaction(fn)
    }
    throw error
  }
}

export default withTransaction
