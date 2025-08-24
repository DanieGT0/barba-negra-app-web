
// Aquí iría todo el contenido del servergeneral.js que ya consolidamos...
// servergeneral.js COMPLETO

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { chromium } = require('playwright');

const app = express();
const PORT = 3001;

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
  
  const diferencia = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
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


app.use(session({
  secret: 'barbershop_secret_key', // Cambiar si deseas
  resave: false,
  saveUninitialized: true
}));   
// Conexión a la base de datos
const db = new sqlite3.Database(path.join(__dirname, 'barbanegra.sqlite'));

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    dui TEXT UNIQUE,
    nombre TEXT,
    telefono TEXT,
    correo TEXT,
    membresia TEXT,
    fecha_inicio TEXT,
    fecha_final TEXT,
    monto REAL,
    tipo_pago TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS empleados (
    fecha TEXT,
    dui TEXT PRIMARY KEY,
    nombre TEXT,
    direccion TEXT,
    correo TEXT,
    nacimiento TEXT,
    salario REAL,
    cargo TEXT,
    telefono TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS productos (
  codigo TEXT PRIMARY KEY,
  producto TEXT,
  precio_venta REAL,
  comision REAL,
  existencia INTEGER DEFAULT 0,
  compra_promedio REAL DEFAULT 0,
  minimo INTEGER DEFAULT 5
)`);

  db.run(`CREATE TABLE IF NOT EXISTS compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  codigo TEXT,
  producto TEXT,
  precio_compra REAL,
  cantidad INTEGER,
  fecha_vencimiento TEXT
  
)`);


  db.run(`CREATE TABLE IF NOT EXISTS cortes (
    codigo TEXT PRIMARY KEY,
    servicio TEXT,
    precio REAL,
    comision REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    comanda INTEGER,
    factura INTEGER,
    cliente TEXT,
    empleado TEXT,
    tipo_pago TEXT,
    precio_venta REAL,
    descuento TEXT,
    total REAL,
    empleado_principal
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS detalle_cortes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER,
    codigo TEXT,
    nombre TEXT,
    cantidad INTEGER,
    total REAL,
    comision REAL,
    empleado TEXT,
    fecha TEXT,
    comanda,
    factura,
    FOREIGN KEY (factura_id) REFERENCES facturas(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS detalle_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER,
    codigo TEXT,
    nombre TEXT,
    cantidad INTEGER,
    total REAL,
    comision REAL,
    empleado TEXT,
    fecha TEXT,
    comanda,
    factura,
    FOREIGN KEY (factura_id) REFERENCES facturas(id)
  )`);

  // Crear tabla de usuarios
db.run(`CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE,
  password TEXT,
  rol TEXT,
  modulos TEXT
)`);
// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  categoria TEXT,
  descripcion TEXT,
  monto REAL
)`);
// Metas 
db.run(`CREATE TABLE IF NOT EXISTS metas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER,
  mes TEXT,
  monto REAL
)`);


db.run(`CREATE TABLE IF NOT EXISTS descuentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  dui TEXT,
  monto REAL,
  motivo TEXT
)`);


});

// ----------------- CRUD CLIENTES -----------------

// Obtener todos los clientes
// --- API para Clientes --- //

// Obtener todos los clientes
app.get('/api/clientes', (req, res) => {
    db.all("SELECT * FROM clientes ORDER BY fecha DESC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener clientes" });
      res.json(rows);
    });
  });
  
  // Filtrar clientes
  app.get('/api/clientes/filtro', (req, res) => {
    const { dui, nombre, desde, hasta } = req.query;
    let query = "SELECT * FROM clientes WHERE 1=1";
    const params = [];
  
    console.log("🔍 Filtros recibidos:", req.query); // <-- Agrega esto
  
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
      if (err) {
        console.error("❌ Error en consulta SQL:", err.message); // <-- Más info
        return res.status(500).json({ mensaje: "Error al filtrar clientes" });
      }
      res.json(rows);
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

    // Asegurar que tipo_pago tenga un valor por defecto
    const tipoPago = c.tipo_pago || 'Efectivo';

    db.run(`INSERT INTO clientes (fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, monto, tipo_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto, tipoPago],
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
  
  // Asegurar que tipo_pago tenga un valor por defecto
  const tipoPago = c.tipo_pago || 'Efectivo';
  
  db.run(`UPDATE clientes SET fecha = ?, dui = ?, nombre = ?, telefono = ?, correo = ?, membresia = ?, fecha_inicio = ?, fecha_final = ?, monto = ?, tipo_pago = ? WHERE id = ?`,
    [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto, tipoPago, id],
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
    db.all("SELECT * FROM cortes ORDER BY codigo ASC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener cortes" });
      res.json(rows);
    });
  });
  
  // 🚀 Crear nuevo corte
  app.post('/api/cortes', (req, res) => {
    const { servicio, precio, comision } = req.body;
  
    db.get("SELECT COUNT(*) AS total FROM cortes", (err, row) => {
      if (err) return res.status(500).json({ mensaje: "Error al generar código" });
  
      const codigo = `SE${String(row.total + 1).padStart(2, '0')}`;
  
      db.run(`INSERT INTO cortes (codigo, servicio, precio, comision)
              VALUES (?, ?, ?, ?)`,
        [codigo, servicio, precio, comision],
        function (err) {
          if (err) return res.status(500).json({ mensaje: "Error al registrar corte" });
  
          res.status(201).json({ mensaje: "Corte registrado exitosamente", codigo });
        });
    });
  });
  
  // 🚀 Actualizar un corte
  app.put('/api/cortes/:codigo', (req, res) => {
    const { servicio, precio, comision } = req.body;
  
    db.run(`UPDATE cortes SET servicio = ?, precio = ?, comision = ? WHERE codigo = ?`,
      [servicio, precio, comision, req.params.codigo],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al actualizar corte" });
  
        res.json({ mensaje: "Corte actualizado correctamente" });
      });
  });
  
  // 🚀 Eliminar un corte
  app.delete('/api/cortes/:codigo', (req, res) => {
    db.run("DELETE FROM cortes WHERE codigo = ?", req.params.codigo, function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al eliminar corte" });
  
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
      .map(c => `
        <tr>
          <td>${c.nombre}</td>
          <td>$${parseFloat(c.precio_unitario).toFixed(2)}</td>
          <td>${c.cantidad}</td>
          <td>$${(c.precio_unitario * c.cantidad).toFixed(2)}</td>
        </tr>
      `).join('');
    
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
    detalleProductos 
  } = req.body;

  db.run(
    `INSERT INTO facturas (
       fecha, comanda, factura, cliente, empleado_principal,
       tipo_pago, precio_venta, descuento, total
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, comanda, factura, cliente, empleado_principal,
      tipo_pago, precio_venta, descuento, total
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

      // ─── Generar PDF de la factura ───────────────────────────────────────
      const codPDF = `Fac${fecha.replace(/-/g, '').slice(2)}_${String(factura).padStart(4, '0')}.pdf`;
      await generarPDF(
        {
          fecha,
          comanda,
          factura,
          cliente,
          empleado: empleado_principal,
          tipo_pago,
          precio_venta,
          descuento,
          total,
          detalleCortes,
          detalleProductos
        },
        codPDF
      );

      // ─── Responder al cliente ────────────────────────────────────────────
      res.status(201).json({
        mensaje: "Factura guardada y PDF generado correctamente",
        archivo: codPDF
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
    let queryFacturas = `SELECT tipo_pago, total, fecha, empleado_principal FROM facturas WHERE fecha = ?`;
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
app.get('/facturas', (req, res) => {
  const { desde, hasta, comanda, factura, empleado,
          cliente, pago } = req.query;

  let sql = 'SELECT * FROM facturas WHERE 1=1';
  const params = [];

  if (desde)   { sql += ' AND fecha >= ?';     params.push(desde); }
  if (hasta)   { sql += ' AND fecha <= ?';     params.push(hasta); }
  if (comanda) { sql += ' AND comanda = ?';    params.push(comanda); }
  if (factura) { sql += ' AND factura = ?';    params.push(factura); }
  if (empleado){ sql += ' AND empleado LIKE ?';params.push(`%${empleado}%`); }
  if (cliente) { sql += ' AND cliente LIKE ?'; params.push(`%${cliente}%`); }
  if (pago)    { sql += ' AND tipo_pago = ?';  params.push(pago); }

  sql += ' ORDER BY fecha DESC, factura DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ mensaje:'Error al filtrar facturas' });
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
    db.all("SELECT * FROM detalle_cortes ORDER BY fecha DESC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener detalle de cortes" });
      res.json(rows);
    });
  });

  app.get('/api/detalle_productos', (req, res) => {
    db.all("SELECT * FROM detalle_productos ORDER BY fecha DESC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener detalle de cortes" });
      res.json(rows);
    });
  });


  // 🚀 Crear tabla de citas si no existe
db.run(`CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start TEXT NOT NULL
  )`);
  
  // 🚀 Obtener todas las citas
  app.get('/api/citas', (req, res) => {
    db.all("SELECT * FROM citas ORDER BY start ASC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener citas" });
      res.json(rows);
    });
  });
  
  // 🚀 Crear nueva cita
  app.post('/api/citas', (req, res) => {
    const { title, start } = req.body;
    db.run(`INSERT INTO citas (title, start) VALUES (?, ?)`,
      [title, start],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al registrar cita" });
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
  
// login



// Insertar usuario administrador si no existe
// 👑 Crear Admin inicial si no existe
db.get("SELECT COUNT(*) AS total FROM usuarios", (err, row) => {
  if (row.total === 0) {
    const passwordPlano = 'admin123';
    const saltRounds = 10;
    bcrypt.hash(passwordPlano, saltRounds, (err, hash) => {
      if (err) {
        console.error("Error encriptando contraseña inicial:", err.message);
      } else {
        const modulosAdmin = JSON.stringify([
          "Clientes", "Empleados", "Inventarios", "Compras", "Cortes",
          "Facturacion", "DetalleCortes", "DetalleProductos", "Planilla", "AgendarCitas","Gastos","CierreCaja","Nomina","Salario"
        ]);
        db.run(`INSERT INTO usuarios (usuario, password, rol, modulos) VALUES (?, ?, ?, ?)`,
          ['admin', hash, 'Admin', modulosAdmin]);
        console.log('✅ Usuario administrador inicial creado (usuario: admin / contraseña: admin123)');
      }
    });
  }
});

// nomina
// Reemplazar esta función en servergeneral.js
// ===============================================
// REEMPLAZAR LA FUNCIÓN /api/nomina EN servergeneral.js
// ===============================================

// Reemplazar esta función en servergeneral.js
app.get('/api/nomina', (req, res) => {
  const { desde, hasta, empleado } = req.query;

  console.log('🔍 Solicitud de nómina recibida:', { desde, hasta, empleado });

  const filtros = [];
  const valores = [];

  if (desde) {
    filtros.push(`f.fecha >= ?`);
    valores.push(desde);
  }

  if (hasta) {
    filtros.push(`f.fecha <= ?`);
    valores.push(hasta);
  }

  // NUEVO: Filtro por empleado específico
  if (empleado && empleado.trim() !== '') {
    filtros.push(`(f.empleado_principal = ? OR e.nombre = ?)`);
    valores.push(empleado, empleado);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  // Consulta SQL mejorada con filtro por empleado
  const sql = `
    SELECT
      f.id AS id,
      f.factura AS factura,
      f.comanda AS comanda,
      f.total AS total,
      f.fecha AS fecha,
      c.dui AS dui,
      c.nombre AS cliente,
      COALESCE(f.empleado_principal, e.nombre) AS empleado,
      e.cargo AS cargo,
      GROUP_CONCAT(DISTINCT dc.nombre) AS cortes,
      SUM(DISTINCT dc.cantidad) AS cantidad_corte,
      GROUP_CONCAT(DISTINCT dp.nombre) AS productos,
      SUM(DISTINCT dp.cantidad) AS cantidad_producto,
      SUM(DISTINCT dp.total) AS precio_producto,
      SUM(DISTINCT dc.comision) AS comision_corte,
      SUM(DISTINCT dp.comision) AS comision_producto,
      f.tipo_pago AS tipo_pago,
      f.descuento AS descuento,
      (COALESCE(SUM(DISTINCT dc.comision), 0) + COALESCE(SUM(DISTINCT dp.comision), 0)) AS salario_total
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente = c.nombre OR f.cliente = c.dui
    LEFT JOIN empleados e ON f.empleado_principal = e.nombre OR f.empleado = e.nombre
    LEFT JOIN detalle_cortes dc ON f.id = dc.factura_id
    LEFT JOIN detalle_productos dp ON f.id = dp.factura_id
    ${where}
    GROUP BY f.id, f.factura, f.comanda, f.total, f.fecha, c.dui, c.nombre, f.empleado_principal, e.nombre, e.cargo, f.tipo_pago, f.descuento
    ORDER BY f.fecha DESC, f.factura DESC
  `;

  console.log('📊 Ejecutando consulta SQL con filtros:', where);
  console.log('🔢 Parámetros:', valores);

  db.all(sql, valores, (err, rows) => {
    if (err) {
      console.error("❌ Error al generar nómina:", err.message);
      return res.status(500).json({ 
        mensaje: "Error interno al generar nómina",
        error: err.message 
      });
    }

    console.log(`✅ Consulta ejecutada exitosamente. ${rows.length} registros encontrados`);

    // Procesar los resultados para asegurar valores por defecto
    const resultados = rows.map(row => ({
      ...row,
      total: row.total || 0,
      dui: row.dui || 'N/A',
      cliente: row.cliente || 'Cliente General',
      empleado: row.empleado || 'N/A',
      cargo: row.cargo || 'N/A',
      cortes: row.cortes || '',
      cantidad_corte: row.cantidad_corte || 0,
      productos: row.productos || '',
      cantidad_producto: row.cantidad_producto || 0,
      precio_producto: row.precio_producto || 0,
      comision_corte: row.comision_corte || 0,
      comision_producto: row.comision_producto || 0,
      tipo_pago: row.tipo_pago || 'Efectivo',
      descuento: row.descuento || 0,
      salario_total: row.salario_total || 0
    }));

    res.json(resultados);
  });
});

// ========================================
// API ENDPOINT PARA MEMBRESÍAS
// Agregar este código en servergeneral.js después de los endpoints existentes
// ========================================
// ========================================
// CORRECCIÓN DEL ENDPOINT DE MEMBRESÍAS
// Reemplaza el endpoint /api/membresias existente en servergeneral.js
// ========================================
// ========================================
// CORRECCIÓN DEL ENDPOINT DE MEMBRESÍAS PARA FECHAS ISO
// Reemplaza el endpoint /api/membresias existente en servergeneral.js
// ========================================

// ========================================
// ENDPOINT DE MEMBRESÍAS CORREGIDO PARA FORMATO CENTROAMERICANO
// Reemplaza el endpoint /api/membresias existente en servergeneral.js
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
          "Facturacion", "DetalleCortes", "DetalleProductos", "AgendarCitas","Usuarios","Nomina","CierreCaja","Salarios","Gastos","Registrar","Comisiones"
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
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;

  db.get("SELECT * FROM usuarios WHERE usuario = ?", [usuario], (err, user) => {
    if (err) return res.status(500).json({ mensaje: "Error de servidor" });
    if (!user) return res.status(401).json({ mensaje: "Usuario no encontrado" });

    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
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
    });
  });
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
  const { fecha, categoria, descripcion, monto } = req.body;
  db.run("INSERT INTO gastos (fecha, categoria, descripcion, monto) VALUES (?, ?, ?, ?)",
    [fecha, categoria, descripcion, monto],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al registrar gasto" });
      res.status(201).json({ id: this.lastID, mensaje: "Gasto registrado con éxito" });
    });
});

app.put('/api/gastos/:id', (req, res) => {
  const { fecha, categoria, descripcion, monto } = req.body;
  db.run("UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ? WHERE id = ?",
    [fecha, categoria, descripcion, monto, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar gasto" });
      res.json({ mensaje: "Gasto actualizado correctamente" });
    });
});

app.delete('/api/gastos/:id', (req, res) => {
  db.run("DELETE FROM gastos WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar gasto" });
    res.json({ mensaje: "Gasto eliminado correctamente" });
  });
});







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

//Salarios 
// Reemplaza el endpoint /api/salarios en servergeneral.js con esta versión corregida
// Reemplaza el endpoint /api/salarios en servergeneral.js
app.get('/api/salarios', (req, res) => {
  const { desde, hasta } = req.query;

  console.log('=== CONSULTA SALARIOS ===');
  console.log('Fechas recibidas - desde:', desde, 'hasta:', hasta);

  // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY si es necesario
  let desdeFormato = desde;
  let hastaFormato = hasta;

  if (desde && desde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = desde.split('-');
    desdeFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  if (hasta && hasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = hasta.split('-');
    hastaFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  console.log('Fechas convertidas para BD - desde:', desdeFormato, 'hasta:', hastaFormato);

  const sql = `
    SELECT 
      e.dui,
      e.nombre,
      e.cargo,
      e.salario AS salario_base,
      COUNT(DISTINCT f.id) AS cantidad_facturas,
      IFNULL(SUM(dc.comision), 0) AS comision_cortes,
      IFNULL(SUM(dp.comision), 0) AS comision_productos,
      (
        SELECT IFNULL(SUM(monto), 0)
        FROM descuentos
        WHERE descuentos.dui = e.dui AND fecha BETWEEN ? AND ?
      ) AS total_descuentos
    FROM empleados e
    LEFT JOIN facturas f ON (f.empleado_principal = e.nombre OR f.empleado = e.nombre) 
                          AND f.fecha BETWEEN ? AND ?
    LEFT JOIN detalle_cortes dc ON dc.empleado = e.nombre 
                                 AND dc.fecha BETWEEN ? AND ?
    LEFT JOIN detalle_productos dp ON dp.empleado = e.nombre 
                                    AND dp.fecha BETWEEN ? AND ?
    GROUP BY e.dui, e.nombre, e.cargo, e.salario
    ORDER BY e.nombre
  `;

  const params = [desdeFormato, hastaFormato, desdeFormato, hastaFormato, desdeFormato, hastaFormato, desdeFormato, hastaFormato];

  console.log('Parámetros SQL:', params);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("❌ Error al calcular salarios:", err.message);
      return res.status(500).json({ mensaje: "Error interno al calcular salarios" });
    }

    console.log(`✅ Consulta ejecutada, ${rows.length} empleados encontrados`);

    // Verificar si hay datos
    if (rows.length === 0) {
      console.log("No se encontraron empleados para el período especificado");
      return res.json([]);
    }

    // Calcular días trabajados usando las fechas originales en formato ISO
    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);
    const dias = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;

    console.log('📊 Días calculados:', dias);

    const resultado = rows.map(row => {
      const salario_proporcional = (row.salario_base / 30) * dias;
      const total_pago = salario_proporcional + row.comision_cortes + row.comision_productos - row.total_descuentos;

      console.log(`${row.nombre}: comision_cortes=${row.comision_cortes}, comision_productos=${row.comision_productos}, total=${total_pago.toFixed(2)}`);

      return {
        ...row,
        dias,
        salario_proporcional: salario_proporcional.toFixed(2),
        total_pago: total_pago.toFixed(2)
      };
    });

    res.json(resultado);
  });
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

// GET - Obtener todos los descuentos (para gestión)
app.get('/api/descuentos', (req, res) => {
  const { desde, hasta, dui } = req.query;
  
  console.log('🔍 === CONSULTANDO TODOS LOS DESCUENTOS ===');
  console.log('📋 Filtros:', { desde, hasta, dui });
  
  let query = `
    SELECT 
      d.id,
      d.fecha,
      d.dui,
      d.monto,
      d.motivo,
      e.nombre as nombre_empleado,
      e.cargo
    FROM descuentos d 
    LEFT JOIN empleados e ON d.dui = e.dui 
    WHERE 1=1
  `;
  const params = [];
  
  // Aplicar filtro por DUI específico
  if (dui && dui.trim() !== '') {
    query += " AND d.dui = ?";
    params.push(dui.trim());
    console.log('🔍 Filtro por DUI aplicado:', dui);
  }
  
  // Aplicar filtros de fecha si se proporcionan
  if (desde && hasta) {
    const desdeFormato = convertirFechaISOaCentroamericana(desde);
    const hastaFormato = convertirFechaISOaCentroamericana(hasta);
    
    query += " AND d.fecha BETWEEN ? AND ?";
    params.push(desdeFormato, hastaFormato);
    
    console.log('📅 Filtro de fechas aplicado:', { desdeFormato, hastaFormato });
  }
  
  query += " ORDER BY d.fecha DESC, d.id DESC";
  
  console.log('🔍 Query SQL:', query);
  console.log('📝 Parámetros:', params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar descuentos:', err.message);
      return res.status(500).json({ mensaje: "Error al obtener descuentos" });
    }
    
    console.log(`✅ ${rows.length} descuentos encontrados`);
    res.json(rows);
  });
});

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
// ENDPOINT DE BOLETAS
// ========================================

// Reemplaza COMPLETAMENTE el endpoint /api/boleta/:dui en servergeneral.js
app.get('/api/boleta/:dui', async (req, res) => {
  const { dui } = req.params;
  const { desde, hasta } = req.query;

  console.log('=== INICIO GENERACIÓN BOLETA ===');
  console.log('DUI:', dui);
  console.log('Fechas originales del filtro - desde:', desde, 'hasta:', hasta);

  // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY para la base de datos
  let desdeFormato = desde;
  let hastaFormato = hasta;

  if (desde && desde.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = desde.split('-');
    desdeFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  if (hasta && hasta.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = hasta.split('-');
    hastaFormato = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  console.log('Fechas convertidas para BD - desde:', desdeFormato, 'hasta:', hastaFormato);

  // Consulta SQL usando las fechas convertidas
  const sql = `
    SELECT 
      e.dui,
      e.nombre,
      e.cargo,
      e.salario AS salario_base,
      (
        SELECT IFNULL(SUM(dc.cantidad), 0)
        FROM detalle_cortes dc
        WHERE dc.empleado = e.nombre AND dc.fecha BETWEEN ? AND ?
      ) AS cantidad_cortes,
      (
        SELECT IFNULL(SUM(dp.cantidad), 0)
        FROM detalle_productos dp
        WHERE dp.empleado = e.nombre AND dp.fecha BETWEEN ? AND ?
      ) AS cantidad_productos,
      (
        SELECT IFNULL(SUM(dc.comision), 0)
        FROM detalle_cortes dc
        WHERE dc.empleado = e.nombre AND dc.fecha BETWEEN ? AND ?
      ) AS comision_cortes,
      (
        SELECT IFNULL(SUM(dp.comision), 0)
        FROM detalle_productos dp
        WHERE dp.empleado = e.nombre AND dp.fecha BETWEEN ? AND ?
      ) AS comision_productos,
      (
        SELECT IFNULL(SUM(monto), 0)
        FROM descuentos
        WHERE descuentos.dui = e.dui AND fecha BETWEEN ? AND ?
      ) AS total_descuentos
    FROM empleados e
    WHERE e.dui = ?
  `;

  const params = [
    desdeFormato, hastaFormato, // cantidad_cortes
    desdeFormato, hastaFormato, // cantidad_productos
    desdeFormato, hastaFormato, // comision_cortes
    desdeFormato, hastaFormato, // comision_productos
    desdeFormato, hastaFormato, // total_descuentos
    dui
  ];

  console.log('Ejecutando consulta SQL con parámetros:', params);

  db.get(sql, params, async (err, row) => {
    if (err) {
      console.error("❌ Error en consulta SQL:", err.message);
      return res.status(500).json({ mensaje: "Error en la consulta de base de datos." });
    }

    if (!row) {
      console.error("❌ No se encontró empleado con DUI:", dui);
      return res.status(404).json({ mensaje: "Empleado no encontrado." });
    }

    console.log('✅ Datos obtenidos:', JSON.stringify(row, null, 2));

    // Calcular días trabajados usando las fechas originales en formato ISO
    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);
    const dias = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;
    
    const salario_proporcional = (row.salario_base / 30) * dias;
    const total_pago = salario_proporcional + row.comision_cortes + row.comision_productos - row.total_descuentos;

    console.log('📊 Cálculos:');
    console.log('- Días:', dias);
    console.log('- Salario proporcional:', salario_proporcional.toFixed(2));
    console.log('- Total a pagar:', total_pago.toFixed(2));

    // CORRECCIÓN: Usar las fechas CONVERTIDAS para mostrar en el PDF
    console.log('📅 Fechas que se mostrarán en el PDF:');
    console.log('- Desde (BD):', desdeFormato);
    console.log('- Hasta (BD):', hastaFormato);

    // Leer plantilla HTML
    const plantillaPath = path.join(__dirname, 'salarios', 'plantilla-boleta.html');
    
    if (!fs.existsSync(plantillaPath)) {
      console.error("❌ No se encontró la plantilla en:", plantillaPath);
      return res.status(500).json({ mensaje: "Plantilla de boleta no encontrada." });
    }

    let html = fs.readFileSync(plantillaPath, 'utf8');
    console.log('✅ Plantilla leída correctamente');

    // Reemplazar TODOS los marcadores usando las fechas CORRECTAS
    const reemplazos = {
      '{{nombre}}': row.nombre || 'N/A',
      '{{dui}}': row.dui || 'N/A',
      '{{cargo}}': row.cargo || 'N/A',
      '{{desde}}': desdeFormato,        // ⬅️ CORRECCIÓN: Usar fecha convertida
      '{{hasta}}': hastaFormato,        // ⬅️ CORRECCIÓN: Usar fecha convertida
      '{{dias}}': dias.toString(),
      '{{salario_base}}': row.salario_base.toFixed(2),
      '{{salario_proporcional}}': salario_proporcional.toFixed(2),
      '{{cantidad_cortes}}': (row.cantidad_cortes || 0).toString(),
      '{{comision_cortes}}': row.comision_cortes.toFixed(2),
      '{{cantidad_productos}}': (row.cantidad_productos || 0).toString(),
      '{{comision_productos}}': row.comision_productos.toFixed(2),
      '{{total_descuentos}}': row.total_descuentos.toFixed(2),
      '{{total_pago}}': total_pago.toFixed(2)
    };

    console.log('🔄 Aplicando reemplazos...');
    
    // Aplicar todos los reemplazos
    Object.keys(reemplazos).forEach(marcador => {
      const valor = reemplazos[marcador];
      html = html.replace(new RegExp(marcador.replace(/[{}]/g, '\\$&'), 'g'), valor);
      console.log(`   ${marcador} -> ${valor}`);
    });

    // Verificar que no queden marcadores sin reemplazar
    const marcadoresRestantes = html.match(/\{\{[^}]+\}\}/g);
    if (marcadoresRestantes) {
      console.warn('⚠️ Marcadores sin reemplazar:', marcadoresRestantes);
    }

    // Crear directorio de salida
    const outputDir = path.join(__dirname, 'boletas');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('📁 Directorio de boletas creado');
    }

    // Usar las fechas convertidas también para el nombre del archivo
    const nombreArchivo = `Boleta_${row.nombre.replace(/\s+/g, '_')}_${desdeFormato.replace(/\//g, '-')}_a_${hastaFormato.replace(/\//g, '-')}.pdf`;
    const outputPath = path.join(outputDir, nombreArchivo);

    try {
      console.log('🖨️ Generando PDF...');
      
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Configurar la página
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Generar PDF con configuración optimizada para una sola página
      await page.pdf({ 
        path: outputPath, 
        format: 'A4',
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });
      
      await browser.close();

      console.log('✅ PDF generado exitosamente:', outputPath);
      console.log('📄 Archivo PDF:', nombreArchivo);
      
      // Enviar el archivo para descarga
      res.download(outputPath, nombreArchivo, (err) => {
        if (err) {
          console.error('❌ Error al enviar PDF:', err);
        } else {
          console.log('✅ PDF enviado correctamente con fechas:', desdeFormato, 'al', hastaFormato);
        }
      });

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      res.status(500).json({ 
        mensaje: "Error al generar el PDF de la boleta",
        error: error.message 
      });
    }
  });
});



// ========================================
// ENDPOINT DE CIERRE COMPLETO
// Agregar este código a servergeneral.js
// ========================================

// ENDPOINT PRINCIPAL: Cierre completo del día
app.get('/api/cierre-completo', async (req, res) => {
  const { fecha, responsable } = req.query;

  console.log('🔍 === INICIANDO CIERRE COMPLETO ===');
  console.log('📅 Fecha:', fecha);
  console.log('👤 Responsable:', responsable);

  if (!fecha) {
    return res.status(400).json({ mensaje: "Fecha es requerida" });
  }

  try {
    // Ejecutar todas las consultas en paralelo para mejor rendimiento
    const [
      ventasData,
      serviciosData,
      productosData,
      comisionesData,
      membresiaData,
      comparacionData
    ] = await Promise.all([
      obtenerVentasPorTipoPago(fecha, responsable),
      obtenerDetalleServicios(fecha, responsable),
      obtenerDetalleProductos(fecha, responsable),
      obtenerComisionesPorEmpleado(fecha, responsable),
      obtenerDatosMembresias(fecha),
      obtenerDatosComparacion(fecha)
    ]);

    // Calcular resumen ejecutivo
    const resumen = calcularResumenEjecutivo(ventasData, serviciosData, productosData, comisionesData, membresiaData);

    // Respuesta completa
    const respuesta = {
      fecha: fecha,
      responsable: responsable || 'Todos',
      sucursal: 'Escalón',
      ventas: ventasData,
      servicios: serviciosData,
      productos: productosData,
      comisiones: comisionesData,
      membresias: membresiaData,
      comparacion: comparacionData,
      resumen: resumen,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Cierre completo generado exitosamente');
    res.json(respuesta);

  } catch (error) {
    console.error('❌ Error en cierre completo:', error);
    res.status(500).json({ 
      mensaje: "Error al generar cierre completo", 
      error: error.message 
    });
  }
});

// ========================================
// FUNCIONES AUXILIARES PARA EL CIERRE
// ========================================




async function obtenerVentasPorTipoPago(fecha, responsable) {
  return new Promise((resolve, reject) => {
    console.log('💳 Consultando ventas por tipo de pago CON RANGOS...');

    // Consulta combinada de facturas y membresías CON COMANDA Y FACTURA
    const consultas = [];

    // 1. Facturas del día CON números de comanda y factura
    let queryFacturas = `
      SELECT 
        'factura' as tipo_registro,
        tipo_pago, 
        total, 
        fecha, 
        empleado_principal,
        factura,
        comanda,
        cliente
      FROM facturas 
      WHERE fecha = ?
    `;
    const paramsFacturas = [fecha];

    if (responsable) {
      queryFacturas += ` AND empleado_principal = ?`;
      paramsFacturas.push(responsable);
    }

    // Ordenar por factura para obtener rangos correctos
    queryFacturas += ` ORDER BY factura ASC`;

    consultas.push(new Promise((res, rej) => {
      db.all(queryFacturas, paramsFacturas, (err, rows) => {
        if (err) {
          console.error('❌ Error consultando facturas:', err);
          rej(err);
        } else {
          console.log(`✅ Facturas obtenidas: ${rows.length}`);
          
          // Debug: Mostrar rangos de comandas y facturas
          if (rows.length > 0) {
            const comandas = rows.map(r => parseInt(r.comanda)).filter(c => !isNaN(c));
            const facturas = rows.map(r => parseInt(r.factura)).filter(f => !isNaN(f));
            
            if (comandas.length > 0) {
              console.log(`📋 Rangos de comandas: ${Math.min(...comandas)} a ${Math.max(...comandas)} (Total: ${comandas.length})`);
            }
            if (facturas.length > 0) {
              console.log(`🧾 Rangos de facturas: ${Math.min(...facturas)} a ${Math.max(...facturas)} (Total: ${facturas.length})`);
            }
          }
          
          res(rows);
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
          console.error('❌ Error consultando membresías:', err);
          rej(err);
        } else {
          console.log(`✅ Membresías obtenidas: ${rows.length}`);
          res(rows);
        }
      });
    }));

    // Ejecutar ambas consultas
    Promise.all(consultas)
      .then(([facturas, membresias]) => {
        const ventas = [...facturas, ...membresias];
        console.log(`✅ Total ventas combinadas: ${facturas.length} facturas + ${membresias.length} membresías`);
        resolve(ventas);
      })
      .catch(reject);
  });
}

// Obtener detalle de servicios/cortes del día

async function obtenerDetalleServicios(fecha, responsable) {
  return new Promise((resolve, reject) => {
    console.log('✂️ === CONSULTANDO DETALLE DE SERVICIOS CORREGIDO ===');
    console.log('📅 Fecha:', fecha);
    console.log('👤 Responsable:', responsable);

    // NUEVA CONSULTA: Obtener CADA servicio individual, no agrupado
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
        -- Calcular precio unitario
        (dc.total / dc.cantidad) as precio_unitario
      FROM detalle_cortes dc
      WHERE dc.fecha = ?
    `;
    const params = [fecha];

    if (responsable && responsable.trim() !== '') {
      query += ` AND dc.empleado = ?`;
      params.push(responsable.trim());
    }

    query += ` ORDER BY dc.factura ASC, dc.id ASC`;

    console.log('🔍 Query SQL corregida:', query);
    console.log('📝 Parámetros:', params);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error consultando servicios:', err.message);
        reject(err);
      } else {
        console.log(`✅ Servicios encontrados: ${rows.length} registros individuales`);
        
        // Debug: Mostrar cada servicio encontrado
        rows.forEach((servicio, index) => {
          console.log(`   ${index + 1}. ${servicio.nombre} - Cantidad: ${servicio.cantidad} - Total: $${servicio.total} - Empleado: ${servicio.empleado} - Factura: ${servicio.factura}`);
        });
        
        // IMPORTANTE: No agrupar aquí, devolver todos los registros individuales
        resolve(rows);
      }
    });
  });
}

// Obtener detalle de productos vendidos del día
async function obtenerDetalleProductos(fecha, responsable) {
  return new Promise((resolve, reject) => {
    console.log('🛍️ Consultando detalle de productos...');

    let query = `
      SELECT 
        dp.nombre,
        dp.cantidad,
        dp.total,
        dp.comision,
        dp.empleado,
        dp.factura,
        dp.comanda,
        COUNT(*) as frecuencia
      FROM detalle_productos dp
      WHERE dp.fecha = ?
    `;
    const params = [fecha];

    if (responsable) {
      query += ` AND dp.empleado = ?`;
      params.push(responsable);
    }

    query += ` 
      GROUP BY dp.nombre, dp.empleado
      ORDER BY dp.nombre, SUM(dp.total) DESC
    `;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error consultando productos:', err);
        reject(err);
      } else {
        console.log(`✅ Productos obtenidos: ${rows.length} tipos diferentes`);
        resolve(rows);
      }
    });
  });
}

// Obtener comisiones por empleado del día
async function obtenerComisionesPorEmpleado(fecha, responsable) {
  return new Promise((resolve, reject) => {
    console.log('💰 Consultando comisiones por empleado...');

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

    if (responsable) {
      query += ` WHERE empleado = ?`;
      params.push(responsable);
    }

    query += ` GROUP BY empleado ORDER BY total_comision DESC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Error consultando comisiones:', err);
        reject(err);
      } else {
        console.log(`✅ Comisiones obtenidas para ${rows.length} empleados`);
        resolve(rows);
      }
    });
  });
}

// Obtener datos de membresías para análisis adicional
async function obtenerDatosMembresias(fecha) {
  return new Promise((resolve, reject) => {
    console.log('👥 Consultando datos de membresías...');

    const query = `
      SELECT 
        COUNT(*) as total_membresias,
        SUM(monto) as ingresos_membresias,
        AVG(monto) as promedio_membresia,
        tipo_pago,
        COUNT(tipo_pago) as cantidad_por_tipo
      FROM clientes 
      WHERE membresia = 'Activo' 
      AND fecha_inicio = ?
      AND monto > 0
      GROUP BY tipo_pago
    `;

    db.all(query, [fecha], (err, rows) => {
      if (err) {
        console.error('❌ Error consultando membresías:', err);
        reject(err);
      } else {
        console.log(`✅ Datos de membresías obtenidos`);
        resolve(rows);
      }
    });
  });
}

// Obtener datos de comparación (día anterior, semana, mes)
async function obtenerDatosComparacion(fecha) {
  return new Promise((resolve, reject) => {
    console.log('📊 Calculando comparaciones históricas...');

    try {
      // Calcular fechas de comparación
      const fechaActual = convertirFechaCentroamericanaADate(fecha);
      
      // Día anterior
      const fechaAyer = new Date(fechaActual);
      fechaAyer.setDate(fechaAyer.getDate() - 1);
      const fechaAyerStr = convertirFechaISOaCentroamericana(fechaAyer.toISOString().split('T')[0]);

      // Semana anterior (mismo día hace 7 días)
      const fechaSemanaAnterior = new Date(fechaActual);
      fechaSemanaAnterior.setDate(fechaSemanaAnterior.getDate() - 7);
      const fechaSemanaStr = convertirFechaISOaCentroamericana(fechaSemanaAnterior.toISOString().split('T')[0]);

      // Mes anterior (mismo día hace 30 días)
      const fechaMesAnterior = new Date(fechaActual);
      fechaMesAnterior.setDate(fechaMesAnterior.getDate() - 30);
      const fechaMesStr = convertirFechaISOaCentroamericana(fechaMesAnterior.toISOString().split('T')[0]);

      // Consultas de comparación
      const consultas = [
        obtenerVentasTotalPorFecha(fechaAyerStr),
        obtenerVentasTotalPorFecha(fechaSemanaStr),
        obtenerVentasTotalPorFecha(fechaMesStr)
      ];

      Promise.all(consultas)
        .then(([ventasAyer, ventasSemana, ventasMes]) => {
          resolve({
            ayer: { fecha: fechaAyerStr, total: ventasAyer },
            semana_anterior: { fecha: fechaSemanaStr, total: ventasSemana },
            mes_anterior: { fecha: fechaMesStr, total: ventasMes }
          });
        })
        .catch(reject);

    } catch (error) {
      console.error('❌ Error calculando fechas de comparación:', error);
      resolve({
        ayer: { fecha: 'N/A', total: 0 },
        semana_anterior: { fecha: 'N/A', total: 0 },
        mes_anterior: { fecha: 'N/A', total: 0 }
      });
    }
  });
}

// Obtener total de ventas por fecha específica
async function obtenerVentasTotalPorFecha(fecha) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COALESCE(SUM(f.total), 0) + COALESCE(SUM(c.monto), 0) as total
      FROM 
        (SELECT total FROM facturas WHERE fecha = ?) f
      FULL OUTER JOIN 
        (SELECT monto FROM clientes WHERE fecha_inicio = ? AND membresia = 'Activo') c ON 1=1
    `;

    db.get(query, [fecha, fecha], (err, row) => {
      if (err) {
        console.error('❌ Error obteniendo ventas por fecha:', err);
        resolve(0);
      } else {
        resolve(row?.total || 0);
      }
    });
  });
}

// Calcular resumen ejecutivo
// Calcular resumen ejecutivo CON RANGOS
function calcularResumenEjecutivo(ventas, servicios, productos, comisiones, membresias) {
  console.log('📈 Calculando resumen ejecutivo CON RANGOS...');

  // Totales de ventas
  let ingresosTotales = 0;
  let totalTransacciones = 0;
  let conteoFacturas = 0;
  let conteoMembresias = 0;

  // Rangos de comandas y facturas
  const comandas = [];
  const numeroFacturas = [];

  ventas.forEach(venta => {
    ingresosTotales += parseFloat(venta.total || 0);
    totalTransacciones++;
    
    if (venta.tipo_registro === 'factura') {
      conteoFacturas++;
      
      // Recopilar números de comanda y factura
      if (venta.comanda && !isNaN(parseInt(venta.comanda))) {
        comandas.push(parseInt(venta.comanda));
      }
      if (venta.factura && !isNaN(parseInt(venta.factura))) {
        numeroFacturas.push(parseInt(venta.factura));
      }
    } else if (venta.tipo_registro === 'membresia') {
      conteoMembresias++;
    }
  });

  // Calcular rangos
  const rangosComandas = {
    inicio: comandas.length > 0 ? Math.min(...comandas) : 0,
    fin: comandas.length > 0 ? Math.max(...comandas) : 0,
    total: comandas.length
  };

  const rangosFacturas = {
    inicio: numeroFacturas.length > 0 ? Math.min(...numeroFacturas) : 0,
    fin: numeroFacturas.length > 0 ? Math.max(...numeroFacturas) : 0,
    total: numeroFacturas.length
  };

  // Totales de servicios
  let totalServicios = 0;
  let cantidadServicios = 0;
  let comisionServicios = 0;

  servicios.forEach(servicio => {
    totalServicios += parseFloat(servicio.total || 0);
    cantidadServicios += parseInt(servicio.cantidad || 0);
    comisionServicios += parseFloat(servicio.comision || 0);
  });

  // Totales de productos
  let totalProductos = 0;
  let cantidadProductos = 0;
  let comisionProductos = 0;

  productos.forEach(producto => {
    totalProductos += parseFloat(producto.total || 0);
    cantidadProductos += parseInt(producto.cantidad || 0);
    comisionProductos += parseFloat(producto.comision || 0);
  });

  // Total de comisiones
  let totalComisiones = 0;
  comisiones.forEach(com => {
    totalComisiones += parseFloat(com.total_comision || 0);
  });

  // Métricas calculadas
  const ventaPromedio = totalTransacciones > 0 ? ingresosTotales / totalTransacciones : 0;
  const margenUtilidad = ingresosTotales > 0 ? ((ingresosTotales - totalComisiones) / ingresosTotales * 100) : 0;
  const utilidadNeta = ingresosTotales - totalComisiones;

  const resumen = {
    ingresos_totales: ingresosTotales,
    total_transacciones: totalTransacciones,
    conteo_facturas: conteoFacturas,
    conteo_membresias: conteoMembresias,
    total_servicios: totalServicios,
    cantidad_servicios: cantidadServicios,
    total_productos: totalProductos,
    cantidad_productos: cantidadProductos,
    total_comisiones: totalComisiones,
    comision_servicios: comisionServicios,
    comision_productos: comisionProductos,
    venta_promedio: ventaPromedio,
    margen_utilidad: margenUtilidad,
    utilidad_neta: utilidadNeta,
    servicios_por_empleado: cantidadServicios / Math.max(comisiones.length, 1),
    productos_por_empleado: cantidadProductos / Math.max(comisiones.length, 1),
    
    // ✅ NUEVOS CAMPOS: Rangos de comandas y facturas
    rangos_comandas: rangosComandas,
    rangos_facturas: rangosFacturas
  };

  console.log('✅ Resumen ejecutivo CON RANGOS calculado:', {
    ...resumen,
    rangos_comandas: rangosComandas,
    rangos_facturas: rangosFacturas
  });
  
  return resumen;
}

// ========================================
// AGREGAR ENDPOINT DE DEBUG PARA VERIFICAR RANGOS
// Agregar después de los endpoints existentes
// ========================================

// ENDPOINT DE DEBUG PARA RANGOS
app.get('/api/debug/rangos/:fecha', (req, res) => {
  const { fecha } = req.params;
  
  console.log('🔍 === DEBUG RANGOS COMANDAS Y FACTURAS ===');
  console.log('📅 Fecha consultada:', fecha);
  
  const query = `
    SELECT 
      id,
      factura,
      comanda,
      cliente,
      empleado_principal,
      total,
      fecha
    FROM facturas 
    WHERE fecha = ?
    ORDER BY factura ASC
  `;
  
  db.all(query, [fecha], (err, rows) => {
    if (err) {
      console.error('❌ Error en debug rangos:', err);
      return res.status(500).json({ error: 'Error en debug' });
    }
    
    console.log(`📋 ${rows.length} facturas encontradas para ${fecha}`);
    
    if (rows.length > 0) {
      // Extraer comandas y facturas
      const comandas = rows.map(r => parseInt(r.comanda)).filter(c => !isNaN(c));
      const facturas = rows.map(r => parseInt(r.factura)).filter(f => !isNaN(f));
      
      const rangosComandas = {
        inicio: comandas.length > 0 ? Math.min(...comandas) : 0,
        fin: comandas.length > 0 ? Math.max(...comandas) : 0,
        total: comandas.length,
        lista: comandas.sort((a, b) => a - b)
      };
      
      const rangosFacturas = {
        inicio: facturas.length > 0 ? Math.min(...facturas) : 0,
        fin: facturas.length > 0 ? Math.max(...facturas) : 0,
        total: facturas.length,
        lista: facturas.sort((a, b) => a - b)
      };
      
      console.log('📊 Rangos calculados:');
      console.log('   Comandas:', rangosComandas);
      console.log('   Facturas:', rangosFacturas);
      
      res.json({
        fecha: fecha,
        total_registros: rows.length,
        rangos_comandas: rangosComandas,
        rangos_facturas: rangosFacturas,
        detalles_facturas: rows.map(r => ({
          factura: r.factura,
          comanda: r.comanda,
          cliente: r.cliente,
          total: r.total
        }))
      });
    } else {
      res.json({
        fecha: fecha,
        total_registros: 0,
        mensaje: 'No se encontraron facturas para esta fecha',
        rangos_comandas: { inicio: 0, fin: 0, total: 0 },
        rangos_facturas: { inicio: 0, fin: 0, total: 0 }
      });
    }
  });
});

console.log('✅ Funciones de rangos de comandas y facturas agregadas al servidor');
// ========================================
// ENDPOINT PARA GUARDAR CIERRE COMPLETO
// ========================================

// Crear tabla para almacenar cierres de caja




// Endpoint para obtener historial de cierres
app.get('/api/historial-cierres', (req, res) => {
  const { desde, hasta, responsable } = req.query;

  let query = `
    SELECT 
      fecha,
      sucursal,
      responsable,
      hora_apertura,
      hora_cierre,
      saldo_inicial,
      efectivo_contado,
      diferencia_efectivo,
      ingresos_totales,
      total_transacciones,
      total_comisiones,
      utilidad_neta,
      estado,
      created_at
    FROM cierres_caja 
    WHERE sucursal = 'Escalón'
  `;
  const params = [];

  if (desde) {
    query += ` AND fecha >= ?`;
    params.push(desde);
  }

  if (hasta) {
    query += ` AND fecha <= ?`;
    params.push(hasta);
  }

  if (responsable) {
    query += ` AND responsable = ?`;
    params.push(responsable);
  }

  query += ` ORDER BY fecha DESC, created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Error obteniendo historial:', err);
      return res.status(500).json({ mensaje: "Error al obtener historial" });
    }

    res.json(rows);
  });
});

// ========================================
// ENDPOINT PARA ANÁLISIS AVANZADO
// ========================================

// Análisis de tendencias por sucursal
app.get('/api/analisis-sucursal', (req, res) => {
  const { mes, anio } = req.query;
  
  if (!mes || !anio) {
    return res.status(400).json({ mensaje: "Mes y año son requeridos" });
  }

  console.log('📊 === GENERANDO ANÁLISIS DE SUCURSAL ===');
  console.log(`📅 Período: ${mes}/${anio}`);

  const patronFecha = `%/${mes.padStart(2, '0')}/${anio}`;

  const queries = {
    // Ventas totales del mes
    ventasMes: `
      SELECT 
        SUM(total) as total_ventas,
        COUNT(*) as total_facturas,
        AVG(total) as promedio_venta
      FROM facturas 
      WHERE fecha LIKE ?
    `,
    
    // Servicios más populares
    serviciosPopulares: `
      SELECT 
        nombre,
        SUM(cantidad) as total_cantidad,
        SUM(total) as total_ingresos,
        COUNT(DISTINCT empleado) as empleados_involucrados
      FROM detalle_cortes 
      WHERE fecha LIKE ?
      GROUP BY nombre
      ORDER BY total_cantidad DESC
      LIMIT 10
    `,
    
    // Productos más vendidos
    productosPopulares: `
      SELECT 
        nombre,
        SUM(cantidad) as total_cantidad,
        SUM(total) as total_ingresos,
        COUNT(DISTINCT empleado) as empleados_involucrados
      FROM detalle_productos 
      WHERE fecha LIKE ?
      GROUP BY nombre
      ORDER BY total_cantidad DESC
      LIMIT 10
    `,
    
    // Performance por empleado
    performanceEmpleados: `
      SELECT 
        empleado,
        COUNT(DISTINCT fecha) as dias_trabajados,
        SUM(CASE WHEN tipo = 'servicio' THEN cantidad ELSE 0 END) as servicios_realizados,
        SUM(CASE WHEN tipo = 'producto' THEN cantidad ELSE 0 END) as productos_vendidos,
        SUM(total) as ingresos_generados,
        SUM(comision) as comisiones_ganadas
      FROM (
        SELECT empleado, fecha, cantidad, total, comision, 'servicio' as tipo 
        FROM detalle_cortes WHERE fecha LIKE ?
        UNION ALL
        SELECT empleado, fecha, cantidad, total, comision, 'producto' as tipo 
        FROM detalle_productos WHERE fecha LIKE ?
      ) 
      GROUP BY empleado
      ORDER BY ingresos_generados DESC
    `,
    
    // Análisis por día de la semana
    ventasPorDia: `
      SELECT 
        fecha,
        SUM(total) as ventas_dia,
        COUNT(*) as transacciones_dia
      FROM facturas 
      WHERE fecha LIKE ?
      GROUP BY fecha
      ORDER BY fecha
    `
  };

  // Ejecutar todas las consultas
  const promesas = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      const params = key === 'performanceEmpleados' ? [patronFecha, patronFecha] : [patronFecha];
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error(`❌ Error en consulta ${key}:`, err);
          reject(err);
        } else {
          resolve({ [key]: rows });
        }
      });
    });
  });

  Promise.all(promesas)
    .then(resultados => {
      const analisis = Object.assign({}, ...resultados);
      
      // Calcular métricas adicionales
      const ventasMes = analisis.ventasMes[0] || {};
      const totalDias = analisis.ventasPorDia.length;
      
      analisis.metricas = {
        promedio_diario: totalDias > 0 ? (ventasMes.total_ventas || 0) / totalDias : 0,
        mejor_dia: analisis.ventasPorDia.reduce((max, dia) => 
          dia.ventas_dia > (max.ventas_dia || 0) ? dia : max, {}),
        total_empleados_activos: analisis.performanceEmpleados.length,
        servicio_estrella: analisis.serviciosPopulares[0] || {},
        producto_estrella: analisis.productosPopulares[0] || {}
      };

      console.log('✅ Análisis de sucursal generado exitosamente');
      res.json({
        sucursal: 'Escalón',
        periodo: `${mes}/${anio}`,
        ...analisis,
        generado_en: new Date().toISOString()
      });
    })
    .catch(error => {
      console.error('❌ Error generando análisis:', error);
      res.status(500).json({ 
        mensaje: "Error al generar análisis de sucursal",
        error: error.message 
      });
    });
});

console.log('✅ Endpoints de cierre completo configurados correctamente');
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
  
  app.get('/nomina/nomina.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'nomina', 'nomina.html'));
  });
  



  
  // Ruta no encontrada
  app.use((req, res) => {
    res.status(404).send('Página no encontrada 😢');
  });
  
  
  // ----------------- INICIAR SERVIDOR -----------------
  app.listen(PORT, () => {
    console.log(`🚀 Servidor General corriendo en http://localhost:${PORT}`);
  });
  


  
  