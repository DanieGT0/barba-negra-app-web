// db-config.js - Configuración de base de datos
require('dotenv').config();
const { Pool } = require('pg');

// Configuración según el entorno
const isProduction = process.env.NODE_ENV === 'production';

let dbConfig;

if (isProduction) {
  // Configuración para producción (Render)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Configuración para desarrollo local
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'barbanegra',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123321'
  };
}

// Pool de conexiones
const pool = new Pool(dbConfig);

// Función para conectar y crear las tablas si no existen
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Crear tablas básicas (actualizaremos después del análisis de SQLite)
    await createTables(client);
    
    client.release();
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
}

// Función para crear tablas
async function createTables(client) {
  try {
    // Tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'Usuario',
        modulos TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
    `);

    // Agregar columna modulos si no existe (para bases de datos existentes)
    try {
      await client.query(`
        DO $$ BEGIN
          BEGIN
            ALTER TABLE usuarios ADD COLUMN modulos TEXT;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
        END $$;
      `);
    } catch (e) {
      console.log('Migración de usuarios completada (columna modulos puede haber existido ya)');
    }

    // Tabla de clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        fecha VARCHAR(20),
        dui VARCHAR(20),
        nombre VARCHAR(200) NOT NULL,
        telefono VARCHAR(20),
        correo VARCHAR(200),
        membresia VARCHAR(100),
        fecha_inicio VARCHAR(20),
        fecha_final VARCHAR(20),
        monto DECIMAL(10,2),
        tipo_pago VARCHAR(50),
        categoria VARCHAR(100),
        empresa VARCHAR(200),
        descuento_porcentaje DECIMAL(5,2),
        direccion TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
    `);

    // Tabla de empleados
    await client.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id SERIAL PRIMARY KEY,
        fecha VARCHAR(20),
        dui VARCHAR(20),
        nombre VARCHAR(200) NOT NULL,
        direccion TEXT,
        correo VARCHAR(200),
        nacimiento VARCHAR(20),
        salario DECIMAL(10,2),
        cargo VARCHAR(100),
        telefono VARCHAR(20),
        fecha_ingreso DATE,
        activo BOOLEAN DEFAULT true
      );
    `);

    // Tabla de productos/servicios
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(100) UNIQUE,
        producto VARCHAR(200) NOT NULL,
        precio_venta DECIMAL(10,2) NOT NULL,
        comision DECIMAL(10,2) DEFAULT 0,
        existencia INTEGER DEFAULT 0,
        compra_promedio DECIMAL(10,2) DEFAULT 0,
        minimo INTEGER DEFAULT 5,
        categoria VARCHAR(100),
        activo BOOLEAN DEFAULT true
      );
    `);

    // Migrar columnas de productos si es necesario
    try {
      // Agregar columnas si no existen
      await client.query(`
        DO $$ BEGIN
          BEGIN
            ALTER TABLE productos ADD COLUMN codigo VARCHAR(100) UNIQUE;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos ADD COLUMN comision DECIMAL(10,2) DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos ADD COLUMN existencia INTEGER DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos ADD COLUMN compra_promedio DECIMAL(10,2) DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos ADD COLUMN minimo INTEGER DEFAULT 5;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          -- Renombrar columnas si existen con nombres diferentes
          BEGIN
            ALTER TABLE productos RENAME COLUMN nombre TO producto;
          EXCEPTION
            WHEN undefined_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos RENAME COLUMN precio TO precio_venta;
          EXCEPTION
            WHEN undefined_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE productos RENAME COLUMN stock TO existencia;
          EXCEPTION
            WHEN undefined_column THEN NULL;
          END;
        END $$;
      `);
    } catch (e) {
      console.log('Migraciones de productos completadas (algunas pueden haber fallado, es normal)');
    }

    // Tabla de cortes/servicios
    await client.query(`
      CREATE TABLE IF NOT EXISTS cortes (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(100) UNIQUE NOT NULL,
        servicio VARCHAR(200) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        comision DECIMAL(10,2) DEFAULT 0,
        categoria VARCHAR(100) DEFAULT 'Servicios',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de compras
    await client.query(`
      CREATE TABLE IF NOT EXISTS compras (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(100) NOT NULL,
        fecha VARCHAR(20) NOT NULL,
        codigo_producto VARCHAR(100),
        producto VARCHAR(200),
        precio_compra DECIMAL(10,2) NOT NULL,
        cantidad INTEGER NOT NULL,
        total DECIMAL(10,2) GENERATED ALWAYS AS (precio_compra * cantidad) STORED,
        fecha_vencimiento VARCHAR(20),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (codigo_producto) REFERENCES productos(codigo) ON DELETE SET NULL
      );
    `);

    // Tabla de ventas/facturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        empleado_id INTEGER REFERENCES empleados(id),
        fecha DATE NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        impuesto DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(50),
        estado VARCHAR(50) DEFAULT 'Completada'
      );
    `);

    // Tabla de detalle de ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL
      );
    `);

    // Tabla de citas
    await client.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        empleado_id INTEGER REFERENCES empleados(id),
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        servicio VARCHAR(200),
        estado VARCHAR(50) DEFAULT 'Programada',
        notas TEXT
      );
    `);

    // Tabla de gastos
    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        fecha VARCHAR(20),
        categoria VARCHAR(100),
        descripcion TEXT,
        concepto VARCHAR(200),
        monto DECIMAL(10,2) NOT NULL,
        es_inventario INTEGER DEFAULT 0,
        cantidad INTEGER DEFAULT 0,
        precio_unitario DECIMAL(10,2) DEFAULT 0,
        stock_actual INTEGER DEFAULT 0
      );
    `);

    // Tabla de facturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        fecha VARCHAR(20) NOT NULL,
        comanda INTEGER,
        factura INTEGER,
        cliente VARCHAR(200),
        empleado VARCHAR(100),
        tipo_pago VARCHAR(50) DEFAULT 'Efectivo',
        precio_venta DECIMAL(10,2) DEFAULT 0,
        descuento VARCHAR(50),
        total DECIMAL(10,2) NOT NULL,
        empleado_principal VARCHAR(100),
        es_pago_mixto INTEGER DEFAULT 0,
        monto_efectivo DECIMAL(10,2) DEFAULT 0,
        monto_tarjeta DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrar columnas de facturas si es necesario
    try {
      await client.query(`
        DO $$ BEGIN
          BEGIN
            ALTER TABLE facturas ADD COLUMN comanda INTEGER;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN factura INTEGER;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN empleado_principal VARCHAR(100);
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN es_pago_mixto INTEGER DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN monto_efectivo DECIMAL(10,2) DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN monto_tarjeta DECIMAL(10,2) DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas ADD COLUMN precio_venta DECIMAL(10,2) DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN NULL;
          END;
          -- Renombrar columnas si existen con nombres diferentes
          BEGIN
            ALTER TABLE facturas RENAME COLUMN cliente_nombre TO cliente;
          EXCEPTION
            WHEN undefined_column THEN NULL;
          END;
          BEGIN
            ALTER TABLE facturas RENAME COLUMN metodo_pago TO tipo_pago;
          EXCEPTION
            WHEN undefined_column THEN NULL;
          END;
        END $$;
      `);
    } catch (e) {
      console.log('Migraciones de facturas completadas (algunas pueden haber fallado, es normal)');
    }

    // Tabla de detalles de productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_productos (
        id SERIAL PRIMARY KEY,
        factura_id INTEGER,
        codigo VARCHAR(100),
        nombre VARCHAR(200),
        cantidad INTEGER DEFAULT 1,
        total DECIMAL(10,2),
        comision DECIMAL(10,2) DEFAULT 0,
        empleado VARCHAR(100),
        fecha VARCHAR(20),
        comanda VARCHAR(20),
        factura VARCHAR(20),
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
      );
    `);

    // Tabla de detalles de servicios
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_servicios (
        id SERIAL PRIMARY KEY,
        factura_id INTEGER,
        codigo VARCHAR(100),
        nombre VARCHAR(200),
        cantidad INTEGER DEFAULT 1,
        total DECIMAL(10,2),
        comision DECIMAL(10,2) DEFAULT 0,
        empleado VARCHAR(100),
        fecha VARCHAR(20),
        comanda VARCHAR(20),
        factura VARCHAR(20),
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
      );
    `);

    // Tabla de detalles de factura (adicional para compatibilidad)
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_facturas (
        id SERIAL PRIMARY KEY,
        factura_id INTEGER,
        tipo VARCHAR(20), -- 'servicio' o 'producto'
        item_id INTEGER,
        nombre VARCHAR(200),
        precio DECIMAL(10,2),
        cantidad INTEGER DEFAULT 1,
        subtotal DECIMAL(10,2),
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ Tablas creadas correctamente');

    // Crear usuario administrador por defecto
    await createDefaultAdmin(client);

  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

// Función para crear usuario administrador por defecto
async function createDefaultAdmin(client) {
  try {
    const bcrypt = require('bcrypt');
    
    // Verificar si ya existe el usuario admin
    const existingUser = await client.query('SELECT * FROM usuarios WHERE usuario = $1', ['admin']);
    
    if (existingUser.rows.length === 0) {
      console.log('🔧 Creando usuario administrador...');
      
      // Hash de la contraseña
      const hash = await bcrypt.hash('admin123', 10);
      
      // Módulos de administrador
      const modulosAdmin = JSON.stringify([
        "clientes", "empleados", "productos", "compras", "cortes", 
        "facturas", "usuarios", "gastos", "citas", "planilla", "comisiones"
      ]);
      
      // Insertar usuario administrador
      await client.query(
        `INSERT INTO usuarios (usuario, password, rol, modulos) VALUES ($1, $2, $3, $4)`,
        ['admin', hash, 'Admin', modulosAdmin]
      );
      
      console.log('✅ Usuario administrador creado exitosamente');
      console.log('   👤 Usuario: admin');
      console.log('   🔑 Contraseña: admin123');
      
    } else {
      console.log('✅ Usuario administrador ya existe');
    }
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
  }
}

module.exports = {
  pool,
  initializeDatabase
};