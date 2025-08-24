// servergeneral-postgres.js - Versión adaptada para PostgreSQL
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
// ========================================

function convertirFechaISOaCentroamericana(fechaISO) {
  if (!fechaISO) return '';
  if (fechaISO.match(/^\d{2}\/\d{2}\/\d{4}$/)) return fechaISO;
  if (fechaISO.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }
  return fechaISO;
}

function convertirFechaCentroamericanaADate(fechaCentro) {
  if (!fechaCentro) return null;
  if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fechaCentro.split('/');
    return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
  }
  if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(fechaCentro);
  }
  return new Date(fechaCentro);
}

function convertirFechaCentroamericanaAISO(fechaCentro) {
  if (!fechaCentro) return '';
  if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) return fechaCentro;
  if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fechaCentro.split('/');
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return fechaCentro;
}

function obtenerFechaActualCentroamericana() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

console.log('✅ Funciones auxiliares de fechas cargadas correctamente');

// ========================================
// MIDDLEWARES
// ========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use(express.static('.'));
app.use('/boletas', express.static(path.join(__dirname, 'boletas')));
app.use('/cierres', express.static(path.join(__dirname, 'cierres')));
app.use('/factura', express.static(path.join(__dirname, 'factura')));
app.use('/estilos', express.static(path.join(__dirname, 'estilos')));
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));
app.use('/clientes', express.static(path.join(__dirname, 'clientes')));
app.use('/empleados', express.static(path.join(__dirname, 'empleados')));
app.use('/inventarios', express.static(path.join(__dirname, 'inventarios')));
app.use('/gastos', express.static(path.join(__dirname, 'gastos')));
app.use('/citas', express.static(path.join(__dirname, 'citas')));
app.use('/compras', express.static(path.join(__dirname, 'compras')));
app.use('/cortes', express.static(path.join(__dirname, 'cortes')));
app.use('/facturacion', express.static(path.join(__dirname, 'facturacion')));
app.use('/salarios', express.static(path.join(__dirname, 'salarios')));
app.use('/tarjetas-fidelidad', express.static(path.join(__dirname, 'tarjetas-fidelidad')));

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'barbershop_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================

function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  } else {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }
}

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  
  if (!usuario || !password) {
    return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' });
  }

  try {
    const user = await DatabaseHelper.getUsuario(usuario);
    
    if (!user) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    req.session.usuario = user.usuario;
    req.session.rol = user.rol;
    
    res.json({ 
      mensaje: 'Login exitoso', 
      usuario: user.usuario, 
      rol: user.rol 
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.usuario) {
    res.json({ 
      autenticado: true, 
      usuario: req.session.usuario, 
      rol: req.session.rol 
    });
  } else {
    res.json({ autenticado: false });
  }
});

// ========================================
// RUTAS PRINCIPALES
// ========================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/indexreportes.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'indexreportes.html'));
});

// ========================================
// CRUD CLIENTES
// ========================================

app.get('/api/clientes', requireAuth, async (req, res) => {
  try {
    const clientes = await DatabaseHelper.getAllClientes();
    res.json(clientes);
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error obteniendo clientes' });
  }
});

app.post('/api/clientes', requireAuth, async (req, res) => {
  const { nombre, telefono, email, direccion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const id = await DatabaseHelper.createCliente(nombre, telefono, email, direccion);
    res.json({ mensaje: 'Cliente creado exitosamente', id });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error creando cliente' });
  }
});

app.put('/api/clientes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, email, direccion } = req.body;

  try {
    await DatabaseHelper.updateCliente(id, nombre, telefono, email, direccion);
    res.json({ mensaje: 'Cliente actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error actualizando cliente' });
  }
});

app.delete('/api/clientes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await DatabaseHelper.deleteCliente(id);
    res.json({ mensaje: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error eliminando cliente' });
  }
});

// ========================================
// CRUD EMPLEADOS
// ========================================

app.get('/api/empleados', requireAuth, async (req, res) => {
  try {
    const empleados = await DatabaseHelper.getAllEmpleados();
    res.json(empleados);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error obteniendo empleados' });
  }
});

app.post('/api/empleados', requireAuth, async (req, res) => {
  const { nombre, telefono, email, puesto, salario, fecha_ingreso } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const id = await DatabaseHelper.createEmpleado(nombre, telefono, email, puesto, salario, fecha_ingreso);
    res.json({ mensaje: 'Empleado creado exitosamente', id });
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

// ========================================
// CRUD PRODUCTOS
// ========================================

app.get('/api/productos', requireAuth, async (req, res) => {
  try {
    const productos = await DatabaseHelper.getAllProductos();
    res.json(productos);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

// ========================================
// CRUD FACTURAS
// ========================================

app.get('/facturas', requireAuth, async (req, res) => {
  const { desde, hasta, comanda, factura, empleado, cliente, pago } = req.query;

  try {
    console.log('Consulta facturas con filtros:', { desde, hasta, comanda, factura, empleado, cliente, pago });

    // Construir consulta SQL con filtros
    let sql = 'SELECT * FROM facturas WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (desde) {
      const desdeFormato = convertirFechaCentroamericanaAISO(desde);
      sql += ` AND fecha >= $${paramIndex}`;
      params.push(desdeFormato);
      paramIndex++;
    }

    if (hasta) {
      const hastaFormato = convertirFechaCentroamericanaAISO(hasta);
      sql += ` AND fecha <= $${paramIndex}`;
      params.push(hastaFormato);
      paramIndex++;
    }

    if (comanda) {
      sql += ` AND comanda = $${paramIndex}`;
      params.push(comanda);
      paramIndex++;
    }

    if (factura) {
      sql += ` AND factura = $${paramIndex}`;
      params.push(factura);
      paramIndex++;
    }

    if (empleado) {
      sql += ` AND (empleado ILIKE $${paramIndex} OR empleado_principal ILIKE $${paramIndex})`;
      params.push(`%${empleado}%`);
      paramIndex++;
    }

    if (cliente) {
      sql += ` AND cliente ILIKE $${paramIndex}`;
      params.push(`%${cliente}%`);
      paramIndex++;
    }

    if (pago) {
      sql += ` AND tipo_pago = $${paramIndex}`;
      params.push(pago);
      paramIndex++;
    }

    // Ordenar por fecha y factura descendente
    sql += ' ORDER BY fecha DESC, factura DESC';

    console.log('SQL query:', sql);
    console.log('Parameters:', params);

    const result = await pool.query(sql, params);
    const facturas = result.rows;

    // Convertir fechas a formato centroamericano para la respuesta
    const facturasFormateadas = facturas.map(f => ({
      ...f,
      fecha: convertirFechaISOaCentroamericana(f.fecha)
    }));

    console.log(`Facturas encontradas: ${facturasFormateadas.length}`);
    res.json(facturasFormateadas);

  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ mensaje: 'Error al obtener facturas' });
  }
});

// Endpoint para crear nueva factura (POST /facturas)
app.post('/facturas', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      fecha, comanda, factura, cliente, empleado, tipo_pago, descuento, total,
      detalleCortes, detalleProductos,
      es_pago_mixto, monto_efectivo, monto_tarjeta
    } = req.body;

    // Iniciar transacción
    await client.query('BEGIN');

    // Insertar factura
    const insertFacturaQuery = `
      INSERT INTO facturas 
      (fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total, empleado_principal, es_pago_mixto, monto_efectivo, monto_tarjeta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;

    const facturaResult = await client.query(insertFacturaQuery, [
      fecha, comanda, factura, cliente, empleado, tipo_pago, total, descuento, total, empleado,
      es_pago_mixto ? true : false, monto_efectivo || 0, monto_tarjeta || 0
    ]);

    const facturaId = facturaResult.rows[0].id;

    // Insertar detalles de cortes
    if (detalleCortes && detalleCortes.length > 0) {
      const insertCorteQuery = `
        INSERT INTO detalle_cortes 
        (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha, comanda, factura)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      for (const corte of detalleCortes) {
        if (corte && corte.cantidad > 0) {
          await client.query(insertCorteQuery, [
            facturaId, corte.codigo, corte.nombre, corte.cantidad, corte.total, corte.comision,
            corte.empleado, fecha, comanda, factura
          ]);
        }
      }
    }

    // Insertar detalles de productos
    if (detalleProductos && detalleProductos.length > 0) {
      const insertProductoQuery = `
        INSERT INTO detalle_productos 
        (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha, comanda, factura)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      for (const producto of detalleProductos) {
        if (producto && producto.cantidad > 0) {
          await client.query(insertProductoQuery, [
            facturaId, producto.codigo, producto.nombre, producto.cantidad, producto.total, 
            producto.comision, producto.empleado, fecha, comanda, factura
          ]);

          // Actualizar inventario de productos
          await client.query(
            'UPDATE productos SET existencia = existencia - $1 WHERE codigo = $2',
            [producto.cantidad, producto.codigo]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Factura creada exitosamente', id: facturaId });
    console.log(`✅ Factura ${factura} creada exitosamente con ID: ${facturaId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en POST /facturas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

app.delete('/facturas/:id', requireAuth, async (req, res) => {
  const facturaId = req.params.id;

  try {
    console.log(`Eliminando factura ID: ${facturaId}`);

    // Obtener productos de la factura para restaurar inventario
    const productosResult = await pool.query(
      'SELECT * FROM detalle_productos WHERE factura_id = $1',
      [facturaId]
    );

    // Restaurar inventario de productos
    for (const producto of productosResult.rows) {
      await pool.query(
        'UPDATE productos SET existencia = existencia + $1 WHERE codigo = $2',
        [producto.cantidad, producto.codigo]
      );
    }

    // Eliminar detalles de productos
    await pool.query('DELETE FROM detalle_productos WHERE factura_id = $1', [facturaId]);

    // Eliminar detalles de servicios
    await pool.query('DELETE FROM detalle_servicios WHERE factura_id = $1', [facturaId]);

    // Eliminar la factura
    await pool.query('DELETE FROM facturas WHERE id = $1', [facturaId]);

    res.json({ mensaje: 'Factura eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ mensaje: 'Error al eliminar factura' });
  }
});

// ========================================
// TARJETAS DE FIDELIDAD
// ========================================

// Inicializar el módulo de tarjetas de fidelidad
const tarjetasFidelidad = new TarjetasFidelidad(app, pool);
console.log('✅ Módulo de tarjetas de fidelidad inicializado');

// ========================================
// MANEJO DE ERRORES
// ========================================

app.use((req, res) => {
  res.status(404).send('Página no encontrada 😢');
});

// ========================================
// INICIAR SERVIDOR
// ========================================

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