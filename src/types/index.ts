export interface CreateDatabaseOptions {
  entitiesDirectory: string,
  migrationDirectory: string,
  customMethods?: Record<string, Function>,
}

export interface DatabaseConfig {
  verbose: boolean,
  name: string,
  user: string,
  pass: string,
  host: string,
  port: number,
  ssl: boolean,
}

export interface Database {
  initialised: boolean,
  config: DatabaseConfig,
  init: (config: DatabaseConfig) => Promise<void>,
  migrate: (version: string) => Promise<void>,
  [key: string]: any,
}
