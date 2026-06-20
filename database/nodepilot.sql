-- ============================================================================
-- NodePilot — Script de creación de la base de datos del IDE
-- Proyecto Final IDPF-14 · Grupo 4BM1
-- Integrantes:
--   Rodriguez Flor Alan Noe        (2025630489)
--   Martinez Guzman Evelyn Briseth (2025630417)
--   Castorela Cuevas Uriel         (2025630469)
--
-- Esta es la base de datos INTERNA de la aplicación (login + historial de chat
-- del asistente). En tiempo de ejecución Sequelize la sincroniza con
-- sequelize.sync(); este script reproduce el mismo esquema de forma manual.
-- Ejecutar:  mysql -u root -p < database/nodepilot.sql
-- ============================================================================

DROP DATABASE IF EXISTS nodepilot;
CREATE DATABASE nodepilot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nodepilot;

-- ----------------------------------------------------------------------------
-- Tabla: users  (login local de la app — único usuario válido: admin / 1234)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  username  VARCHAR(255) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- Usuario por defecto del login
INSERT INTO users (username, password, createdAt, updatedAt)
VALUES ('admin', '1234', NOW(), NOW());

-- ----------------------------------------------------------------------------
-- Tabla: chat_messages  (historial de conversación del asistente de IA)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  projectId VARCHAR(255) NOT NULL,
  role      VARCHAR(255) NOT NULL,          -- 'user' | 'assistant'
  content   LONGTEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_chat_messages_projectId (projectId)
);
