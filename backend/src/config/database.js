const { Sequelize } = require('sequelize');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'nodepilot',
  DB_USER = 'root',
  DB_PASSWORD = '',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: false,
});

// Intenta conectar sin tumbar el servidor si MySQL no está disponible.
// Devuelve el estado para que /healthz lo reporte.
async function checkConnection() {
  try {
    await sequelize.authenticate();
    return { status: 'ok' };
  } catch (err) {
    // Sequelize envuelve el error de driver; el detalle útil vive en err.original.
    const detail = err.original?.message || err.message || 'conexión fallida';
    return { status: 'down', error: detail };
  }
}

module.exports = { sequelize, checkConnection };
