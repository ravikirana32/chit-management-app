require('dotenv').config();

function getProductionConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = Number(url.port || 5432);
    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const internal = host.startsWith('dpg-') && !host.includes('.');
    return {
      username, password, database, host, port, dialect: 'postgres',
      dialectOptions: internal ? {} : { ssl: { require: true, rejectUnauthorized: false } }
    };
  }
  return {
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    dialect: 'postgres'
  };
}

module.exports = {
  development: { username: process.env.DATABASE_USER || 'postgres', password: process.env.DATABASE_PASSWORD || 'postgres', database: process.env.DATABASE_NAME || 'chit_app', host: process.env.DATABASE_HOST || 'localhost', port: Number(process.env.DATABASE_PORT || 5432), dialect: 'postgres' },
  test: { username: process.env.DATABASE_USER || 'postgres', password: process.env.DATABASE_PASSWORD || 'postgres', database: process.env.DATABASE_NAME || 'chit_app_test', host: process.env.DATABASE_HOST || 'localhost', port: Number(process.env.DATABASE_PORT || 5432), dialect: 'postgres' },
  production: getProductionConfig()
};
