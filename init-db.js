// init-db.js - Inicializar base de datos PostgreSQL
require('dotenv').config();
const { initializeDatabase } = require('./db-config');

async function init() {
  try {
    console.log('🚀 Inicializando base de datos PostgreSQL...');
    await initializeDatabase();
    console.log('✅ Base de datos inicializada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

init();