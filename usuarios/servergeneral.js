
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

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
// 🚀 Servir carpeta de estilos
app.use('/estilos', express.static(path.join(__dirname, 'estilos')));

app.use(session({
  secret: 'barbershop_secret_key', // Cambiar si deseas
  resave: false,
  saveUninitialized: true
}));
// Conexión a la base de datos
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

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
    monto REAL
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
    compra_promedio REAL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    codigo TEXT,
    producto TEXT,
    precio_compra REAL,
    cantidad INTEGER
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
    total REAL
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
  
      db.run(`INSERT INTO clientes (fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, monto)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto],
        function (err) {
          if (err) return res.status(500).json({ mensaje: "Error al registrar cliente" });
          res.status(201).json({ id: this.lastID, mensaje: "Cliente registrado con éxito" });
        });
    });
  });
  
  // Actualizar cliente existente
  app.put('/api/clientes/:id', (req, res) => {
    const id = req.params.id;
    const c = req.body;
    db.run(`UPDATE clientes SET fecha = ?, dui = ?, nombre = ?, telefono = ?, correo = ?, membresia = ?, fecha_inicio = ?, fecha_final = ?, monto = ? WHERE id = ?`,
      [c.fecha, c.dui, c.nombre, c.telefono, c.correo, c.membresia, c.fecha_inicio, c.fecha_final, c.monto, id],
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
    db.all("SELECT * FROM productos ORDER BY codigo ASC", (err, rows) => {
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
app.post('/productos', (req, res) => {
  const p = req.body;
  db.get("SELECT COUNT(*) AS total FROM productos", (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al generar código" });
    const codigo = `P${row.total + 1}`;
    db.run(`INSERT INTO productos (codigo, producto, precio_venta, comision, existencia, compra_promedio, minimo)
            VALUES (?, ?, ?, ?, 0, 0, ?)`,
      [codigo, p.producto, p.precio_venta, p.comision, p.minimo || 0],
      function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al registrar producto" });
        res.status(201).json({ mensaje: "Producto registrado exitosamente", codigo });
      });
  });
});

// Al actualizar un producto
app.put('/productos/:codigo', (req, res) => {
  const p = req.body;
  db.run(`UPDATE productos SET producto = ?, precio_venta = ?, comision = ?, minimo = ? WHERE codigo = ?`,
    [p.producto, p.precio_venta, p.comision, p.minimo || 0, req.params.codigo],
    function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar producto" });
      res.json({ mensaje: "Producto actualizado correctamente" });
    });
}); 
  
  // Eliminar producto
  app.delete('/productos/:codigo', (req, res) => {
    db.run("DELETE FROM productos WHERE codigo = ?", req.params.codigo, function (err) {
      if (err) return res.status(500).json({ mensaje: "Error al eliminar producto" });
      res.json({ mensaje: "Producto eliminado correctamente" });
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
// 🚀 Servir la página HTML de Compras
app.get('/compras', (req, res) => {
    res.sendFile(path.join(__dirname, 'compras', 'compras.html'));
  });
  
  // 🚀 Obtener todas las compras (datos JSON)
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
  app.post('/api/compras', (req, res) => {
    const { fecha, codigo, precio_compra, cantidad } = req.body;
  
    db.get("SELECT * FROM productos WHERE codigo = ?", [codigo], (err, producto) => {
      if (err || !producto) return res.status(404).json({ mensaje: "Producto no encontrado" });
  
      const nuevaExistencia = producto.existencia + parseInt(cantidad);
      const compraAnterior = producto.compra_promedio || 0;
      const nuevoPromedio = ((producto.existencia * compraAnterior) + (cantidad * precio_compra)) / nuevaExistencia;
  
      db.run(`INSERT INTO compras (fecha, codigo, producto, precio_compra, cantidad)
              VALUES (?, ?, ?, ?, ?)`,
        [fecha, codigo, producto.producto, precio_compra, cantidad], function (err) {
          if (err) return res.status(500).json({ mensaje: "Error al registrar compra" });
  
          db.run(`UPDATE productos SET existencia = ?, compra_promedio = ? WHERE codigo = ?`,
            [nuevaExistencia, nuevoPromedio, codigo], function (err) {
              if (err) return res.status(500).json({ mensaje: "Error al actualizar inventario" });
  
              res.status(201).json({ mensaje: "Compra registrada exitosamente" });
            });
        });
    });
  });
  
  // 🚀 Eliminar una compra y actualizar inventario
  app.delete('/api/compras/:id', (req, res) => {
    const id = req.params.id;
  
    db.get("SELECT * FROM compras WHERE id = ?", [id], (err, compra) => {
      if (err || !compra) return res.status(404).json({ mensaje: "Compra no encontrada" });
  
      db.run("DELETE FROM compras WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al eliminar compra" });
  
        // Actualizar inventario al eliminar una compra
        db.get("SELECT existencia FROM productos WHERE codigo = ?", [compra.codigo], (err, producto) => {
          if (producto) {
            const nuevaExistencia = producto.existencia - compra.cantidad;
            db.run("UPDATE productos SET existencia = ? WHERE codigo = ?", [nuevaExistencia, compra.codigo]);
          }
        });
  
        res.json({ mensaje: "Compra eliminada correctamente" });
      });
    });
  });
  
  
  // Eliminar compra y actualizar inventario
  app.delete('/compras/:id', (req, res) => {
    const id = req.params.id;
  
    db.get("SELECT * FROM compras WHERE id = ?", [id], (err, compra) => {
      if (err || !compra) return res.status(404).json({ mensaje: "Compra no encontrada" });
  
      db.get("SELECT * FROM productos WHERE codigo = ?", [compra.codigo], (err, producto) => {
        if (err || !producto) return res.status(404).json({ mensaje: "Producto no encontrado" });
  
        const nuevaExistencia = producto.existencia - compra.cantidad;
  
        db.run("DELETE FROM compras WHERE id = ?", [id], function (err) {
          if (err) return res.status(500).json({ mensaje: "Error al eliminar compra" });
  
          db.run(`UPDATE productos SET existencia = ? WHERE codigo = ?`,
            [nuevaExistencia, compra.codigo], function (err) {
              if (err) return res.status(500).json({ mensaje: "Error al actualizar inventario tras eliminar compra" });
  
              res.json({ mensaje: "Compra eliminada y existencias actualizadas correctamente" });
            });
        });
      });
    });
  });
  // PUT para actualizar una compra existente
app.put('/api/compras/:id', (req, res) => {
  const id = req.params.id;
  const { fecha, codigo, precio_compra, cantidad } = req.body;
  
  // Primero, obtener la compra actual para calcular la diferencia en cantidades
  db.get("SELECT * FROM compras WHERE id = ?", [id], (err, compraActual) => {
    if (err || !compraActual) return res.status(404).json({ mensaje: "Compra no encontrada" });
    
    const diferenciaCantidad = cantidad - compraActual.cantidad;
    
    // Actualizar la compra
    db.run(`UPDATE compras SET fecha = ?, codigo = ?, precio_compra = ?, cantidad = ? WHERE id = ?`,
      [fecha, codigo, precio_compra, cantidad, id], function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al actualizar compra" });
        
        // Actualizar existencias en productos
        if (diferenciaCantidad !== 0) {
          db.get("SELECT existencia FROM productos WHERE codigo = ?", [codigo], (err, producto) => {
            if (!err && producto) {
              const nuevaExistencia = producto.existencia + diferenciaCantidad;
              db.run("UPDATE productos SET existencia = ? WHERE codigo = ?", 
                [nuevaExistencia, codigo]);
            }
          });
        }
        
        res.json({ mensaje: "Compra actualizada correctamente" });
      });
  });
});



  // ----------------- CRUD FACTURACIÓN + GENERAR PDF -----------------
  
  // Función para generar PDF
  async function generarPDF(datos, filename) {
    try {
      const templatePath = path.join(__dirname, 'facturacion', 'plantilla-factura.html');
      let html = fs.readFileSync(templatePath, 'utf8');
  
      const detalleCortesHTML = (datos.detalleCortes || []).map(c => `
        <tr><td>${c.nombre}</td><td>$${parseFloat(c.precio).toFixed(2)}</td><td>${c.cantidad}</td><td>$${(c.precio * c.cantidad).toFixed(2)}</td></tr>
      `).join('');
      
      const detalleProductosHTML = (datos.detalleProductos || []).map(p => `
        <tr><td>${p.nombre}</td><td>$${parseFloat(p.precio).toFixed(2)}</td><td>${p.cantidad}</td><td>$${(p.precio * p.cantidad).toFixed(2)}</td></tr>
      `).join('');
      
      html = html
        .replace('{{fecha}}', datos.fecha)
        .replace('{{factura}}', datos.factura)
        .replace('{{comanda}}', datos.comanda)
        .replace('{{cliente}}', datos.cliente)
        .replace('{{empleado}}', datos.empleado)
        .replace('{{tipo_pago}}', datos.tipo_pago)
        .replace('{{precio_venta}}', datos.precio_venta)
        .replace('{{descuento}}', datos.descuento)
        .replace('{{total}}', datos.total)
        .replace('{{detalle_cortes}}', detalleCortesHTML)
        .replace('{{detalle_productos}}', detalleProductosHTML);
  
      const outputDir = path.join(__dirname, 'factura');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.pdf({ path: path.join(outputDir, filename), format: 'A4' });
      await browser.close();
  
      console.log(`✅ PDF generado: ${filename}`);
    } catch (error) {
      console.error("❌ Error al generar PDF:", error.message);
    }
  }
  
  // Guardar factura
  app.post('/facturas', async (req, res) => {
    const { fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total, detalleCortes, detalleProductos } = req.body;
  
    db.run(`INSERT INTO facturas (fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total],
      async function (err) {
        if (err) return res.status(500).json({ mensaje: "Error al guardar factura" });
  
        const facturaId = this.lastID;
  
        (detalleCortes || []).forEach(c => {
          db.run(`INSERT INTO detalle_cortes (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [facturaId, c.codigo, c.nombre, c.cantidad, c.precio * c.cantidad, c.comision, empleado, fecha]);
        });
  
        (detalleProductos || []).forEach(p => {
          db.run(`INSERT INTO detalle_productos (factura_id, codigo, nombre, cantidad, total, comision, empleado, fecha)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [facturaId, p.codigo, p.nombre, p.cantidad, p.precio * p.cantidad, p.comision, empleado, fecha]);
  
          db.run(`UPDATE productos SET existencia = existencia - ? WHERE codigo = ?`, [p.cantidad, p.codigo]);
        });
  
        const codPDF = `Fac${fecha.replace(/-/g, '').slice(2)}_${String(factura).padStart(4, '0')}.pdf`;
        await generarPDF({ fecha, comanda, factura, cliente, empleado, tipo_pago, precio_venta, descuento, total, detalleCortes, detalleProductos }, codPDF);
  
        res.status(201).json({ mensaje: "Factura guardada y PDF generado correctamente", archivo: codPDF });
      });
  });
  
  // Obtener facturas
  app.get('/facturas', (req, res) => {
    db.all("SELECT * FROM facturas ORDER BY fecha DESC, factura DESC", (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error al obtener historial" });
      res.json(rows);
    });
  });
  
  // Eliminar factura
  app.delete('/facturas/:id', (req, res) => {
    const facturaId = req.params.id;
    db.serialize(() => {
      db.all("SELECT * FROM detalle_productos WHERE factura_id = ?", [facturaId], (err, productos) => {
        if (productos && productos.length > 0) {
          productos.forEach(p => {
            db.run("UPDATE productos SET existencia = existencia + ? WHERE codigo = ?", [p.cantidad, p.codigo]);
          });
        }
        db.run("DELETE FROM detalle_cortes WHERE factura_id = ?", [facturaId]);
        db.run("DELETE FROM detalle_productos WHERE factura_id = ?", [facturaId]);
        db.run("DELETE FROM facturas WHERE id = ?", [facturaId], function (err) {
          if (err) return res.status(500).json({ mensaje: "Error al eliminar factura" });
          res.json({ mensaje: "Factura eliminada correctamente" });
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
          "Facturacion", "DetalleCortes", "DetalleProductos", "Planilla", "AgendarCitas"
        ]);
        db.run(`INSERT INTO usuarios (usuario, password, rol, modulos) VALUES (?, ?, ?, ?)`,
          ['admin', hash, 'Admin', modulosAdmin]);
        console.log('✅ Usuario administrador inicial creado (usuario: admin / contraseña: admin123)');
      }
    });
  }
});

// nomina
app.get('/api/nomina', (req, res) => {
  const { desde, hasta } = req.query;

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

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const sql = `
    SELECT
      f.id AS factura_id,
      f.fecha,
      e.dui,
      f.cliente,
      f.empleado,
      e.cargo,
      GROUP_CONCAT(DISTINCT dc.nombre) AS cortes,
      SUM(dc.cantidad) AS cantidad_corte,
      GROUP_CONCAT(DISTINCT dp.nombre) AS productos,
      SUM(dp.cantidad) AS cantidad_producto,
      SUM(dp.cantidad * COALESCE(p.precio_venta, 0)) AS precio_producto,
      SUM(dc.comision) AS comision_corte,
      SUM(dp.comision) AS comision_producto,
      f.tipo_pago,
      0 AS descuento,
      (e.salario + SUM(dc.comision) + SUM(dp.comision)) AS salario_total
    FROM facturas f
    LEFT JOIN empleados e ON f.empleado = e.nombre
    LEFT JOIN detalle_cortes dc ON f.id = dc.factura_id
    LEFT JOIN detalle_productos dp ON f.id = dp.factura_id
    LEFT JOIN inventarios p ON dp.codigo = p.codigo
    ${where}
    GROUP BY f.id
    ORDER BY f.fecha DESC
  `;

  db.all(sql, valores, (err, rows) => {
    if (err) {
      console.error("Error al generar nómina:", err.message);
      return res.status(500).json({ mensaje: "Error interno" });
    }

    const resultado = rows.map((row, i) => ({
      id: i + 1,
      ...row
    }));

    res.json(resultado);
  });
});





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
          "Facturacion", "DetalleCortes", "DetalleProductos", "Planilla", "AgendarCitas","Usuarios"
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
    if (err) return res.status(500).json({ mensaje: "Error al obtener usuarios." });

    const usuarios = rows.map(row => ({
      usuario: row.usuario,
      rol: row.rol,
      modulos: row.modulos ? JSON.parse(row.modulos) : []
    }));

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
app.put('/api/editarModulosUsuario', (req, res) => {
  const { usuario, nuevosModulos } = req.body;

  if (!usuario || !Array.isArray(nuevosModulos)) {
    return res.status(400).json({ mensaje: "Datos incompletos para editar módulos." });
  }

  db.get("SELECT rol FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al consultar usuario." });

    if (!row) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // 🔥 Solo si es Admin se bloquea
    if (row.rol === 'Admin') {
      return res.status(403).json({ mensaje: "No se pueden editar los módulos de un Administrador." });
    }

    const nuevosModulosJSON = JSON.stringify(nuevosModulos);

    db.run("UPDATE usuarios SET modulos = ? WHERE usuario = ?", [nuevosModulosJSON, usuario], (err) => {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar módulos." });
      res.json({ mensaje: "Módulos actualizados exitosamente." });
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

app.get('/api/gastos/filtro', (req, res) => {
  const { categoria, desde, hasta } = req.query;
  let query = "SELECT * FROM gastos WHERE 1=1";
  const params = [];

  if (categoria) {
    query += " AND categoria LIKE ?";
    params.push(`%${categoria}%`);
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
    if (err) return res.status(500).json({ mensaje: "Error al filtrar gastos" });
    res.json(rows);
  });
});



// metas 
// ==========================
// CONSULTAR TODAS LAS METAS (para frontend)
// ==========================
app.get('/api/metas', (req, res) => {
  db.all("SELECT * FROM metas", (err, rows) => {
    if (err) {
      console.error("Error al obtener metas:", err);
      return res.status(500).json({ mensaje: "Error al obtener metas" });
    }
    res.json(rows);
  });
});

// ==========================
// CONSULTAR UNA META ESPECÍFICA POR AÑO Y MES
// ==========================
app.get('/api/metas/una', (req, res) => {
  const { anio, mes } = req.query;

  if (!anio || !mes) {
    return res.status(400).json({ mensaje: "Mes y año requeridos" });
  }

  db.get("SELECT monto FROM metas WHERE anio = ? AND mes = ?", [anio, mes], (err, row) => {
    if (err) {
      console.error("Error al consultar meta individual:", err);
      return res.status(500).json({ mensaje: "Error al obtener meta" });
    }
    res.json({ monto: row ? row.monto : 0 });
  });
});

// ==========================
// GUARDAR O ACTUALIZAR META
// ==========================
app.post('/api/metas', (req, res) => {
  const { anio, mes, monto } = req.body;

  if (
    !anio || isNaN(parseInt(anio)) ||
    !mes || typeof mes !== 'string' ||
    monto === undefined || isNaN(parseFloat(monto))
  ) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios y válidos." });
  }

  console.log("Datos recibidos:", { anio, mes, monto });

  db.get("SELECT * FROM metas WHERE anio = ? AND mes = ?", [anio, mes], (err, row) => {
    if (err) {
      console.error("Error al verificar meta:", err);
      return res.status(500).json({ mensaje: "Error al verificar meta." });
    }

    if (row) {
      db.run("UPDATE metas SET monto = ? WHERE anio = ? AND mes = ?", [monto, anio, mes], function (err) {
        if (err) {
          console.error("Error al actualizar meta:", err);
          return res.status(500).json({ mensaje: "Error al actualizar meta." });
        }
        console.log("Meta actualizada correctamente");
        res.json({ mensaje: "Meta actualizada exitosamente." });
      });
    } else {
      db.run("INSERT INTO metas (anio, mes, monto) VALUES (?, ?, ?)", [anio, mes, monto], function (err) {
        if (err) {
          console.error("Error al insertar meta:", err);
          return res.status(500).json({ mensaje: "Error al guardar meta." });
        }
        console.log("Meta guardada correctamente, ID:", this.lastID);
        res.status(201).json({ mensaje: "Meta guardada exitosamente." });
      });
    }
  });
});


// ========================== 
// CONSULTAR VENTAS POR MES Y AÑO (CORREGIDO)
// ==========================
app.get('/api/ventas', (req, res) => {
  const { mes, anio } = req.query;
  
  if (!mes || !anio) {
    return res.status(400).json({ mensaje: "Mes y año son requeridos" });
  }
  
  // Convertir mes a número (1-12)
  const mesNumero = obtenerNumeroMes(mes);
  
  // Crear patrones para buscar fechas en formato YYYY-MM-DD
  const patronFecha = `${anio}-${mesNumero.toString().padStart(2, '0')}-%`;
  
  db.get(`
    SELECT
      SUM(total) AS total,
      COUNT(*) AS cantidad
    FROM facturas
    WHERE fecha LIKE ?
  `, [patronFecha], (err, row) => {
    if (err) {
      console.error("❌ Error al consultar ventas:", err.message);
      return res.status(500).json({ mensaje: "Error al obtener ventas" });
    }
    
    res.json({
      total: row.total || 0,
      cantidad: row.cantidad || 0
    });
  });
});

// Función auxiliar para convertir nombre de mes a número
function obtenerNumeroMes(mes) {
  const meses = {
    "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, 
    "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8, 
    "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
  };
  
  return meses[mes] || new Date().getMonth() + 1; // Devuelve mes actual si no encuentra coincidencia
}

// ========================== 
// OBTENER VENTAS DIARIAS POR MES Y AÑO
// ==========================
app.get('/api/ventas/diarias', (req, res) => {
  const { mes, anio } = req.query;
  
  if (!mes || !anio) {
    return res.status(400).json({ mensaje: "Mes y año son requeridos" });
  }
  
  // Convertir mes a número (1-12)
  const mesNumero = obtenerNumeroMes(mes);
  
  // Crear patrón para buscar fechas en formato YYYY-MM-DD
  const patronFecha = `${anio}-${mesNumero.toString().padStart(2, '0')}-%`;
  
  db.all(`
    SELECT 
      SUBSTR(fecha, 9, 2) AS dia,
      SUM(total) AS total
    FROM facturas
    WHERE fecha LIKE ?
    GROUP BY dia
    ORDER BY dia
  `, [patronFecha], (err, rows) => {
    if (err) {
      console.error("❌ Error al consultar ventas diarias:", err.message);
      return res.status(500).json({ mensaje: "Error al obtener ventas diarias" });
    }
    
    // Convertir días a números enteros
    const result = rows.map(row => ({
      dia: parseInt(row.dia),
      total: row.total || 0
    }));
    
    res.json(result);
  });
});

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
  
  // ...otras rutas que ya tienes
// RUTAS NUEVAS AQUÍ 👇
app.get('/api/metas', (req, res) => {
  
});

app.get('/api/ventas-mensuales', (req, res) => {
  
});



  
  // Ruta no encontrada
  app.use((req, res) => {
    res.status(404).send('Página no encontrada 😢');
  });
  
  
  // ----------------- INICIAR SERVIDOR -----------------
  app.listen(PORT, () => {
    console.log(`🚀 Servidor General corriendo en http://localhost:${PORT}`);
  });
  


  
  