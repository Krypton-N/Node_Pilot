const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Historial de conversación del asistente, persistido en MySQL vía Sequelize.
const ChatMessage = sequelize.define(
  'ChatMessage',
  {
    projectId: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false }, // 'user' | 'assistant'
    content: { type: DataTypes.TEXT('long'), allowNull: false },
  },
  { tableName: 'chat_messages', indexes: [{ fields: ['projectId'] }] }
);

module.exports = ChatMessage;
