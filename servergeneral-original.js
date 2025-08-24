
// Aquí iría todo el contenido del servergeneral.js que ya consolidamos...
// servergeneral.js COMPLETO

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { chromium } = require('playwright');
const { pool, initializeDatabase } = require('./db-config');
const DatabaseHelper = require('./db-helper');

// Importar módulo de tarjetas de fidelidad
const TarjetasFidelidad = require('./tarjetas-fidelidad');

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// FUNCIONES AUXILIARES PARA MANEJO DE FECHAS
// Agregar estas funciones al inicio de servergeneral.js (después de las importaciones y antes de las rutas)
// ========================================

/**
 * Convierte fecha de formato ISO (YYYY-MM-DD) a formato centroamericano (DD/MM/YYYY)
 * @param {string} fechaISO - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
function convertirFechaISOaCentroamericana(fechaISO) {
  if (!fechaISO) return '';
  
  // Si ya está en formato DD/MM/YYYY, devolverla tal como está
  if (fechaISO.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return fechaISO;
  }
  
  // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
  if (fechaISO.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }
  
  return fechaISO;
}

/**
 * Convierte fecha de formato centroamericano (DD/MM/YYYY) a objeto Date
 * @param {string} fechaCentro - Fecha en formato DD/MM/YYYY
 * @returns {Date|null} Objeto Date o null si no es válida
 */
function convertirFechaCentroamericanaADate(fechaCentro) {
  if (!fechaCentro) return null;
  
  // Si está en formato DD/MM/YYYY
  if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fechaCentro.split('/');
    return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
  }
  
  // Si está en formato YYYY-MM-DD
  if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(fechaCentro);
  }
  
  return new Date(fechaCentro);
}

/**
 * Convierte fecha centroamericana (DD/MM/YYYY) a formato ISO (YYYY-MM-DD)
 * @param {string} fechaCentro - Fecha en formato DD/MM/YYYY
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function convertirFechaCentroamericanaAISO(fechaCentro) {
  if (!fechaCentro) return '';
  
  // Si ya está en formato YYYY-MM-DD, devolverla tal como está
  if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaCentro;
  }
  
  // Si está en formato DD/MM/YYYY, convertir a YYYY-MM-DD
  if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fechaCentro.split('/');
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  return fechaCentro;
}

/**
 * Obtiene la fecha actual en formato centroamericano (DD/MM/YYYY)
 * @returns {string} Fecha actual en formato DD/MM/YYYY
 */
function obtenerFechaActualCentroamericana() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {string} fechaInicio - Fecha de inicio (cualquier formato)
 * @param {string} fechaFin - Fecha de fin (cualquier formato)
 * @returns {number} Número de días
 */
function calcularDiasEntreFechas(fechaInicio, fechaFin) {
  const inicio = convertirFechaCentroamericanaADate(convertirFechaISOaCentroamericana(fechaInicio));
  const fin = convertirFechaCentroamericanaADate(convertirFechaISOaCentroamericana(fechaFin));
  
  if (!inicio || !fin) return 0;
  
  // Normalizar las fechas para evitar problemas de zona horaria
  const inicioNormalizada = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const finNormalizada = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  
  // Calcular diferencia en días (sin el +1 extra que causaba problemas)
  const diferencia = Math.floor((finNormalizada - inicioNormalizada) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diferencia);
}

/**
 * Valida si una fecha está en formato válido
 * @param {string} fecha - Fecha a validar
 * @returns {boolean} True si es válida
 */
function validarFormatoFecha(fecha) {
  if (!fecha) return false;
  
  // Validar formato DD/MM/YYYY
  if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fecha.split('/');
    const fechaObj = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    return fechaObj.getDate() == parseInt(dia) && 
           fechaObj.getMonth() == parseInt(mes) - 1 && 
           fechaObj.getFullYear() == parseInt(anio);
  }
  
  // Validar formato YYYY-MM-DD
  if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const fechaObj = new Date(fecha);
    return !isNaN(fechaObj.getTime());
  }
  
  return false;
}

/**
 * Formatea una fecha para mostrar en logs
 * @param {string} fecha - Fecha en cualquier formato
 * @returns {string} Fecha formateada para logs
 */
function formatearFechaParaLog(fecha) {
  try {
    const fechaObj = convertirFechaCentroamericanaADate(convertirFechaISOaCentroamericana(fecha));
    if (!fechaObj) return 'Fecha inválida';
    return fechaObj.toLocaleDateString('es-ES');
  } catch (error) {
    return 'Fecha inválida';
  }
}

console.log('✅ Funciones auxiliares de fechas cargadas correctamente');

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
// 🚀 Servir carpeta de estilos
app.use('/estilos', express.static(path.join(__dirname, 'estilos')));
app.use('/cierre', express.static(path.join(__dirname, 'cierre')));
app.use('/salarios', express.static(path.join(__dirname, 'salarios')));
app.use('/tarjetas-fidelidad', express.static(path.join(__dirname, 'tarjetas-fidelidad')));


app.use(session({
  secret: process.env.SESSION_SECRET || 'barbershop_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// ===========================================
// SISTEMA DE MIGRACIÓN AUTOMÁTICA DE BASE DE DATOS - REMOVIDO (AHORA USA POSTGRESQL)
// ===========================================

// Función removida - ahora usa PostgreSQL
function runDatabaseMigrations() {
  console.log('🔄 Iniciando migración automática de base de datos...');
  
  const tableDefinitions = {
    clientes: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        dui: 'TEXT UNIQUE',
        nombre: 'TEXT',
        telefono: 'TEXT',
        correo: 'TEXT',
        membresia: 'TEXT',
        fecha_inicio: 'TEXT',
        fecha_final: 'TEXT',
        monto: 'REAL',
        tipo_pago: 'TEXT',
        categoria: 'TEXT DEFAULT "normal"'
      }
    },
    
    empleados: {
      columns: {
        fecha: 'TEXT',
        dui: 'TEXT PRIMARY KEY',
        nombre: 'TEXT',
        direccion: 'TEXT',
        correo: 'TEXT',
        nacimiento: 'TEXT',
        salario: 'REAL',
        cargo: 'TEXT',
        telefono: 'TEXT'
      }
    },
    
    productos: {
      columns: {
        codigo: 'TEXT PRIMARY KEY',
        producto: 'TEXT',
        precio_venta: 'REAL',
        comision: 'REAL',
        existencia: 'INTEGER DEFAULT 0',
        compra_promedio: 'REAL DEFAULT 0',
        minimo: 'INTEGER DEFAULT 5'
      }
    },
    
    compras: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        codigo: 'TEXT',
        producto: 'TEXT',
        precio_compra: 'REAL',
        cantidad: 'INTEGER',
        fecha_vencimiento: 'TEXT'
      }
    },
    
    cortes: {
      columns: {
        codigo: 'TEXT PRIMARY KEY',
        servicio: 'TEXT',
        precio: 'REAL',
        comision: 'REAL'
      }
    },
    
    facturas: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        comanda: 'INTEGER',
        factura: 'INTEGER',
        cliente: 'TEXT',
        empleado: 'TEXT',
        tipo_pago: 'TEXT',
        precio_venta: 'REAL',
        descuento: 'TEXT',
        total: 'REAL',
        empleado_principal: 'TEXT',
        es_pago_mixto: 'INTEGER DEFAULT 0',
        monto_efectivo: 'REAL DEFAULT 0',
        monto_tarjeta: 'REAL DEFAULT 0'
      }
    },
    
    detalle_cortes: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        factura_id: 'INTEGER',
        codigo: 'TEXT',
        nombre: 'TEXT',
        cantidad: 'INTEGER',
        total: 'REAL',
        comision: 'REAL',
        empleado: 'TEXT',
        fecha: 'TEXT',
        comanda: 'TEXT',
        factura: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (factura_id) REFERENCES facturas(id)']
    },
    
    detalle_productos: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        factura_id: 'INTEGER',
        codigo: 'TEXT',
        nombre: 'TEXT',
        cantidad: 'INTEGER',
        total: 'REAL',
        comision: 'REAL',
        empleado: 'TEXT',
        fecha: 'TEXT',
        comanda: 'TEXT',
        factura: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (factura_id) REFERENCES facturas(id)']
    },
    
    usuarios: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        usuario: 'TEXT UNIQUE',
        password: 'TEXT',
        rol: 'TEXT',
        modulos: 'TEXT'
      }
    },
    
    gastos: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        categoria: 'TEXT',
        descripcion: 'TEXT',
        monto: 'REAL',
        // Nuevos campos para inventarios
        es_inventario: 'INTEGER DEFAULT 0',
        cantidad: 'INTEGER DEFAULT 0',
        precio_unitario: 'REAL DEFAULT 0',
        stock_actual: 'INTEGER DEFAULT 0'
      }
    },
    
    // Nueva tabla para salidas de inventario
    salidas_inventario: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        gasto_id: 'INTEGER',
        empleado: 'TEXT',
        cantidad_salida: 'INTEGER',
        precio_unitario: 'REAL',
        valor_total: 'REAL',
        fecha_salida: 'TEXT',
        observaciones: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (gasto_id) REFERENCES gastos(id)']
    },
    
    metas: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        anio: 'INTEGER',
        mes: 'TEXT',
        monto: 'REAL'
      }
    },
    
    descuentos: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        dui: 'TEXT',
        monto: 'REAL',
        motivo: 'TEXT'
      }
    },
    
    citas: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        title: 'TEXT NOT NULL',
        start: 'TEXT NOT NULL',
        cliente_nombre: 'TEXT',
        cliente_id: 'INTEGER',
        servicio_nombre: 'TEXT',
        empleado_nombre: 'TEXT',
        empleado_id: 'INTEGER',
        telefono: 'TEXT'
      },
      foreignKeys: [
        'FOREIGN KEY (cliente_id) REFERENCES clientes(id)',
        'FOREIGN KEY (empleado_id) REFERENCES empleados(id)'
      ]
    },
    
    horas_extras: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        dui: 'TEXT NOT NULL',
        fecha: 'TEXT NOT NULL',
        horas: 'REAL NOT NULL',
        pago_hora: 'REAL NOT NULL',
        total: 'REAL NOT NULL',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
      }
    },
    
    dias_dobles: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        dui: 'TEXT NOT NULL',
        fecha: 'TEXT NOT NULL',
        motivo: 'TEXT NOT NULL',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
      }
    },
    
    tarjetas_fidelidad: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        codigo: 'TEXT UNIQUE',
        cliente_id: 'INTEGER',
        fecha_creacion: 'TEXT',
        sellos_actuales: 'INTEGER DEFAULT 0',
        estado: 'TEXT DEFAULT "activa"',
        fecha_completada: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (cliente_id) REFERENCES clientes(id)']
    },
    
    historial_sellos: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        tarjeta_id: 'INTEGER',
        fecha: 'TEXT',
        tipo: 'TEXT',
        empleado: 'TEXT',
        factura_id: 'INTEGER',
        observaciones: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (tarjeta_id) REFERENCES tarjetas_fidelidad(id)', 'FOREIGN KEY (factura_id) REFERENCES facturas(id)']
    },
    
    membresias: {
      columns: {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        fecha: 'TEXT',
        cliente_id: 'INTEGER',
        nombre: 'TEXT',
        dui: 'TEXT',
        telefono: 'TEXT',
        correo: 'TEXT',
        tipo_membresia: 'TEXT',
        fecha_inicio: 'TEXT',
        fecha_final: 'TEXT',
        monto: 'REAL',
        tipo_pago: 'TEXT',
        estado: 'TEXT DEFAULT "activa"',
        observaciones: 'TEXT'
      },
      foreignKeys: ['FOREIGN KEY (cliente_id) REFERENCES clientes(id)']
    }
  };
  
  // Función para crear o actualizar cada tabla
  function createOrUpdateTable(tableName, definition) {
    return new Promise((resolve, reject) => {
      // Primero verificar si la tabla existe
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName], (err, row) => {
        if (err) {
          console.error(`❌ Error verificando tabla ${tableName}:`, err);
          reject(err);
          return;
        }
        
        if (!row) {
          // La tabla no existe, crearla
          console.log(`📊 Creando tabla ${tableName}...`);
          createTable(tableName, definition, resolve, reject);
        } else {
          // La tabla existe, verificar columnas
          console.log(`🔍 Verificando estructura de tabla ${tableName}...`);
          checkAndAddMissingColumns(tableName, definition, resolve, reject);
        }
      });
    });
  }
  
  // Función para crear una nueva tabla
  function createTable(tableName, definition, resolve, reject) {
    const columnDefinitions = [];
    
    // Agregar definiciones de columnas
    for (const [columnName, columnDef] of Object.entries(definition.columns)) {
      columnDefinitions.push(`${columnName} ${columnDef}`);
    }
    
    // Agregar foreign keys si existen
    if (definition.foreignKeys) {
      columnDefinitions.push(...definition.foreignKeys);
    }
    
    const createSQL = `CREATE TABLE ${tableName} (${columnDefinitions.join(', ')})`;
    
    db.run(createSQL, (err) => {
      if (err) {
        console.error(`❌ Error creando tabla ${tableName}:`, err);
        reject(err);
      } else {
        console.log(`✅ Tabla ${tableName} creada exitosamente`);
        resolve();
      }
    });
  }
  
  // Función para verificar y agregar columnas faltantes
  function checkAndAddMissingColumns(tableName, definition, resolve, reject) {
    db.all("PRAGMA table_info(" + tableName + ")", (err, columns) => {
      if (err) {
        console.error(`❌ Error obteniendo información de tabla ${tableName}:`, err);
        reject(err);
        return;
      }
      
      const existingColumns = columns.map(col => col.name);
      const requiredColumns = Object.keys(definition.columns);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log(`✅ Tabla ${tableName} está actualizada`);
        resolve();
        return;
      }
      
      console.log(`🔧 Agregando ${missingColumns.length} columnas faltantes a ${tableName}:`, missingColumns);
      
      // Agregar columnas faltantes una por una
      let addedColumns = 0;
      missingColumns.forEach((columnName, index) => {
        const columnDef = definition.columns[columnName];
        const alterSQL = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`;
        
        db.run(alterSQL, (err) => {
          if (err) {
            console.error(`❌ Error agregando columna ${columnName} a ${tableName}:`, err);
            if (index === 0) reject(err); // Solo rechazar en el primer error
          } else {
            console.log(`✅ Columna ${columnName} agregada a ${tableName}`);
            addedColumns++;
            
            // Resolver cuando todas las columnas han sido procesadas
            if (addedColumns === missingColumns.length) {
              resolve();
            }
          }
        });
      });
    });
  }
  
  // Ejecutar migraciones para todas las tablas
  db.serialize(async () => {
    try {
      console.log(`🏗️ Procesando ${Object.keys(tableDefinitions).length} tablas...`);
      
      for (const [tableName, definition] of Object.entries(tableDefinitions)) {
        await createOrUpdateTable(tableName, definition);
      }
      
      console.log('🎉 ¡Migración de base de datos completada exitosamente!');
      console.log('📊 Todas las tablas están creadas y actualizadas');
      
      // Crear usuario administrador por defecto si no existe
      createDefaultAdmin();
      
    } catch (error) {
      console.error('💥 Error durante la migración:', error);
    }
  });
}

// Función para crear usuario administrador por defecto
function createDefaultAdmin() {
  db.get("SELECT COUNT(*) AS total FROM usuarios", (err, row) => {
    if (err) {
      console.error('❌ Error verificando tabla usuarios:', err);
      return;
    }
    
    if (row && row.total === 0) {
      console.log('👤 Creando usuario administrador por defecto...');
      const passwordPlano = 'admin123';
      const saltRounds = 10;
      
      bcrypt.hash(passwordPlano, saltRounds, (err, hash) => {
        if (err) {
          console.error('❌ Error hasheando contraseña:', err);
          return;
        }
        
        const modulosAdmin = JSON.stringify([
          "Clientes", "Empleados", "Inventarios", "Compras", "Cortes",
          "Facturacion", "DetalleCortes", "DetalleProductos", "Planilla", 
          "AgendarCitas", "Gastos", "CierreCaja", "Salarios", "TarjetasFidelidad"
        ]);
        
        db.run(`INSERT INTO usuarios (usuario, password, rol, modulos) 
                VALUES (?, ?, ?, ?)`, 
          ['admin', hash, 'Admin', modulosAdmin], 
          function(err) {
            if (err) {
              console.error('❌ Error creando usuario administrador:', err);
            } else {
              console.log('✅ Usuario administrador creado exitosamente');
              console.log('   Usuario: admin');
              console.log('   Contraseña: admin123');
            }
          }
        );
      });
    } else {
      console.log('✅ Usuario administrador ya existe');
    }
  });
}

// Ejecutar migraciones al iniciar el servidor
// runDatabaseMigrations(); // Comentado - ahora usamos PostgreSQL

// ===========================================
// CÓDIGO LEGACY REMOVIDO - REEMPLAZADO POR SISTEMA DE MIGRACIÓN AUTOMÁTICA
// ===========================================
// El código de creación manual de tablas ha sido reemplazado por el sistema
// de migración automática arriba que maneja tanto la creación de nuevas tablas
// como la adición de columnas faltantes en tablas existentes.

// ----------------- CRUD CLIENTES -----------------

// Obtener todos los clientes
// --- API para Clientes --- //

// Obtener todos los clientes con paginación
app.get('/api/clientes', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const offset = (page - 1) * limit;
      
      // Obtener total de registros
      const total = await DatabaseHelper.countClientes();
      const totalPages = Math.ceil(total / limit);
      
      // Obtener registros paginados
      const rows = await DatabaseHelper.getClientesPaginados(limit, offset);
      
      res.json({
        data: rows,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalRecords: total,
          recordsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({ mensaje: "Error al obtener clientes" });
    }
  });

  // Obtener solo clientes normales
  app.get('/api/clientes/normales', async (req, res) => {
    try {
      const rows = await DatabaseHelper.all(
        `SELECT * FROM clientes 
         WHERE categoria IS NULL OR categoria = 'normal' 
         ORDER BY fecha_registro DESC, id DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener clientes normales:', error);
      res.status(500).json({ mensaje: "Error al obtener clientes normales" });
    }
  });

  // Obtener solo clientes preferenciales
  app.get('/api/clientes/preferenciales', (req, res) => {
    db.all(`SELECT * FROM clientes 
            WHERE categoria = 'preferencial' 
            ORDER BY 
              substr(fecha, 7, 4) DESC,  -- Año
              substr(fecha, 4, 2) DESC,  -- Mes  
              substr(fecha, 1, 2) DESC,  -- Día
              id DESC`, (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener clientes preferenciales" });
      res.json(rows);
    });
  });
  
  // Filtrar clientes con paginación
  app.get('/api/clientes/filtro', (req, res) => {
    const { dui, nombre, desde, hasta, page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = "WHERE 1=1";
    const params = [];
  
    console.log("🔍 Filtros recibidos:", req.query);
  
    if (dui) {
      whereClause += " AND dui LIKE ?";
      params.push(`%${dui}%`);
    }
    if (nombre) {
      whereClause += " AND nombre LIKE ?";
      params.push(`%${nombre}%`);
    }
    if (desde) {
      whereClause += " AND fecha >= ?";
      params.push(desde);
    }
    if (hasta) {
      whereClause += " AND fecha <= ?";
      params.push(hasta);
    }
    
    // Obtener total de registros filtrados
    const countQuery = `SELECT COUNT(*) as total FROM clientes ${whereClause}`;
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        console.error("❌ Error en consulta de conteo:", err.message);
        return res.status(500).json({ mensaje: "Error al contar clientes filtrados" });
      }
      
      const total = countResult.total;
      const totalPages = Math.ceil(total / limitNum);
      
      // Obtener registros filtrados y paginados - ordenar por fecha más reciente primero
      const dataQuery = `SELECT * FROM clientes ${whereClause} 
                         ORDER BY 
                           substr(fecha, 7, 4) DESC,  -- Año
                           substr(fecha, 4, 2) DESC,  -- Mes  
                           substr(fecha, 1, 2) DESC,  -- Día
                           id DESC                    -- ID como criterio secundario
                         LIMIT ? OFFSET ?`;
      const dataParams = [...params, limitNum, offset];
      
      db.all(dataQuery, dataParams, (err, rows) => {
        if (err) {
          console.error("❌ Error en consulta SQL:", err.message);
          return res.status(500).json({ mensaje: "Error al filtrar clientes" });
        }
        
        res.json({
          data: rows,
          pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalRecords: total,
            recordsPerPage: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });
      });
    });
  });
  
  // Obtener un cliente por ID
  app.get('/api/clientes/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM clientes WHERE id = ?", [id], (err, row) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener cliente" });
      if (!row) return res.status(404).json({ mensaje: "Cliente no encontrado" });
      res.json(row);
    });
  });
  
  // Crear nuevo cliente
  app.post('/api/clientes', (req, res) => {
  const c = req.body;
  db.get("SELECT * FROM clientes WHERE dui = ?", c.dui, (err, row) => {
    if (row) return res.status(400).json({ mensaje: "El DUI ya existe" });

    // Asegurar que los campos tengan valores por defecto
    const tipoPago = c.tipo_pago || 'Efectivo';
    const categoria = c.categoria || 'normal';
    const empresa = c.empresa || '';
    const descuentoPorcentaje = c.descuento_porcentaje || 0;

    db.run(`INSERT INTO clientes (fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, monto, tipo_pago, categoria, empresa, descuento_porcentaje)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto, tipoPago, categoria, empresa, descuentoPorcentaje],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al registrar cliente" });
        res.status(201).json({ id: this.lastID, mensaje: "Cliente registrado con éxito" });
      });
  });
});
  
  // Actualizar cliente existente
 // Actualizar cliente existente - MODIFICADO para incluir tipo_pago
app.put('/api/clientes/:id', (req, res) => {
  const id = req.params.id;
  const c = req.body;
  
  // Asegurar que los campos tengan valores por defecto
  const tipoPago = c.tipo_pago || 'Efectivo';
  const categoria = c.categoria || 'normal';
  const empresa = c.empresa || '';
  const descuentoPorcentaje = c.descuento_porcentaje || 0;
  
  db.run(`UPDATE clientes SET fecha = ?, dui = ?, nombre = ?, telefono = ?, correo = ?, membresia = ?, fecha_inicio = ?, fecha_final = ?, monto = ?, tipo_pago = ?, categoria = ?, empresa = ?, descuento_porcentaje = ? WHERE id = ?`,
    [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto, tipoPago, categoria, empresa, descuentoPorcentaje, id],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar cliente" });
      res.json({ mensaje: "Cliente actualizado correctamente" });
    });
});
  
  // Eliminar cliente
  app.delete('/api/clientes/:id', (req, res) => {
    db.run("DELETE FROM clientes WHERE id = ?", req.params.id, function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al eliminar cliente" });
      res.json({ mensaje: "Cliente eliminado correctamente" });
    });
  });
  
  
  
// ----------------- Fin CRUD CLIENTES -----------------

// ----------------- INICIALIZAR MÓDULO DE TARJETAS DE FIDELIDAD -----------------
// Inicializar el módulo de tarjetas de fidelidad
const tarjetasFidelidad = new TarjetasFidelidad(app, pool);
console.log('✅ Módulo de tarjetas de fidelidad inicializado');

// ----------------- CRUD EMPLEADOS -----------------

// Servir el HTML de empleados
app.get('/empleados', (req, res) => {
    res.sendFile(path.join(__dirname, 'empleados', 'empleados.html'));
  });
  
  // API para obtener todos los empleados
  app.get('/api/empleados', (req, res) => {
    db.all("SELECT * FROM empleados ORDER BY fecha DESC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener empleados" });
      res.json(rows);
    });
  });
  // Filtrar empleados
app.get('/api/empleados/filtro', (req, res) => {
  const { dui, nombre, desde, hasta } = req.query;
  let query = "SELECT * FROM empleados WHERE 1=1";
  const params = [];

  if (dui) {
    query += " AND dui LIKE ?";
    params.push(`%${dui}%`);
  }

  if (nombre) {
    query += " AND nombre LIKE ?";
    params.push(`%${nombre}%`);
  }

  if (desde) {
    query += " AND fecha >= ?";
    params.push(desde);
  }

  if (hasta) {
    query += " AND fecha <= ?";
    params.push(hasta);
  }

  query += " ORDER BY fecha DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al filtrar empleados" });
    res.json(rows);
  });
});

  // API para crear un nuevo empleado
  app.post('/api/empleados', (req, res) => {
    const { fecha, dui, nombre, direccion, correo, nacimiento, salario, cargo, telefono } = req.body;

   db.run(`INSERT INTO empleados (fecha, dui, nombre, direccion, correo, nacimiento, salario, cargo, telefono)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [fecha, dui, nombre, direccion, correo, nacimiento, salario, cargo, telefono],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al registrar empleado" });
        res.status(201).json({ id: this.lastID, mensaje: "Empleado registrado correctamente" });
      });
  });
  
  // API para actualizar un empleado
  app.put('/api/empleados/:dui', (req, res) => {
    const { fecha, nombre, direccion, correo, nacimiento, salario, cargo, telefono } = req.body;
    const dui = req.params.dui;
  
    db.run(`UPDATE empleados SET fecha = ?, nombre = ?, direccion = ?, correo = ?, nacimiento = ?, salario = ?, cargo = ?, telefono = ? WHERE dui = ?`,
      [fecha, nombre, direccion, correo, nacimiento, salario, cargo, telefono, dui],
    
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al actualizar empleado" });
        res.json({ mensaje: "Empleado actualizado correctamente" });
      });
  });
  
  // API para eliminar un empleado
  app.delete('/api/empleados/:dui', (req, res) => {
    const dui = req.params.dui;
  
    db.run("DELETE FROM empleados WHERE dui = ?", [dui], function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al eliminar empleado" });
      res.json({ mensaje: "Empleado eliminado correctamente" });
    });
  });
    // API para obtener un empleado por DUI
app.get('/api/empleados/:dui', (req, res) => {
  const dui = req.params.dui;
  db.get("SELECT * FROM empleados WHERE dui = ?", [dui], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener empleado" });
    if (!row) return res.status(404).json({ mensaje: "Empleado no encontrado" });
    res.json(row);
  });
});
  // ----------------- CRUD INVENTARIOS -----------------
  
  // Obtener todos los productos
  app.get('/productos', (req, res) => {
    db.all("SELECT * FROM productos ORDER BY CAST(substr(codigo, 2) AS INTEGER)", (err, rows) => {

      if (err) return res.status(500).json({ mensaje: "Error al obtener productos" });
      res.json(rows);
    });
  });
  // En servergeneral.js, añade esta ruta en la sección de CRUD de productos
app.get('/productos/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  db.get("SELECT * FROM productos WHERE codigo = ?", [codigo], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener producto" });
    if (!row) return res.status(404).json({ mensaje: "Producto no encontrado" });
    res.json(row);
  });
});
 // Al crear un producto
// REEMPLAZA COMPLETAMENTE EL ENDPOINT POST /productos en servergeneral.js

app.post('/productos', (req, res) => {
  console.log('📥 Creando producto:', req.body);
  
  const p = req.body;
  
  // Validaciones básicas
  if (!p.producto || p.producto.trim() === '') {
    console.error('❌ Nombre de producto vacío');
    return res.status(400).json({ mensaje: "El nombre del producto es requerido" });
  }
  
  if (!p.precio_venta || parseFloat(p.precio_venta) <= 0) {
    console.error('❌ Precio de venta inválido');
    return res.status(400).json({ mensaje: "El precio de venta debe ser mayor a 0" });
  }
  
  if (p.comision === undefined || parseFloat(p.comision) < 0) {
    console.error('❌ Comisión inválida');
    return res.status(400).json({ mensaje: "La comisión debe ser mayor o igual a 0" });
  }
  
  // Limpiar y preparar datos
  const datosLimpios = {
    producto: p.producto.trim(),
    precio_venta: parseFloat(p.precio_venta),
    comision: parseFloat(p.comision),
    minimo: parseInt(p.minimo) || 5
  };
  
  console.log('🧹 Datos limpios:', datosLimpios);
  
  // Verificar si producto ya existe (ignorando mayúsculas/minúsculas)
  db.get(
    "SELECT codigo FROM productos WHERE LOWER(TRIM(producto)) = LOWER(TRIM(?))", 
    [datosLimpios.producto], 
    (err, existente) => {
      if (err) {
        console.error("❌ Error verificando producto existente:", err);
        return res.status(500).json({ 
          mensaje: "Error interno del servidor",
          detalle: err.message 
        });
      }
      
      if (existente) {
        console.log('⚠️ Producto ya existe:', existente.codigo);
        return res.status(400).json({ 
          mensaje: `Ya existe un producto con el nombre "${datosLimpios.producto}" (Código: ${existente.codigo})` 
        });
      }
      
      // Obtener el siguiente número de código disponible
      db.get(
        "SELECT COALESCE(MAX(CAST(substr(codigo, 2) AS INTEGER)), 0) + 1 as siguiente FROM productos WHERE codigo LIKE 'P%'", 
        [], 
        (err, row) => {
          if (err) {
            console.error("❌ Error generando código:", err);
            return res.status(500).json({ 
              mensaje: "Error interno al generar código",
              detalle: err.message 
            });
          }
          
          const codigo = `P${row.siguiente}`;
          console.log('🏷️ Código generado:', codigo);
          
          // Insertar el nuevo producto
          const sql = `INSERT INTO productos (codigo, producto, precio_venta, comision, existencia, compra_promedio, minimo)
                       VALUES (?, ?, ?, ?, 0, 0, ?)`;
          
          const valores = [
            codigo,
            datosLimpios.producto,
            datosLimpios.precio_venta,
            datosLimpios.comision,
            datosLimpios.minimo
          ];
          
          console.log('💾 Insertando:', { sql, valores });
          
          db.run(sql, valores, function (err) {
            if (err) {
              console.error("❌ Error en inserción:", err);
              console.error("   SQL:", sql);
              console.error("   Valores:", valores);
              
              // Manejar errores específicos de SQLite
              if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ 
                  mensaje: "Ya existe un producto con esos datos" 
                });
              }
              
              return res.status(500).json({ 
                mensaje: "Error al guardar en la base de datos",
                detalle: err.message,
                codigo_error: err.code
              });
            }
            
            console.log('✅ Producto creado exitosamente');
            console.log('   ID:', this.lastID);
            console.log('   Código:', codigo);
            
            res.status(201).json({ 
              mensaje: "Producto registrado exitosamente", 
              codigo: codigo,
              id: this.lastID
            });
          });
        }
      );
    }
  );
});

// Al actualizar un producto
app.put('/productos/:codigo', (req, res) => {
  const p = req.body;
  db.run(`UPDATE productos SET producto = ?, precio_venta = ?, comision = ?, minimo = ? WHERE codigo = ?`,
    [p.producto, p.precio_venta, p.comision, p.minimo || 5, req.params.codigo],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar producto" });
      res.json({ mensaje: "Producto actualizado correctamente" });
    });
});

  
  // Eliminar producto
  app.delete('/productos/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  
  // Verificar si hay compras asociadas antes de eliminar
  db.get("SELECT COUNT(*) as total FROM compras WHERE codigo = ?", [codigo], (err, row) => {
    if (err) {
      console.error("Error al verificar compras:", err.message);
      return res.status(500).json({ mensaje: "Error al verificar compras asociadas" });
    }
    
    if (row.total > 0) {
      return res.status(400).json({ 
        mensaje: `No se puede eliminar el producto. Tiene ${row.total} compras asociadas. Elimine primero las compras.`,
        compras: row.total
      });
    }
    
    // Si no hay compras, proceder con la eliminación
    db.run("DELETE FROM productos WHERE codigo = ?", [codigo], function (err) {
      if (err) {
        console.error("Error al eliminar producto:", err.message);
        return res.status(500).json({ mensaje: "Error al eliminar producto" });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ mensaje: "Producto no encontrado" });
      }
      
      res.json({ mensaje: "Producto eliminado correctamente" });
    });
  });
});
  
  // ----------------- CRUD CORTES -----------------
  
// 🚀 Servir la página HTML de Cortes
app.get('/cortes', (req, res) => {
    res.sendFile(path.join(__dirname, 'cortes', 'cortes.html'));
});

// 🚀 Obtener todos los cortes (datos JSON)
app.get('/api/cortes', (req, res) => {
    const filtro = req.query.servicio || '';
    let query = "SELECT * FROM cortes";
    let params = [];
    
    if (filtro) {
        query += " WHERE servicio LIKE ?";
        params.push(`%${filtro}%`);
    }
    
    query += " ORDER BY codigo ASC";
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error al obtener cortes:', err);
            return res.status(500).json({ mensaje: "Error al obtener cortes" });
        }
        res.json(rows);
    });
});

// 🚀 Obtener un corte específico
app.get('/api/cortes/:codigo', (req, res) => {
    db.get("SELECT * FROM cortes WHERE codigo = ?", req.params.codigo, (err, row) => {
        if (err) {
            console.error('Error al obtener corte:', err);
            return res.status(500).json({ mensaje: "Error al obtener corte" });
        }
        if (!row) {
            return res.status(404).json({ mensaje: "Corte no encontrado" });
        }
        res.json(row);
    });
});

// 🚀 Crear nuevo corte
// 🚀 Crear nuevo corte - VERSIÓN CORREGIDA
app.post('/api/cortes', (req, res) => {
    const { servicio, precio, comision } = req.body;
    
    // Validar datos
    if (!servicio || precio === undefined || comision === undefined) {
        return res.status(400).json({ mensaje: "Todos los campos son requeridos" });
    }

    // Buscar el código más alto existente
    db.get(`SELECT codigo FROM cortes 
            WHERE codigo LIKE 'SE%' 
            ORDER BY CAST(SUBSTR(codigo, 3) AS INTEGER) DESC 
            LIMIT 1`, (err, row) => {
        
        if (err) {
            console.error('Error al generar código:', err);
            return res.status(500).json({ mensaje: "Error al generar código" });
        }

        let siguienteNumero = 1;
        
        if (row && row.codigo) {
            // Extraer el número del código existente (SE01 -> 01 -> 1)
            const numeroActual = parseInt(row.codigo.substring(2));
            siguienteNumero = numeroActual + 1;
        }

        const codigo = `SE${String(siguienteNumero).padStart(2, '0')}`;

        // Verificar que el código no existe (doble verificación)
        db.get("SELECT codigo FROM cortes WHERE codigo = ?", [codigo], (err, existeCorte) => {
            if (err) {
                console.error('Error al verificar código:', err);
                return res.status(500).json({ mensaje: "Error al verificar código" });
            }

            if (existeCorte) {
                // Si existe, buscar el próximo disponible
                buscarCodigoDisponible(res, servicio, precio, comision);
            } else {
                // Insertar el corte
                insertarCorte(res, codigo, servicio, precio, comision);
            }
        });
    });
});

// Función auxiliar para buscar código disponible
function buscarCodigoDisponible(res, servicio, precio, comision) {
    db.all(`SELECT codigo FROM cortes 
            WHERE codigo LIKE 'SE%' 
            ORDER BY CAST(SUBSTR(codigo, 3) AS INTEGER) ASC`, (err, rows) => {
        
        if (err) {
            console.error('Error al buscar código disponible:', err);
            return res.status(500).json({ mensaje: "Error al buscar código disponible" });
        }

        let numeroDisponible = 1;
        const codigosExistentes = rows.map(row => parseInt(row.codigo.substring(2)));

        // Buscar el primer número disponible
        while (codigosExistentes.includes(numeroDisponible)) {
            numeroDisponible++;
        }

        const codigo = `SE${String(numeroDisponible).padStart(2, '0')}`;
        insertarCorte(res, codigo, servicio, precio, comision);
    });
}

// Función auxiliar para insertar corte
function insertarCorte(res, codigo, servicio, precio, comision) {
    db.run(`INSERT INTO cortes (codigo, servicio, precio, comision)
            VALUES (?, ?, ?, ?)`,
        [codigo, servicio.trim(), parseFloat(precio), parseFloat(comision)],
        function (err) {
            if (err) {
                console.error('Error al registrar corte:', err);
                return res.status(500).json({ mensaje: "Error al registrar corte: " + err.message });
            }

            console.log(`Corte registrado: ${codigo} - ${servicio}`);
            res.status(201).json({ mensaje: "Corte registrado exitosamente", codigo });
        });
}

// 🚀 Función para verificar y limpiar duplicados (ejecutar una sola vez)
function verificarYLimpiarCortes() {
    db.all("SELECT codigo, COUNT(*) as cantidad FROM cortes GROUP BY codigo HAVING cantidad > 1", (err, duplicados) => {
        if (err) {
            console.error('Error al verificar duplicados:', err);
            return;
        }

        if (duplicados.length > 0) {
            console.log('Códigos duplicados encontrados:', duplicados);
            
            // Para cada código duplicado, mantener solo el primero
            duplicados.forEach(dup => {
                db.run(`DELETE FROM cortes 
                        WHERE codigo = ? 
                        AND rowid NOT IN (
                            SELECT MIN(rowid) 
                            FROM cortes 
                            WHERE codigo = ?
                        )`, [dup.codigo, dup.codigo], function(err) {
                    if (err) {
                        console.error(`Error al limpiar duplicado ${dup.codigo}:`, err);
                    } else {
                        console.log(`Duplicados eliminados para código ${dup.codigo}: ${this.changes} registros`);
                    }
                });
            });
        } else {
            console.log('No se encontraron códigos duplicados');
        }
    });
}

// 🚀 Endpoint para verificar el estado de la tabla (opcional - para debugging)
app.get('/api/cortes/debug', (req, res) => {
    db.all(`SELECT codigo, servicio, precio, comision,
            CAST(SUBSTR(codigo, 3) AS INTEGER) as numero
            FROM cortes 
            ORDER BY numero ASC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const info = {
            total: rows.length,
            cortes: rows,
            ultimoCodigo: rows.length > 0 ? rows[rows.length - 1].codigo : 'Ninguno'
        };
        
        res.json(info);
    });
});

// 🚀 Actualizar un corte
app.put('/api/cortes/:codigo', (req, res) => {
    const { servicio, precio, comision } = req.body;
    
    // Validar datos
    if (!servicio || precio === undefined || comision === undefined) {
        return res.status(400).json({ mensaje: "Todos los campos son requeridos" });
    }

    db.run(`UPDATE cortes SET servicio = ?, precio = ?, comision = ? WHERE codigo = ?`,
        [servicio, parseFloat(precio), parseFloat(comision), req.params.codigo],
        function (err) {
            if (err) {
                console.error('Error al actualizar corte:', err);
                return res.status(500).json({ mensaje: "Error al actualizar corte" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ mensaje: "Corte no encontrado" });
            }

            res.json({ mensaje: "Corte actualizado correctamente" });
        });
});

// 🚀 Eliminar un corte
app.delete('/api/cortes/:codigo', (req, res) => {
    db.run("DELETE FROM cortes WHERE codigo = ?", req.params.codigo, function (err) {
        if (err) {
            console.error('Error al eliminar corte:', err);
            return res.status(500).json({ mensaje: "Error al eliminar corte" });
        }

        if (this.changes === 0) {
            return res.status(404).json({ mensaje: "Corte no encontrado" });
        }

        res.json({ mensaje: "Corte eliminado correctamente" });
    });
});
  
  // ----------------- CRUD COMPRAS -----------------
  
  // (continúa el CRUD de compras en el siguiente bloque para no saturar)
  
  
  
  // ----------------- CRUD COMPRAS -----------------
// ----------------- CRUD COMPRAS -----------------
// 🚀 Servir la página HTML de Compras
app.get('/compras', (req, res) => {
    res.sendFile(path.join(__dirname, 'compras', 'compras.html'));
  });
  
// 🚀 Obtener compras con filtros
app.get('/api/compras', (req, res) => {
  const { codigo, desde, hasta } = req.query;
  let query = "SELECT * FROM compras WHERE 1=1";
  const params = [];

  if (codigo) {
    query += " AND codigo LIKE ?";
    params.push(`%${codigo}%`);
  }

  if (desde) {
    query += " AND fecha >= ?";
    params.push(desde);
  }

  if (hasta) {
    query += " AND fecha <= ?";
    params.push(hasta);
  }

  query += " ORDER BY fecha DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("❌ Error al filtrar compras:", err.message);
      return res.status(500).json({ mensaje: "Error al filtrar compras" });
    }
    res.json(rows);
  });
});

// GET para obtener una compra específica por ID
app.get('/api/compras/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM compras WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener compra" });
    if (!row) return res.status(404).json({ mensaje: "Compra no encontrada" });
    res.json(row);
  });
});

// 🚀 Crear nueva compra y actualizar inventario
// RUTA MEJORADA: Crear nueva compra y actualizar inventario
app.post('/api/compras', (req, res) => {
  const { fecha, codigo, precio_compra, cantidad, fecha_vencimiento } = req.body;

  // Validar datos de entrada
  if (!fecha || !codigo || !precio_compra || !cantidad) {
    return res.status(400).json({ 
      mensaje: "Faltan datos requeridos",
      campos_requeridos: "fecha, codigo, precio_compra, cantidad" 
    });
  }

  // Convertir a números los valores numéricos
  const cantidadNum = parseInt(cantidad);
  const precioNum = parseFloat(precio_compra);

  if (isNaN(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).json({ mensaje: "La cantidad debe ser un número positivo" });
  }

  if (isNaN(precioNum) || precioNum <= 0) {
    return res.status(400).json({ mensaje: "El precio de compra debe ser un número positivo" });
  }

  // Obtener información del producto
  db.get("SELECT * FROM productos WHERE codigo = ?", [codigo], (err, producto) => {
    if (err) {
      console.error("❌ Error al buscar el producto:", err.message);
      return res.status(500).json({ mensaje: "Error al buscar el producto" });
    }
    
    if (!producto) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    // Calcular nueva existencia y precio promedio de compra
    const nuevaExistencia = producto.existencia + cantidadNum;
    const compraAnterior = producto.compra_promedio || 0;
    const nuevoPromedio = ((producto.existencia * compraAnterior) + (cantidadNum * precioNum)) / nuevaExistencia;

    // Iniciar una transacción para asegurar que ambas operaciones se completen juntas
    db.run("BEGIN TRANSACTION", (err) => {
      if (err) {
        console.error("❌ Error al iniciar transacción:", err.message);
        return res.status(500).json({ mensaje: "Error al procesar la compra" });
      }

      // Insertar nueva compra
      db.run(`INSERT INTO compras (fecha, codigo, producto, precio_compra, cantidad, fecha_vencimiento)
              VALUES (?, ?, ?, ?, ?, ?)`,
        [fecha, codigo, producto.producto, precioNum, cantidadNum, fecha_vencimiento], function (err) {
          if (err) {
            console.error("❌ Error al registrar compra:", err.message);
            db.run("ROLLBACK");
            return res.status(500).json({ mensaje: "Error al registrar compra" });
          }

          // Actualizar inventario con nueva existencia y promedio
          db.run(`UPDATE productos SET existencia = ?, compra_promedio = ? WHERE codigo = ?`,
            [nuevaExistencia, nuevoPromedio, codigo], function (err) {
              if (err) {
                console.error("❌ Error al actualizar inventario:", err.message);
                db.run("ROLLBACK");
                return res.status(500).json({ mensaje: "Error al actualizar inventario" });
              }

              // Si todo está bien, confirmar la transacción
              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("❌ Error al confirmar transacción:", err.message);
                  db.run("ROLLBACK");
                  return res.status(500).json({ mensaje: "Error al finalizar la operación" });
                }
                
                res.status(201).json({ 
                  mensaje: "Compra registrada exitosamente",
                  detalles: {
                    id: this.lastID,
                    producto: producto.producto,
                    nuevaExistencia: nuevaExistencia,
                    nuevoPrecioPromedio: nuevoPromedio.toFixed(2)
                  }
                });
              });
          });
      });
    });
  });
});
  
// 🚀 Eliminar una compra y actualizar inventario
// RUTA MEJORADA: Eliminar una compra y actualizar inventario
app.delete('/api/compras/:id', (req, res) => {
  const id = req.params.id;

  // Primero, obtener los detalles de la compra que se va a eliminar
  db.get("SELECT * FROM compras WHERE id = ?", [id], (err, compra) => {
    if (err) {
      console.error("❌ Error al buscar la compra:", err.message);
      return res.status(500).json({ mensaje: "Error al buscar la compra" });
    }
    
    if (!compra) {
      return res.status(404).json({ mensaje: "Compra no encontrada" });
    }

    // Obtener la información actual del producto
    db.get("SELECT * FROM productos WHERE codigo = ?", [compra.codigo], (err, producto) => {
      if (err) {
        console.error("❌ Error al buscar el producto:", err.message);
        return res.status(500).json({ mensaje: "Error al buscar el producto" });
      }
      
      if (!producto) {
        return res.status(404).json({ mensaje: "Producto asociado no encontrado" });
      }

      // Calcular la nueva existencia (restando la cantidad de la compra)
      const nuevaExistencia = Math.max(0, producto.existencia - compra.cantidad);
      
      // Iniciar una transacción para garantizar que ambas operaciones (eliminar compra y actualizar producto) se realicen juntas
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          console.error("❌ Error al iniciar transacción:", err.message);
          return res.status(500).json({ mensaje: "Error al procesar la eliminación" });
        }
        
        // Eliminar la compra
        db.run("DELETE FROM compras WHERE id = ?", [id], function(err) {
          if (err) {
            console.error("❌ Error al eliminar compra:", err.message);
            db.run("ROLLBACK");
            return res.status(500).json({ mensaje: "Error al eliminar compra" });
          }
          
          // Actualizar la existencia del producto
          db.run("UPDATE productos SET existencia = ? WHERE codigo = ?", [nuevaExistencia, compra.codigo], function(err) {
            if (err) {
              console.error("❌ Error al actualizar inventario:", err.message);
              db.run("ROLLBACK");
              return res.status(500).json({ mensaje: "Error al actualizar inventario" });
            }
            
            // Si todo está bien, confirmar la transacción
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("❌ Error al confirmar transacción:", err.message);
                db.run("ROLLBACK");
                return res.status(500).json({ mensaje: "Error al finalizar la operación" });
              }
              
              res.json({ 
                mensaje: "Compra eliminada y existencias actualizadas correctamente",
                detalles: {
                  producto: compra.producto,
                  codigoProducto: compra.codigo,
                  cantidadEliminada: compra.cantidad,
                  nuevaExistencia: nuevaExistencia
                }
              });
            });
          });
        });
      });
    });
  });
});


// PUT para actualizar una compra existente
// RUTA MEJORADA: Actualizar una compra existente y su impacto en inventario
app.put('/api/compras/:id', (req, res) => {
  const id = req.params.id;
  const { fecha, codigo, precio_compra, cantidad, fecha_vencimiento } = req.body;
  
  // Primero, obtener la compra actual para calcular la diferencia en cantidades
  db.get("SELECT * FROM compras WHERE id = ?", [id], (err, compraActual) => {
    if (err) {
      console.error("❌ Error al buscar la compra actual:", err.message);
      return res.status(500).json({ mensaje: "Error al buscar la compra" });
    }
    
    if (!compraActual) {
      return res.status(404).json({ mensaje: "Compra no encontrada" });
    }

    // Calcular la diferencia de cantidad entre la compra actual y la actualización
    const diferenciaCantidad = parseInt(cantidad) - parseInt(compraActual.cantidad);
    
    // Obtener información actual del producto
    db.get("SELECT existencia FROM productos WHERE codigo = ?", [codigo], (err, producto) => {
      if (err) {
        console.error("❌ Error al buscar el producto:", err.message);
        return res.status(500).json({ mensaje: "Error al buscar el producto" });
      }
      
      if (!producto) {
        return res.status(404).json({ mensaje: "Producto no encontrado" });
      }

      // Calcular la nueva existencia
      const nuevaExistencia = Math.max(0, producto.existencia + diferenciaCantidad);
      
      // Iniciar una transacción para asegurar que ambas operaciones se completen juntas
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          console.error("❌ Error al iniciar transacción:", err.message);
          return res.status(500).json({ mensaje: "Error al procesar la actualización" });
        }
        
        // Actualizar la compra
        db.run(`UPDATE compras SET fecha = ?, codigo = ?, precio_compra = ?, cantidad = ?, fecha_vencimiento = ? WHERE id = ?`,
          [fecha, codigo, precio_compra, cantidad, fecha_vencimiento, id], function (err) {
            if (err) {
              console.error("❌ Error al actualizar compra:", err.message);
              db.run("ROLLBACK");
              return res.status(500).json({ mensaje: "Error al actualizar compra" });
            }
          
            // Actualizar existencias en productos si hay cambio en la cantidad
            if (diferenciaCantidad !== 0) {
              db.run("UPDATE productos SET existencia = ? WHERE codigo = ?", 
                [nuevaExistencia, codigo], function(err) {
                  if (err) {
                    console.error("❌ Error al actualizar existencias:", err.message);
                    db.run("ROLLBACK");
                    return res.status(500).json({ mensaje: "Error al actualizar existencias" });
                  }
                  
                  // Si todo está bien, confirmar la transacción
                  db.run("COMMIT", (err) => {
                    if (err) {
                      console.error("❌ Error al confirmar transacción:", err.message);
                      db.run("ROLLBACK");
                      return res.status(500).json({ mensaje: "Error al finalizar la operación" });
                    }
                    
                    res.json({ 
                      mensaje: "Compra actualizada correctamente",
                      detalles: {
                        diferenciaCantidad: diferenciaCantidad,
                        nuevaExistencia: nuevaExistencia
                      }
                    });
                  });
              });
            } else {
              // Si no hay cambio en cantidad, simplemente confirmar y responder
              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("❌ Error al confirmar transacción:", err.message);
                  db.run("ROLLBACK");
                  return res.status(500).json({ mensaje: "Error al finalizar la operación" });
                }
                
                res.json({ mensaje: "Compra actualizada correctamente (sin cambios en existencias)" });
              });
            }
        });
      });
    });
  });
});


  // ----------------- CRUD FACTURACIÓN + GENERAR PDF -----------------
  
  // Función para generar PDF
  /* ────────────────────────────────────────────────────────────
   Generar PDF con Playwright + logo embebido en Base64
────────────────────────────────────────────────────────────── */
async function generarPDF(datos, filename) {
  try {
    /* 1) Cargar plantilla */
    const templatePath = path.join(__dirname, 'facturacion', 'plantilla-factura.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    
    /* 2) Leer logo y convertirlo en data URI */
    const logoB64 = fs.readFileSync(
      path.join(__dirname, 'imagenes', 'logo.png'),
      'base64'
    );
    const logoDataURI = `data:image/png;base64,${logoB64}`;
    
    /* 3) Construir tablas de detalle - MODIFICADO para usar precio unitario */
    const detalleCortesHTML = (datos.detalleCortes || [])
      .map(c => {
        // Si es un corte gratis, mostrar "CORTE GRATIS" en lugar del precio
        if (c.descuento_gratis) {
          return `
            <tr>
              <td>${c.nombre}</td>
              <td style="color: #28a745; font-weight: bold;">🎁 CORTE GRATIS</td>
              <td>${c.cantidad}</td>
              <td style="color: #28a745; font-weight: bold;">$0.00</td>
            </tr>
          `;
        } else {
          return `
            <tr>
              <td>${c.nombre}</td>
              <td>$${parseFloat(c.precio_unitario).toFixed(2)}</td>
              <td>${c.cantidad}</td>
              <td>$${(c.precio_unitario * c.cantidad).toFixed(2)}</td>
            </tr>
          `;
        }
      }).join('');
    
    const detalleProductosHTML = (datos.detalleProductos || [])
      .map(p => `
        <tr>
          <td>${p.nombre}</td>
          <td>$${parseFloat(p.precio_unitario).toFixed(2)}</td>
          <td>${p.cantidad}</td>
          <td>$${(p.precio_unitario * p.cantidad).toFixed(2)}</td>
        </tr>
      `).join('');
    
    /* 4) Reemplazar marcadores en la plantilla */
    html = html
      .replace('{{logo_src}}',         logoDataURI)          // ⬅ logo
      .replace('{{fecha}}',            datos.fecha)
      .replace('{{factura}}',          datos.factura)
      .replace('{{comanda}}',          datos.comanda)
      .replace('{{cliente}}',          datos.cliente)
      .replace('{{empleado}}',         datos.empleado)
      .replace('{{tipo_pago}}',        datos.tipo_pago)
      .replace('{{precio_venta}}',     datos.precio_venta)
      .replace('{{descuento}}',        datos.descuento)
      .replace('{{total}}',            datos.total)
      .replace('{{detalle_cortes}}',   detalleCortesHTML)
      .replace('{{detalle_productos}}', detalleProductosHTML);
    
    /* 5) Extraer el mes de la fecha (DD/MM/YYYY) */
    const [_, mes, anio] = datos.fecha.split('/');
    
    /* 6) Construir la estructura de carpetas */
    // Directorio base: factura
    const baseDir = path.join(__dirname, 'factura');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    
    // Subdirectorio: Fac
    const facDir = path.join(baseDir, 'Fac');
    if (!fs.existsSync(facDir)) fs.mkdirSync(facDir, { recursive: true });
    
    // Subdirectorio del mes: 01-12
    const mesDir = path.join(facDir, mes);
    if (!fs.existsSync(mesDir)) fs.mkdirSync(mesDir, { recursive: true });
    
    /* 7) Generar el nombre del archivo correcto */
    // Formato: AAAA_XXXX.pdf (ej: 2025_0012.pdf)
    const pdfFilename = `${anio}_${String(datos.factura).padStart(4, '0')}.pdf`;
    const outputPath = path.join(mesDir, pdfFilename);
    
    /* 8) Generar PDF con Playwright */
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.pdf({ path: outputPath, format: 'A4' });
    await browser.close();
    
    console.log(`✅ PDF generado: ${outputPath}`);
    
    // Devolver la ruta relativa para referencias posteriores
    return {
      ruta: `factura/Fac/${mes}/${pdfFilename}`,
      nombre: pdfFilename
    };
  } catch (err) {
    console.error('❌ Error al generar PDF:', err.message);
    throw err; // Re-lanzar el error para manejarlo en la función que llama
  }
}

  // Guardar factura
 // Reemplazar la función existente con esta implementación actualizada
app.post('/facturas', async (req, res) => {
  const { 
    fecha, 
    comanda, 
    factura, 
    cliente, 
    empleado_principal, 
    tipo_pago, 
    precio_venta, 
    descuento, 
    total, 
    detalleCortes, 
    detalleProductos,
    es_pago_mixto,
    monto_efectivo,
    monto_tarjeta
  } = req.body;

  db.run(
    `INSERT INTO facturas (
       fecha, comanda, factura, cliente, empleado_principal,
       tipo_pago, precio_venta, descuento, total,
       es_pago_mixto, monto_efectivo, monto_tarjeta
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, comanda, factura, cliente, empleado_principal,
      tipo_pago, precio_venta, descuento, total,
      es_pago_mixto ? 1 : 0, monto_efectivo || 0, monto_tarjeta || 0
    ],
    async function (err) {
      if (err) {
        console.error("Error al guardar factura:", err);
        return res.status(500).json({ mensaje: "Error al guardar factura" });
      }

      const facturaId = this.lastID;

      // ─── Procesar detalle de cortes ───────────────────────────────────────
      (detalleCortes || []).forEach(c => {
        db.run(
          `INSERT INTO detalle_cortes (
             factura_id, codigo, nombre, cantidad, total, comision,
             empleado, fecha, comanda, factura
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            facturaId,
            c.codigo,
            c.nombre,
            c.cantidad,
            c.precio,       // ← usa c.precio (ya viene total desde el cliente)
            c.comision,
            c.empleado,
            fecha,
            comanda,
            factura
          ]
        );
      });

      // ─── Procesar detalle de productos ───────────────────────────────────
      (detalleProductos || []).forEach(p => {
        db.run(
          `INSERT INTO detalle_productos (
             factura_id, codigo, nombre, cantidad, total, comision,
             empleado, fecha, comanda, factura
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            facturaId,
            p.codigo,
            p.nombre,
            p.cantidad,
            p.precio,       // ← usa p.precio (ya viene total desde el cliente)
            p.comision,
            p.empleado,
            fecha,
            comanda,
            factura
          ]
        );

        // Actualizar existencia del producto
        db.run(
          `UPDATE productos SET existencia = existencia - ? WHERE codigo = ?`,
          [p.cantidad, p.codigo]
        );
      });

      // ─── PDF AUTOMÁTICO DESHABILITADO ───────────────────────────────────────
      // Ya no generamos PDF automáticamente, solo usamos vista HTML
      // El PDF se genera solo cuando el usuario lo solicita desde /api/generar-factura-pdf
      
      /*
      const codPDF = `Fac${fecha.replace(/-/g, '').slice(2)}_${String(factura).padStart(4, '0')}.pdf`;
      
      // Formatear descuento para mostrar con % en el PDF
      const descuentoParaPDF = descuento && parseFloat(descuento) > 0 ? `${descuento}%` : '0%';
      
      await generarPDF(
        {
          fecha,
          comanda,
          factura,
          cliente,
          empleado: empleado_principal,
          tipo_pago,
          precio_venta,
          descuento: descuentoParaPDF,
          total,
          detalleCortes,
          detalleProductos
        },
        codPDF
      );
      */

      // ─── Responder al cliente ────────────────────────────────────────────
      res.status(201).json({
        mensaje: "Factura guardada correctamente. Use 'Ver Factura' para visualizar.",
        factura_id: facturaId
      });
    }
  );
});


// Ruta para servir la página HTML de comisiones
app.get('/facturacion/comisiones.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'facturacion', 'comisiones.html'));
});

// Endpoint para obtener el resumen de comisiones por barbero
// Actualización final del JavaScript en comisiones.html
app.get('/api/comisiones', (req, res) => {
  const { desde, hasta, barbero } = req.query;

  console.log('Solicitud de comisiones recibida:', { desde, hasta, barbero });

  // Validar que se proporcionaron las fechas
  if (!desde || !hasta) {
    return res.status(400).json({ mensaje: "Las fechas son obligatorias" });
  }

  // Convertir fechas de formato YYYY-MM-DD a DD/MM/YYYY si es necesario
  let desdeFormato = desde;
  let hastaFormato = hasta;

  if (desde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = desde.split('-');
    desdeFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  if (hasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = hasta.split('-');
    hastaFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  console.log('Fechas convertidas a formato DD/MM/YYYY:', { desdeFormato, hastaFormato });

  // En lugar de usar subconsultas, hacemos consultas directas para verificar los datos reales
  // Primero obtenemos la lista de empleados que tienen actividad
  db.all(`
    SELECT DISTINCT empleado 
    FROM (
      SELECT empleado FROM detalle_cortes 
      WHERE fecha BETWEEN ? AND ?
      UNION
      SELECT empleado FROM detalle_productos 
      WHERE fecha BETWEEN ? AND ?
    )
  `, [desdeFormato, hastaFormato, desdeFormato, hastaFormato], (err, empleados) => {
    if (err) {
      console.error("Error al consultar empleados con actividad:", err);
      return res.status(500).json({ mensaje: "Error al obtener comisiones" });
    }

    if (empleados.length === 0) {
      return res.json([]); // No hay empleados con actividad
    }

    // Filtramos por barbero específico si se proporcionó
    if (barbero && barbero !== '') {
      empleados = empleados.filter(e => e.empleado === barbero);
    }

    // Procesamos cada empleado por separado para evitar problemas de agregación
    const results = [];
    let processedCount = 0;

    empleados.forEach(emp => {
      // Resumen del empleado
      const resumen = { 
        empleado: emp.empleado,
        total_servicios: 0,
        total_ventas: 0,
        total_comision: 0
      };

      // 1. Obtenemos datos de cortes
      db.all(
        "SELECT SUM(cantidad) as cant_servicios, SUM(total) as total_ventas, SUM(comision) as total_comision FROM detalle_cortes WHERE empleado = ? AND fecha BETWEEN ? AND ?",
        [emp.empleado, desdeFormato, hastaFormato],
        (err, cortes) => {
          if (err) {
            console.error(`Error al consultar cortes para ${emp.empleado}:`, err);
            processedCount++;
            checkIfComplete();
            return;
          }

          // Agregamos datos de cortes
          if (cortes.length > 0 && cortes[0].cant_servicios) {
            resumen.total_servicios += cortes[0].cant_servicios || 0;
            resumen.total_ventas += cortes[0].total_ventas || 0;
            resumen.total_comision += cortes[0].total_comision || 0;
          }

          // 2. Obtenemos datos de productos
          db.all(
            "SELECT SUM(cantidad) as cant_productos, SUM(total) as total_ventas, SUM(comision) as total_comision FROM detalle_productos WHERE empleado = ? AND fecha BETWEEN ? AND ?",
            [emp.empleado, desdeFormato, hastaFormato],
            (err, productos) => {
              if (err) {
                console.error(`Error al consultar productos para ${emp.empleado}:`, err);
                processedCount++;
                checkIfComplete();
                return;
              }

              // Agregamos datos de productos
              if (productos.length > 0 && productos[0].cant_productos) {
                resumen.total_servicios += productos[0].cant_productos || 0;
                resumen.total_ventas += productos[0].total_ventas || 0;
                resumen.total_comision += productos[0].total_comision || 0;
              }

              // Depuración
              console.log(`Resumen para ${emp.empleado}:`, JSON.stringify(resumen, null, 2));

              // Agregar el resumen al resultado
              results.push(resumen);
              processedCount++;
              checkIfComplete();
            }
          );
        }
      );
    });

    // Función para verificar si hemos terminado de procesar todos los empleados
    function checkIfComplete() {
      if (processedCount === empleados.length) {
        // Ordenar por comisión (mayor a menor)
        results.sort((a, b) => b.total_comision - a.total_comision);
        res.json(results);
      }
    }
  });
});
// Función para formatear fecha en formato de input date (YYYY-MM-DD)
function formatoISO(fecha) {
  return fecha.toISOString().split('T')[0];
}

// Función para convertir fecha de YYYY-MM-DD a DD/MM/YYYY
function formatoLatam(fecha) {
  // Si la fecha está en formato YYYY-MM-DD
  if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }
  // Si es un objeto Date
  else if (fecha instanceof Date) {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
  return fecha; // En caso de no poder formatear, devolver como está
}

// Función actualizada para cargar resumen
async function cargarResumen() {
  // Obtenemos las fechas del formulario (están en formato YYYY-MM-DD por el input date)
  const desdeISO = document.getElementById('filtroDesde').value;
  const hastaISO = document.getElementById('filtroHasta').value;
  const barbero = document.getElementById('filtroBarbero').value;
  
  if (!desdeISO || !hastaISO) {
    alert('Por favor seleccione fechas válidas');
    return;
  }
  
  try {
    console.log('Fechas seleccionadas (ISO):', { desdeISO, hastaISO });
    
    // URL con las fechas en formato original para que el servidor las convierta
    const url = `/api/comisiones?desde=${encodeURIComponent(desdeISO)}&hasta=${encodeURIComponent(hastaISO)}${barbero ? `&barbero=${encodeURIComponent(barbero)}` : ''}`;
    console.log('URL de consulta:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error HTTP: ${res.status} ${res.statusText}. Detalles: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Datos recibidos:', data);
    
    renderizarTablaResumen(data);
    
    // Ocultar detalles al cargar un nuevo resumen
    document.getElementById('seccionDetalle').style.display = 'none';
    
    // Si no hay datos, mostrar mensaje más específico
    if (data.length === 0) {
      alert('No se encontraron comisiones para el período seleccionado.');
    }
  } catch (err) {
    console.error('Error al cargar resumen:', err);
    alert('No se pudo cargar el resumen de comisiones. Intente nuevamente. Error: ' + err.message);
  }
}

// Función actualizada para ver detalle
async function verDetalle(empleado) {
  // Obtenemos las fechas del formulario (están en formato YYYY-MM-DD)
  const desdeISO = document.getElementById('filtroDesde').value;
  const hastaISO = document.getElementById('filtroHasta').value;
  
  try {
    console.log('Cargando detalles para:', empleado, { desdeISO, hastaISO });
    
    // Consumir API para obtener los detalles de comisiones
    const url = `/api/comisiones/detalle?empleado=${encodeURIComponent(empleado)}&desde=${encodeURIComponent(desdeISO)}&hasta=${encodeURIComponent(hastaISO)}`;
    console.log('URL de consulta detalle:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error HTTP: ${res.status} ${res.statusText}. Detalles: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Detalles recibidos:', data);
    
    // Mostrar nombre del barbero
    document.getElementById('nombreBarbero').textContent = empleado;
    
    // Renderizar tabla de detalles
    renderizarTablaDetalle(data);
    
    // Mostrar la sección de detalles
    document.getElementById('seccionDetalle').style.display = 'block';
    
    // Desplazar al usuario a la sección de detalles
    document.getElementById('seccionDetalle').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Error al cargar detalles:', err);
    alert('No se pudieron cargar los detalles. Intente nuevamente. Error: ' + err.message);
  }
}
// Endpoint para obtener el detalle de comisiones de un barbero específico

app.get('/api/comisiones/detalle', (req, res) => {
  const { empleado, desde, hasta } = req.query;

  // Validar parámetros obligatorios
  if (!empleado || !desde || !hasta) {
    return res.status(400).json({ mensaje: "Empleado y fechas son obligatorios" });
  }

  console.log('Solicitud de detalle de comisiones:', { empleado, desde, hasta });

  // Convertir fechas de formato YYYY-MM-DD a DD/MM/YYYY si es necesario
  let desdeFormato = desde;
  let hastaFormato = hasta;

  if (desde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = desde.split('-');
    desdeFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  if (hasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = hasta.split('-');
    hastaFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  // Obtener los detalles de cortes
  db.all(`
    SELECT 
      fecha,
      factura,
      comanda,
      nombre AS servicio,
      cantidad,
      total,
      comision,
      'corte' AS tipo
    FROM detalle_cortes
    WHERE empleado = ? AND fecha BETWEEN ? AND ?
  `, [empleado, desdeFormato, hastaFormato], (err, cortes) => {
    if (err) {
      console.error("Error al consultar detalle de cortes:", err);
      return res.status(500).json({ mensaje: "Error al obtener detalle de comisiones" });
    }
    
    // Obtener los detalles de productos
    db.all(`
      SELECT 
        fecha,
        factura,
        comanda,
        nombre AS servicio,
        cantidad,
        total,
        comision,
        'producto' AS tipo
      FROM detalle_productos
      WHERE empleado = ? AND fecha BETWEEN ? AND ?
    `, [empleado, desdeFormato, hastaFormato], (err, productos) => {
      if (err) {
        console.error("Error al consultar detalle de productos:", err);
        return res.status(500).json({ mensaje: "Error al obtener detalle de comisiones" });
      }
      
      // Combinar ambos conjuntos de resultados
      const resultados = [...cortes, ...productos].sort((a, b) => {
        // Ordenar por fecha (descendente) y luego por factura (descendente)
        if (a.fecha === b.fecha) {
          return b.factura - a.factura;
        }
        return new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-'));
      });
      
      console.log(`Total detalles encontrados: ${resultados.length} (${cortes.length} cortes + ${productos.length} productos)`);
      res.json(resultados);
    });
  });
});



// Obtener facturas filtradas por fecha exacta (sin hora)
app.get('/api/facturas', (req, res) => {
  const fecha = req.query.fecha;
  if (!fecha) return res.status(400).json({ mensaje: "Falta la fecha" });

  db.all("SELECT * FROM facturas WHERE fecha = ?", [fecha], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener ventas del día" });
    res.json(rows);
  });
});

// ENDPOINT MODIFICADO: Obtener facturas por día INCLUYENDO MEMBRESÍAS
// ========================================
// ENDPOINT CORREGIDO: Facturas por día con mejor debug
// Reemplaza el endpoint existente /api/facturas/por-dia en servergeneral.js
// ========================================

app.get('/api/facturas/por-dia', (req, res) => {
  const { fecha, responsable } = req.query;

  console.log('=== CONSULTA VENTAS DEL DÍA (CON MEMBRESÍAS) - DEBUG MEJORADO ===');
  console.log('📅 Fecha recibida del frontend:', fecha);
  console.log('👤 Responsable:', responsable);

  if (!fecha) {
    return res.status(400).json({ mensaje: "Falta la fecha" });
  }

  // Promesas para obtener datos en paralelo
  const consultaFacturas = new Promise((resolve, reject) => {
    let queryFacturas = `SELECT tipo_pago, total, fecha, empleado_principal, es_pago_mixto, monto_efectivo, monto_tarjeta FROM facturas WHERE fecha = ?`;
    const paramsFacturas = [fecha];

    if (responsable) {
      queryFacturas += ` AND empleado_principal = ?`;
      paramsFacturas.push(responsable);
    }

    console.log('🔍 SQL Facturas:', queryFacturas);
    console.log('📝 Parámetros Facturas:', paramsFacturas);

    db.all(queryFacturas, paramsFacturas, (err, rows) => {
      if (err) {
        console.error("❌ Error al consultar facturas:", err.message);
        reject(err);
      } else {
        console.log(`✅ Facturas encontradas: ${rows.length}`);
        rows.forEach((row, index) => {
          console.log(`   ${index + 1}. Fecha: ${row.fecha}, Tipo: ${row.tipo_pago}, Total: $${row.total}, Empleado: ${row.empleado_principal}`);
        });
        resolve(rows);
      }
    });
  });

  const consultaMembresias = new Promise((resolve, reject) => {
    // Consultar membresías activas del día (fecha_inicio = fecha del cierre)
    let queryMembresias = `
      SELECT tipo_pago, monto as total, fecha_inicio, nombre
      FROM clientes 
      WHERE membresia = 'Activo' 
      AND fecha_inicio = ? 
      AND monto > 0
    `;
    const paramsMembresias = [fecha];

    console.log('🔍 SQL Membresías:', queryMembresias);
    console.log('📝 Parámetros Membresías:', paramsMembresias);
    
    db.all(queryMembresias, paramsMembresias, (err, rows) => {
      if (err) {
        console.error("❌ Error al consultar membresías:", err.message);
        reject(err);
      } else {
        console.log(`✅ Membresías encontradas: ${rows.length}`);
        rows.forEach((row, index) => {
          console.log(`   ${index + 1}. Cliente: ${row.nombre}, Fecha Inicio: ${row.fecha_inicio}, Tipo: ${row.tipo_pago}, Monto: $${row.total}`);
        });
        resolve(rows);
      }
    });
  });

  // Ejecutar ambas consultas en paralelo
  Promise.all([consultaFacturas, consultaMembresias])
    .then(([facturas, membresias]) => {
      // Combinar facturas y membresías
      const todosLosIngresos = [...facturas, ...membresias];
      
      console.log('📊 === RESUMEN DE INGRESOS COMBINADOS ===');
      console.log(`   - Facturas: ${facturas.length} registros`);
      console.log(`   - Membresías: ${membresias.length} registros`);
      console.log(`   - Total registros: ${todosLosIngresos.length}`);
      
      // Calcular totales por tipo de pago para debug
      let totalEfectivo = 0, totalTarjeta = 0, totalOtros = 0;
      todosLosIngresos.forEach(item => {
        const tipo = item.tipo_pago;
        const total = parseFloat(item.total);
        
        if (tipo === "Efectivo") totalEfectivo += total;
        else if (tipo === "Tarjeta") totalTarjeta += total;
        else if (tipo === "Otros") totalOtros += total;
      });
      
      console.log('💰 Totales por tipo de pago:');
      console.log(`   - Efectivo: $${totalEfectivo.toFixed(2)}`);
      console.log(`   - Tarjeta: $${totalTarjeta.toFixed(2)}`);
      console.log(`   - Otros: $${totalOtros.toFixed(2)}`);
      console.log(`   - GRAN TOTAL: $${(totalEfectivo + totalTarjeta + totalOtros).toFixed(2)}`);
      
      res.json(todosLosIngresos);
    })
    .catch(error => {
      console.error("❌ Error en consulta combinada:", error.message);
      res.status(500).json({ mensaje: "Error al consultar ventas del día" });
    });
});

// ========================================
// ENDPOINT DE DEBUG ADICIONAL
// Agregar este endpoint para investigar discrepancias
// ========================================

app.get('/api/debug/facturas-fecha', (req, res) => {
  const { fecha } = req.query;
  
  console.log('🔍 === DEBUG: FACTURAS POR FECHA ===');
  console.log('📅 Fecha consultada:', fecha);
  
  if (!fecha) {
    return res.status(400).json({ error: 'Fecha es requerida' });
  }
  
  // Obtener todas las facturas para ver formatos de fecha
  const sql = `
    SELECT 
      id,
      fecha,
      total,
      tipo_pago,
      empleado_principal,
      cliente
    FROM facturas 
    ORDER BY id DESC 
    LIMIT 10
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error en debug:', err.message);
      return res.status(500).json({ error: 'Error en debug' });
    }
    
    console.log(`📋 ${rows.length} facturas recientes encontradas:`);
    rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, Fecha: "${row.fecha}", Total: $${row.total}, Tipo: ${row.tipo_pago}`);
    });
    
    // Buscar coincidencias exactas con la fecha consultada
    const coincidencias = rows.filter(row => row.fecha === fecha);
    console.log(`🎯 ${coincidencias.length} facturas coinciden exactamente con "${fecha}"`);
    
    // Buscar coincidencias con diferentes formatos
    const coincidenciasLike = rows.filter(row => 
      row.fecha && (
        row.fecha.includes(fecha) || 
        fecha.includes(row.fecha.replace(/\//g, '')) ||
        row.fecha.replace(/\//g, '') === fecha.replace(/\//g, '')
      )
    );
    console.log(`🔄 ${coincidenciasLike.length} facturas con formatos similares`);
    
    res.json({
      fecha_consultada: fecha,
      total_facturas_recientes: rows.length,
      coincidencias_exactas: coincidencias.length,
      coincidencias_similares: coincidenciasLike.length,
      facturas_recientes: rows.map(row => ({
        id: row.id,
        fecha: row.fecha,
        total: row.total,
        tipo_pago: row.tipo_pago,
        coincide_exacta: row.fecha === fecha,
        formato_detectado: detectarFormatoFecha(row.fecha)
      })),
      detalles_coincidencias: {
        exactas: coincidencias,
        similares: coincidenciasLike
      }
    });
  });
});

// Función auxiliar para detectar formato de fecha
function detectarFormatoFecha(fecha) {
  if (!fecha) return 'null';
  if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) return 'DD/MM/YYYY';
  if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return 'YYYY-MM-DD';
  if (fecha.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return 'D/M/YYYY o DD/M/YYYY';
  return 'formato_desconocido';
}







  // Obtener facturas
  // 🚀 Historial de facturas con filtros dinámicos
// ========================================
// REEMPLAZAR COMPLETAMENTE TU FUNCIÓN ACTUAL EN servergeneral.js
// ========================================

app.get('/facturas', (req, res) => {
  const { desde, hasta, comanda, factura, empleado, cliente, pago } = req.query;

  console.log('Consulta facturas con ordenamiento corregido');
  console.log('Filtros recibidos:', { desde, hasta, comanda, factura, empleado, cliente, pago });

  let sql = 'SELECT *, es_pago_mixto, monto_efectivo, monto_tarjeta FROM facturas WHERE 1=1';
  const params = [];

  if (desde) {
    const desdeFormato = convertirFechaISOaCentroamericana(desde);
    sql += ' AND fecha >= ?';
    params.push(desdeFormato);
    console.log('Filtro desde aplicado:', desdeFormato);
  }
  
  if (hasta) {
    const hastaFormato = convertirFechaISOaCentroamericana(hasta);
    sql += ' AND fecha <= ?';
    params.push(hastaFormato);
    console.log('Filtro hasta aplicado:', hastaFormato);
  }
  
  if (comanda) { 
    sql += ' AND comanda = ?';    
    params.push(comanda); 
  }
  
  if (factura) { 
    sql += ' AND factura = ?';    
    params.push(factura); 
  }
  
  if (empleado) { 
    sql += ' AND empleado_principal LIKE ?';
    params.push('%' + empleado + '%'); 
  }
  
  if (cliente) { 
    sql += ' AND cliente LIKE ?'; 
    params.push('%' + cliente + '%'); 
  }
  
  if (pago) { 
    sql += ' AND tipo_pago = ?';  
    params.push(pago); 
  }

  sql += ' ORDER BY substr(fecha, 7, 4) DESC, substr(fecha, 4, 2) DESC, substr(fecha, 1, 2) DESC, CAST(factura AS INTEGER) DESC';

  console.log('SQL generado:', sql);
  console.log('Parametros:', params);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error al filtrar facturas:', err.message);
      return res.status(500).json({ mensaje: 'Error al filtrar facturas' });
    }
    
    console.log(rows.length + ' facturas encontradas');
    
    if (rows.length > 0) {
      console.log('Primeras 5 facturas (verificar ordenamiento):');
      rows.slice(0, 5).forEach((row, index) => {
        console.log('  ' + (index + 1) + '. Fecha: ' + row.fecha + ', Factura: #' + row.factura + ', Cliente: ' + row.cliente);
      });
      
      const primeraFecha = rows[0].fecha;
      const ultimaFecha = rows[rows.length - 1].fecha;
      console.log('Rango ordenado: ' + ultimaFecha + ' -> ' + primeraFecha);
      
      const facturasPorMes = {};
      rows.forEach(row => {
        const mes = row.fecha.substring(3, 5);
        const anio = row.fecha.substring(6, 10);
        const clave = mes + '/' + anio;
        facturasPorMes[clave] = (facturasPorMes[clave] || 0) + 1;
      });
      console.log('Distribucion por mes:', facturasPorMes);
    }
    
    res.json(rows);
  });
});
  
  // Eliminar factura
 // Reemplaza la función eliminar factura actual con esta versión actualizada
app.delete('/facturas/:id', (req, res) => {
  const facturaId = req.params.id;
  
  // Primero obtener los datos de la factura para conocer la ubicación del PDF
  db.get("SELECT fecha, factura FROM facturas WHERE id = ?", [facturaId], (err, facturaData) => {
    if (err) {
      console.error("❌ Error al obtener datos de la factura:", err.message);
      return res.status(500).json({ mensaje: "Error al eliminar factura" });
    }
    
    if (!facturaData) {
      return res.status(404).json({ mensaje: "Factura no encontrada" });
    }
    
    // Extraer componentes de la fecha (DD/MM/YYYY)
    const [dia, mes, anio] = facturaData.fecha.split('/');
    
    // Construir la ruta del PDF basada en los datos de la factura
    const pdfFilename = `${anio}_${String(facturaData.factura).padStart(4, '0')}.pdf`;
    const pdfPath = path.join(__dirname, 'factura', 'Fac', mes, pdfFilename);
    
    console.log(`🔍 Intentando eliminar PDF: ${pdfPath}`);
    
    // Comenzar proceso de eliminación en base de datos y archivo
    db.serialize(() => {
      // 1. Recuperar productos para restaurar existencias
      db.all("SELECT * FROM detalle_productos WHERE factura_id = ?", [facturaId], (err, productos) => {
        if (err) {
          console.error("❌ Error al obtener productos para restaurar existencias:", err.message);
          return res.status(500).json({ mensaje: "Error al eliminar factura" });
        }
        
        // 2. Restaurar existencias
        if (productos && productos.length > 0) {
          productos.forEach(p => {
            db.run("UPDATE productos SET existencia = existencia + ? WHERE codigo = ?", [p.cantidad, p.codigo]);
          });
        }
        
        // 3. Eliminar detalles y factura en cascada
        db.run("DELETE FROM detalle_cortes WHERE factura_id = ?", [facturaId]);
        db.run("DELETE FROM detalle_productos WHERE factura_id = ?", [facturaId]);
        db.run("DELETE FROM facturas WHERE id = ?", [facturaId], function (err) {
          if (err) {
            console.error("❌ Error al eliminar factura de la base de datos:", err.message);
            return res.status(500).json({ mensaje: "Error al eliminar factura" });
          }
          
          // 4. Intentar eliminar el archivo PDF asociado
          if (fs.existsSync(pdfPath)) {
            try {
              fs.unlinkSync(pdfPath);
              console.log(`✅ PDF eliminado exitosamente: ${pdfPath}`);
              
              // 5. Verificar si el directorio del mes quedó vacío
              const monthDir = path.dirname(pdfPath);
              const filesInMonth = fs.readdirSync(monthDir);
              
              if (filesInMonth.length === 0) {
                try {
                  // Si el directorio del mes está vacío, eliminarlo
                  fs.rmdirSync(monthDir);
                  console.log(`🧹 Directorio vacío eliminado: ${monthDir}`);
                } catch (dirErr) {
                  console.error(`⚠️ No se pudo eliminar el directorio: ${dirErr.message}`);
                  // Continuamos a pesar del error, ya que no es crítico
                }
              }
              
              res.json({ 
                mensaje: "Factura y PDF eliminados correctamente",
                pdf_eliminado: true
              });
            } catch (fileErr) {
              console.error(`⚠️ Error al eliminar PDF: ${fileErr.message}`);
              res.json({ 
                mensaje: "Factura eliminada, pero no se pudo eliminar el PDF",
                pdf_eliminado: false,
                error_pdf: fileErr.message
              });
            }
          } else {
            console.log(`⚠️ PDF no encontrado: ${pdfPath}`);
            res.json({ 
              mensaje: "Factura eliminada correctamente, PDF no encontrado",
              pdf_eliminado: false
            });
          }
        });
      });
    });
  });
});
  

  // 🚀 Obtener todos los detalles de cortes
app.get('/api/detalle_cortes', (req, res) => {
  console.log('🔍 === CONSULTA DETALLE DE CORTES CON ORDENAMIENTO CORREGIDO ===');
  
  // Consulta SQL con ordenamiento correcto para fechas en formato DD/MM/YYYY
  const sql = `
    SELECT 
      id,
      fecha,
      factura,
      comanda,
      empleado,
      nombre,
      cantidad,
      total,
      comision,
      codigo
    FROM detalle_cortes 
    ORDER BY 
      -- 1. Ordenar por fecha (más reciente primero)
      -- Convertir DD/MM/YYYY a formato comparable (YYYY-MM-DD)
      substr(fecha, 7, 4) DESC,  -- Año (descendente)
      substr(fecha, 4, 2) DESC,  -- Mes (descendente)  
      substr(fecha, 1, 2) DESC,  -- Día (descendente)
      
      -- 2. Luego por número de factura (descendente - más alta primero)
      CAST(factura AS INTEGER) DESC,
      
      -- 3. Finalmente por número de comanda (descendente - más alta primero)
      CAST(comanda AS INTEGER) DESC
  `;
  
  console.log('📊 Ejecutando consulta con ordenamiento: fecha DESC, factura DESC, comanda DESC');
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener detalle de cortes:", err.message);
      return res.status(500).json({ mensaje: "Error al obtener detalle de cortes" });
    }
    
    console.log(`✅ ${rows.length} registros obtenidos y ordenados correctamente`);
    
    // Log de verificación del ordenamiento (primeros 5 registros)
    if (rows.length > 0) {
      console.log('🔍 Verificación del ordenamiento (primeros 5 registros):');
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. Fecha: ${row.fecha}, Factura: ${row.factura}, Comanda: ${row.comanda}, Empleado: ${row.empleado}`);
      });
      
      // Verificar que está correctamente ordenado
      const primeraFecha = rows[0].fecha;
      const ultimaFecha = rows[rows.length - 1].fecha;
      console.log(`📅 Rango de fechas: ${ultimaFecha} (más antigua) -> ${primeraFecha} (más reciente)`);
    }
    
    res.json(rows);
  });
});

app.get('/api/detalle_productos', (req, res) => {
  console.log('🔍 === CONSULTA DETALLE DE PRODUCTOS CON ORDENAMIENTO CORREGIDO ===');
  
  // Consulta SQL con ordenamiento correcto para fechas en formato DD/MM/YYYY
  const sql = `
    SELECT 
      id,
      fecha,
      factura,
      comanda,
      empleado,
      nombre,
      cantidad,
      total,
      comision,
      codigo
    FROM detalle_productos 
    ORDER BY 
      -- 1. Ordenar por fecha (más reciente primero)
      -- Convertir DD/MM/YYYY a formato comparable (YYYY-MM-DD)
      substr(fecha, 7, 4) DESC,  -- Año (descendente)
      substr(fecha, 4, 2) DESC,  -- Mes (descendente)  
      substr(fecha, 1, 2) DESC,  -- Día (descendente)
      
      -- 2. Luego por número de factura (descendente - más alta primero)
      CAST(factura AS INTEGER) DESC,
      
      -- 3. Finalmente por número de comanda (descendente - más alta primero)
      CAST(comanda AS INTEGER) DESC
  `;
  
  console.log('📊 Ejecutando consulta con ordenamiento: fecha DESC, factura DESC, comanda DESC');
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener detalle de productos:", err.message);
      return res.status(500).json({ mensaje: "Error al obtener detalle de productos" });
    }
    
    console.log(`✅ ${rows.length} registros obtenidos y ordenados correctamente`);
    
    // Log de verificación del ordenamiento (primeros 5 registros)
    if (rows.length > 0) {
      console.log('🔍 Verificación del ordenamiento (primeros 5 registros):');
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. Fecha: ${row.fecha}, Factura: ${row.factura}, Comanda: ${row.comanda}, Empleado: ${row.empleado}`);
      });
      
      // Verificar que está correctamente ordenado
      const primeraFecha = rows[0].fecha;
      const ultimaFecha = rows[rows.length - 1].fecha;
      console.log(`📅 Rango de fechas: ${ultimaFecha} (más antigua) -> ${primeraFecha} (más reciente)`);
    }
    
    res.json(rows);
  });
});  


  // 🚀 Tabla de citas creada automáticamente por el sistema de migración
  
  // 🚀 Obtener todas las citas
  app.get('/api/citas', (req, res) => {
    db.all("SELECT * FROM citas ORDER BY start ASC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener citas" });
      
      // Procesar citas para asegurar que el título incluya el empleado
      const citasProcesadas = rows.map(cita => {
        // Si tiene empleado_nombre guardado, reconstruir el título
        if (cita.empleado_nombre && cita.cliente_nombre && cita.servicio_nombre) {
          let nuevoTitle = `${cita.cliente_nombre} - ${cita.servicio_nombre} - ${cita.empleado_nombre}`;
          if (cita.telefono) {
            nuevoTitle += ` (${cita.telefono})`;
          }
          return {
            ...cita,
            title: nuevoTitle
          };
        }
        
        // Si no tiene empleado_nombre (citas viejas), usar título original
        return cita;
      });
      
      res.json(citasProcesadas);
    });
  });
  
  // 🚀 Crear nueva cita
  app.post('/api/citas', (req, res) => {
    const { 
      title, 
      start, 
      cliente_nombre, 
      cliente_id, 
      servicio_nombre, 
      empleado_nombre, 
      empleado_id, 
      telefono 
    } = req.body;
    
    db.run(`INSERT INTO citas (title, start, cliente_nombre, cliente_id, servicio_nombre, empleado_nombre, empleado_id, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, start, cliente_nombre, cliente_id || null, servicio_nombre, empleado_nombre, empleado_id || null, telefono || null],
      function (err) {
        if (err) {
          console.error('Error al registrar cita:', err);
          return res.status(500).json({ mensaje: "Error al registrar cita" });
        }
        res.status(201).json({ id: this.lastID, mensaje: "Cita registrada exitosamente" });
      }
    );
  });
  
  // 🚀 Actualizar una cita
  app.put('/api/citas/:id', (req, res) => {
    const id = req.params.id;
    const { title, start } = req.body;
    db.run(`UPDATE citas SET title = ?, start = ? WHERE id = ?`,
      [title, start, id],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al actualizar cita" });
        res.json({ mensaje: "Cita actualizada correctamente" });
      }
    );
  });
  
  // 🚀 Eliminar una cita
  app.delete('/api/citas/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM citas WHERE id = ?`,
      [id],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al eliminar cita" });
        res.json({ mensaje: "Cita eliminada correctamente" });
      }
    );
  });
  

// Usuario administrador creado automáticamente por el sistema de migración


// MÓDULO DE NÓMINA ELIMINADO

// ========================================
// ENDPOINTS PARA MÓDULO DE SALARIOS MEJORADO
// ========================================

// Tablas creadas automáticamente por el sistema de migración

// Endpoint principal de salarios nuevo (limpio)
app.get('/api/salarios-nuevo', async (req, res) => {
  const { desde, hasta, empleado } = req.query;
  console.log('💼 === CALCULANDO SALARIOS CON SISTEMA MEJORADO ===');
  
  if (!desde || !hasta) {
    return res.status(400).json({ mensaje: "Las fechas son obligatorias" });
  }

  try {
    // Obtener todos los empleados
    const empleados = await new Promise((resolve, reject) => {
      db.all("SELECT dui, nombre, cargo, salario FROM empleados ORDER BY nombre", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log(`👥 ${empleados.length} empleados encontrados`);

    // Procesar cada empleado
    const resultados = [];
    
    for (const emp of empleados) {
      // Si hay filtro de empleado específico
      if (empleado && emp.dui !== empleado) continue;
      
      const datosEmpleado = await calcularSalarioNuevo(emp, desde, hasta);
      resultados.push(datosEmpleado);
    }

    console.log(`✅ ${resultados.length} salarios calculados`);
    
    res.json({
      success: true,
      salarios: resultados,
      periodo: { desde, hasta },
      total_empleados: resultados.length
    });

  } catch (error) {
    console.error('❌ Error al calcular salarios mejorado:', error);
    res.status(500).json({ mensaje: `Error interno: ${error.message}` });
  }
});

// Función para calcular salario individual nuevo (limpio)
async function calcularSalarioNuevo(empleado, fechaDesde, fechaHasta) {
  console.log(`🧮 === INICIANDO CÁLCULO PARA ${empleado.nombre} (${empleado.dui}) ===`);
  console.log(`📅 Período: ${fechaDesde} a ${fechaHasta}`);
  
  const dui = empleado.dui;
  const salarioMensual = parseFloat(empleado.salario || 0);
  const diasDelMes = 30; // Días fijos para cálculo mensual
  
  // Convertir fechas si vienen en formato ISO
  let fechaDesdeDD = fechaDesde;
  let fechaHastaDD = fechaHasta;
  
  if (fechaDesde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = fechaDesde.split('-');
    fechaDesdeDD = `${dia}/${mes}/${anio}`;
  }
  
  if (fechaHasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = fechaHasta.split('-');
    fechaHastaDD = `${dia}/${mes}/${anio}`;
  }

  // 1. Calcular días del período (usar función de cálculo de días corregida)
  const diasTrabajados = calcularDiasEntreFechas(fechaDesde, fechaHasta);

  // 2. Calcular salario proporcional (SIEMPRE mensual completo según tu requerimiento)
  const salarioProporcional = salarioMensual; // Pago completo mensual independiente de días

  // 3. Calcular comisiones de servicios
  const comisionServicios = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COALESCE(SUM(comision), 0) as total_comision,
        COALESCE(SUM(cantidad), 0) as total_cantidad
      FROM detalle_cortes 
      WHERE empleado = ? AND (
        substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
        BETWEEN 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
        AND 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
      )
    `;
    
    // LOG TEMPORAL PARA DEPURACIÓN
    console.log('🔍 === DEPURACIÓN CORTES ===');
    console.log('Empleado:', empleado.nombre);
    console.log('Fecha desde (DD):', fechaDesdeDD);
    console.log('Fecha hasta (DD):', fechaHastaDD);
    console.log('SQL:', sql);
    
    db.get(sql, [empleado.nombre, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err, row) => {
      if (err) reject(err);
      else {
        console.log('📊 Resultado cortes:', row);
        console.log('Total comisión:', row ? row.total_comision : 0);
        console.log('Total cantidad:', row ? row.total_cantidad : 0);
        console.log('🔍 === FIN DEPURACIÓN CORTES ===');
        
        // CONSULTA ADICIONAL PARA VER REGISTROS INDIVIDUALES
        const sqlDetalle = `
          SELECT fecha, cantidad, comision, empleado 
          FROM detalle_cortes 
          WHERE empleado = ? AND (
            substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
            BETWEEN 
            substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
            AND 
            substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
          )
          LIMIT 10
        `;
        db.all(sqlDetalle, [empleado.nombre, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err2, rows) => {
          if (!err2 && rows) {
            console.log('📋 Primeros 10 registros de cortes:');
            rows.forEach((record, index) => {
              console.log(`${index + 1}. Fecha: ${record.fecha}, Cantidad: ${record.cantidad}, Comisión: ${record.comision}, Empleado: ${record.empleado}`);
            });
          }
        });
        
        resolve({
          total: parseFloat(row ? row.total_comision : 0),
          cantidad: parseInt(row ? row.total_cantidad : 0)
        });
      }
    });
  });

  // 4. Calcular comisiones de productos
  const comisionProductos = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COALESCE(SUM(comision), 0) as total_comision,
        COALESCE(SUM(cantidad), 0) as total_cantidad
      FROM detalle_productos 
      WHERE empleado = ? AND (
        substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
        BETWEEN 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
        AND 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
      )
    `;
    db.get(sql, [empleado.nombre, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err, row) => {
      if (err) reject(err);
      else resolve({
        total: parseFloat(row ? row.total_comision : 0),
        cantidad: parseInt(row ? row.total_cantidad : 0)
      });
    });
  });

  // 5. Calcular horas extras (usa formato ISO)
  const horasExtras = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COALESCE(SUM(total), 0) as total_pago,
        COALESCE(SUM(horas), 0) as total_horas
      FROM horas_extras 
      WHERE dui = ? AND fecha BETWEEN ? AND ?
    `;
    db.get(sql, [dui, fechaDesde, fechaHasta], (err, row) => {
      if (err) reject(err);
      else resolve({
        total: parseFloat(row ? row.total_pago : 0),
        horas: parseFloat(row ? row.total_horas : 0)
      });
    });
  });

  // 6. Calcular días dobles (usa formato ISO)
  const diasDobles = await new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) as cantidad_dias
      FROM dias_dobles 
      WHERE dui = ? AND fecha BETWEEN ? AND ?
    `;
    db.get(sql, [dui, fechaDesde, fechaHasta], (err, row) => {
      if (err) reject(err);
      else {
        const cantidadDias = parseInt(row ? row.cantidad_dias : 0);
        const pagoDiario = salarioMensual / 30; // Salario diario
        const totalDiasDobles = cantidadDias * pagoDiario;
        resolve({
          total: totalDiasDobles,
          cantidad: cantidadDias
        });
      }
    });
  });

  // 7. Calcular descuentos
  const descuentos = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COALESCE(SUM(monto), 0) as total_descuentos,
        GROUP_CONCAT(motivo, '; ') as conceptos
      FROM descuentos 
      WHERE dui = ? AND (
        substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
        BETWEEN 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
        AND 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
      )
    `;
    db.get(sql, [dui, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err, row) => {
      if (err) reject(err);
      else resolve({
        total: parseFloat(row ? row.total_descuentos : 0),
        conceptos: row ? row.conceptos : null
      });
    });
  });

  // 8. Obtener desglose detallado de cortes
  const desgloseCortes = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COUNT(*) as total_cortes,
        SUM(CASE WHEN comision > 0 THEN 1 ELSE 0 END) as cortes_con_comision,
        SUM(CASE WHEN comision = 0 THEN 1 ELSE 0 END) as cortes_sin_comision,
        COALESCE(SUM(CASE WHEN comision > 0 THEN comision ELSE 0 END), 0) as total_comision_cortes
      FROM detalle_cortes 
      WHERE empleado = ? AND (
        substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
        BETWEEN 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
        AND 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
      )
    `;
    db.get(sql, [empleado.nombre, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err, row) => {
      if (err) reject(err);
      else resolve({
        total_cortes: parseInt(row ? row.total_cortes : 0),
        cortes_con_comision: parseInt(row ? row.cortes_con_comision : 0),
        cortes_sin_comision: parseInt(row ? row.cortes_sin_comision : 0),
        total_comision_cortes: parseFloat(row ? row.total_comision_cortes : 0)
      });
    });
  });

  // 9. Obtener desglose detallado de productos
  const desgloseProductos = await new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COUNT(*) as total_productos,
        SUM(CASE WHEN comision > 0 THEN 1 ELSE 0 END) as productos_con_comision,
        SUM(CASE WHEN comision = 0 THEN 1 ELSE 0 END) as productos_sin_comision,
        COALESCE(SUM(CASE WHEN comision > 0 THEN comision ELSE 0 END), 0) as total_comision_productos
      FROM detalle_productos 
      WHERE empleado = ? AND (
        substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
        BETWEEN 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
        AND 
        substr(?, 7, 4) || '-' || substr(?, 4, 2) || '-' || substr(?, 1, 2)
      )
    `;
    db.get(sql, [empleado.nombre, fechaDesdeDD, fechaDesdeDD, fechaDesdeDD, fechaHastaDD, fechaHastaDD, fechaHastaDD], (err, row) => {
      if (err) reject(err);
      else resolve({
        total_productos: parseInt(row ? row.total_productos : 0),
        productos_con_comision: parseInt(row ? row.productos_con_comision : 0),
        productos_sin_comision: parseInt(row ? row.productos_sin_comision : 0),
        total_comision_productos: parseFloat(row ? row.total_comision_productos : 0)
      });
    });
  });

  // 10. Calcular total neto
  const totalBruto = salarioProporcional + comisionServicios.total + comisionProductos.total + horasExtras.total + diasDobles.total;
  const totalNeto = totalBruto - descuentos.total;

  return {
    dui: dui,
    nombre: empleado.nombre,
    cargo: empleado.cargo,
    salario_base: salarioMensual,
    dias_trabajados: diasTrabajados,
    salario_proporcional: salarioProporcional, // Siempre completo
    comision_servicios: comisionServicios.total,
    cantidad_servicios: comisionServicios.cantidad,
    comision_productos: comisionProductos.total,
    cantidad_productos: comisionProductos.cantidad,
    total_horas_extras: horasExtras.total,
    total_horas: horasExtras.horas,
    total_dias_dobles: diasDobles.total,
    cantidad_dias_dobles: diasDobles.cantidad,
    total_descuentos: descuentos.total,
    conceptos_descuentos: descuentos.conceptos,
    // Desglose detallado de cortes
    desglose_cortes: desgloseCortes,
    // Desglose detallado de productos  
    desglose_productos: desgloseProductos,
    total_bruto: totalBruto,
    total_neto: totalNeto
  };
}

// ===================================================
// ENDPOINT PARA GENERAR BOLETAS PDF
// ===================================================

app.post('/api/generar-boleta-pdf', async (req, res) => {
  console.log('📄 === GENERANDO BOLETA PDF ===');
  
  const { empleado, periodo } = req.body;
  
  if (!empleado || !periodo) {
    return res.status(400).json({ mensaje: "Datos del empleado y período son obligatorios" });
  }

  try {
    // Calcular datos completos del empleado incluyendo horas extras y días dobles
    const datosCompletos = await calcularSalarioNuevo(empleado, periodo.desde, periodo.hasta);
    
    // USAR LA PLANTILLA HTML EXTERNA
    const path = require('path');
    const fs = require('fs');
    const { chromium } = require('playwright');

    const plantillaPath = path.join(__dirname, 'salarios', 'plantilla-boleta-profesional.html');
    
    if (!fs.existsSync(plantillaPath)) {
      return res.status(500).json({ mensaje: "Plantilla de boleta no encontrada." });
    }

    let htmlTemplate = fs.readFileSync(plantillaPath, 'utf8');

    // Formatear fechas para mostrar
    const fechaDesdeFormateada = convertirFechaISOaCentroamericana(periodo.desde);
    const fechaHastaFormateada = convertirFechaISOaCentroamericana(periodo.hasta);
    
    // Usar los datos calculados por calcularSalarioNuevo
    const fechaGeneracion = new Date().toLocaleDateString('es-ES');
    
    const variables = {
      // Datos básicos del empleado
      '{{nombre}}': datosCompletos.nombre || '',
      '{{dui}}': datosCompletos.dui || '',
      '{{cargo}}': empleado.cargo || '',
      '{{dias}}': datosCompletos.dias_trabajados.toString(),
      '{{desde}}': fechaDesdeFormateada,
      '{{hasta}}': fechaHastaFormateada,
      '{{fecha_generacion}}': fechaGeneracion,
      
      // Salarios
      '{{salario_base}}': parseFloat(empleado.salario || 0).toFixed(2),
      '{{salario_proporcional}}': datosCompletos.salario_proporcional.toFixed(2),
      
      // Cortes - datos básicos (compatibilidad)
      '{{cantidad_cortes}}': datosCompletos.cantidad_servicios.toString(),
      '{{comision_cortes}}': datosCompletos.comision_servicios.toFixed(2),
      
      // Cortes - desglose detallado
      '{{total_cortes}}': datosCompletos.desglose_cortes.total_cortes.toString(),
      '{{cortes_con_comision}}': datosCompletos.desglose_cortes.cortes_con_comision.toString(),
      '{{cortes_sin_comision}}': datosCompletos.desglose_cortes.cortes_sin_comision.toString(),
      
      // Productos - datos básicos (compatibilidad)
      '{{cantidad_productos}}': datosCompletos.cantidad_productos.toString(),
      '{{comision_productos}}': datosCompletos.comision_productos.toFixed(2),
      
      // Productos - desglose detallado
      '{{total_productos}}': datosCompletos.desglose_productos.total_productos.toString(),
      '{{productos_con_comision}}': datosCompletos.desglose_productos.productos_con_comision.toString(),
      '{{productos_sin_comision}}': datosCompletos.desglose_productos.productos_sin_comision.toString(),
      
      // Horas extras y días dobles
      '{{cantidad_horas}}': datosCompletos.total_horas ? datosCompletos.total_horas.toFixed(1) : '0.0',
      '{{total_horas_extras}}': datosCompletos.total_horas_extras.toFixed(2),
      '{{cantidad_dias_dobles}}': datosCompletos.cantidad_dias_dobles.toString(),
      '{{total_dias_dobles}}': datosCompletos.total_dias_dobles.toFixed(2),
      
      // Descuentos y total
      '{{total_descuentos}}': datosCompletos.total_descuentos.toFixed(2),
      '{{total_pago}}': datosCompletos.total_neto.toFixed(2)
    };

    // Reemplazar todas las variables
    for (const [variable, valor] of Object.entries(variables)) {
      htmlTemplate = htmlTemplate.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), valor);
    }

    console.log('✅ Variables reemplazadas en plantilla');

    // Generar PDF
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle' });
    
    const pdfBuffer = await page.pdf({
      format: 'letter', // Tamaño carta como la plantilla
      margin: {
        top: '6mm',
        bottom: '6mm', 
        left: '6mm',
        right: '6mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    await browser.close();

    // Guardar PDF en carpeta boletas
    const boletasDir = path.join(__dirname, 'boletas');
    if (!fs.existsSync(boletasDir)) {
      fs.mkdirSync(boletasDir, { recursive: true });
    }

    const nombreEmpleado = empleado.nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const fechaDesdeArchivo = fechaDesdeFormateada.replace(/\//g, '-');
    const fechaHastaArchivo = fechaHastaFormateada.replace(/\//g, '-');
    const nombreArchivo = `Boleta_${nombreEmpleado}_${fechaDesdeArchivo}_a_${fechaHastaArchivo}.pdf`;
    const outputPath = path.join(boletasDir, nombreArchivo);

    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log('✅ PDF guardado en:', outputPath);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    console.log('✅ Boleta PDF generada exitosamente usando plantilla');

  } catch (error) {
    console.error('❌ Error generando boleta PDF:', error);
    res.status(500).json({ mensaje: `Error generando PDF: ${error.message}` });
  }
});

// FUNCIÓN ELIMINADA: generarHTMLBoleta - Ahora se usa plantilla-boleta-profesional.html

/* CÓDIGO HTML ELIMINADO - SE USA PLANTILLA EXTERNA
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boleta de Pago</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          background: #f8f9fa;
          color: #333;
          line-height: 1.4;
        }
        
        .boleta-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1a1a1a, #2c3e50);
          color: white;
          padding: 25px 40px;
          position: relative;
          border-bottom: 3px solid #9fd81a;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #9fd81a, #27ae60);
        }
        
        .header-content {
          display: grid;
          grid-template-columns: 120px 1fr auto;
          gap: 25px;
          align-items: center;
        }
        
        .logo-section {
          text-align: center;
        }
        
        .company-logo {
          max-width: 100px;
          max-height: 100px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          border: 2px solid #9fd81a;
        }
        
        .company-info {
          text-align: left;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 8px;
          color: #9fd81a;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .company-subtitle {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 12px;
          font-style: italic;
        }
        
        .company-address {
          font-size: 12px;
          line-height: 1.4;
          opacity: 0.8;
          color: #ecf0f1;
        }
        
        .document-info {
          text-align: right;
        }
        
        .boleta-title {
          font-size: 20px;
          font-weight: bold;
          color: #9fd81a;
          margin-bottom: 10px;
          padding: 10px 15px;
          background: rgba(159, 216, 26, 0.1);
          border-radius: 8px;
          border: 1px solid #9fd81a;
        }
        
        .periodo-info {
          font-size: 12px;
          opacity: 0.8;
          line-height: 1.4;
        }
        
        .content {
          padding: 40px;
        }
        
        .empleado-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
          border-left: 4px solid #9fd81a;
        }
        
        .empleado-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .empleado-row:last-child {
          margin-bottom: 0;
        }
        
        .label {
          font-weight: bold;
          color: #2c3e50;
          min-width: 120px;
        }
        
        .value {
          color: #34495e;
          flex: 1;
          text-align: right;
        }
        
        .detalle-section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #9fd81a;
        }
        
        .detalle-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .detalle-table th {
          background: #34495e;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: bold;
          font-size: 14px;
        }
        
        .detalle-table td {
          padding: 15px;
          border-bottom: 1px solid #ecf0f1;
          font-size: 14px;
        }
        
        .detalle-table tr:nth-child(even) td {
          background: #f8f9fa;
        }
        
        .amount {
          text-align: right;
          font-weight: bold;
        }
        
        .amount.positive {
          color: #27ae60;
        }
        
        .amount.negative {
          color: #e74c3c;
        }
        
        .total-section {
          background: linear-gradient(135deg, #2c3e50, #34495e);
          color: white;
          padding: 25px;
          border-radius: 8px;
          margin-top: 30px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .total-row:last-child {
          margin-bottom: 0;
          font-size: 20px;
          font-weight: bold;
          border-top: 2px solid #9fd81a;
          padding-top: 15px;
          margin-top: 15px;
        }
        
        .total-neto {
          color: #9fd81a;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #ecf0f1;
          text-align: center;
          color: #7f8c8d;
          font-size: 12px;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin: 40px 0 20px 0;
        }
        
        .signature-box {
          text-align: center;
          width: 200px;
        }
        
        .signature-line {
          border-top: 2px solid #34495e;
          margin-bottom: 10px;
          padding-top: 10px;
        }
        
        .signature-label {
          font-size: 12px;
          color: #7f8c8d;
          font-weight: bold;
        }
        
        @media print {
          body {
            background: white;
          }
          
          .boleta-container {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="boleta-container">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="logo-section">
              <img src="/imagenes/logo.png" alt="Logo Barbería" class="company-logo">
            </div>
            <div class="company-info">
              <div class="company-name">BARBERÍA BARBA NEGRA</div>
              <div class="company-subtitle">Sistema de Gestión Integral</div>
              <div class="company-address">
                Dirección: Calle Principal #123, Ciudad<br>
                Teléfono: (503) 1234-5678 | Email: info@barbanegra.com
              </div>
            </div>
            <div class="document-info">
              <div class="boleta-title">BOLETA DE PAGO</div>
              <div class="periodo-info">
                Período: ${periodo.desde} al ${periodo.hasta}<br>
                Generada: ${fechaActual}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Información del Empleado -->
          <div class="empleado-info">
            <div class="empleado-row">
              <span class="label">DUI:</span>
              <span class="value">${empleado.dui}</span>
            </div>
            <div class="empleado-row">
              <span class="label">Empleado:</span>
              <span class="value">${empleado.nombre}</span>
            </div>
            <div class="empleado-row">
              <span class="label">Cargo:</span>
              <span class="value">${empleado.cargo || 'N/A'}</span>
            </div>
            <div class="empleado-row">
              <span class="label">Días Trabajados:</span>
              <span class="value">${empleado.dias_trabajados || 0} días</span>
            </div>
          </div>
          
          <!-- Detalle de Conceptos -->
          <div class="detalle-section">
            <div class="section-title">DETALLE DE CONCEPTOS</div>
            <table class="detalle-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Salario Base</td>
                  <td>Salario mensual fijo</td>
                  <td class="amount positive">$${salarioBase.toFixed(2)}</td>
                </tr>
                ${comisionCortes > 0 ? `
                <tr>
                  <td>Comisión Cortes</td>
                  <td>Comisiones por servicios de corte</td>
                  <td class="amount positive">$${comisionCortes.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${comisionProductos > 0 ? `
                <tr>
                  <td>Comisión Productos</td>
                  <td>Comisiones por venta de productos</td>
                  <td class="amount positive">$${comisionProductos.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${horasExtras > 0 ? `
                <tr>
                  <td>Horas Extras</td>
                  <td>Pago por horas adicionales trabajadas</td>
                  <td class="amount positive">$${horasExtras.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${diasDobles > 0 ? `
                <tr>
                  <td>Días Dobles</td>
                  <td>Pago por trabajo en días festivos</td>
                  <td class="amount positive">$${diasDobles.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${descuentos > 0 ? `
                <tr>
                  <td>Descuentos</td>
                  <td>${empleado.conceptos_descuentos || 'Varios conceptos'}</td>
                  <td class="amount negative">-$${descuentos.toFixed(2)}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <!-- Totales -->
          <div class="total-section">
            <div class="total-row">
              <span>Total Bruto:</span>
              <span>$${totalBruto.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Descuentos:</span>
              <span>-$${descuentos.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span class="total-neto">TOTAL NETO A PAGAR:</span>
              <span class="total-neto">$${totalNeto.toFixed(2)}</span>
            </div>
          </div>
          
          <!-- Firmas -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">FIRMA DEL EMPLEADO</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">FIRMA DEL EMPLEADOR</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>Esta boleta es un comprobante oficial de pago generado automáticamente por el sistema.</p>
            <p>Para cualquier consulta, contacte al departamento de recursos humanos.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
FUNCIÓN COMENTADA COMPLETA */

// Endpoint para registrar horas extras
app.post('/api/horas-extras', (req, res) => {
  const { dui, fecha, horas, pago_hora, total } = req.body;
  
  if (!dui || !fecha || !horas || !pago_hora) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  const sql = `INSERT INTO horas_extras (dui, fecha, horas, pago_hora, total) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [dui, fecha, horas, pago_hora, total], function(err) {
    if (err) {
      console.error('Error al registrar horas extras:', err);
      return res.status(500).json({ mensaje: "Error al registrar horas extras" });
    }
    
    console.log(`✅ Horas extras registradas: ${horas}h para ${dui}`);
    res.json({ 
      mensaje: "Horas extras registradas correctamente", 
      id: this.lastID,
      total_calculado: total
    });
  });
});

// Endpoint para obtener horas extras
app.get('/api/horas-extras', (req, res) => {
  console.log('📋 Obteniendo horas extras...');
  
  // Verificar si la tabla existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='horas_extras'", [], (err, table) => {
    if (err) {
      console.error('❌ Error verificando tabla horas_extras:', err.message);
      return res.status(500).json({ mensaje: "Error verificando base de datos" });
    }
    
    if (!table) {
      console.log('⚠️ Tabla horas_extras no existe, retornando array vacío');
      return res.json([]);
    }
    
    const sql = `
      SELECT h.*, e.nombre as nombre_empleado 
      FROM horas_extras h
      LEFT JOIN empleados e ON h.dui = e.dui
      ORDER BY h.fecha DESC, h.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('❌ Error al obtener horas extras:', err.message);
        return res.status(500).json({ mensaje: "Error al obtener horas extras" });
      }
      
      console.log(`✅ ${rows.length} registros de horas extras obtenidos`);
      res.json(rows || []);
    });
  });
});

// Endpoint para eliminar horas extras
app.delete('/api/horas-extras/:id', (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Eliminando horas extras ID:', id);
  
  db.run("DELETE FROM horas_extras WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('❌ Error al eliminar horas extras:', err.message);
      return res.status(500).json({ mensaje: "Error al eliminar horas extras" });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }
    
    console.log('✅ Horas extras eliminadas exitosamente');
    res.json({ mensaje: "Horas extras eliminadas correctamente" });
  });
});

// Endpoint para registrar días dobles
app.post('/api/dias-dobles', (req, res) => {
  const { dui, fecha, motivo } = req.body;
  
  if (!dui || !fecha || !motivo) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  // Verificar que el empleado existe
  db.get("SELECT salario FROM empleados WHERE dui = ?", [dui], (err, empleado) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error al verificar empleado" });
    }
    
    if (!empleado) {
      return res.status(404).json({ mensaje: "Empleado no encontrado" });
    }

    const sql = `INSERT INTO dias_dobles (dui, fecha, motivo) VALUES (?, ?, ?)`;
    
    db.run(sql, [dui, fecha, motivo], function(err) {
      if (err) {
        console.error('Error al registrar día doble:', err);
        return res.status(500).json({ mensaje: "Error al registrar día doble" });
      }
      
      const pagoDiario = parseFloat(empleado.salario || 0) / 30;
      console.log(`✅ Día doble registrado para ${dui}: $${pagoDiario.toFixed(2)}`);
      
      res.json({ 
        mensaje: "Día doble registrado correctamente", 
        id: this.lastID,
        pago_adicional: pagoDiario.toFixed(2)
      });
    });
  });
});

// Endpoint para obtener días dobles
app.get('/api/dias-dobles', (req, res) => {
  console.log('📋 Obteniendo días dobles...');
  
  // Verificar si la tabla existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='dias_dobles'", [], (err, table) => {
    if (err) {
      console.error('❌ Error verificando tabla dias_dobles:', err.message);
      return res.status(500).json({ mensaje: "Error verificando base de datos" });
    }
    
    if (!table) {
      console.log('⚠️ Tabla dias_dobles no existe, retornando array vacío');
      return res.json([]);
    }
    
    const sql = `
      SELECT d.*, e.nombre as nombre_empleado, e.salario,
             ROUND(e.salario / 30.0, 2) as pago_dia
      FROM dias_dobles d
      LEFT JOIN empleados e ON d.dui = e.dui
      ORDER BY d.fecha DESC, d.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('❌ Error al obtener días dobles:', err.message);
        return res.status(500).json({ mensaje: "Error al obtener días dobles" });
      }
      
      console.log(`✅ ${rows.length} registros de días dobles obtenidos`);
      res.json(rows || []);
    });
  });
});

// Endpoint para eliminar días dobles
app.delete('/api/dias-dobles/:id', (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Eliminando día doble ID:', id);
  
  db.run("DELETE FROM dias_dobles WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('❌ Error al eliminar día doble:', err.message);
      return res.status(500).json({ mensaje: "Error al eliminar día doble" });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }
    
    console.log('✅ Día doble eliminado exitosamente');
    res.json({ mensaje: "Día doble eliminado correctamente" });
  });
});

// Endpoint para obtener descuentos (módulo de salarios)
app.get('/api/descuentos', (req, res) => {
  console.log('📋 Obteniendo descuentos para módulo de salarios...');
  
  // Primero verificar si la tabla existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='descuentos'", [], (err, table) => {
    if (err) {
      console.error('❌ Error verificando tabla descuentos:', err.message);
      return res.status(500).json({ mensaje: "Error verificando base de datos" });
    }
    
    if (!table) {
      console.log('⚠️ Tabla descuentos no existe, retornando array vacío');
      return res.json([]);
    }
    
    const sql = `
      SELECT d.*, e.nombre as nombre_empleado 
      FROM descuentos d
      LEFT JOIN empleados e ON d.dui = e.dui
      ORDER BY d.fecha DESC, d.id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('❌ Error al obtener descuentos:', err.message);
        return res.status(500).json({ mensaje: "Error al obtener descuentos" });
      }
      
      console.log(`✅ ${rows.length} registros de descuentos obtenidos`);
      res.json(rows || []);
    });
  });
});

// Endpoint para verificar datos del sistema
app.get('/api/verificar-salarios', (req, res) => {
  console.log('🔍 Verificando datos del sistema de salarios...');
  
  Promise.all([
    // Total empleados
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM empleados", [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    
    // Empleados con salario
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM empleados WHERE salario > 0", [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    
    // Empleados sin salario
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM empleados WHERE salario IS NULL OR salario = 0", [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    
    // Total horas extras registradas
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM horas_extras", [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    
    // Total días dobles registrados
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM dias_dobles", [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    })
  ]).then(([totalEmpleados, empleadosConSalario, empleadosSinSalario, totalHorasExtras, totalDiasDobles]) => {
    
    const verificacion = {
      total_empleados: totalEmpleados,
      empleados_con_salario: empleadosConSalario,
      empleados_sin_salario: empleadosSinSalario,
      comisiones_activas: true, // El sistema siempre tiene comisiones
      descuentos_activos: true, // El sistema siempre tiene descuentos
      total_horas_extras: totalHorasExtras,
      total_dias_dobles: totalDiasDobles,
      sistema_salario_mensual: true // Característica principal
    };
    
    console.log('✅ Verificación completada:', verificacion);
    res.json(verificacion);
    
  }).catch(error => {
    console.error('❌ Error en verificación:', error);
    res.status(500).json({ mensaje: `Error en verificación: ${error.message}` });
  });
});

// ========================================
// REEMPLAZAR COMPLETAMENTE EL ENDPOINT /api/salarios EN servergeneral.js
// El problema era que consultaba TODOS los registros en lugar de filtrar por fecha
// ========================================

app.get('/api/salarios', (req, res) => {
  const { desde, hasta, empleado } = req.query;

  console.log('💰 === CALCULANDO SALARIOS CON FILTROS EXACTOS ===');
  console.log('📅 Parámetros recibidos:', { desde, hasta, empleado });

  if (!desde || !hasta) {
    console.log('❌ Error: Fechas son obligatorias');
    return res.status(400).json({ 
      mensaje: "Las fechas desde y hasta son obligatorias" 
    });
  }

  // ========================================
  // CONVERSIÓN DE FECHAS ISO A FORMATO DD/MM/YYYY
  // (Igual que hace el frontend)
  // ========================================
  let desdeFormato = desde;
  let hastaFormato = hasta;

  if (desde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = desde.split('-');
    desdeFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  if (hasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = hasta.split('-');
    hastaFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  console.log('📅 Fechas convertidas para filtro:', { desdeFormato, hastaFormato });

  // ========================================
  // PASO 1: OBTENER TODOS LOS REGISTROS DE CORTES Y PRODUCTOS
  // (Como lo hacen los endpoints detalle_cortes y detalle_productos)
  // ========================================
  
  // Consulta para cortes (igual que /api/detalle_cortes)
  const sqlCortes = `
    SELECT 
      empleado,
      fecha,
      cantidad,
      comision
    FROM detalle_cortes 
    ORDER BY 
      substr(fecha, 7, 4) DESC,
      substr(fecha, 4, 2) DESC,
      substr(fecha, 1, 2) DESC
  `;
  
  // Consulta para productos (igual que /api/detalle_productos)
  const sqlProductos = `
    SELECT 
      empleado,
      fecha,
      cantidad,
      comision
    FROM detalle_productos 
    ORDER BY 
      substr(fecha, 7, 4) DESC,
      substr(fecha, 4, 2) DESC,
      substr(fecha, 1, 2) DESC
  `;
  
  // Consulta para empleados
  const sqlEmpleados = `SELECT dui, nombre, cargo, salario FROM empleados ORDER BY nombre`;
  
  // ========================================
  // EJECUTAR CONSULTAS EN PARALELO
  // ========================================
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(sqlCortes, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(sqlProductos, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(sqlEmpleados, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    })
  ]).then(([todosLosCortes, todosLosProductos, todosLosEmpleados]) => {
    
    console.log(`📊 Datos obtenidos:`);
    console.log(`   - Cortes totales: ${todosLosCortes.length}`);
    console.log(`   - Productos totales: ${todosLosProductos.length}`);
    console.log(`   - Empleados: ${todosLosEmpleados.length}`);
    
    // ========================================
    // PASO 2: APLICAR FILTROS DE FECHA (IGUAL QUE EL FRONTEND)
    // ========================================
    
    // Función para validar formato dd/mm/yyyy (copiada del frontend)
    function esFechaValida(fecha) {
      if (!fecha || typeof fecha !== 'string') return false;
      const patron = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!patron.test(fecha)) return false;
      const partes = fecha.split('/');
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const año = parseInt(partes[2], 10);
      return dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && año >= 1900 && año <= 2100;
    }
    
    // Función para comparar fechas (copiada del frontend)
    function compararFechas(fecha1, fecha2) {
      if (!esFechaValida(fecha1) || !esFechaValida(fecha2)) return 0;
      const [dia1, mes1, año1] = fecha1.split('/').map(Number);
      const [dia2, mes2, año2] = fecha2.split('/').map(Number);
      if (año1 !== año2) return año1 - año2;
      if (mes1 !== mes2) return mes1 - mes2;
      return dia1 - dia2;
    }
    
    // ========================================
    // FILTRAR CORTES POR FECHA (IGUAL QUE EL FRONTEND)
    // ========================================
    const cortesFiltrados = todosLosCortes.filter(corte => {
      let cumpleFecha = true;
      const fechaCorte = corte.fecha;
      
      if (desdeFormato && esFechaValida(desdeFormato)) {
        cumpleFecha = cumpleFecha && compararFechas(fechaCorte, desdeFormato) >= 0;
      }
      
      if (hastaFormato && esFechaValida(hastaFormato)) {
        cumpleFecha = cumpleFecha && compararFechas(fechaCorte, hastaFormato) <= 0;
      }
      
      return cumpleFecha;
    });
    
    // ========================================
    // FILTRAR PRODUCTOS POR FECHA (IGUAL QUE EL FRONTEND)
    // ========================================
    const productosFiltrados = todosLosProductos.filter(producto => {
      let cumpleFecha = true;
      const fechaProducto = producto.fecha;
      
      if (desdeFormato && esFechaValida(desdeFormato)) {
        cumpleFecha = cumpleFecha && compararFechas(fechaProducto, desdeFormato) >= 0;
      }
      
      if (hastaFormato && esFechaValida(hastaFormato)) {
        cumpleFecha = cumpleFecha && compararFechas(fechaProducto, hastaFormato) <= 0;
      }
      
      return cumpleFecha;
    });
    
    console.log(`📊 Después del filtro de fechas:`);
    console.log(`   - Cortes filtrados: ${cortesFiltrados.length}`);
    console.log(`   - Productos filtrados: ${productosFiltrados.length}`);
    
    // ========================================
    // PASO 3: AGRUPAR POR EMPLEADO Y CALCULAR TOTALES
    // ========================================
    
    // Agrupar cortes por empleado
    const cortesAgrupadosPorEmpleado = {};
    cortesFiltrados.forEach(corte => {
      const empleado = corte.empleado;
      if (!cortesAgrupadosPorEmpleado[empleado]) {
        cortesAgrupadosPorEmpleado[empleado] = {
          cantidad_cortes: 0,
          comision_cortes: 0
        };
      }
      cortesAgrupadosPorEmpleado[empleado].cantidad_cortes += parseInt(corte.cantidad) || 0;
      cortesAgrupadosPorEmpleado[empleado].comision_cortes += parseFloat(corte.comision) || 0;
    });
    
    // Agrupar productos por empleado
    const productosAgrupadosPorEmpleado = {};
    productosFiltrados.forEach(producto => {
      const empleado = producto.empleado;
      if (!productosAgrupadosPorEmpleado[empleado]) {
        productosAgrupadosPorEmpleado[empleado] = {
          cantidad_productos: 0,
          comision_productos: 0
        };
      }
      productosAgrupadosPorEmpleado[empleado].cantidad_productos += parseInt(producto.cantidad) || 0;
      productosAgrupadosPorEmpleado[empleado].comision_productos += parseFloat(producto.comision) || 0;
    });
    
    console.log('📊 Agrupación por empleado:');
    console.log('   Cortes:', cortesAgrupadosPorEmpleado);
    console.log('   Productos:', productosAgrupadosPorEmpleado);
    
    // ========================================
    // PASO 4: CALCULAR DÍAS TRABAJADOS
    // ========================================
    const dias = calcularDiasEntreFechas(desde, hasta);
    
    console.log(`📅 Días trabajados: ${dias}`);
    
    // ========================================
    // PASO 5: PROCESAR CADA EMPLEADO Y OBTENER DESCUENTOS
    // ========================================
    
    let empleadosProcesados = 0;
    const resultadoFinal = [];
    
    // Filtrar empleados si se especifica uno
    let empleadosAProcesar = todosLosEmpleados;
    if (empleado && empleado.trim() !== '') {
      empleadosAProcesar = todosLosEmpleados.filter(emp => emp.nombre === empleado.trim());
    }
    
    if (empleadosAProcesar.length === 0) {
      return res.json([]);
    }
    
    empleadosAProcesar.forEach((emp) => {
      console.log(`👤 Procesando empleado: ${emp.nombre}`);
      
      // Obtener datos agrupados para este empleado
      const datosCortes = cortesAgrupadosPorEmpleado[emp.nombre] || { cantidad_cortes: 0, comision_cortes: 0 };
      const datosProductos = productosAgrupadosPorEmpleado[emp.nombre] || { cantidad_productos: 0, comision_productos: 0 };
      
      console.log(`   📊 Datos calculados:`);
      console.log(`      - Cortes: ${datosCortes.cantidad_cortes} servicios = $${datosCortes.comision_cortes.toFixed(2)}`);
      console.log(`      - Productos: ${datosProductos.cantidad_productos} unidades = $${datosProductos.comision_productos.toFixed(2)}`);
      
      // Consultar descuentos del período
      const sqlDescuentos = `
        SELECT motivo, monto, fecha
        FROM descuentos
        WHERE dui = ? AND fecha >= ? AND fecha <= ?
        ORDER BY fecha ASC
      `;
      
      db.all(sqlDescuentos, [emp.dui, desdeFormato, hastaFormato], (err, descuentos) => {
        if (err) {
          console.error("❌ Error en descuentos:", err.message);
          empleadosProcesados++;
          checkIfComplete();
          return;
        }
        
        // Procesar descuentos
        let conceptosDescuentos = "Sin descuentos";
        let totalDescuentos = 0;
        
        if (descuentos && descuentos.length > 0) {
          totalDescuentos = descuentos.reduce((sum, desc) => sum + parseFloat(desc.monto || 0), 0);
          
          if (descuentos.length === 1) {
            conceptosDescuentos = descuentos[0].motivo;
          } else {
            conceptosDescuentos = descuentos.map((desc, index) => 
              `${index + 1}. ${desc.motivo} ($${desc.monto})`
            ).join('; ');
          }
        }
        
        // ========================================
        // CONSULTAR HORAS EXTRAS DEL PERÍODO (usa formato ISO)
        // ========================================
        const sqlHorasExtras = `
          SELECT 
            COALESCE(SUM(total), 0) as total_pago,
            COALESCE(SUM(horas), 0) as total_horas
          FROM horas_extras 
          WHERE dui = ? AND fecha >= ? AND fecha <= ?
        `;
        
        db.get(sqlHorasExtras, [emp.dui, desde, hasta], (err, horasExtras) => {
          if (err) {
            console.error("❌ Error en horas extras:", err.message);
            empleadosProcesados++;
            checkIfComplete();
            return;
          }
          
          console.log(`🔍 ${emp.nombre} - Horas extras query:`, { dui: emp.dui, desde, hasta });
          console.log(`🔍 ${emp.nombre} - Horas extras result:`, horasExtras);
          
          const totalHorasExtras = parseFloat(horasExtras ? horasExtras.total_pago : 0);
          const cantidadHoras = parseFloat(horasExtras ? horasExtras.total_horas : 0);
          
          console.log(`🔍 ${emp.nombre} - Parsed horas extras:`, { totalHorasExtras, cantidadHoras });
          
          // ========================================
          // CONSULTAR DÍAS DOBLES DEL PERÍODO (usa formato ISO)
          // ========================================
          const sqlDiasDobles = `
            SELECT COUNT(*) as cantidad_dias
            FROM dias_dobles 
            WHERE dui = ? AND fecha >= ? AND fecha <= ?
          `;
          
          db.get(sqlDiasDobles, [emp.dui, desde, hasta], (err, diasDobles) => {
            if (err) {
              console.error("❌ Error en días dobles:", err.message);
              empleadosProcesados++;
              checkIfComplete();
              return;
            }
            
            console.log(`🔍 ${emp.nombre} - Días dobles query:`, { dui: emp.dui, desde, hasta });
            console.log(`🔍 ${emp.nombre} - Días dobles result:`, diasDobles);
            
            const cantidadDiasDobles = parseInt(diasDobles ? diasDobles.cantidad_dias : 0);
            const pagoDiario = emp.salario / 30; // Salario diario
            const totalDiasDobles = cantidadDiasDobles * pagoDiario;
            
            console.log(`🔍 ${emp.nombre} - Parsed días dobles:`, { cantidadDiasDobles, pagoDiario, totalDiasDobles });
            
            // ========================================
            // CÁLCULOS FINALES
            // ========================================
            const salario_proporcional = (emp.salario / 30) * dias;
            const total_pago = salario_proporcional + datosCortes.comision_cortes + datosProductos.comision_productos + totalHorasExtras + totalDiasDobles - totalDescuentos;
        
            const empleadoResultado = {
              dui: emp.dui,
              nombre: emp.nombre,
              cargo: emp.cargo,
              salario_base: parseFloat(emp.salario).toFixed(2),
              dias: dias,
              salario_proporcional: salario_proporcional.toFixed(2),
              
              // ✅ ESTOS DATOS AHORA COINCIDIRÁN CON DETALLE_CORTES
              cantidad_cortes: datosCortes.cantidad_cortes,
              comision_cortes: datosCortes.comision_cortes.toFixed(2),
              
              // ✅ ESTOS DATOS AHORA COINCIDIRÁN CON DETALLE_PRODUCTOS
              cantidad_productos: datosProductos.cantidad_productos,
              comision_productos: datosProductos.comision_productos.toFixed(2),
              
              // ✅ HORAS EXTRAS
              total_horas_extras: totalHorasExtras.toFixed(2),
              cantidad_horas: cantidadHoras.toFixed(1),
              
              // ✅ DÍAS DOBLES
              total_dias_dobles: totalDiasDobles.toFixed(2),
              cantidad_dias_dobles: cantidadDiasDobles,
              
              total_descuentos: totalDescuentos.toFixed(2),
              conceptos_descuentos: conceptosDescuentos,
              total_pago: total_pago.toFixed(2)
            };
        
            console.log(`✅ ${emp.nombre} RESULTADO:`);
            console.log(`   📋 Cortes: ${empleadoResultado.cantidad_cortes} = $${empleadoResultado.comision_cortes}`);
            console.log(`   📦 Productos: ${empleadoResultado.cantidad_productos} = $${empleadoResultado.comision_productos}`);
            console.log(`   ⏰ Horas Extras: ${empleadoResultado.cantidad_horas}h = $${empleadoResultado.total_horas_extras}`);
            console.log(`   📅 Días Dobles: ${empleadoResultado.cantidad_dias_dobles} días = $${empleadoResultado.total_dias_dobles}`);
            console.log(`   💰 Total: $${empleadoResultado.total_pago}`);
            
            resultadoFinal.push(empleadoResultado);
            empleadosProcesados++;
            checkIfComplete();
          }); // Cierre de consulta días dobles
        }); // Cierre de consulta horas extras
      }); // Cierre de consulta descuentos
    });
    
    function checkIfComplete() {
      if (empleadosProcesados === empleadosAProcesar.length) {
        resultadoFinal.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('✅ === RESPUESTA FINAL ===');
        console.log(`📊 ${resultadoFinal.length} empleados procesados`);
        console.log(`📅 Período: ${desdeFormato} al ${hastaFormato} (${dias} días)`);
        
        res.json(resultadoFinal);
      }
    }
    
  }).catch(error => {
    console.error('❌ Error en consultas:', error);
    res.status(500).json({ mensaje: "Error interno al procesar salarios", detalle: error.message });
  });
});


// ========================================
// REEMPLAZAR COMPLETAMENTE EL ENDPOINT /api/boleta/:dui EN servergeneral.js
// Buscar la línea: app.get('/api/boleta/:dui', async (req, res) => {
// ========================================

app.get('/api/boleta/:dui', async (req, res) => {
  const { dui } = req.params;
  const { desde, hasta } = req.query;

  console.log('📄 === GENERANDO BOLETA CON FILTROS EXACTOS ===');
  console.log('👤 DUI:', dui);
  console.log('📅 Período:', desde, 'al', hasta);
  
  req.setTimeout(60000);
  
  if (!dui || !desde || !hasta) {
    return res.status(400).json({ 
      mensaje: "DUI, fecha desde y fecha hasta son obligatorios" 
    });
  }

  try {
    // ========================================
    // OBTENER DATOS DEL EMPLEADO
    // ========================================
    const empleado = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM empleados WHERE dui = ?", [dui], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!empleado) {
      return res.status(404).json({ mensaje: "Empleado no encontrado." });
    }

    console.log('✅ Empleado encontrado:', empleado.nombre);

    // ========================================
    // USAR LA FUNCIÓN CORREGIDA calcularSalarioNuevo
    // ========================================
    const datosCompletos = await calcularSalarioNuevo(empleado, desde, hasta);
    
    console.log('✅ Datos calculados:', {
      nombre: datosCompletos.nombre,
      dias: datosCompletos.dias_trabajados,
      horas_extras: datosCompletos.total_horas_extras,
      dias_dobles: datosCompletos.total_dias_dobles,
      total_neto: datosCompletos.total_neto
    });

    // ========================================
    // GENERAR BOLETA PDF CON DATOS CALCULADOS
    // ========================================
    
    // Usar la plantilla existente pero con datos correctos
    const path = require('path');
    const fs = require('fs');
    const { chromium } = require('playwright');

    const plantillaPath = path.join(__dirname, 'salarios', 'plantilla-boleta-profesional.html');
    
    if (!fs.existsSync(plantillaPath)) {
      return res.status(500).json({ mensaje: "Plantilla de boleta no encontrada." });
    }

    let htmlTemplate = fs.readFileSync(plantillaPath, 'utf8');

    // Formatear fechas para mostrar
    const fechaDesdeFormateada = convertirFechaISOaCentroamericana(desde);
    const fechaHastaFormateada = convertirFechaISOaCentroamericana(hasta);
    
    // Usar los datos calculados por calcularSalarioNuevo
    const fechaGeneracion = new Date().toLocaleDateString('es-ES');
    
    const variables = {
      // Datos básicos del empleado
      '{{nombre}}': datosCompletos.nombre || '',
      '{{dui}}': datosCompletos.dui || '',
      '{{cargo}}': empleado.cargo || '',
      '{{dias}}': datosCompletos.dias_trabajados.toString(),
      '{{desde}}': fechaDesdeFormateada,
      '{{hasta}}': fechaHastaFormateada,
      '{{fecha_generacion}}': fechaGeneracion,
      
      // Salarios
      '{{salario_base}}': parseFloat(empleado.salario || 0).toFixed(2),
      '{{salario_proporcional}}': datosCompletos.salario_proporcional.toFixed(2),
      
      // Cortes - datos básicos (compatibilidad)
      '{{cantidad_cortes}}': datosCompletos.cantidad_servicios.toString(),
      '{{comision_cortes}}': datosCompletos.comision_servicios.toFixed(2),
      
      // Cortes - desglose detallado
      '{{total_cortes}}': datosCompletos.desglose_cortes.total_cortes.toString(),
      '{{cortes_con_comision}}': datosCompletos.desglose_cortes.cortes_con_comision.toString(),
      '{{cortes_sin_comision}}': datosCompletos.desglose_cortes.cortes_sin_comision.toString(),
      
      // Productos - datos básicos (compatibilidad)
      '{{cantidad_productos}}': datosCompletos.cantidad_productos.toString(),
      '{{comision_productos}}': datosCompletos.comision_productos.toFixed(2),
      
      // Productos - desglose detallado
      '{{total_productos}}': datosCompletos.desglose_productos.total_productos.toString(),
      '{{productos_con_comision}}': datosCompletos.desglose_productos.productos_con_comision.toString(),
      '{{productos_sin_comision}}': datosCompletos.desglose_productos.productos_sin_comision.toString(),
      
      // Horas extras y días dobles
      '{{cantidad_horas}}': datosCompletos.total_horas ? datosCompletos.total_horas.toFixed(1) : '0.0',
      '{{total_horas_extras}}': datosCompletos.total_horas_extras.toFixed(2),
      '{{cantidad_dias_dobles}}': datosCompletos.cantidad_dias_dobles.toString(),
      '{{total_dias_dobles}}': datosCompletos.total_dias_dobles.toFixed(2),
      
      // Descuentos y total
      '{{total_descuentos}}': datosCompletos.total_descuentos.toFixed(2),
      '{{total_pago}}': datosCompletos.total_neto.toFixed(2)
    };

    // Reemplazar todas las variables
    for (const [variable, valor] of Object.entries(variables)) {
      htmlTemplate = htmlTemplate.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), valor);
    }

    console.log('✅ Variables reemplazadas en plantilla');

    // Generar PDF
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle' });
    
    const pdfBuffer = await page.pdf({
      format: 'letter', // Tamaño carta como solicitado
      margin: {
        top: '6mm',
        bottom: '6mm', 
        left: '6mm',
        right: '6mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    await browser.close();

    // Guardar y enviar PDF
    const boletasDir = path.join(__dirname, 'boletas');
    if (!fs.existsSync(boletasDir)) {
      fs.mkdirSync(boletasDir, { recursive: true });
    }

    const nombreEmpleado = empleado.nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const fechaDesdeArchivo = fechaDesdeFormateada.replace(/\//g, '-');
    const fechaHastaArchivo = fechaHastaFormateada.replace(/\//g, '-');
    const nombreArchivo = `Boleta_${nombreEmpleado}_${fechaDesdeArchivo}_a_${fechaHastaArchivo}.pdf`;
    const outputPath = path.join(boletasDir, nombreArchivo);

    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log('✅ PDF guardado en:', outputPath);
    console.log('📄 Boleta generada exitosamente');

    // Enviar archivo para descarga
    res.download(outputPath, nombreArchivo, (err) => {
      if (err) {
        console.error('❌ Error al enviar PDF:', err);
      } else {
        console.log('✅ PDF enviado correctamente');
      }
    });

  } catch (error) {
    console.error('❌ Error al generar boleta:', error);
    res.status(500).json({ 
      mensaje: "Error al generar el PDF de la boleta",
      error: error.message 
    });
  }
});

// Nueva ruta para mostrar boleta como HTML (vista previa)
app.get('/boleta/vista/:dui', async (req, res) => {
  const { dui } = req.params;
  const { desde, hasta } = req.query;
  
  try {
    console.log('🖥️ === GENERANDO VISTA HTML DE BOLETA ===');
    console.log('👤 DUI:', dui, 'Período:', desde, 'al', hasta);
    
    if (!desde || !hasta) {
      return res.status(400).send('<h1>Error: Faltan parámetros de fecha (desde, hasta)</h1>');
    }

    // Obtener datos del empleado
    const empleado = await new Promise((resolve, reject) => {
      db.get("SELECT nombre, dui, cargo, salario FROM empleados WHERE dui = ?", [dui], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (!empleado) {
      return res.status(404).send('<h1>Empleado no encontrado</h1>');
    }

    // Calcular datos del salario usando la misma lógica que el endpoint de PDF
    const periodoCompleto = await calcularSalarioNuevo(empleado, desde, hasta);
    
    // Cargar plantilla HTML
    const plantillaPath = path.join(__dirname, 'salarios', 'plantilla-boleta-profesional.html');
    let html = fs.readFileSync(plantillaPath, 'utf8');
    
    // Formatear fechas
    const fechaDesdeFormateada = convertirFechaISOaCentroamericana(desde);
    const fechaHastaFormateada = convertirFechaISOaCentroamericana(hasta);

    // Obtener logo en base64
    let logoDataURI = '';
    try {
      const logoPath = path.join(__dirname, 'imagenes', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataURI = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (logoError) {
      console.warn('⚠️ Error cargando logo para boleta:', logoError);
    }

    // Reemplazar variables en la plantilla
    html = html.replace(/{{nombre}}/g, empleado.nombre || 'N/A');
    html = html.replace(/{{dui}}/g, empleado.dui || 'N/A');
    html = html.replace(/{{cargo}}/g, empleado.cargo || 'N/A');
    html = html.replace(/{{dias}}/g, periodoCompleto.dias_trabajados || 0);
    html = html.replace(/{{desde}}/g, fechaDesdeFormateada);
    html = html.replace(/{{hasta}}/g, fechaHastaFormateada);
    html = html.replace(/{{cantidad_cortes}}/g, periodoCompleto.cantidad_servicios || 0);
    html = html.replace(/{{cantidad_productos}}/g, periodoCompleto.cantidad_productos || 0);
    html = html.replace(/{{salario_base}}/g, parseFloat(periodoCompleto.salario_base || 0).toFixed(2));
    html = html.replace(/{{salario_proporcional}}/g, parseFloat(periodoCompleto.salario_proporcional || 0).toFixed(2));
    html = html.replace(/{{comision_cortes}}/g, parseFloat(periodoCompleto.comision_servicios || 0).toFixed(2));
    html = html.replace(/{{comision_productos}}/g, parseFloat(periodoCompleto.comision_productos || 0).toFixed(2));
    html = html.replace(/{{cantidad_horas}}/g, periodoCompleto.total_horas || 0);
    html = html.replace(/{{total_horas_extras}}/g, parseFloat(periodoCompleto.total_horas_extras || 0).toFixed(2));
    html = html.replace(/{{cantidad_dias_dobles}}/g, periodoCompleto.cantidad_dias_dobles || 0);
    html = html.replace(/{{total_dias_dobles}}/g, parseFloat(periodoCompleto.total_dias_dobles || 0).toFixed(2));
    html = html.replace(/{{total_descuentos}}/g, parseFloat(periodoCompleto.total_descuentos || 0).toFixed(2));
    html = html.replace(/{{total_pago}}/g, parseFloat(periodoCompleto.total_neto || 0).toFixed(2));

    // Reemplazar logo
    if (logoDataURI) {
      html = html.replace(/src="[^"]*logo[^"]*"/g, `src="${logoDataURI}"`);
    }

    // Agregar estilos para vista web y botón de impresión
    const estilosVistaWeb = `
      <style>
        @media screen {
          .btn-imprimir {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1a1a2e;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            transition: background-color 0.2s;
          }
          .btn-imprimir:hover {
            background: #16213e;
          }
        }
        @media print {
          .btn-imprimir {
            display: none !important;
          }
        }
      </style>
    `;

    const scriptImprimir = `
      <script>
        function imprimirBoleta() {
          window.print();
        }
      </script>
    `;

    // Insertar estilos y script
    html = html.replace('</head>', `${estilosVistaWeb}</head>`);
    html = html.replace('<body>', `<body>
      <button class="btn-imprimir" onclick="imprimirBoleta()">🖨️ Imprimir</button>`);
    html = html.replace('</body>', `${scriptImprimir}</body>`);

    console.log('✅ Vista HTML de boleta generada correctamente');
    
    // Enviar HTML como respuesta
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('❌ Error generando vista HTML de boleta:', error);
    res.status(500).send('<h1>Error al generar vista de boleta</h1><p>' + error.message + '</p>');
  }
});

// ========================================
// ENDPOINT COMPLETO PARA GUARDAR DESCUENTOS
// Agregar en servergeneral.js (ya debería estar en las líneas 3200-3300 aprox)
// ========================================

// POST - Registrar nuevo descuento
app.post('/api/descuentos', (req, res) => {
  const { fecha, dui, monto, motivo } = req.body;
  
  console.log('💸 === REGISTRANDO DESCUENTO ===');
  console.log('📋 Datos recibidos:', { fecha, dui, monto, motivo });
  
  // ========================================
  // VALIDACIONES BÁSICAS
  // ========================================
  if (!fecha || !dui || !monto || !motivo) {
    console.log('❌ Faltan campos obligatorios');
    return res.status(400).json({ 
      mensaje: "Todos los campos son obligatorios",
      campos_requeridos: ["fecha", "dui", "monto", "motivo"]
    });
  }
  
  // Validar monto
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    console.log('❌ Monto inválido:', monto);
    return res.status(400).json({ mensaje: "El monto debe ser un número mayor a cero" });
  }
  
  // Validar DUI básico
  if (!dui.match(/^\d{8}-\d$/)) {
    console.log('❌ Formato de DUI inválido:', dui);
    return res.status(400).json({ mensaje: "Formato de DUI inválido. Use el formato: 12345678-9" });
  }
  
  // ========================================
  // CONVERTIR FECHA PARA LA BASE DE DATOS
  // ========================================
  let fechaParaBD;
  try {
    fechaParaBD = convertirFechaISOaCentroamericana(fecha);
    console.log('📅 Fecha convertida para BD:', fechaParaBD);
    
    // Validar que la fecha convertida sea válida
    if (!fechaParaBD || fechaParaBD === fecha) {
      // Si no se pudo convertir o ya estaba en formato correcto, validar que sea válida
      if (!validarFormatoFecha(fechaParaBD)) {
        throw new Error('Formato de fecha inválido');
      }
    }
  } catch (error) {
    console.log('❌ Error al procesar fecha:', error.message);
    return res.status(400).json({ mensaje: "Formato de fecha inválido. Use DD/MM/YYYY o seleccione desde el calendario." });
  }
  
  // ========================================
  // VERIFICAR QUE EL EMPLEADO EXISTE
  // ========================================
  db.get("SELECT nombre FROM empleados WHERE dui = ?", [dui], (err, empleado) => {
    if (err) {
      console.error('❌ Error al verificar empleado:', err.message);
      return res.status(500).json({ mensaje: "Error al verificar empleado" });
    }
    
    if (!empleado) {
      console.log('❌ Empleado no encontrado:', dui);
      return res.status(404).json({ mensaje: "No se encontró un empleado con ese DUI" });
    }
    
    console.log('👤 Empleado encontrado:', empleado.nombre);
    
    // ========================================
    // INSERTAR DESCUENTO EN LA BASE DE DATOS
    // ========================================
    db.run(
      `INSERT INTO descuentos (fecha, dui, monto, motivo) VALUES (?, ?, ?, ?)`,
      [fechaParaBD, dui, montoNum, motivo],
      function (err) {
        if (err) {
          console.error('❌ Error al insertar descuento:', err.message);
          return res.status(500).json({ mensaje: "Error al registrar descuento en la base de datos" });
        }
        
        console.log('✅ Descuento registrado exitosamente:');
        console.log('   - ID:', this.lastID);
        console.log('   - Empleado:', empleado.nombre);
        console.log('   - Fecha:', fechaParaBD);
        console.log('   - Monto: $' + montoNum.toFixed(2));
        console.log('   - Motivo:', motivo);
        
        res.status(201).json({ 
          mensaje: `Descuento de $${montoNum.toFixed(2)} registrado correctamente para ${empleado.nombre}`,
          descuento: {
            id: this.lastID,
            empleado: empleado.nombre,
            fecha: fechaParaBD,
            monto: montoNum,
            motivo: motivo
          }
        });
      }
    );
  });
});

// (Endpoint duplicado eliminado - se mantiene solo el del módulo de salarios)

// ========================================
// GET - Obtener un descuento específico por ID
// ========================================
app.get('/api/descuentos/detalle/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🔍 === OBTENIENDO DESCUENTO PARA EDICIÓN ===');
  console.log('📋 ID del descuento:', id);
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ mensaje: "ID de descuento inválido" });
  }
  
  const query = `
    SELECT d.*, e.nombre as nombre_empleado 
    FROM descuentos d 
    LEFT JOIN empleados e ON d.dui = e.dui 
    WHERE d.id = ?
  `;
  
  db.get(query, [id], (err, descuento) => {
    if (err) {
      console.error('❌ Error al consultar descuento:', err.message);
      return res.status(500).json({ mensaje: "Error al obtener descuento" });
    }
    
    if (!descuento) {
      console.log('❌ Descuento no encontrado:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    console.log('✅ Descuento encontrado:', descuento.nombre_empleado);
    res.json(descuento);
  });
});

// ========================================
// PUT - Actualizar un descuento existente
// ========================================
app.put('/api/descuentos/:id', (req, res) => {
  const { id } = req.params;
  const { fecha, dui, monto, motivo } = req.body;
  
  console.log('✏️ === ACTUALIZANDO DESCUENTO ===');
  console.log('📋 ID del descuento:', id);
  console.log('📋 Nuevos datos:', { fecha, dui, monto, motivo });
  
  // Validaciones básicas
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ mensaje: "ID de descuento inválido" });
  }
  
  if (!fecha || !dui || !monto || !motivo) {
    console.log('❌ Faltan campos obligatorios');
    return res.status(400).json({ 
      mensaje: "Todos los campos son obligatorios",
      campos_requeridos: ["fecha", "dui", "monto", "motivo"]
    });
  }
  
  // Validar monto
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    console.log('❌ Monto inválido:', monto);
    return res.status(400).json({ mensaje: "El monto debe ser un número mayor a cero" });
  }
  
  // Validar DUI básico
  if (!dui.match(/^\d{8}-\d$/)) {
    console.log('❌ Formato de DUI inválido:', dui);
    return res.status(400).json({ mensaje: "Formato de DUI inválido. Use el formato: 12345678-9" });
  }
  
  // Convertir fecha para la base de datos
  let fechaParaBD;
  try {
    fechaParaBD = convertirFechaISOaCentroamericana(fecha);
    console.log('📅 Fecha convertida para BD:', fechaParaBD);
    
    if (!validarFormatoFecha(fechaParaBD)) {
      throw new Error('Formato de fecha inválido');
    }
  } catch (error) {
    console.log('❌ Error al procesar fecha:', error.message);
    return res.status(400).json({ mensaje: "Formato de fecha inválido" });
  }
  
  // Verificar que el descuento existe
  db.get("SELECT * FROM descuentos WHERE id = ?", [id], (err, descuentoExistente) => {
    if (err) {
      console.error('❌ Error al verificar descuento existente:', err.message);
      return res.status(500).json({ mensaje: "Error al verificar descuento" });
    }
    
    if (!descuentoExistente) {
      console.log('❌ Descuento no encontrado para actualizar:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    // Verificar que el empleado existe
    db.get("SELECT nombre FROM empleados WHERE dui = ?", [dui], (err, empleado) => {
      if (err) {
        console.error('❌ Error al verificar empleado:', err.message);
        return res.status(500).json({ mensaje: "Error al verificar empleado" });
      }
      
      if (!empleado) {
        console.log('❌ Empleado no encontrado:', dui);
        return res.status(404).json({ mensaje: "No se encontró un empleado con ese DUI" });
      }
      
      console.log('👤 Empleado encontrado:', empleado.nombre);
      
      // Actualizar el descuento
      db.run(
        `UPDATE descuentos SET fecha = ?, dui = ?, monto = ?, motivo = ? WHERE id = ?`,
        [fechaParaBD, dui, montoNum, motivo, id],
        function (err) {
          if (err) {
            console.error('❌ Error al actualizar descuento:', err.message);
            return res.status(500).json({ mensaje: "Error al actualizar descuento en la base de datos" });
          }
          
          if (this.changes === 0) {
            console.log('⚠️ No se realizaron cambios en el descuento:', id);
            return res.status(404).json({ mensaje: "No se pudo actualizar el descuento" });
          }
          
          console.log('✅ Descuento actualizado exitosamente');
          
          res.json({ 
            mensaje: `Descuento actualizado correctamente para ${empleado.nombre}`,
            descuento_actualizado: {
              id: parseInt(id),
              empleado: empleado.nombre,
              dui: dui,
              fecha: fechaParaBD,
              monto: montoNum,
              motivo: motivo
            }
          });
        }
      );
    });
  });
});

// ========================================
// DELETE - Eliminar descuento
// ========================================
app.delete('/api/descuentos/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🗑️ === ELIMINANDO DESCUENTO ===');
  console.log('📋 ID del descuento:', id);
  
  // Primero obtener información del descuento antes de eliminarlo
  db.get("SELECT d.*, e.nombre as nombre_empleado FROM descuentos d LEFT JOIN empleados e ON d.dui = e.dui WHERE d.id = ?", [id], (err, descuento) => {
    if (err) {
      console.error('❌ Error al buscar descuento:', err.message);
      return res.status(500).json({ mensaje: "Error al buscar descuento" });
    }
    
    if (!descuento) {
      console.log('❌ Descuento no encontrado:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    // Eliminar el descuento
    db.run("DELETE FROM descuentos WHERE id = ?", [id], function(err) {
      if (err) {
        console.error('❌ Error al eliminar descuento:', err.message);
        return res.status(500).json({ mensaje: "Error al eliminar descuento" });
      }
      
      console.log('✅ Descuento eliminado exitosamente');
      
      res.json({ 
        mensaje: `Descuento de $${descuento.monto} eliminado correctamente`,
        descuento_eliminado: {
          id: descuento.id,
          empleado: descuento.nombre_empleado,
          monto: descuento.monto,
          motivo: descuento.motivo
        }
      });
    });
  });
});

// ========================================
// FUNCIÓN ADICIONAL: VERIFICAR PLANTILLA DE BOLETA
// Agregar esta función para debug
// ========================================


app.get('/api/membresias', (req, res) => {
  const { mes, anio } = req.query;
  
  console.log('🔍 === CONSULTA DE MEMBRESÍAS (FORMATO CENTROAMERICANO) ===');
  console.log('📅 Parámetros recibidos:', { mes, anio });
  
  // Validación de parámetros
  if (!mes || !anio) {
    console.log('❌ Faltan parámetros mes o año');
    return res.status(400).json({ error: 'Mes y año son requeridos' });
  }
  
  // Construir patrón para fechas en formato DD/MM/YYYY (centroamericano)
  const patronFechaCentro = `%/${mes.padStart(2, '0')}/${anio}`;
  
  console.log('🔎 Patrón de búsqueda centroamericano:', patronFechaCentro);
  
  // CORRECCIÓN: Calcular fechas para vencimiento en formato centroamericano
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + 7);
  
  // Convertir a formato centroamericano DD/MM/YYYY
  const fechaHoyCentro = convertirFechaISOaCentroamericana(hoy.toISOString().split('T')[0]);
  const fechaLimiteCentro = convertirFechaISOaCentroamericana(fechaLimite.toISOString().split('T')[0]);
  
  console.log('📅 Fechas para vencimiento:', { 
    hoy: fechaHoyCentro, 
    limite: fechaLimiteCentro,
    hoySinFormato: hoy.toISOString().split('T')[0],
    limiteSinFormato: fechaLimite.toISOString().split('T')[0]
  });
  
  // Ejecutar consultas en paralelo
  const consultas = {
    // 1. Membresías activas que iniciaron en el mes consultado
    activas: new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as total 
        FROM clientes 
        WHERE membresia = 'Activo' 
        AND fecha_inicio LIKE ?
      `;
      
      db.get(sql, [patronFechaCentro], (err, row) => {
        if (err) {
          console.error('❌ Error en consulta activas:', err.message);
          reject(err);
        } else {
          console.log('✅ Membresías activas encontradas:', row.total);
          resolve(row.total || 0);
        }
      });
    }),
    
    // 2. Nuevas membresías del mes (registradas en el mes)
    nuevas: new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as total 
        FROM clientes 
        WHERE membresia = 'Activo' 
        AND fecha LIKE ?
      `;
      
      db.get(sql, [patronFechaCentro], (err, row) => {
        if (err) {
          console.error('❌ Error en consulta nuevas:', err.message);
          reject(err);
        } else {
          console.log('✅ Nuevas membresías encontradas:', row.total);
          resolve(row.total || 0);
        }
      });
    }),
    
    // 3. Ingresos por membresías que iniciaron en el mes consultado
    ingresos: new Promise((resolve, reject) => {
      const sql = `
        SELECT SUM(monto) as total 
        FROM clientes 
        WHERE membresia = 'Activo' 
        AND fecha_inicio LIKE ?
        AND monto IS NOT NULL
        AND monto > 0
      `;
      
      db.get(sql, [patronFechaCentro], (err, row) => {
        if (err) {
          console.error('❌ Error en consulta ingresos:', err.message);
          reject(err);
        } else {
          const ingresos = parseFloat(row.total || 0);
          console.log('✅ Ingresos por membresías:', ingresos);
          resolve(ingresos);
        }
      });
    }),
    
    // 4. CORRECCIÓN: Membresías próximas a vencer usando lógica de fechas centroamericanas
    proximasVencer: new Promise((resolve, reject) => {
      // Obtener todas las membresías activas y evaluar fecha_final
      const sql = `
        SELECT fecha_final, nombre 
        FROM clientes 
        WHERE membresia = 'Activo' 
        AND fecha_final IS NOT NULL 
        AND fecha_final != ''
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error en consulta próximas a vencer:', err.message);
          reject(err);
        } else {
          console.log('🔍 Evaluando membresías para vencimiento...');
          
          let proximasVencer = 0;
          const hoyObj = new Date();
          const fechaLimiteObj = new Date();
          fechaLimiteObj.setDate(hoyObj.getDate() + 7);
          
          rows.forEach(row => {
            if (row.fecha_final) {
              // Convertir fecha_final de DD/MM/YYYY a objeto Date
              const fechaFinalObj = convertirFechaCentroamericanaADate(row.fecha_final);
              
              if (fechaFinalObj) {
                // Verificar si está entre hoy y 7 días adelante
                if (fechaFinalObj >= hoyObj && fechaFinalObj <= fechaLimiteObj) {
                  proximasVencer++;
                  console.log(`📅 Membresía próxima a vencer: ${row.nombre} - ${row.fecha_final}`);
                }
              }
            }
          });
          
          console.log('✅ Membresías próximas a vencer:', proximasVencer);
          resolve(proximasVencer);
        }
      });
    })
  };
  
  // Ejecutar todas las consultas
  Promise.all([
    consultas.activas,
    consultas.nuevas,
    consultas.ingresos,
    consultas.proximasVencer
  ])
  .then(([activas, nuevas, ingresos, proximasVencer]) => {
    const resultado = {
      activas,
      nuevas,
      ingresos,
      proximasVencer
    };
    
    console.log('✅ === RESULTADO FINAL MEMBRESÍAS ===');
    console.log('📊 Datos compilados:', JSON.stringify(resultado, null, 2));
    
    res.json(resultado);
  })
  .catch(error => {
    console.error('❌ Error al ejecutar consultas de membresías:', error.message);
    res.status(500).json({ 
      error: 'Error interno al consultar datos de membresías',
      mensaje: error.message 
    });
  });
});

// ========================================
// DEBUGGING: Endpoint actualizado para fechas centroamericanas
// ========================================

// ========================================
// ENDPOINT DE DEBUG PARA VENCIMIENTO DE MEMBRESÍAS
// Agregar este endpoint en servergeneral.js para depurar fechas
// ========================================

app.get('/api/membresias/debug-vencimiento', (req, res) => {
  console.log('🔍 === DEBUG VENCIMIENTO DE MEMBRESÍAS ===');
  
  const hoyObj = new Date();
  const fechaLimiteObj = new Date();
  fechaLimiteObj.setDate(hoyObj.getDate() + 7);
  
  console.log('📅 Rango de fechas para vencimiento:');
  console.log('   - Hoy:', hoyObj.toLocaleDateString('es-ES'));
  console.log('   - Límite (7 días):', fechaLimiteObj.toLocaleDateString('es-ES'));
  
  // Obtener todas las membresías activas
  const sql = `
    SELECT 
      nombre,
      dui,
      fecha_inicio,
      fecha_final,
      monto
    FROM clientes 
    WHERE membresia = 'Activo' 
    AND fecha_final IS NOT NULL 
    AND fecha_final != ''
    ORDER BY fecha_final ASC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error en debug de vencimiento:', err.message);
      return res.status(500).json({ error: 'Error en debug' });
    }
    
    console.log(`📋 ${rows.length} membresías activas con fecha final:`);
    
    const resultados = [];
    let proximasVencer = 0;
    
    rows.forEach((row, index) => {
      console.log(`\n--- Membresía ${index + 1}: ${row.nombre} ---`);
      console.log('   fecha_final (BD):', row.fecha_final);
      
      // Convertir fecha_final de DD/MM/YYYY a objeto Date
      const fechaFinalObj = convertirFechaCentroamericanaADate(row.fecha_final);
      
      if (fechaFinalObj) {
        console.log('   fecha_final (Date):', fechaFinalObj.toLocaleDateString('es-ES'));
        
        const dentroDelRango = fechaFinalObj >= hoyObj && fechaFinalObj <= fechaLimiteObj;
        const diasParaVencer = Math.ceil((fechaFinalObj - hoyObj) / (1000 * 60 * 60 * 24));
        
        console.log('   días para vencer:', diasParaVencer);
        console.log('   ¿próxima a vencer?:', dentroDelRango);
        
        if (dentroDelRango) {
          proximasVencer++;
        }
        
        resultados.push({
          nombre: row.nombre,
          dui: row.dui,
          fecha_inicio: row.fecha_inicio,
          fecha_final: row.fecha_final,
          fecha_final_convertida: fechaFinalObj.toLocaleDateString('es-ES'),
          dias_para_vencer: diasParaVencer,
          proxima_a_vencer: dentroDelRango,
          monto: row.monto
        });
      } else {
        console.log('   ❌ Error al convertir fecha');
        resultados.push({
          nombre: row.nombre,
          dui: row.dui,
          fecha_final: row.fecha_final,
          error: 'No se pudo convertir la fecha'
        });
      }
    });
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total membresías activas: ${rows.length}`);
    console.log(`   Próximas a vencer (7 días): ${proximasVencer}`);
    
    res.json({
      hoy: hoyObj.toLocaleDateString('es-ES'),
      fecha_limite: fechaLimiteObj.toLocaleDateString('es-ES'),
      total_membresias: rows.length,
      proximas_vencer: proximasVencer,
      detalles: resultados
    });
  });
});

// ========================================
// ENDPOINT PARA RESUMEN DE MEMBRESÍAS (GRÁFICO)
// ========================================
app.get('/api/membresias/resumen', (req, res) => {
  const { mes, anio } = req.query;
  
  console.log('📊 === RESUMEN DE MEMBRESÍAS PARA GRÁFICO ===');
  console.log('📅 Parámetros:', { mes, anio });
  
  // Si no se proporcionan mes/año, usar actuales
  const fechaActual = new Date();
  const mesActual = mes || String(fechaActual.getMonth() + 1).padStart(2, '0');
  const anioActual = anio || fechaActual.getFullYear().toString();
  
  // Consultar membresías del mes (mismo endpoint interno)
  const patronFechaCentro = `%/${mesActual}/${anioActual}`;
  
  console.log('🔎 Patrón de búsqueda:', patronFechaCentro);
  
  const hoyObj = new Date();
  const fechaLimiteObj = new Date();
  fechaLimiteObj.setDate(hoyObj.getDate() + 7); // 7 días para "próximas a vencer"
  
  const hoy = hoyObj.toLocaleDateString('es-ES');
  const limite = fechaLimiteObj.toLocaleDateString('es-ES');
  
  console.log('📅 Fechas para vencimiento:', { hoy, limite });
  
  // Obtener todas las membresías activas
  const sql = `
    SELECT id, nombre, dui, fecha_inicio, fecha_final, monto, estado
    FROM membresias 
    WHERE estado = 'activa'
    ORDER BY fecha_final ASC
  `;
  
  db.all(sql, (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar membresías:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    
    console.log(`✅ Membresías activas encontradas: ${rows.length}`);
    
    let activas = 0;
    let nuevas = 0;
    let proximasVencer = 0;
    let vencidas = 0;
    let ingresos = 0;
    
    // Procesar cada membresía
    rows.forEach(row => {
      // Contar como activa
      activas++;
      ingresos += parseFloat(row.monto || 0);
      
      // Verificar si es nueva (fecha_inicio del mes actual)
      if (row.fecha_inicio && row.fecha_inicio.includes(`/${mesActual}/${anioActual}`)) {
        nuevas++;
      }
      
      // Verificar vencimiento
      if (row.fecha_final) {
        try {
          const [dia, mes, ano] = row.fecha_final.split('/').map(Number);
          if (dia && mes && ano) {
            const fechaFinalObj = new Date(ano, mes - 1, dia);
            const hoyObj = new Date();
            hoyObj.setHours(0, 0, 0, 0);
            
            const diasParaVencer = Math.ceil((fechaFinalObj - hoyObj) / (1000 * 60 * 60 * 24));
            
            if (diasParaVencer < 0) {
              vencidas++;
            } else if (diasParaVencer <= 7) {
              proximasVencer++;
            }
          }
        } catch (error) {
          console.error('Error procesando fecha:', row.fecha_final);
        }
      }
    });
    
    console.log('🔍 Evaluando membresías para vencimiento...');
    console.log(`✅ Membresías próximas a vencer: ${proximasVencer}`);
    console.log(`✅ Nuevas membresías encontradas: ${nuevas}`);
    console.log(`✅ Ingresos por membresías: ${ingresos}`);
    
    const resultado = {
      activas,
      nuevas,
      proximasVencer,
      vencidas,
      ingresos
    };
    
    console.log('✅ === RESULTADO FINAL MEMBRESÍAS ===');
    console.log('📊 Datos compilados:', JSON.stringify(resultado, null, 2));
    
    res.json(resultado);
  });
});

// ========================================
// FUNCIÓN AUXILIAR MEJORADA 
// (Si no existe ya, agregar esta función)
// ========================================

function convertirFechaCentroamericanaADate(fechaCentro) {
  if (!fechaCentro) return null;
  
  try {
    // Si está en formato DD/MM/YYYY
    if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, anio] = fechaCentro.split('/');
      // Crear fecha con mes-1 porque Date usa base 0 para meses
      const fechaObj = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
      
      // Verificar que la fecha sea válida
      if (fechaObj.getDate() == parseInt(dia) && 
          fechaObj.getMonth() == parseInt(mes) - 1 && 
          fechaObj.getFullYear() == parseInt(anio)) {
        return fechaObj;
      }
    }
    
    // Si está en formato YYYY-MM-DD
    if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(fechaCentro);
    }
    
  } catch (error) {
    console.error('Error al convertir fecha:', fechaCentro, error);
  }
  
  return null;
}

// 📌 RUTAS

// ➡️ Ruta para mostrar login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ➡️ Ruta para registrar usuario
app.post('/api/register', (req, res) => {
  const { usuario, password, rol, modulos } = req.body;

  if (!usuario || !password || !rol) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  db.get("SELECT * FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error de servidor." });
    if (row) return res.status(400).json({ mensaje: "El usuario ya existe." });

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) return res.status(500).json({ mensaje: "Error al encriptar contraseña." });

      // 🔥 Aquí validamos: si es Admin, asignamos TODOS los módulos automáticamente
      let modulosFinal = [];

      if (rol === 'Admin') {
        modulosFinal = [
          "Clientes", "Empleados", "Inventarios", "Compras", "Cortes",
          "Facturacion", "DetalleCortes", "DetalleProductos", "AgendarCitas","Usuarios","CierreCaja","Salarios","Gastos","Registrar","Comisiones","TarjetasFidelidad"
        ];
      } else {
        modulosFinal = modulos || [];
      }

      const modulosJSON = JSON.stringify(modulosFinal);

      db.run(`INSERT INTO usuarios (usuario, password, rol, modulos) VALUES (?, ?, ?, ?)`,
        [usuario, hash, rol, modulosJSON],
        (err) => {
          if (err) return res.status(500).json({ mensaje: "Error al registrar usuario." });
          res.status(201).json({ mensaje: "Usuario registrado exitosamente." });
        });
    });
  });
});

// ➡️ Ruta para hacer login
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const user = await DatabaseHelper.getUsuario(usuario);
    
    if (!user) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (isValid) {
      req.session.usuario = user.usuario;
      req.session.rol = user.rol;
      req.session.modulos = user.modulos;

      res.json({
        mensaje: "Login exitoso",
        usuario: user.usuario,
        rol: user.rol,
        modulos: user.modulos ? JSON.parse(user.modulos) : []
      });
    } else {
      res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: "Error de servidor" });
  }
});

// ➡️ Ruta para obtener sesión actual
app.get('/api/session', (req, res) => {
  if (req.session.usuario) {
    res.json({
      usuario: req.session.usuario,
      rol: req.session.rol,
      modulos: req.session.modulos ? JSON.parse(req.session.modulos) : []
    });
  } else {
    res.status(401).json({ mensaje: "No autorizado" });
  }
});

app.get('/api/verificarUsuario', (req, res) => {
  if (req.session && req.session.usuario) {
    res.json({
      usuario: req.session.usuario,
      rol: req.session.rol
    });
  } else {
    res.status(401).json({ mensaje: "No autorizado" });
  }
});


// ➡️ Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// 🔒 Middleware para proteger rutas privadas
app.use((req, res, next) => {
  const rutasPublicas = ['/login', '/api/login', '/api/register', '/api/session', '/estilos/style.css', '/login.js', '/register.js'];
  if (rutasPublicas.includes(req.path) || req.path.startsWith('/api/placeholder') || req.path.startsWith('/factura/')) {
    return next();
  }
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
});

 // usuarios 
 
 // Listar usuarios

 app.get('/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, 'usuarios', 'usuarios.html'));
});

app.get('/api/usuarios', (req, res) => {
  db.all("SELECT usuario, rol, modulos FROM usuarios", [], (err, rows) => {
    if (err) {
      console.error("Error en la consulta de usuarios:", err);
      return res.status(500).json({ mensaje: "Error al obtener usuarios." });
    }

    const usuarios = rows.map(row => {
      let modulosArray = [];
      
      // Tratar de parsear los módulos si existen
      if (row.modulos) {
        try {
          modulosArray = JSON.parse(row.modulos);
          // Asegurarnos de que sea un array
          if (!Array.isArray(modulosArray)) {
            console.warn(`Módulos para ${row.usuario} no es un array, inicializando como array vacío`);
            modulosArray = [];
          }
        } catch (error) {
          console.error(`Error al parsear módulos para ${row.usuario}:`, error);
          // Si hay error en el parsing, usar un array vacío
          modulosArray = [];
        }
      }
      
      return {
        usuario: row.usuario,
        rol: row.rol,
        modulos: modulosArray
      };
    });

    res.json(usuarios);
  });
});

// Editar rol de usuario
app.put('/api/editarUsuario', (req, res) => {
  const { usuario, nuevoRol } = req.body;

  if (!usuario || !nuevoRol) {
    return res.status(400).json({ mensaje: "Datos incompletos." });
  }

  db.get("SELECT rol FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al consultar usuario." });

    if (!row) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    if (row.rol === 'Admin') {
      return res.status(403).json({ mensaje: "No puedes cambiar el rol de un Administrador." });
    }

    db.run("UPDATE usuarios SET rol = ? WHERE usuario = ?", [nuevoRol, usuario], (err) => {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar rol." });
      res.json({ mensaje: "Rol actualizado exitosamente." });
    });
  });
});


// Eliminar usuario
app.delete('/api/eliminarUsuario/:usuario', (req, res) => {
  const { usuario } = req.params;

  db.run("DELETE FROM usuarios WHERE usuario = ?", [usuario], (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar usuario." });
    res.json({ mensaje: "Usuario eliminado exitosamente." });
  });
});

// Editar módulos permitidos de un usuario
// Editar módulos permitidos de un usuario
// Modificación para el endpoint de editar módulos
app.put('/api/editarModulosUsuario', (req, res) => {
  const { usuario, nuevosModulos } = req.body;
  
  // Log para depuración
  console.log(`Intento de editar módulos para: ${usuario}`);
  console.log(`Nuevos módulos: ${JSON.stringify(nuevosModulos)}`);
  
  if (!usuario || !Array.isArray(nuevosModulos)) {
    console.log("⚠️ Datos incompletos para editar módulos");
    return res.status(400).json({ mensaje: "Datos incompletos para editar módulos." });
  }
  
  // Verificar si el usuario existe
  db.get("SELECT usuario, rol, modulos FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
    if (err) {
      console.error("Error en consulta SQL:", err);
      return res.status(500).json({ mensaje: "Error al consultar usuario." });
    }
    
    if (!row) {
      console.log(`⚠️ Usuario no encontrado: ${usuario}`);
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    
    // Si es Admin, no permitir la edición (descomenta si quieres añadir esta validación)
    /*
    if (row.rol === 'Admin') {
      console.log(`⚠️ Intento de editar módulos de un administrador: ${usuario}`);
      return res.status(403).json({ mensaje: "No se pueden editar los módulos de un Administrador." });
    }
    */
    
    // Convertir el array de módulos a JSON string
    const nuevosModulosJSON = JSON.stringify(nuevosModulos);
    
    // Actualizar los módulos en la base de datos
    db.run("UPDATE usuarios SET modulos = ? WHERE usuario = ?", [nuevosModulosJSON, usuario], function(err) {
      if (err) {
        console.error("Error al actualizar módulos:", err);
        return res.status(500).json({ mensaje: "Error al actualizar módulos." });
      }
      
      console.log(`✅ Módulos actualizados para ${usuario}. Filas afectadas: ${this.changes}`);
      res.json({ 
        mensaje: "Módulos actualizados exitosamente.",
        modulosActualizados: nuevosModulos 
      });
    });
  });
});

// Cambiar contraseña de usuario
app.put('/api/cambiarPassword', (req, res) => {
  const { usuario, nuevaPassword } = req.body;

  if (!usuario || !nuevaPassword) {
    return res.status(400).json({ mensaje: "Datos incompletos para cambiar contraseña." });
  }

  const saltRounds = 10;
  bcrypt.hash(nuevaPassword, saltRounds, (err, hash) => {
    if (err) return res.status(500).json({ mensaje: "Error al encriptar la nueva contraseña." });

    db.run("UPDATE usuarios SET password = ? WHERE usuario = ?", [hash, usuario], (err) => {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar contraseña." });
      res.json({ mensaje: "Contraseña actualizada exitosamente." });
    });
  });
});


// API para CRUD de gastos
app.get('/api/gastos/filtro', (req, res) => {
  const { categoria, desde, hasta } = req.query;
  let query = "SELECT * FROM gastos WHERE 1=1";
  const params = [];
  
  if (categoria && categoria.trim() !== '') {
    // Usar LIKE con comodines a ambos lados y convertir a minúsculas
    query += " AND LOWER(categoria) LIKE ?";
    params.push(`%${categoria.toLowerCase()}%`);
  }
  
  if (desde) {
    query += " AND fecha >= ?";
    params.push(desde);
  }
  
  if (hasta) {
    query += " AND fecha <= ?";
    params.push(hasta);
  }
  
  query += " ORDER BY fecha DESC";
  
  console.log("Query SQL:", query);
  console.log("Parámetros:", params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("❌ Error al filtrar gastos:", err.message);
      return res.status(500).json({ mensaje: "Error al filtrar gastos" });
    }
    res.json(rows);
  });
});

app.get('/api/gastos', (req, res) => {
  db.all("SELECT * FROM gastos ORDER BY fecha DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener gastos" });
    res.json(rows);
  });
});

app.get('/api/gastos/:id', (req, res) => {
  db.get("SELECT * FROM gastos WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener gasto" });
    res.json(row);
  });
});

app.post('/api/gastos', (req, res) => {
  const { fecha, categoria, descripcion, monto, es_inventario, cantidad, precio_unitario } = req.body;
  
  // Calcular valores para inventarios
  let stock_actual = 0;
  let monto_final = monto;
  
  if (es_inventario && cantidad && precio_unitario) {
    stock_actual = parseInt(cantidad);
    monto_final = parseFloat(cantidad) * parseFloat(precio_unitario);
  }
  
  const query = `INSERT INTO gastos 
    (fecha, categoria, descripcion, monto, es_inventario, cantidad, precio_unitario, stock_actual) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query,
    [fecha, categoria, descripcion, monto_final, es_inventario ? 1 : 0, cantidad || 0, precio_unitario || 0, stock_actual],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al registrar gasto" });
      res.status(201).json({ id: this.lastID, mensaje: es_inventario ? "Inventario registrado con éxito" : "Gasto registrado con éxito" });
    });
});

app.put('/api/gastos/:id', (req, res) => {
  const { fecha, categoria, descripcion, monto, es_inventario, cantidad, precio_unitario } = req.body;
  
  // Calcular valores para inventarios
  let stock_actual = 0;
  let monto_final = monto;
  
  if (es_inventario && cantidad && precio_unitario) {
    stock_actual = parseInt(cantidad);
    monto_final = parseFloat(cantidad) * parseFloat(precio_unitario);
  }
  
  const query = `UPDATE gastos SET 
    fecha = ?, categoria = ?, descripcion = ?, monto = ?, 
    es_inventario = ?, cantidad = ?, precio_unitario = ?, stock_actual = ? 
    WHERE id = ?`;
  
  db.run(query,
    [fecha, categoria, descripcion, monto_final, es_inventario ? 1 : 0, cantidad || 0, precio_unitario || 0, stock_actual, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar gasto" });
      res.json({ mensaje: es_inventario ? "Inventario actualizado correctamente" : "Gasto actualizado correctamente" });
    });
});

app.delete('/api/gastos/:id', (req, res) => {
  db.run("DELETE FROM gastos WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar gasto" });
    res.json({ mensaje: "Gasto eliminado correctamente" });
  });
});

// ========================================
// NUEVAS APIs PARA INVENTARIOS
// ========================================

// Obtener todos los inventarios disponibles (solo items con es_inventario = 1)
app.get('/api/inventarios', (req, res) => {
  db.all("SELECT * FROM gastos WHERE es_inventario = 1 ORDER BY descripcion", [], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener inventarios" });
    res.json(rows);
  });
});

// Registrar salida de inventario
app.post('/api/salidas-inventario', (req, res) => {
  const { gasto_id, empleado, cantidad_salida, observaciones } = req.body;
  const fecha_salida = obtenerFechaActualCentroamericana();
  
  // Primero obtener datos del inventario
  db.get("SELECT * FROM gastos WHERE id = ? AND es_inventario = 1", [gasto_id], (err, inventario) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener inventario" });
    if (!inventario) return res.status(404).json({ mensaje: "Inventario no encontrado" });
    
    const cantidad_disponible = inventario.stock_actual || 0;
    const cantidad_solicitada = parseInt(cantidad_salida);
    
    if (cantidad_solicitada > cantidad_disponible) {
      return res.status(400).json({ 
        mensaje: `Stock insuficiente. Disponible: ${cantidad_disponible}, Solicitado: ${cantidad_solicitada}` 
      });
    }
    
    const precio_unitario = inventario.precio_unitario || 0;
    const valor_total = cantidad_solicitada * precio_unitario;
    const nuevo_stock = cantidad_disponible - cantidad_solicitada;
    
    // Iniciar transacción
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      
      // Insertar salida
      db.run(
        `INSERT INTO salidas_inventario 
         (gasto_id, empleado, cantidad_salida, precio_unitario, valor_total, fecha_salida, observaciones) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [gasto_id, empleado, cantidad_salida, precio_unitario, valor_total, fecha_salida, observaciones],
        function(err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ mensaje: "Error al registrar salida" });
          }
          
          // Actualizar stock
          db.run(
            "UPDATE gastos SET stock_actual = ? WHERE id = ?",
            [nuevo_stock, gasto_id],
            function(err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ mensaje: "Error al actualizar stock" });
              }
              
              db.run("COMMIT");
              res.status(201).json({ 
                mensaje: "Salida registrada correctamente", 
                salida_id: this.lastID,
                nuevo_stock: nuevo_stock
              });
            }
          );
        }
      );
    });
  });
});

// Obtener historial de salidas
app.get('/api/salidas-inventario', (req, res) => {
  const query = `
    SELECT s.*, g.descripcion as producto_nombre
    FROM salidas_inventario s
    JOIN gastos g ON s.gasto_id = g.id
    ORDER BY s.fecha_salida DESC, s.id DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener historial de salidas" });
    res.json(rows);
  });
});

// Filtrar salidas por empleado y/o fecha
app.get('/api/salidas-inventario/filtro', (req, res) => {
  const { empleado, desde, hasta } = req.query;
  
  let query = `
    SELECT s.*, g.descripcion as producto_nombre
    FROM salidas_inventario s
    JOIN gastos g ON s.gasto_id = g.id
    WHERE 1=1
  `;
  const params = [];
  
  if (empleado && empleado.trim() !== '') {
    query += " AND LOWER(s.empleado) LIKE ?";
    params.push(`%${empleado.toLowerCase()}%`);
  }
  
  if (desde) {
    query += " AND s.fecha_salida >= ?";
    params.push(desde);
  }
  
  if (hasta) {
    query += " AND s.fecha_salida <= ?";
    params.push(hasta);
  }
  
  query += " ORDER BY s.fecha_salida DESC, s.id DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al filtrar salidas" });
    res.json(rows);
  });
});

// Obtener empleados para el selector (desde la tabla empleados)
app.get('/api/empleados-lista', (req, res) => {
  db.all("SELECT nombre FROM empleados ORDER BY nombre", [], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener empleados" });
    res.json(rows.map(emp => emp.nombre));
  });
});

// 1. NUEVA FUNCIÓN PARA OBTENER GASTOS DEL DÍA
function obtenerGastosDelDia(fecha, responsable) {
  console.log('💸 Obteniendo gastos del día...');
  
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        id,
        fecha,
        categoria,
        descripcion,
        monto
      FROM gastos 
      WHERE fecha = ?
    `;
    const params = [fecha];

    query += ` ORDER BY categoria ASC, id ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error en gastos:', err.message);
        reject(new Error(`Error gastos: ${err.message}`));
      } else {
        console.log(`✅ Gastos encontrados: ${rows.length}`);
        resolve(rows || []);
      }
    });
  });
}

// 2. FUNCIÓN PARA CONSTRUIR TABLA DE GASTOS
function construirTablaGastosCompleta(gastos) {
  if (!gastos || gastos.length === 0) {
    return `<tr><td colspan="3" style="text-align: center; color: #666;">No hay gastos registrados</td></tr>`;
  }
  
  // ========================================
  // AGRUPAR GASTOS POR CATEGORÍA
  // ========================================
  const gastosAgrupados = {};
  
  gastos.forEach(gasto => {
    const categoria = gasto.categoria || 'Sin categoría';
    
    if (!gastosAgrupados[categoria]) {
      gastosAgrupados[categoria] = {
        categoria: categoria,
        cantidad: 0,
        total: 0,
        detalles: []
      };
    }
    
    gastosAgrupados[categoria].cantidad += 1;
    gastosAgrupados[categoria].total += parseFloat(gasto.monto || 0);
    gastosAgrupados[categoria].detalles.push(gasto.descripcion);
  });
  
  console.log('✅ Gastos agrupados por categoría:', gastosAgrupados);
  
  // ========================================
  // CONSTRUIR FILAS HTML
  // ========================================
  let filas = '';
  let totalGeneral = 0;
  
  // Ordenar por categoría
  const categoriasOrdenadas = Object.values(gastosAgrupados).sort((a, b) => 
    a.categoria.localeCompare(b.categoria)
  );
  
  categoriasOrdenadas.forEach(grupo => {
    totalGeneral += grupo.total;
    
    // Limitar detalles para que no sea muy largo
    const detallesLimitados = grupo.detalles.slice(0, 3);
    const detallesTexto = detallesLimitados.join(', ');
    const masDetalles = grupo.detalles.length > 3 ? ` (+${grupo.detalles.length - 3} más)` : '';
    
    filas += `
      <tr>
        <td>${grupo.categoria}</td>
        <td style="text-align: center;">${detallesTexto}${masDetalles}</td>
        <td style="text-align: center;">$${grupo.total.toFixed(2)}</td>
      </tr>
    `;
  });
  
  // Agregar fila de total
  filas += `
    <tr style="background-color: #f8d7da; font-weight: bold; border-top: 2px solid #dc3545; color: #721c24;">
      <td>TOTAL GASTOS</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center;">$${totalGeneral.toFixed(2)}</td>
    </tr>
  `;
  
  console.log(`✅ Gastos procesados: ${categoriasOrdenadas.length} categorías, total: $${totalGeneral.toFixed(2)}`);
  
  return filas;
}





// Total de ventas por mes y año
app.get('/api/ventas', (req, res) => {
  const { mes, anio } = req.query;
  
  // Usando LIKE para buscar el patrón de fecha en formato DD/MM/YYYY
  const patronFecha = `%/${mes}/${anio}`;
  
  const sql = `
    SELECT SUM(total) as total 
    FROM facturas 
    WHERE fecha LIKE ?
  `;
  
  db.get(sql, [patronFecha], (err, row) => {
    if (err) {
      console.error("Error al consultar ventas mensuales:", err);
      return res.status(500).json({ error: 'Error al obtener ventas' });
    }
    res.json({ total: row && row.total ? row.total : 0 });
  });
});

// Endpoints para METAS
// ===========================================

// 1. Asegúrate de que estas rutas estén correctamente definidas en tu archivo servergeneral.js

// Endpoint para obtener una meta específica
app.get('/api/metas', (req, res) => {
  const { mes, anio } = req.query;
  
  // Validación de parámetros
  if (!mes || !anio) {
    console.log('Error: Faltan parámetros mes o año');
    return res.status(400).json({ error: 'Mes y año son requeridos' });
  }
  
  console.log(`Consultando meta para ${mes} ${anio}`);
  
  db.get(
    `SELECT * FROM metas WHERE mes = ? AND anio = ?`,
    [mes, anio],
    (err, row) => {
      if (err) {
        console.error('Error al consultar meta:', err);
        return res.status(500).json({ error: 'Error al consultar la meta' });
      }
      
      console.log('Resultado de consulta:', row);
      res.json({ monto: row ? row.monto : 0 });
    }
  );
});

// Endpoint para guardar/actualizar metas
app.post('/api/metas', (req, res) => {
  console.log('Recibida solicitud POST para guardar meta:', req.body);
  
  const { mes, anio, monto } = req.body;
  
  // Validación básica
  if (!mes || !anio || isNaN(monto)) {
    console.log('Error: Datos inválidos', { mes, anio, monto });
    return res.status(400).json({ error: 'Datos inválidos. Por favor verifica la información.' });
  }
  
  console.log(`Intentando guardar meta: ${mes} ${anio} = $${monto}`);
  
  // Verificar si ya existe la meta para mes y año
  db.get(
    `SELECT * FROM metas WHERE mes = ? AND anio = ?`,
    [mes, anio],
    (err, row) => {
      if (err) {
        console.error('Error al verificar meta existente:', err);
        return res.status(500).json({ error: 'Error al verificar meta existente' });
      }
      
      console.log('¿Existe meta previa?', row ? 'Sí' : 'No');
      
      if (row) {
        // Si existe, actualizar
        db.run(
          `UPDATE metas SET monto = ? WHERE mes = ? AND anio = ?`,
          [monto, mes, anio],
          function(err) {
            if (err) {
              console.error('Error al actualizar meta:', err);
              return res.status(500).json({ error: 'Error al actualizar meta' });
            }
            
            console.log('Meta actualizada con éxito');
            res.json({ 
              message: 'Meta actualizada correctamente',
              mes,
              anio,
              monto
            });
          }
        );
      } else {
        // Si no existe, insertar
        db.run(
          `INSERT INTO metas (mes, anio, monto) VALUES (?, ?, ?)`,
          [mes, anio, monto],
          function(err) {
            if (err) {
              console.error('Error al guardar meta:', err);
              return res.status(500).json({ error: 'Error al guardar meta' });
            }
            
            console.log('Meta guardada con éxito. ID:', this.lastID);
            res.json({ 
              message: 'Meta guardada exitosamente',
              mes,
              anio,
              monto
            });
          }
        );
      }
    }
  );
});

// Endpoint para obtener todas las metas (opcional, para reportes)
app.get('/api/metas/todas', (req, res) => {
  const { anio } = req.query;
  
  let query = 'SELECT * FROM metas';
  let params = [];
  
  if (anio) {
    query += ' WHERE anio = ?';
    params.push(anio);
  }
  
  query += ' ORDER BY anio DESC, mes ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error al consultar todas las metas:', err);
      return res.status(500).json({ error: 'Error al consultar metas' });
    }
    
    res.json({ metas: rows || [] });
  });
});

// 2. Endpoint para API de ventas (necesario para el funcionamiento completo)
app.get('/api/ventas', (req, res) => {
  const { mes, anio } = req.query;
  
  // Validación de parámetros
  if (!mes || !anio) {
    return res.status(400).json({ error: 'Mes y año son requeridos' });
  }
  
  // Obtener primer y último día del mes para el filtro
  const primerDia = `${anio}-${mes}-01`;
  const ultimoDia = `${anio}-${mes}-31`; // Esto funciona aunque el mes no tenga 31 días
  
  console.log(`Consultando ventas desde ${primerDia} hasta ${ultimoDia}`);
  
  // Consulta que suma todas las ventas del mes
  db.get(
    `SELECT SUM(total) as total FROM facturas WHERE fecha >= ? AND fecha <= ?`,
    [primerDia, ultimoDia],
    (err, row) => {
      if (err) {
        console.error('Error al consultar ventas:', err);
        return res.status(500).json({ error: 'Error al consultar ventas' });
      }
      
      console.log('Resultado de consulta de ventas:', row);
      res.json({ total: row && row.total ? row.total : 0 });
    }
  );
});




// ========================================
// ENDPOINTS DE DESCUENTOS
// ========================================

// POST - Registrar nuevo descuento
app.post('/api/descuentos', (req, res) => {
  const { fecha, dui, monto, motivo } = req.body;
  
  console.log('💸 === REGISTRANDO DESCUENTO ===');
  console.log('📋 Datos recibidos:', { fecha, dui, monto, motivo });
  
  // Validaciones básicas
  if (!fecha || !dui || !monto || !motivo) {
    console.log('❌ Faltan campos obligatorios');
    return res.status(400).json({ 
      mensaje: "Todos los campos son obligatorios",
      campos_requeridos: ["fecha", "dui", "monto", "motivo"]
    });
  }
  
  // Validar monto
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    console.log('❌ Monto inválido:', monto);
    return res.status(400).json({ mensaje: "El monto debe ser un número mayor a cero" });
  }
  
  // Validar DUI básico
  if (!dui.match(/^\d{8}-\d$/)) {
    console.log('❌ Formato de DUI inválido:', dui);
    return res.status(400).json({ mensaje: "Formato de DUI inválido. Use el formato: 12345678-9" });
  }
  
  // Convertir fecha para la base de datos (asegurar formato DD/MM/YYYY)
  let fechaParaBD;
  try {
    fechaParaBD = convertirFechaISOaCentroamericana(fecha);
    console.log('📅 Fecha convertida para BD:', fechaParaBD);
    
    // Validar que la fecha convertida sea válida
    if (!fechaParaBD || fechaParaBD === fecha) {
      // Si no se pudo convertir o ya estaba en formato correcto, validar que sea válida
      if (!validarFormatoFecha(fechaParaBD)) {
        throw new Error('Formato de fecha inválido');
      }
    }
  } catch (error) {
    console.log('❌ Error al procesar fecha:', error.message);
    return res.status(400).json({ mensaje: "Formato de fecha inválido. Use DD/MM/YYYY o seleccione desde el calendario." });
  }
  
  // Verificar que el empleado existe
  db.get("SELECT nombre FROM empleados WHERE dui = ?", [dui], (err, empleado) => {
    if (err) {
      console.error('❌ Error al verificar empleado:', err.message);
      return res.status(500).json({ mensaje: "Error al verificar empleado" });
    }
    
    if (!empleado) {
      console.log('❌ Empleado no encontrado:', dui);
      return res.status(404).json({ mensaje: "No se encontró un empleado con ese DUI" });
    }
    
    console.log('👤 Empleado encontrado:', empleado.nombre);
    
    // Insertar descuento en la base de datos
    db.run(
      `INSERT INTO descuentos (fecha, dui, monto, motivo) VALUES (?, ?, ?, ?)`,
      [fechaParaBD, dui, montoNum, motivo],
      function (err) {
        if (err) {
          console.error('❌ Error al insertar descuento:', err.message);
          return res.status(500).json({ mensaje: "Error al registrar descuento en la base de datos" });
        }
        
        console.log('✅ Descuento registrado exitosamente:');
        console.log('   - ID:', this.lastID);
        console.log('   - Empleado:', empleado.nombre);
        console.log('   - Fecha:', fechaParaBD);
        console.log('   - Monto: $' + montoNum.toFixed(2));
        console.log('   - Motivo:', motivo);
        
        res.status(201).json({ 
          mensaje: `Descuento de $${montoNum.toFixed(2)} registrado correctamente para ${empleado.nombre}`,
          descuento: {
            id: this.lastID,
            empleado: empleado.nombre,
            fecha: fechaParaBD,
            monto: montoNum,
            motivo: motivo
          }
        });
      }
    );
  });
});

// (Endpoint duplicado eliminado - se mantiene solo el del módulo de salarios línea 3411)

// GET - Obtener un descuento específico por ID para edición
app.get('/api/descuentos/detalle/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🔍 === OBTENIENDO DESCUENTO PARA EDICIÓN ===');
  console.log('📋 ID del descuento:', id);
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ mensaje: "ID de descuento inválido" });
  }
  
  const query = `
    SELECT d.*, e.nombre as nombre_empleado 
    FROM descuentos d 
    LEFT JOIN empleados e ON d.dui = e.dui 
    WHERE d.id = ?
  `;
  
  db.get(query, [id], (err, descuento) => {
    if (err) {
      console.error('❌ Error al consultar descuento:', err.message);
      return res.status(500).json({ mensaje: "Error al obtener descuento" });
    }
    
    if (!descuento) {
      console.log('❌ Descuento no encontrado:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    console.log('✅ Descuento encontrado:', descuento.nombre_empleado);
    res.json(descuento);
  });
});

// PUT - Actualizar un descuento existente
app.put('/api/descuentos/:id', (req, res) => {
  const { id } = req.params;
  const { fecha, dui, monto, motivo } = req.body;
  
  console.log('✏️ === ACTUALIZANDO DESCUENTO ===');
  console.log('📋 ID del descuento:', id);
  console.log('📋 Nuevos datos:', { fecha, dui, monto, motivo });
  
  // Validaciones básicas
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ mensaje: "ID de descuento inválido" });
  }
  
  if (!fecha || !dui || !monto || !motivo) {
    console.log('❌ Faltan campos obligatorios');
    return res.status(400).json({ 
      mensaje: "Todos los campos son obligatorios",
      campos_requeridos: ["fecha", "dui", "monto", "motivo"]
    });
  }
  
  // Validar monto
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    console.log('❌ Monto inválido:', monto);
    return res.status(400).json({ mensaje: "El monto debe ser un número mayor a cero" });
  }
  
  // Validar DUI básico
  if (!dui.match(/^\d{8}-\d$/)) {
    console.log('❌ Formato de DUI inválido:', dui);
    return res.status(400).json({ mensaje: "Formato de DUI inválido. Use el formato: 12345678-9" });
  }
  
  // Convertir fecha para la base de datos
  let fechaParaBD;
  try {
    fechaParaBD = convertirFechaISOaCentroamericana(fecha);
    console.log('📅 Fecha convertida para BD:', fechaParaBD);
    
    if (!validarFormatoFecha(fechaParaBD)) {
      throw new Error('Formato de fecha inválido');
    }
  } catch (error) {
    console.log('❌ Error al procesar fecha:', error.message);
    return res.status(400).json({ mensaje: "Formato de fecha inválido" });
  }
  
  // Verificar que el descuento existe
  db.get("SELECT * FROM descuentos WHERE id = ?", [id], (err, descuentoExistente) => {
    if (err) {
      console.error('❌ Error al verificar descuento existente:', err.message);
      return res.status(500).json({ mensaje: "Error al verificar descuento" });
    }
    
    if (!descuentoExistente) {
      console.log('❌ Descuento no encontrado para actualizar:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    // Verificar que el empleado existe
    db.get("SELECT nombre FROM empleados WHERE dui = ?", [dui], (err, empleado) => {
      if (err) {
        console.error('❌ Error al verificar empleado:', err.message);
        return res.status(500).json({ mensaje: "Error al verificar empleado" });
      }
      
      if (!empleado) {
        console.log('❌ Empleado no encontrado:', dui);
        return res.status(404).json({ mensaje: "No se encontró un empleado con ese DUI" });
      }
      
      console.log('👤 Empleado encontrado:', empleado.nombre);
      
      // Actualizar el descuento
      db.run(
        `UPDATE descuentos SET fecha = ?, dui = ?, monto = ?, motivo = ? WHERE id = ?`,
        [fechaParaBD, dui, montoNum, motivo, id],
        function (err) {
          if (err) {
            console.error('❌ Error al actualizar descuento:', err.message);
            return res.status(500).json({ mensaje: "Error al actualizar descuento en la base de datos" });
          }
          
          if (this.changes === 0) {
            console.log('⚠️ No se realizaron cambios en el descuento:', id);
            return res.status(404).json({ mensaje: "No se pudo actualizar el descuento" });
          }
          
          console.log('✅ Descuento actualizado exitosamente');
          
          res.json({ 
            mensaje: `Descuento actualizado correctamente para ${empleado.nombre}`,
            descuento_actualizado: {
              id: parseInt(id),
              empleado: empleado.nombre,
              dui: dui,
              fecha: fechaParaBD,
              monto: montoNum,
              motivo: motivo
            }
          });
        }
      );
    });
  });
});

// DELETE - Eliminar descuento
app.delete('/api/descuentos/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🗑️ === ELIMINANDO DESCUENTO ===');
  console.log('📋 ID del descuento:', id);
  
  // Primero obtener información del descuento antes de eliminarlo
  db.get("SELECT d.*, e.nombre as nombre_empleado FROM descuentos d LEFT JOIN empleados e ON d.dui = e.dui WHERE d.id = ?", [id], (err, descuento) => {
    if (err) {
      console.error('❌ Error al buscar descuento:', err.message);
      return res.status(500).json({ mensaje: "Error al buscar descuento" });
    }
    
    if (!descuento) {
      console.log('❌ Descuento no encontrado:', id);
      return res.status(404).json({ mensaje: "Descuento no encontrado" });
    }
    
    // Eliminar el descuento
    db.run("DELETE FROM descuentos WHERE id = ?", [id], function(err) {
      if (err) {
        console.error('❌ Error al eliminar descuento:', err.message);
        return res.status(500).json({ mensaje: "Error al eliminar descuento" });
      }
      
      console.log('✅ Descuento eliminado exitosamente');
      
      res.json({ 
        mensaje: `Descuento de $${descuento.monto} eliminado correctamente`,
        descuento_eliminado: {
          id: descuento.id,
          empleado: descuento.nombre_empleado,
          monto: descuento.monto,
          motivo: descuento.motivo
        }
      });
    });
  });
});



// ========================================
// REEMPLAZA COMPLETAMENTE EL ENDPOINT /api/boleta/:dui en servergeneral.js
// Líneas aproximadas 2076-2113
// ========================================




app.get('/api/cierre-completo', async (req, res) => {
  const { fecha, responsable } = req.query;

  console.log('🔍 === CIERRE COMPLETO CON GASTOS - ENDPOINT ===');
  console.log('📅 Fecha recibida:', fecha);
  console.log('👤 Responsable:', responsable);
  console.log('🕐 Timestamp:', new Date().toISOString());

  res.setHeader('Content-Type', 'application/json');

  if (!fecha) {
    console.log('❌ Fecha no proporcionada');
    return res.status(400).json({ 
      error: true,
      mensaje: "Fecha es requerida",
      codigo: "FECHA_REQUERIDA"
    });
  }

  try {
    console.log('🚀 Iniciando consultas...');

    // Ejecutar consultas de forma secuencial
    console.log('💳 Consultando ventas...');
    const ventasData = await obtenerVentasPorTipoPago(fecha, responsable);
    console.log(`✅ Ventas obtenidas: ${ventasData.length} registros`);

    console.log('✂️ Consultando servicios...');
    const serviciosData = await obtenerDetalleServicios(fecha, responsable);
    console.log(`✅ Servicios obtenidos: ${serviciosData.length} registros`);

    console.log('🛍️ Consultando productos...');
    const productosData = await obtenerDetalleProductos(fecha, responsable);
    console.log(`✅ Productos obtenidos: ${productosData.length} registros`);

    console.log('💰 Consultando comisiones...');
    const comisionesData = await obtenerComisionesPorEmpleado(fecha, responsable);
    console.log(`✅ Comisiones obtenidas: ${comisionesData.length} registros`);

    // ========================================
    // NUEVA: CONSULTAR GASTOS DEL DÍA
    // ========================================
    console.log('💸 Consultando gastos...');
    const gastosData = await obtenerGastosDelDia(fecha, responsable);
    console.log(`✅ Gastos obtenidos: ${gastosData.length} registros`);

    // Calcular resumen con rangos y gastos
    console.log('📊 Calculando resumen ejecutivo con gastos...');
    const resumen = calcularResumenEjecutivoConGastos(ventasData, serviciosData, productosData, comisionesData, gastosData);

    // Respuesta estructurada
    const respuesta = {
      success: true,
      fecha: fecha,
      responsable: responsable || 'Todos',
      sucursal: 'Escalón',
      timestamp: new Date().toISOString(),
      
      ventas: ventasData || [],
      servicios: serviciosData || [],
      productos: productosData || [],
      comisiones: comisionesData || [],
      gastos: gastosData || [], // ⬅️ NUEVO
      resumen: resumen || {},
      
      debug: {
        formato_fecha: detectarFormatoFecha(fecha),
        total_ventas: (ventasData || []).length,
        total_servicios: (serviciosData || []).length,
        total_productos: (productosData || []).length,
        total_comisiones: (comisionesData || []).length,
        total_gastos: (gastosData || []).length // ⬅️ NUEVO
      }
    };

    console.log('✅ Cierre completo con gastos generado exitosamente');
    res.json(respuesta);

  } catch (error) {
    console.error('❌ Error crítico en cierre completo:', error);
    
    res.status(500).json({ 
      success: false,
      error: true,
      mensaje: "Error al generar cierre completo", 
      detalle: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fecha: fecha,
      timestamp: new Date().toISOString()
    });
  }
});

// ========================================
// 4. NUEVA FUNCIÓN DE RESUMEN CON GASTOS
// ========================================

function calcularResumenEjecutivoConGastos(ventas, servicios, productos, comisiones, gastos) {
  console.log('📊 Calculando resumen ejecutivo con gastos...');
  
  // Calcular totales de ventas
  let ingresosTotales = 0;
  let totalTransacciones = ventas.length;
  
  ventas.forEach(venta => {
    ingresosTotales += parseFloat(venta.total || 0);
  });

  // Calcular total de comisiones
  let totalComisiones = 0;
  comisiones.forEach(comision => {
    totalComisiones += parseFloat(comision.total_comision || 0);
  });

  // ========================================
  // NUEVO: CALCULAR TOTAL DE GASTOS
  // ========================================
  let totalGastos = 0;
  gastos.forEach(gasto => {
    totalGastos += parseFloat(gasto.monto || 0);
  });

  // Calcular utilidad neta REAL (con gastos)
  const utilidadNeta = ingresosTotales - totalComisiones - totalGastos;
  
  // Calcular venta promedio
  const ventaPromedio = totalTransacciones > 0 ? ingresosTotales / totalTransacciones : 0;
  
  // Calcular margen de utilidad REAL
  const margenUtilidad = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;

  // Calcular rangos de comandas y facturas
  const rangos = calcularRangosComandaFactura(ventas);

  const resumen = {
    ingresos_totales: ingresosTotales,
    total_transacciones: totalTransacciones,
    total_comisiones: totalComisiones,
    total_gastos: totalGastos, // ⬅️ NUEVO
    utilidad_neta: utilidadNeta, // ⬅️ AHORA INCLUYE GASTOS
    venta_promedio: ventaPromedio,
    margen_utilidad: margenUtilidad, // ⬅️ MARGEN REAL
    rangos_comandas: rangos.comandas,
    rangos_facturas: rangos.facturas
  };

  console.log('✅ Resumen ejecutivo con gastos calculado:', resumen);
  return resumen;
}
// ========================================
// FUNCIONES DE CONSULTA DE DATOS
// ========================================

function obtenerVentasPorTipoPago(fecha, responsable) {
  console.log('💳 Obteniendo ventas por tipo de pago...');
  
  return new Promise((resolve, reject) => {
    const consultas = [];

    // 1. Facturas del día
    let queryFacturas = `
      SELECT 
        'factura' as tipo_registro,
        tipo_pago, 
        total, 
        fecha, 
        empleado_principal,
        factura,
        comanda,
        cliente,
        es_pago_mixto,
        monto_efectivo,
        monto_tarjeta
      FROM facturas 
      WHERE fecha = ?
    `;
    const paramsFacturas = [fecha];

    if (responsable && responsable.trim() !== '') {
      queryFacturas += ` AND empleado_principal = ?`;
      paramsFacturas.push(responsable.trim());
    }

    queryFacturas += ` ORDER BY factura ASC`;

    consultas.push(new Promise((res, rej) => {
      db.all(queryFacturas, paramsFacturas, (err, rows) => {
        if (err) {
          console.error('❌ Error en facturas:', err.message);
          rej(new Error(`Error facturas: ${err.message}`));
        } else {
          console.log(`✅ Facturas encontradas: ${rows.length}`);
          res(rows || []);
        }
      });
    }));

    // 2. Membresías del día
    const queryMembresias = `
      SELECT 
        'membresia' as tipo_registro,
        tipo_pago, 
        monto as total, 
        fecha_inicio, 
        nombre,
        NULL as factura,
        NULL as comanda
      FROM clientes 
      WHERE membresia = 'Activo' 
      AND fecha_inicio = ? 
      AND monto > 0
    `;

    consultas.push(new Promise((res, rej) => {
      db.all(queryMembresias, [fecha], (err, rows) => {
        if (err) {
          console.error('❌ Error en membresías:', err.message);
          rej(new Error(`Error membresías: ${err.message}`));
        } else {
          console.log(`✅ Membresías encontradas: ${rows.length}`);
          res(rows || []);
        }
      });
    }));

    // Ejecutar consultas
    Promise.all(consultas)
      .then(([facturas, membresias]) => {
        const ventas = [...facturas, ...membresias];
        console.log(`✅ Total ventas combinadas: ${ventas.length}`);
        resolve(ventas);
      })
      .catch(error => {
        console.error('❌ Error en obtenerVentasPorTipoPago:', error);
        reject(error);
      });
  });
}

function obtenerDetalleServicios(fecha, responsable) {
  console.log('✂️ Obteniendo detalle de servicios con información de cliente...');
  
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        dc.id,
        dc.nombre,
        dc.codigo,
        dc.cantidad,
        dc.total,
        dc.comision,
        dc.empleado,
        dc.factura,
        dc.comanda,
        dc.fecha,
        (dc.total / NULLIF(dc.cantidad, 0)) as precio_unitario,
        f.cliente,
        f.descuento,
        c.precio as precio_original,
        -- Detectar si es corte gratis
        CASE 
          WHEN dc.total = 0 AND dc.cantidad > 0 THEN 1
          WHEN f.descuento LIKE '%GRATIS%' OR f.descuento LIKE '%gratis%' THEN 1
          WHEN f.descuento LIKE '%FIDELIDAD%' OR f.descuento LIKE '%fidelidad%' THEN 1
          WHEN f.descuento LIKE '%10%' AND f.descuento LIKE '%sello%' THEN 1
          ELSE 0
        END as descuento_gratis
      FROM detalle_cortes dc
      LEFT JOIN facturas f ON dc.factura_id = f.id
      LEFT JOIN cortes c ON dc.codigo = c.codigo
      WHERE dc.fecha = ?
    `;
    const params = [fecha];

    if (responsable && responsable.trim() !== '') {
      query += ` AND dc.empleado = ?`;
      params.push(responsable.trim());
    }

    query += ` ORDER BY dc.factura ASC, dc.id ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error en servicios:', err.message);
        reject(new Error(`Error servicios: ${err.message}`));
      } else {
        console.log(`✅ Servicios encontrados: ${rows.length}`);
        // Debug de cortes gratis
        const cortesGratis = rows.filter(r => r.descuento_gratis === 1);
        console.log(`🎁 Cortes gratis detectados: ${cortesGratis.length}`);
        if (cortesGratis.length > 0) {
          console.log('🎁 Detalle de cortes gratis:', cortesGratis.map(c => ({
            nombre: c.nombre,
            cliente: c.cliente,
            total: c.total,
            precio_original: c.precio_original,
            descuento: c.descuento
          })));
        }
        resolve(rows || []);
      }
    });
  });
}

function obtenerDetalleProductos(fecha, responsable) {
  console.log('🛍️ Obteniendo detalle de productos...');
  
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        dp.id,
        dp.nombre,
        dp.codigo,
        dp.cantidad,
        dp.total,
        dp.comision,
        dp.empleado,
        dp.factura,
        dp.comanda,
        dp.fecha,
        (dp.total / NULLIF(dp.cantidad, 0)) as precio_unitario
      FROM detalle_productos dp
      WHERE dp.fecha = ?
    `;
    const params = [fecha];

    if (responsable && responsable.trim() !== '') {
      query += ` AND dp.empleado = ?`;
      params.push(responsable.trim());
    }

    query += ` ORDER BY dp.factura ASC, dp.id ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error en productos:', err.message);
        reject(new Error(`Error productos: ${err.message}`));
      } else {
        console.log(`✅ Productos encontrados: ${rows.length}`);
        resolve(rows || []);
      }
    });
  });
}

function obtenerComisionesPorEmpleado(fecha, responsable) {
  console.log('💰 Obteniendo comisiones por empleado...');
  
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        empleado,
        SUM(CASE WHEN tipo = 'servicio' THEN comision ELSE 0 END) as comision_servicios,
        SUM(CASE WHEN tipo = 'producto' THEN comision ELSE 0 END) as comision_productos,
        SUM(comision) as total_comision,
        COUNT(CASE WHEN tipo = 'servicio' THEN 1 END) as cantidad_servicios,
        COUNT(CASE WHEN tipo = 'producto' THEN 1 END) as cantidad_productos
      FROM (
        SELECT empleado, comision, 'servicio' as tipo FROM detalle_cortes WHERE fecha = ?
        UNION ALL
        SELECT empleado, comision, 'producto' as tipo FROM detalle_productos WHERE fecha = ?
      ) comisiones_union
    `;
    const params = [fecha, fecha];

    if (responsable && responsable.trim() !== '') {
      query += ` WHERE empleado = ?`;
      params.push(responsable.trim());
    }

    query += ` GROUP BY empleado ORDER BY total_comision DESC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error en comisiones:', err.message);
        reject(new Error(`Error comisiones: ${err.message}`));
      } else {
        console.log(`✅ Comisiones encontradas para ${rows.length} empleados`);
        resolve(rows || []);
      }
    });
  });
}

// ========================================
// FUNCIÓN PARA CALCULAR RESUMEN EJECUTIVO
// ========================================

function calcularResumenEjecutivo(ventas, servicios, productos, comisiones) {
  console.log('📊 Calculando resumen ejecutivo...');
  
  // Calcular totales de ventas
  let ingresosTotales = 0;
  let totalTransacciones = ventas.length;
  
  ventas.forEach(venta => {
    ingresosTotales += parseFloat(venta.total || 0);
  });

  // Calcular total de comisiones
  let totalComisiones = 0;
  comisiones.forEach(comision => {
    totalComisiones += parseFloat(comision.total_comision || 0);
  });

  // Calcular utilidad neta
  const utilidadNeta = ingresosTotales - totalComisiones;
  
  // Calcular venta promedio
  const ventaPromedio = totalTransacciones > 0 ? ingresosTotales / totalTransacciones : 0;
  
  // Calcular margen de utilidad
  const margenUtilidad = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;

  // Calcular rangos de comandas y facturas
  const rangos = calcularRangosComandaFactura(ventas);

  const resumen = {
    ingresos_totales: ingresosTotales,
    total_transacciones: totalTransacciones,
    total_comisiones: totalComisiones,
    utilidad_neta: utilidadNeta,
    venta_promedio: ventaPromedio,
    margen_utilidad: margenUtilidad,
    rangos_comandas: rangos.comandas,
    rangos_facturas: rangos.facturas
  };

  console.log('✅ Resumen ejecutivo calculado:', resumen);
  return resumen;
}

// ========================================
// FUNCIÓN PARA CALCULAR RANGOS
// ========================================

function calcularRangosComandaFactura(ventas) {
  console.log('📊 Calculando rangos de comandas y facturas...');
  
  const comandas = [];
  const facturas = [];

  ventas.forEach(venta => {
    if (venta.tipo_registro === 'factura') {
      // Extraer comandas
      if (venta.comanda) {
        const comandaNum = parseInt(venta.comanda);
        if (!isNaN(comandaNum) && comandaNum > 0) {
          comandas.push(comandaNum);
        }
      }
      
      // Extraer facturas
      if (venta.factura) {
        const facturaNum = parseInt(venta.factura);
        if (!isNaN(facturaNum) && facturaNum > 0) {
          facturas.push(facturaNum);
        }
      }
    }
  });

  const rangosComandas = {
    inicio: comandas.length > 0 ? Math.min(...comandas) : 0,
    fin: comandas.length > 0 ? Math.max(...comandas) : 0,
    total: comandas.length
  };

  const rangosFacturas = {
    inicio: facturas.length > 0 ? Math.min(...facturas) : 0,
    fin: facturas.length > 0 ? Math.max(...facturas) : 0,
    total: facturas.length
  };

  console.log('✅ Rangos calculados:', { comandas: rangosComandas, facturas: rangosFacturas });

  return {
    comandas: rangosComandas,
    facturas: rangosFacturas
  };
}

// ========================================
// ENDPOINT PARA GENERAR PDF DE CIERRE
// ========================================

app.post('/api/generar-pdf-cierre', async (req, res) => {
  console.log('🎯 === ENDPOINT: Generar PDF de Cierre ===');
  
  try {
    const datosCierre = req.body;
    console.log('📊 Datos recibidos para PDF de cierre');
    
    // Validar datos requeridos
    if (!datosCierre.fecha || !datosCierre.responsable) {
      return res.status(400).json({ 
        error: 'Faltan datos obligatorios: fecha y responsable son requeridos' 
      });
    }
    
    // Generar el PDF
    const resultadoPDF = await generarPDFCierreCompleto(datosCierre);
    
    console.log('✅ PDF de cierre generado exitosamente:', resultadoPDF.nombreArchivo);
    
    res.json({
      mensaje: 'PDF de cierre generado exitosamente',
      archivo: resultadoPDF.nombreArchivo,
      ruta: resultadoPDF.rutaCompleta
    });
    
  } catch (error) {
    console.error('❌ Error al generar PDF de cierre:', error);
    res.status(500).json({ 
      error: 'Error interno al generar PDF de cierre',
      detalle: error.message 
    });
  }
});

// ========================================
// FUNCIONES PARA GENERAR PDF
// ========================================

async function generarPDFCierreCompleto(datosCierre) {
  console.log('📄 Iniciando generación de PDF de cierre...');
  
  try {
    // 1. Cargar la plantilla HTML
    const plantillaHTML = await cargarPlantillaCierre();
    
    // 2. Procesar los datos y reemplazar variables
    const htmlProcesado = await procesarPlantillaCierre(plantillaHTML, datosCierre);
    
    // 3. Generar el PDF usando Playwright
    const resultadoPDF = await generarPDFConPlaywright(htmlProcesado, datosCierre);
    
    return resultadoPDF;
    
  } catch (error) {
    console.error('❌ Error en generación de PDF de cierre:', error);
    throw error;
  }
}

async function cargarPlantillaCierre() {
  console.log('📂 Cargando plantilla de cierre...');
  
  const rutaPlantilla = path.join(__dirname, 'cierre', 'plantilla-cierre.html');
  
  // Verificar si existe la plantilla
  if (!fs.existsSync(rutaPlantilla)) {
    console.log('⚠️ Plantilla no encontrada, creando plantilla por defecto...');
    await crearPlantillaPorDefecto(rutaPlantilla);
  }
  
  try {
    const plantillaHTML = fs.readFileSync(rutaPlantilla, 'utf8');
    console.log('✅ Plantilla cargada exitosamente');
    return plantillaHTML;
  } catch (error) {
    console.error('❌ Error al leer plantilla:', error);
    throw new Error('No se pudo cargar la plantilla de cierre');
  }
}

async function crearPlantillaPorDefecto(rutaArchivo) {
  console.log('📝 Creando plantilla de cierre por defecto...');
  
  // Crear directorio si no existe
  const directorioPlantilla = path.dirname(rutaArchivo);
  if (!fs.existsSync(directorioPlantilla)) {
    fs.mkdirSync(directorioPlantilla, { recursive: true });
  }
  
  const plantillaPorDefecto = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cierre de Caja - Barba Negra</title>
  <style>
    body { font-family: 'Calibri', sans-serif; margin: 0; padding: 30px; color: #444; }
    .factura { max-width: 800px; margin: auto; background: white; padding: 30px; }
    .header { text-align: center; margin-bottom: 20px; }
    .titulo { padding: 10px 20px; border: 1px solid #8B7355; color: #8B7355; font-size: 18px; }
    .datos { display: flex; justify-content: space-between; margin: 25px 0; }
    .seccion-titulo { font-size: 18px; color: #8B7355; margin-bottom: 15px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { color: #8B7355; font-weight: normal; text-transform: uppercase; border-bottom: 2px solid #8B7355; }
    .resumen-financiero { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; font-size: 14px; color: #777; }
  </style>
</head>
<body>
  <div class="factura">
    <div class="header">
      <img src="{{logo_src}}" alt="Logo" style="height:80px;width:80px;border-radius:50%;" />
      <h1>Barba Negra</h1>
      <div class="titulo">Cierre de Caja del {{fecha}}</div>
    </div>
    
    <div class="datos">
      <div><strong>Fecha:</strong> {{fecha}}</div>
      <div><strong>Responsable:</strong> {{responsable}}</div>
    </div>

    <div class="resumen-financiero">
      <div class="seccion-titulo">Resumen del Día</div>
      <div>Total Ingresos: ${{ingresos_totales}}</div>
      <div>Total Comisiones: ${{total_comisiones}}</div>
      <div>Utilidad Neta: ${{utilidad_neta}}</div>
    </div>

    {{detalle_servicios}}
    {{detalle_productos}}
    {{detalle_comisiones}}

    <div class="footer">
      <div>Sistema de Gestión - Barba Negra</div>
      <div>Generado: {{timestamp}}</div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(rutaArchivo, plantillaPorDefecto, 'utf8');
  console.log('✅ Plantilla por defecto creada');
}

async function procesarPlantillaCierre(plantillaHTML, datosCierre) {
  console.log('🔄 === PROCESANDO NUEVA PLANTILLA DE CIERRE ===');
  
  try {
    // ========================================
    // PROCESAR LOGO
    // ========================================
    let logoHTML = '';
    try {
      const logoPath = path.join(__dirname, 'imagenes', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logoB64 = fs.readFileSync(logoPath, 'base64');
        logoHTML = `<img src="data:image/jpeg;base64,${logoB64}" alt="Logo Barba Negra" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        logoHTML = `<div style="width: 100%; height: 100%; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">BN</div>`;
      }
    } catch (error) {
      console.warn('⚠️ Error cargando logo:', error.message);
      logoHTML = `<div style="width: 100%; height: 100%; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">BN</div>`;
    }

    // ========================================
    // GENERAR TABLA DE VENTAS
    // ========================================
    let tablaVentas = '';
    if (datosCierre.ventas && datosCierre.ventas.length > 0) {
      datosCierre.ventas.forEach(venta => {
        tablaVentas += `
          <tr>
            <td>#${venta.factura || 'N/A'}</td>
            <td>${venta.comanda || 'N/A'}</td>
            <td>${venta.cliente || 'Cliente General'}</td>
            <td>${venta.empleado || 'N/A'}</td>
            <td><span class="status-badge ${venta.tipo_pago === 'Efectivo' ? 'status-success' : venta.tipo_pago === 'Tarjeta' ? 'status-warning' : 'status-error'}">${venta.tipo_pago || 'N/A'}</span></td>
            <td class="numeric positive">$${parseFloat(venta.total || 0).toFixed(2)}</td>
          </tr>`;
      });
    } else {
      tablaVentas = '<tr><td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">No hay ventas registradas</td></tr>';
    }

    // ========================================
    // GENERAR TABLA DE SERVICIOS
    // ========================================
    let tablaServicios = '';
    if (datosCierre.servicios && datosCierre.servicios.length > 0) {
      datosCierre.servicios.forEach(servicio => {
        const esGratis = parseFloat(servicio.total || 0) === 0;
        tablaServicios += `
          <tr>
            <td>${servicio.tipo_corte || servicio.nombre || 'N/A'}</td>
            <td>${servicio.cliente || 'Cliente General'}</td>
            <td>${servicio.empleado || 'N/A'}</td>
            <td class="numeric">${esGratis ? '<span class="status-error">GRATIS</span>' : '$' + parseFloat(servicio.precio_unitario || 0).toFixed(2)}</td>
            <td class="numeric">${servicio.cantidad || 1}</td>
            <td class="numeric ${esGratis ? 'neutral' : 'positive'}">${esGratis ? 'GRATIS' : '$' + parseFloat(servicio.total || 0).toFixed(2)}</td>
          </tr>`;
      });
    } else {
      tablaServicios = '<tr><td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">No hay servicios registrados</td></tr>';
    }

    // ========================================
    // GENERAR TABLA DE PRODUCTOS
    // ========================================
    let tablaProductos = '';
    if (datosCierre.productos && datosCierre.productos.length > 0) {
      datosCierre.productos.forEach(producto => {
        tablaProductos += `
          <tr>
            <td>${producto.nombre || 'N/A'}</td>
            <td>${producto.cliente || 'Cliente General'}</td>
            <td>${producto.empleado || 'N/A'}</td>
            <td class="numeric">$${parseFloat(producto.precio_unitario || 0).toFixed(2)}</td>
            <td class="numeric">${producto.cantidad || 1}</td>
            <td class="numeric positive">$${parseFloat(producto.total || 0).toFixed(2)}</td>
          </tr>`;
      });
    } else {
      tablaProductos = '<tr><td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">No hay productos registrados</td></tr>';
    }

    // ========================================
    // GENERAR TABLA DE COMISIONES
    // ========================================
    let tablaComisiones = '';
    let totalServiciosEmpleados = 0;
    let totalVentasEmpleados = 0;
    
    if (datosCierre.comisiones && datosCierre.comisiones.length > 0) {
      datosCierre.comisiones.forEach(comision => {
        totalServiciosEmpleados += parseInt(comision.total_servicios || 0);
        totalVentasEmpleados += parseFloat(comision.total_ventas || 0);
        
        tablaComisiones += `
          <tr>
            <td>${comision.empleado || 'N/A'}</td>
            <td class="numeric">${comision.total_servicios || 0}</td>
            <td class="numeric">$${parseFloat(comision.total_ventas || 0).toFixed(2)}</td>
            <td class="numeric positive">$${parseFloat(comision.total_comision || 0).toFixed(2)}</td>
          </tr>`;
      });
    } else {
      tablaComisiones = '<tr><td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">No hay comisiones registradas</td></tr>';
    }

    // ========================================
    // GENERAR TABLA DE GASTOS
    // ========================================
    let tablaGastos = '';
    if (datosCierre.gastos && datosCierre.gastos.length > 0) {
      datosCierre.gastos.forEach(gasto => {
        tablaGastos += `
          <tr>
            <td>${gasto.descripcion || 'N/A'}</td>
            <td>${gasto.categoria || 'N/A'}</td>
            <td>${gasto.responsable || 'N/A'}</td>
            <td class="numeric negative">$${parseFloat(gasto.monto || 0).toFixed(2)}</td>
            <td><span class="status-badge ${gasto.estado === 'aprobado' ? 'status-success' : gasto.estado === 'pendiente' ? 'status-warning' : 'status-error'}">${gasto.estado || 'N/A'}</span></td>
          </tr>`;
      });
    } else {
      tablaGastos = '<tr><td colspan="5" style="text-align: center; color: #64748b; font-style: italic;">No hay gastos registrados</td></tr>';
    }

    // ========================================
    // FORMATEAR RANGOS
    // ========================================
    const rangoComandas = datosCierre.resumen_ejecutivo?.rangos_comandas ? 
      `#${datosCierre.resumen_ejecutivo.rangos_comandas.inicio} - #${datosCierre.resumen_ejecutivo.rangos_comandas.fin} (${datosCierre.resumen_ejecutivo.rangos_comandas.total} comandas)` : 'Sin comandas';
    
    const rangoFacturas = datosCierre.resumen_ejecutivo?.rangos_facturas ? 
      `#${datosCierre.resumen_ejecutivo.rangos_facturas.inicio} - #${datosCierre.resumen_ejecutivo.rangos_facturas.fin} (${datosCierre.resumen_ejecutivo.rangos_facturas.total} facturas)` : 'Sin facturas';

    // ========================================
    // ESTADO DEL CIERRE
    // ========================================
    const utilidadNeta = parseFloat(datosCierre.resumen_ejecutivo?.utilidad_neta || 0);
    let estadoCierre = '';
    if (utilidadNeta > 0) {
      estadoCierre = '<span class="status-success">Positivo</span>';
    } else if (utilidadNeta < 0) {
      estadoCierre = '<span class="status-error">Negativo</span>';
    } else {
      estadoCierre = '<span class="status-warning">Neutro</span>';
    }

    // ========================================
    // TIMESTAMP
    // ========================================
    const timestamp = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // ========================================
    // MAPEO DE VARIABLES PARA REEMPLAZO
    // ========================================
    const datosReemplazo = {
      // Información general
      fecha: datosCierre.fecha || new Date().toLocaleDateString('es-ES'),
      responsable: datosCierre.responsable || 'No especificado',
      hora_apertura: datosCierre.hora_apertura || 'No especificado',
      
      // Logo
      logo_placeholder: logoHTML,
      
      // Resumen ejecutivo
      ingresos_totales: parseFloat(datosCierre.resumen_ejecutivo?.ingresos_totales || 0).toFixed(2),
      total_transacciones: datosCierre.resumen_ejecutivo?.total_transacciones || 0,
      total_gastos: parseFloat(datosCierre.resumen_ejecutivo?.total_gastos || 0).toFixed(2),
      utilidad_neta: parseFloat(datosCierre.resumen_ejecutivo?.utilidad_neta || 0).toFixed(2),
      
      // Tablas generadas
      tabla_ventas: tablaVentas,
      tabla_servicios: tablaServicios,
      tabla_productos: tablaProductos,
      tabla_comisiones: tablaComisiones,
      tabla_gastos: tablaGastos,
      
      // Totales de tablas
      total_ventas: parseFloat(datosCierre.resumen_ejecutivo?.ingresos_totales || 0).toFixed(2),
      total_servicios: parseFloat(datosCierre.resumen_ejecutivo?.ingresos_servicios || 0).toFixed(2),
      total_productos: parseFloat(datosCierre.resumen_ejecutivo?.ingresos_productos || 0).toFixed(2),
      total_comisiones: parseFloat(datosCierre.resumen_ejecutivo?.total_comisiones || 0).toFixed(2),
      
      // Totales de empleados para comisiones
      total_servicios_empleados: totalServiciosEmpleados,
      total_ventas_empleados: totalVentasEmpleados.toFixed(2),
      
      // Rangos y control
      rango_comandas: rangoComandas,
      rango_facturas: rangoFacturas,
      estado_cierre: estadoCierre,
      
      // Observaciones y timestamp
      observaciones: datosCierre.observaciones || 'Sin observaciones especiales.',
      timestamp: timestamp
    };

    // ========================================
    // PROCESAR PLANTILLA HTML
    // ========================================
    let htmlProcesado = plantillaHTML;
    
    console.log('🔄 Reemplazando variables en plantilla...');
    console.log('📊 Variables disponibles:', Object.keys(datosReemplazo).length);
    
    // Reemplazar cada variable
    Object.entries(datosReemplazo).forEach(([variable, valor]) => {
      const marcador = `{{${variable}}}`;
      const regex = new RegExp(marcador.replace(/[{}]/g, '\\$&'), 'g');
      htmlProcesado = htmlProcesado.replace(regex, valor || '');
    });
    
    // ========================================
    // VERIFICAR Y LIMPIAR MARCADORES RESTANTES
    // ========================================
    const marcadoresRestantes = htmlProcesado.match(/\{\{[^}]+\}\}/g);
    if (marcadoresRestantes) {
      console.warn('⚠️ Marcadores sin reemplazar encontrados:', marcadoresRestantes.slice(0, 5));
      
      // Reemplazar marcadores restantes con valores por defecto
      marcadoresRestantes.forEach(marcador => {
        const variable = marcador.replace(/[{}]/g, '');
        let valorDefault = '';
        
        // Asignar valores por defecto según el tipo de variable
        if (variable.includes('total') || variable.includes('monto') || variable.includes('precio')) {
          valorDefault = '0.00';
        } else if (variable.includes('cantidad') || variable.includes('numero')) {
          valorDefault = '0';
        } else if (variable.includes('fecha')) {
          valorDefault = new Date().toLocaleDateString('es-ES');
        } else if (variable.includes('tabla')) {
          valorDefault = '<tr><td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">Sin datos</td></tr>';
        } else {
          valorDefault = 'N/A';
        }
        
        htmlProcesado = htmlProcesado.replace(new RegExp(marcador.replace(/[{}]/g, '\\$&'), 'g'), valorDefault);
      });
    }
    
    console.log('✅ Nueva plantilla de cierre procesada exitosamente');
    console.log('📊 Datos incluidos:');
    console.log(`   - Ventas: ${datosCierre.ventas?.length || 0} registros`);
    console.log(`   - Servicios: ${datosCierre.servicios?.length || 0} registros`);
    console.log(`   - Productos: ${datosCierre.productos?.length || 0} registros`);
    console.log(`   - Comisiones: ${datosCierre.comisiones?.length || 0} empleados`);
    console.log(`   - Gastos: ${datosCierre.gastos?.length || 0} registros`);
    
    return htmlProcesado;
    
  } catch (error) {
    console.error('❌ Error procesando nueva plantilla de cierre:', error);
    throw error;
  }
}

// ========================================
// FUNCIONES AUXILIARES PARA CIERRES
// ========================================

// Función centralizada para obtener datos de cierre completo
async function obtenerDatosCierreCompleto(fecha, responsable) {
  console.log('🔄 === OBTENIENDO DATOS DE CIERRE COMPLETO ===');
  console.log('📅 Fecha:', fecha);
  console.log('👤 Responsable:', responsable || 'Todos');
  
  try {
    console.log('🚀 Iniciando consultas...');
    
    // Ejecutar consultas de forma secuencial
    console.log('💳 Consultando ventas...');
    const ventasData = await obtenerVentasPorTipoPago(fecha, responsable);
    console.log(`✅ Ventas obtenidas: ${ventasData.length} registros`);
    
    console.log('✂️ Consultando servicios...');
    const serviciosData = await obtenerDetalleServicios(fecha, responsable);
    console.log(`✅ Servicios obtenidos: ${serviciosData.length} registros`);
    
    console.log('🛍️ Consultando productos...');
    const productosData = await obtenerDetalleProductos(fecha, responsable);
    console.log(`✅ Productos obtenidos: ${productosData.length} registros`);
    
    console.log('💰 Consultando comisiones...');
    const comisionesData = await obtenerComisionesPorEmpleado(fecha, responsable);
    console.log(`✅ Comisiones obtenidas: ${comisionesData.length} registros`);
    
    console.log('💸 Consultando gastos...');
    const gastosData = await obtenerGastosDelDia(fecha, responsable);
    console.log(`✅ Gastos obtenidos: ${gastosData.length} registros`);
    
    // Calcular resumen con rangos y gastos
    console.log('📊 Calculando resumen ejecutivo con gastos...');
    const resumenEjecutivo = calcularResumenEjecutivoConGastos(ventasData, serviciosData, productosData, comisionesData, gastosData);
    
    // Formatear respuesta para compatibilidad con la plantilla
    const datosFormateados = {
      success: true,
      fecha: fecha,
      responsable: responsable || 'Todos',
      sucursal: 'Escalón',
      hora_apertura: '08:00 AM',
      timestamp: new Date().toISOString(),
      
      ventas: ventasData || [],
      servicios: serviciosData || [],
      productos: productosData || [],
      comisiones: comisionesData || [],
      gastos: gastosData || [],
      resumen_ejecutivo: resumenEjecutivo || {},
      observaciones: 'Cierre generado automáticamente'
    };
    
    console.log('✅ Datos de cierre completo obtenidos exitosamente');
    return datosFormateados;
    
  } catch (error) {
    console.error('❌ Error en obtenerDatosCierreCompleto:', error);
    throw error;
  }
}



function construirTablaServiciosCompleta(servicios) {
  if (!servicios || servicios.length === 0) {
    return `<tr><td colspan="4" style="text-align: center; color: #666;">No hay servicios registrados</td></tr>`;
  }
  
  // ========================================
  // AGRUPAR SERVICIOS POR NOMBRE
  // ========================================
  const serviciosAgrupados = {};
  
  servicios.forEach(servicio => {
    const nombre = servicio.nombre || 'Sin nombre';
    
    if (!serviciosAgrupados[nombre]) {
      serviciosAgrupados[nombre] = {
        nombre: nombre,
        cantidad: 0,
        total: 0,
        precio_unitario: 0
      };
    }
    
    // Sumar cantidades y totales
    serviciosAgrupados[nombre].cantidad += parseInt(servicio.cantidad || 0);
    serviciosAgrupados[nombre].total += parseFloat(servicio.total || 0);
  });
  
  // Calcular precio unitario promedio para cada grupo
  Object.keys(serviciosAgrupados).forEach(nombre => {
    const grupo = serviciosAgrupados[nombre];
    grupo.precio_unitario = grupo.cantidad > 0 ? grupo.total / grupo.cantidad : 0;
  });
  
  console.log('✅ Servicios agrupados:', serviciosAgrupados);
  
  // ========================================
  // CONSTRUIR FILAS HTML
  // ========================================
  let filas = '';
  let totalGeneral = 0;
  let cantidadGeneral = 0;
  
  // Ordenar por nombre para consistencia
  const serviciosOrdenados = Object.values(serviciosAgrupados).sort((a, b) => 
    a.nombre.localeCompare(b.nombre)
  );
  
  serviciosOrdenados.forEach(servicio => {
    totalGeneral += servicio.total;
    cantidadGeneral += servicio.cantidad;
    
    filas += `
      <tr>
        <td>${servicio.nombre}</td>
        <td style="text-align: center;">${servicio.cantidad}</td>
        <td style="text-align: center;">$${servicio.precio_unitario.toFixed(2)}</td>
        <td style="text-align: center;">$${servicio.total.toFixed(2)}</td>
      </tr>
    `;
  });
  
  // Agregar fila de total
  filas += `
    <tr style="background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #8B7355;">
      <td>TOTAL SERVICIOS</td>
      <td style="text-align: center;">${cantidadGeneral}</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center;">$${totalGeneral.toFixed(2)}</td>
    </tr>
  `;
  
  console.log(`✅ Servicios agrupados: ${serviciosOrdenados.length} tipos diferentes, ${cantidadGeneral} servicios totales`);
  
  return filas;
}

function construirTablaProductosCompleta(productos) {
  if (!productos || productos.length === 0) {
    return `<tr><td colspan="4" style="text-align: center; color: #666;">No hay productos registrados</td></tr>`;
  }
  
  // ========================================
  // AGRUPAR PRODUCTOS POR NOMBRE
  // ========================================
  const productosAgrupados = {};
  
  productos.forEach(producto => {
    const nombre = producto.nombre || 'Sin nombre';
    
    if (!productosAgrupados[nombre]) {
      productosAgrupados[nombre] = {
        nombre: nombre,
        cantidad: 0,
        total: 0,
        precio_unitario: 0
      };
    }
    
    // Sumar cantidades y totales
    productosAgrupados[nombre].cantidad += parseInt(producto.cantidad || 0);
    productosAgrupados[nombre].total += parseFloat(producto.total || 0);
  });
  
  // Calcular precio unitario promedio para cada grupo
  Object.keys(productosAgrupados).forEach(nombre => {
    const grupo = productosAgrupados[nombre];
    grupo.precio_unitario = grupo.cantidad > 0 ? grupo.total / grupo.cantidad : 0;
  });
  
  console.log('✅ Productos agrupados:', productosAgrupados);
  
  // ========================================
  // CONSTRUIR FILAS HTML
  // ========================================
  let filas = '';
  let totalGeneral = 0;
  let cantidadGeneral = 0;
  
  // Ordenar por nombre para consistencia
  const productosOrdenados = Object.values(productosAgrupados).sort((a, b) => 
    a.nombre.localeCompare(b.nombre)
  );
  
  productosOrdenados.forEach(producto => {
    totalGeneral += producto.total;
    cantidadGeneral += producto.cantidad;
    
    filas += `
      <tr>
        <td>${producto.nombre}</td>
        <td style="text-align: center;">${producto.cantidad}</td>
        <td style="text-align: center;">$${producto.precio_unitario.toFixed(2)}</td>
        <td style="text-align: center;">$${producto.total.toFixed(2)}</td>
      </tr>
    `;
  });
  
  // Agregar fila de total
  filas += `
    <tr style="background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #8B7355;">
      <td>TOTAL PRODUCTOS</td>
      <td style="text-align: center;">${cantidadGeneral}</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center;">$${totalGeneral.toFixed(2)}</td>
    </tr>
  `;
  
  console.log(`✅ Productos agrupados: ${productosOrdenados.length} tipos diferentes, ${cantidadGeneral} productos totales`);
  
  return filas;
}

// ========================================
// FUNCIÓN DE COMISIONES (sin cambios)
// ========================================
function construirTablaComisionesCompleta(comisiones) {
  if (!comisiones || comisiones.length === 0) {
    return `<tr><td colspan="4" style="text-align: center; color: #666;">No hay comisiones registradas</td></tr>`;
  }
  
  let filas = '';
  let totalComisiones = 0;
  
  comisiones.forEach(comision => {
    const comisionServicios = parseFloat(comision.comision_servicios || 0);
    const comisionProductos = parseFloat(comision.comision_productos || 0);
    const total = parseFloat(comision.total_comision || 0);
    
    totalComisiones += total;
    
    filas += `
      <tr>
        <td>${comision.empleado || 'Sin nombre'}</td>
        <td style="text-align: center;">$${comisionServicios.toFixed(2)}</td>
        <td style="text-align: center;">$${comisionProductos.toFixed(2)}</td>
        <td style="text-align: center;">$${total.toFixed(2)}</td>
      </tr>
    `;
  });
  
  // Agregar fila de total
  filas += `
    <tr style="background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #8B7355;">
      <td>TOTAL COMISIONES</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center;">$${totalComisiones.toFixed(2)}</td>
    </tr>
  `;
  
  return filas;
}

async function generarPDFConPlaywright(htmlContent, datosCierre) {
  console.log('🖨️ Generando PDF con Playwright...');
  
  try {
    const fecha = datosCierre.fecha || 'SinFecha';
    const responsable = datosCierre.responsable || 'SinResponsable';
    
    // Limpiar caracteres especiales para el nombre del archivo
    const fechaLimpia = fecha.replace(/\//g, '-');
    const responsableLimpio = responsable.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Crear directorio
    const baseDir = path.join(__dirname, 'cierres');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    // Nombre del archivo
    const nombreArchivo = `Cierre_Escalon_${fechaLimpia}_${responsableLimpio}.pdf`;
    const rutaCompleta = path.join(baseDir, nombreArchivo);
    
    console.log('📁 Guardando PDF en:', rutaCompleta);
    
    // Generar PDF con Playwright
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.pdf({ 
      path: rutaCompleta, 
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true
    });
    
    await browser.close();
    
    console.log('✅ PDF generado exitosamente:', nombreArchivo);
    
    return {
      nombreArchivo: nombreArchivo,
      rutaCompleta: rutaCompleta,
      rutaRelativa: path.relative(__dirname, rutaCompleta)
    };
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    throw new Error(`Error al generar PDF: ${error.message}`);
  }
}

// ========================================
// ENDPOINTS DE DEBUG
// ========================================

app.get('/api/debug/cierre-test/:fecha', async (req, res) => {
  const { fecha } = req.params;
  
  console.log('🧪 === ENDPOINT DE DEBUG ===');
  console.log('📅 Fecha recibida:', fecha);
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const testQuery = `SELECT COUNT(*) as total FROM facturas WHERE fecha = ?`;
    
    db.get(testQuery, [fecha], (err, row) => {
      if (err) {
        console.error('❌ Error en test:', err);
        return res.status(500).json({
          error: true,
          mensaje: 'Error en consulta de prueba',
          detalle: err.message
        });
      }
      
      console.log('✅ Test exitoso, facturas encontradas:', row.total);
      
      res.json({
        success: true,
        fecha: fecha,
        test_resultado: 'OK',
        facturas_encontradas: row.total,
        timestamp: new Date().toISOString(),
        servidor_funcionando: true
      });
    });
    
  } catch (error) {
    console.error('❌ Error en debug test:', error);
    res.status(500).json({
      error: true,
      mensaje: 'Error en endpoint de debug',
      detalle: error.message
    });
  }
});

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function detectarFormatoFecha(fecha) {
  if (!fecha) return 'null o vacía';
  if (typeof fecha !== 'string') return 'no es string';
  if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) return 'DD/MM/YYYY';
  if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return 'YYYY-MM-DD';
  if (fecha.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return 'D/M/YYYY variante';
  return 'formato desconocido';
}

// ========================================
// ENDPOINT PARA SERVIR PDFs DE CIERRE
// ========================================

app.get('/cierres/:archivo', (req, res) => {
  const { archivo } = req.params;
  
  console.log(`📥 Solicitud de PDF de cierre: ${archivo}`);
  
  const rutaArchivo = path.join(__dirname, 'cierres', archivo);
  
  // Verificar que el archivo existe
  if (!fs.existsSync(rutaArchivo)) {
    console.log('❌ Archivo de cierre no encontrado:', rutaArchivo);
    return res.status(404).json({ error: 'Archivo de cierre no encontrado' });
  }
  
  // Verificar que es un archivo PDF
  if (!archivo.toLowerCase().endsWith('.pdf')) {
    console.log('❌ Tipo de archivo no válido:', archivo);
    return res.status(400).json({ error: 'Tipo de archivo no válido' });
  }
  
  // Servir el archivo
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${archivo}"`);
  
  const stream = fs.createReadStream(rutaArchivo);
  stream.pipe(res);
  
  stream.on('error', (error) => {
    console.error('❌ Error al servir PDF de cierre:', error);
    res.status(500).json({ error: 'Error al servir el archivo' });
  });
  
  console.log('✅ PDF de cierre servido exitosamente:', archivo);
});

// ========================================
// MIDDLEWARE PARA SERVIR ARCHIVOS ESTÁTICOS
// ========================================

app.use('/cierres', express.static(path.join(__dirname, 'cierres')));

// ========================================
// LOGGING FINAL
// ========================================

// ========================================
// NUEVA RUTA: VISTA HTML DE CIERRE
// ========================================
app.get('/cierre/vista/:fecha', async (req, res) => {
  console.log('👁️ === GENERANDO VISTA HTML DE CIERRE ===');
  
  try {
    const fecha = req.params.fecha;
    const responsable = req.query.responsable || '';
    
    console.log('📋 Parámetros recibidos:', { fecha, responsable });
    
    // Convertir fecha si es necesario (de ISO a formato centroamericano)
    let fechaCentroamericana = fecha;
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [año, mes, dia] = fecha.split('-');
      fechaCentroamericana = `${dia}/${mes}/${año}`;
    }
    
    console.log('📅 Fecha procesada:', fechaCentroamericana);
    
    // Obtener datos del cierre usando la función existente
    const urlConsulta = `/api/cierre-completo?fecha=${encodeURIComponent(fechaCentroamericana)}${responsable ? `&responsable=${encodeURIComponent(responsable)}` : ''}`;
    console.log('🔗 Consultando datos:', urlConsulta);
    
    // Obtener datos del cierre directamente sin HTTP call
    const datosCierre = await obtenerDatosCierreCompleto(fechaCentroamericana, responsable);
    console.log('📊 Datos de cierre obtenidos correctamente');
    console.log('🔍 Estructura de datos para plantilla:', {
      ventas: datosCierre.ventas?.length || 0,
      servicios: datosCierre.servicios?.length || 0,
      productos: datosCierre.productos?.length || 0,
      comisiones: datosCierre.comisiones?.length || 0,
      gastos: datosCierre.gastos?.length || 0,
      resumen_ejecutivo: !!datosCierre.resumen_ejecutivo
    });
    
    // Leer la plantilla HTML
    const plantillaPath = path.join(__dirname, 'cierre', 'plantilla-cierre.html');
    let plantillaHTML = fs.readFileSync(plantillaPath, 'utf8');
    
    // Procesar la plantilla con los datos del cierre
    plantillaHTML = await procesarPlantillaCierre(plantillaHTML, datosCierre);
    
    console.log('✅ Vista HTML de cierre generada correctamente');
    console.log('📏 Tamaño del HTML generado:', plantillaHTML.length, 'caracteres');
    console.log('🔍 Primeros 200 caracteres del HTML:', plantillaHTML.substring(0, 200));
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    console.log('📤 Enviando HTML al navegador...');
    res.send(plantillaHTML);
    
  } catch (error) {
    console.error('❌ Error generando vista HTML de cierre:', error);
    console.error('Stack completo del error:', error.stack);
    res.status(500).json({ 
      error: 'Error al generar vista HTML de cierre',
      detalles: error.message,
      stack: error.stack 
    });
  }
});

console.log('✅ Sistema de cierre de caja configurado');
console.log('📁 Directorio de cierres:', path.join(__dirname, 'cierres'));
console.log('🌐 Endpoints disponibles:');
console.log('   - GET /api/cierre-completo');
console.log('   - POST /api/generar-pdf-cierre');
console.log('   - GET /cierres/:archivo');
console.log('   - GET /cierre/vista/:fecha');
console.log('   - GET /api/debug/cierre-test/:fecha');

// ========================================
// ENDPOINT PARA ANÁLISIS AVANZADO
// ========================================


  // ----------------- SERVIR HTMLS -----------------

// Dashboard principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'indexreportes.html'));
  });
  
  // Clientes
  app.get('/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, 'clientes', 'index.html'));
 });
  
  // Empleados
  app.get('/empleados', (req, res) => {
    res.sendFile(path.join(__dirname, 'empleados', 'empleados.html'));
  });
  
  // Inventarios
  app.get('/inventarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'inventarios', 'inventarios.html'));
  });
  
  // Compras
  app.get('/compras', (req, res) => {
    res.sendFile(path.join(__dirname, 'compras', 'compras.html'));
  });
  
  // Cortes
  app.get('/cortes', (req, res) => {
    res.sendFile(path.join(__dirname, 'cortes', 'cortes.html'));
  });
  
  // Facturación
  app.get('/facturacion', (req, res) => {
    res.sendFile(path.join(__dirname, 'facturacion', 'factura.html'));
  });
  
  // Planilla
  app.get('/planilla', (req, res) => {
    res.sendFile(path.join(__dirname, 'planilla', 'planilla.html'));
  });
  
  // Salarios
  app.get('/salarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'salarios', 'salarios.html'));
  });
  

  // 🚀 Servir Detalle de Cortes
   app.get('/detalle_cortes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'facturacion', 'detalle_cortes.html'));
  });
  
  app.get('/detalle_productos.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'facturacion', 'detalle_productos.html'));
  });
     // Servir página citas
// Corregir y permitir /citas o /citas/
   app.get(['/citas', '/citas/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'citas', 'citas.html'));
  });
  app.get(['/gastos', '/gastos/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'gastos', 'gastos.html'));
  });
  
  // Ruta para módulo de salarios nuevo
  app.get(['/salarios', '/salarios/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'salarios', 'salarios.html'));
  });
  
  // Ruta de nómina eliminada
  



  
  // ----------------- RUTA API PARA OBTENER FACTURAS -----------------
  // Endpoint para obtener facturas (necesario para el sistema de tarjetas)
  app.get('/api/facturas', (req, res) => {
    const { comanda, factura } = req.query;
    
    let query = "SELECT * FROM facturas";
    let params = [];
    
    if (comanda && factura) {
      query += " WHERE comanda = ? AND factura = ?";
      params = [comanda, factura];
    } else {
      query += " ORDER BY id DESC LIMIT 100";
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error al obtener facturas:', err);
        return res.status(500).json({ mensaje: 'Error al obtener facturas' });
      }
      res.json(rows);
    });
  });

  // Endpoint para obtener una factura específica por ID (para generar PDF)
  app.get('/api/factura/:id', (req, res) => {
    const facturaId = req.params.id;
    
    // Obtener datos de la factura
    db.get("SELECT * FROM facturas WHERE id = ?", [facturaId], (err, factura) => {
      if (err) {
        console.error('Error al obtener factura:', err);
        return res.status(500).json({ mensaje: 'Error al obtener factura' });
      }
      
      if (!factura) {
        return res.status(404).json({ mensaje: 'Factura no encontrada' });
      }
      
      // Obtener detalles de cortes
      db.all("SELECT * FROM detalle_cortes WHERE factura_id = ?", [facturaId], (err, cortes) => {
        if (err) {
          console.error('Error al obtener detalles de cortes:', err);
          return res.status(500).json({ mensaje: 'Error al obtener detalles' });
        }
        
        // Obtener detalles de productos
        db.all("SELECT * FROM detalle_productos WHERE factura_id = ?", [facturaId], (err, productos) => {
          if (err) {
            console.error('Error al obtener detalles de productos:', err);
            return res.status(500).json({ mensaje: 'Error al obtener detalles' });
          }
          
          // Preparar respuesta completa
          const facturaCompleta = {
            ...factura,
            detalleCortes: cortes.map(c => ({
              nombre: c.nombre,
              cantidad: c.cantidad,
              precio: c.total / c.cantidad, // Calcular precio unitario
              total: c.total
            })),
            detalleProductos: productos.map(p => ({
              nombre: p.nombre,
              cantidad: p.cantidad,
              precio: p.total / p.cantidad, // Calcular precio unitario
              total: p.total
            }))
          };
          
          res.json(facturaCompleta);
        });
      });
    });
  });

  // Nueva ruta para mostrar factura como HTML (vista previa)
  app.get('/factura/vista/:id', async (req, res) => {
    const facturaId = req.params.id;
    
    try {
      console.log('🖥️ === GENERANDO VISTA HTML DE FACTURA ===');
      console.log('📋 ID de factura:', facturaId);
      
      // Obtener datos de la factura usando la misma lógica que el endpoint de PDF
      const factura = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM facturas WHERE id = ?", [facturaId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      if (!factura) {
        return res.status(404).send('<h1>Factura no encontrada</h1>');
      }
      
      // Obtener detalles de cortes
      const cortes = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM detalle_cortes WHERE factura_id = ?", [facturaId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      // Obtener detalles de productos
      const productos = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM detalle_productos WHERE factura_id = ?", [facturaId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      // Preparar datos para la plantilla (igual que en procesarPlantillaFactura)
      const datosFactura = {
        ...factura,
        detalleCortes: cortes.map(c => ({
          nombre: c.nombre,
          cantidad: c.cantidad,
          precio: c.total / c.cantidad,
          total: c.total,
          descuento_gratis: c.descuento_gratis || false
        })),
        detalleProductos: productos.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.total / p.cantidad,
          total: p.total
        }))
      };
      
      // Leer y procesar plantilla HTML
      const plantillaPath = path.join(__dirname, 'facturacion', 'plantilla-factura.html');
      let html = fs.readFileSync(plantillaPath, 'utf8');
      
      // Procesar plantilla con los datos
      html = await procesarPlantillaFactura(html, datosFactura);
      
      // Agregar estilos para vista web y botón de impresión
      const estilosVistaWeb = `
        <style>
          @media screen {
            body {
              background: #f5f5f5 !important;
            }
            .btn-imprimir {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #8B7355;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 1000;
              transition: background-color 0.2s;
            }
            .btn-imprimir:hover {
              background: #6d5a42;
            }
          }
          @media print {
            .btn-imprimir {
              display: none !important;
            }
            body {
              background: white !important;
            }
          }
        </style>
      `;
      
      const scriptImprimir = `
        <script>
          function imprimirFactura() {
            window.print();
          }
        </script>
      `;
      
      // Insertar estilos y script antes del cierre de head
      html = html.replace('</head>', `${estilosVistaWeb}</head>`);
      
      // Insertar botón después del body
      html = html.replace('<body>', `<body>
        <button class="btn-imprimir" onclick="imprimirFactura()">🖨️ Imprimir</button>`);
      
      // Insertar script antes del cierre de body
      html = html.replace('</body>', `${scriptImprimir}</body>`);
      
      console.log('✅ Vista HTML de factura generada correctamente');
      
      // Enviar HTML como respuesta
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      
    } catch (error) {
      console.error('❌ Error generando vista HTML de factura:', error);
      res.status(500).send('<h1>Error al generar vista de factura</h1><p>' + error.message + '</p>');
    }
  });

  // ========================================
  // ENDPOINTS PARA FACTURACIÓN
  // ========================================
  
  // Endpoint para obtener todas las facturas (GET /facturas)
  app.get('/facturas', (req, res) => {
    const query = `
      SELECT f.*, 
             f.empleado_principal as empleado_principal,
             f.es_pago_mixto, f.monto_efectivo, f.monto_tarjeta
      FROM facturas f 
      ORDER BY f.id DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error al obtener facturas:', err);
        return res.status(500).json({ mensaje: 'Error al obtener facturas' });
      }
      res.json(rows);
    });
  });

  // Endpoint para crear nueva factura (POST /facturas)
  app.post('/facturas', async (req, res) => {
    try {
      const {
        fecha, comanda, factura, cliente, empleado, tipo_pago, descuento, total,
        detalleCortes, detalleProductos,
        es_pago_mixto, monto_efectivo, monto_tarjeta
      } = req.body;

      // Iniciar transacción
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Insertar factura
        const insertFactura = `
          INSERT INTO facturas 
          (fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total, empleado_principal, es_pago_mixto, monto_efectivo, monto_tarjeta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertFactura, [
          fecha, comanda, factura, cliente, empleado, tipo_pago, total, descuento, total, empleado,
          es_pago_mixto ? 1 : 0, monto_efectivo || 0, monto_tarjeta || 0
        ], function(err) {
          if (err) {
            db.run("ROLLBACK");
            console.error('Error al insertar factura:', err);
            return res.status(500).json({ mensaje: 'Error al crear factura' });
          }

          const facturaId = this.lastID;

          // Insertar detalles de cortes
          if (detalleCortes && detalleCortes.length > 0) {
            const insertCorte = `
              INSERT INTO detalle_cortes 
              (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha, comanda, factura)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            detalleCortes.forEach(corte => {
              if (corte && corte.cantidad > 0) {
                db.run(insertCorte, [
                  facturaId, corte.codigo, corte.nombre, corte.cantidad, corte.total, corte.comision,
                  corte.empleado, fecha, comanda, factura
                ], (err) => {
                  if (err) console.error('Error al insertar detalle de corte:', err);
                });
              }
            });
          }

          // Insertar detalles de productos
          if (detalleProductos && detalleProductos.length > 0) {
            const insertProducto = `
              INSERT INTO detalle_productos 
              (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha, comanda, factura)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            detalleProductos.forEach(producto => {
              if (producto && producto.cantidad > 0) {
                db.run(insertProducto, [
                  facturaId, producto.codigo, producto.nombre, producto.cantidad, producto.total, 
                  producto.comision, producto.empleado, fecha, comanda, factura
                ], (err) => {
                  if (err) console.error('Error al insertar detalle de producto:', err);
                });

                // Actualizar inventario de productos
                db.run("UPDATE productos SET existencia = existencia - ? WHERE codigo = ?", [
                  producto.cantidad, producto.codigo
                ], (err) => {
                  if (err) console.error('Error al actualizar inventario:', err);
                });
              }
            });
          }

          db.run("COMMIT");
          res.json({ mensaje: 'Factura creada exitosamente', id: facturaId });
        });
      });

    } catch (error) {
      console.error('Error en POST /facturas:', error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  });

  // Endpoint para eliminar factura (DELETE /facturas/:id)
  app.delete('/facturas/:id', (req, res) => {
    const facturaId = req.params.id;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Restaurar inventario antes de eliminar
      db.all("SELECT * FROM detalle_productos WHERE factura_id = ?", [facturaId], (err, productos) => {
        if (!err && productos) {
          productos.forEach(producto => {
            db.run("UPDATE productos SET existencia = existencia + ? WHERE codigo = ?", [
              producto.cantidad, producto.codigo
            ]);
          });
        }

        // Eliminar detalles
        db.run("DELETE FROM detalle_cortes WHERE factura_id = ?", [facturaId]);
        db.run("DELETE FROM detalle_productos WHERE factura_id = ?", [facturaId]);
        
        // Eliminar factura
        db.run("DELETE FROM facturas WHERE id = ?", [facturaId], function(err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ mensaje: 'Error al eliminar factura' });
          }
          
          db.run("COMMIT");
          res.json({ mensaje: 'Factura eliminada correctamente' });
        });
      });
    });
  });

  // ========================================
  // NUEVO ENDPOINT PARA DESCARGAR PDFs DE FACTURAS
  // ========================================
  app.post('/api/generar-factura-pdf', async (req, res) => {
    console.log('🧾 === GENERANDO FACTURA PDF PARA DESCARGA ===');
    
    try {
      const datos = req.body;
      console.log('📄 Datos recibidos para factura PDF:', Object.keys(datos));
      
      if (!datos) {
        return res.status(400).json({ error: 'No se recibieron datos para la factura' });
      }
      
      // Leer plantilla de factura
      const plantillaPath = path.join(__dirname, 'facturacion', 'plantilla-factura.html');
      
      if (!fs.existsSync(plantillaPath)) {
        console.error('❌ Plantilla de factura no encontrada:', plantillaPath);
        return res.status(500).json({ error: 'Plantilla de factura no encontrada' });
      }
      
      let html = fs.readFileSync(plantillaPath, 'utf8');
      console.log('📖 Plantilla de factura cargada correctamente');
      
      // Procesar plantilla con los datos de la factura
      html = await procesarPlantillaFactura(html, datos);
      
      // Generar PDF en memoria con Playwright
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Generar PDF en buffer (en memoria)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true
      });
      
      await browser.close();
      
      // Crear nombre del archivo
      const fechaLimpia = datos.fecha ? datos.fecha.replace(/\//g, '-') : 'sin-fecha';
      const nombreArchivo = `Factura_${datos.factura || 'SIN_NUM'}_${fechaLimpia}.pdf`;
      
      console.log('✅ PDF generado en memoria:', nombreArchivo);
      
      // Enviar PDF directamente para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      console.log('📤 Factura PDF enviada para descarga');
      
    } catch (error) {
      console.error('❌ Error generando factura PDF:', error);
      res.status(500).json({ error: `Error generando PDF: ${error.message}` });
    }
  });

  // ========================================
  // FUNCIÓN AUXILIAR PARA PROCESAR PLANTILLA DE FACTURA
  // ========================================
  async function procesarPlantillaFactura(html, datos) {
    try {
      console.log('📋 Procesando plantilla con datos:', Object.keys(datos));
      console.log('📊 Datos recibidos:', {
        detalleCortes: datos.detalleCortes?.length || 0,
        detalleProductos: datos.detalleProductos?.length || 0,
        detalles: datos.detalles?.length || 0,
        precio_venta: datos.precio_venta,
        total: datos.total
      });
      
      // Obtener logo en base64
      let logoDataURI = '';
      try {
        const logoPath = path.join(__dirname, 'imagenes', 'logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoDataURI = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          console.log('📸 Logo cargado correctamente');
        } else {
          console.warn('⚠️ Logo no encontrado en:', logoPath);
        }
      } catch (logoError) {
        console.error('❌ Error cargando logo:', logoError);
      }
      
      // Procesar detalles de SERVICIOS/CORTES para {{detalle_cortes}}
      let detalleCortes = '';
      if (datos.detalleCortes && Array.isArray(datos.detalleCortes)) {
        console.log('🔧 Procesando', datos.detalleCortes.length, 'servicios/cortes');
        datos.detalleCortes.forEach(corte => {
          if (corte && corte.cantidad > 0) {
            // El total del corte viene en corte.total, precio unitario viene en corte.precio
            const total = parseFloat(corte.total || 0);
            const precioUnitario = parseFloat(corte.precio || 0);
            console.log(`  - ${corte.nombre}: ${corte.cantidad}x $${precioUnitario} = $${total}`);
            
            // Verificar si es corte gratis
            if (corte.descuento_gratis) {
              detalleCortes += `
                <tr>
                  <td>${corte.nombre || 'Servicio'}</td>
                  <td style="color: #28a745; font-weight: bold;">🎁 CORTE GRATIS</td>
                  <td>${corte.cantidad}</td>
                  <td style="color: #28a745; font-weight: bold;">$0.00</td>
                </tr>
              `;
            } else {
              detalleCortes += `
                <tr>
                  <td>${corte.nombre || 'Servicio'}</td>
                  <td>$${precioUnitario.toFixed(2)}</td>
                  <td>${corte.cantidad}</td>
                  <td>$${total.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        });
      }
      
      // Procesar detalles de PRODUCTOS para {{detalle_productos}}
      let detalleProductos = '';
      if (datos.detalleProductos && Array.isArray(datos.detalleProductos)) {
        console.log('📦 Procesando', datos.detalleProductos.length, 'productos');
        datos.detalleProductos.forEach(producto => {
          if (producto && producto.cantidad > 0) {
            // El total del producto viene en producto.total, precio unitario viene en producto.precio
            const total = parseFloat(producto.total || 0);
            const precioUnitario = parseFloat(producto.precio || 0);
            console.log(`  - ${producto.nombre}: ${producto.cantidad}x $${precioUnitario} = $${total}`);
            
            detalleProductos += `
              <tr>
                <td>${producto.nombre || 'Producto'}</td>
                <td>$${precioUnitario.toFixed(2)}</td>
                <td>${producto.cantidad}</td>
                <td>$${total.toFixed(2)}</td>
              </tr>
            `;
          }
        });
      }
      
      // Procesar detalles genéricos (formato alternativo desde la interfaz)
      if (datos.detalles && Array.isArray(datos.detalles)) {
        console.log('📋 Procesando', datos.detalles.length, 'detalles genéricos');
        datos.detalles.forEach(detalle => {
          if (detalle && (detalle.cantidad || 0) > 0) {
            const precio = parseFloat(detalle.precio || 0);
            const total = parseFloat(detalle.total || 0);
            const precioUnitario = detalle.cantidad > 0 ? precio : 0;
            console.log(`  - ${detalle.nombre}: ${detalle.cantidad}x $${precioUnitario} = $${total}`);
            
            // Asumir que son servicios si no hay productos específicos
            if (!detalleCortes) {
              detalleCortes += `
                <tr>
                  <td>${detalle.nombre || 'Item'}</td>
                  <td>$${precioUnitario.toFixed(2)}</td>
                  <td>${detalle.cantidad}</td>
                  <td>$${total.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        });
      }
      
      // Si no hay servicios, mostrar mensaje
      if (!detalleCortes.trim()) {
        detalleCortes = `
          <tr>
            <td colspan="4" style="text-align: center; font-style: italic; color: #999;">
              No hay servicios en esta factura
            </td>
          </tr>
        `;
      }
      
      // Si no hay productos, mostrar mensaje
      if (!detalleProductos.trim()) {
        detalleProductos = `
          <tr>
            <td colspan="4" style="text-align: center; font-style: italic; color: #999;">
              No hay productos en esta factura
            </td>
          </tr>
        `;
      }
      
      // Reemplazar marcadores básicos y de detalles
      const reemplazos = {
        '{{logo_src}}': logoDataURI,
        '{{fecha}}': datos.fecha || new Date().toLocaleDateString('es-GT'),
        '{{comanda}}': datos.comanda || '',
        '{{factura}}': datos.factura || '',
        '{{cliente}}': datos.cliente || 'Cliente General',
        '{{empleado}}': datos.empleado_principal || datos.empleado || '',
        '{{tipo_pago}}': datos.tipo_pago || '',
        '{{precio_venta}}': datos.precio_venta ? parseFloat(datos.precio_venta).toFixed(2) : '0.00',
        '{{descuento}}': datos.descuento ? (datos.descuento.includes('%') ? datos.descuento : datos.descuento + '%') : '0%',
        '{{total}}': datos.total ? parseFloat(datos.total).toFixed(2) : '0.00',
        '{{detalle_cortes}}': detalleCortes,
        '{{detalle_productos}}': detalleProductos
      };
      
      console.log('🔄 Aplicando reemplazos:', {
        servicios: detalleCortes.includes('No hay servicios') ? 'Sin servicios' : 'Con servicios',
        productos: detalleProductos.includes('No hay productos') ? 'Sin productos' : 'Con productos',
        precio_venta: reemplazos['{{precio_venta}}'],
        total: reemplazos['{{total}}'],
        logo: logoDataURI ? 'Logo cargado' : 'Sin logo'
      });
      
      // Aplicar reemplazos
      Object.keys(reemplazos).forEach(marcador => {
        const regex = new RegExp(marcador.replace(/[{}]/g, '\\$&'), 'g');
        html = html.replace(regex, reemplazos[marcador]);
      });
      
      // Limpiar marcadores restantes
      const marcadoresRestantes = html.match(/\{\{[^}]+\}\}/g);
      if (marcadoresRestantes) {
        console.warn('⚠️ Marcadores sin reemplazar:', marcadoresRestantes);
        // Reemplazar marcadores restantes con valores por defecto
        marcadoresRestantes.forEach(marcador => {
          html = html.replace(new RegExp(marcador.replace(/[{}]/g, '\\$&'), 'g'), '');
        });
      }
      
      console.log('✅ Plantilla de factura procesada exitosamente');
      return html;
      
    } catch (error) {
      console.error('❌ Error procesando plantilla de factura:', error);
      throw error;
    }
  }

  // Ruta no encontrada
  app.use((req, res) => {
    res.status(404).send('Página no encontrada 😢');
  });
  
  
  // ----------------- INICIAR SERVIDOR -----------------
  async function startServer() {
    try {
      // Inicializar base de datos PostgreSQL
      await initializeDatabase();
      
      // Iniciar servidor
      app.listen(PORT, () => {
        console.log(`🚀 Servidor General corriendo en http://localhost:${PORT}`);
        console.log(`💳 Sistema de tarjetas de fidelidad activo`);
        console.log(`🗄️  Base de datos: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL (Render)' : 'PostgreSQL (Local)'}`);
      });
    } catch (error) {
      console.error('❌ Error al iniciar el servidor:', error);
      process.exit(1);
    }
  }

  startServer();
  


  
  