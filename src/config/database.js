/**
 * Database Configuration
 * Supports multiple database types for scalability
 */

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  },
  test: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pattyshack_test',
    username: process.env.DB_USER || 'pattyshack_user',
    password: process.env.DB_PASSWORD || 'pattyshack_dev_password',
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  },
  production: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pattyshack',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  }
};
