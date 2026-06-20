const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Usuario del login local de la aplicación, persistido en MySQL vía Sequelize.
// La app tiene un único usuario válido (admin / 1234).
const User = sequelize.define(
  'User',
  {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'users' }
);

// Crea el usuario por defecto (admin / 1234) si aún no existe en la tabla.
// Idempotente: se puede llamar en cada arranque sin duplicar.
async function ensureDefaultUser() {
  await User.findOrCreate({
    where: { username: 'admin' },
    defaults: { password: '1234' },
  });
}

module.exports = { User, ensureDefaultUser };
