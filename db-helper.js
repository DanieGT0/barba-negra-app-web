// db-helper.js - Helper para consultas PostgreSQL
const { pool } = require('./db-config');

class DatabaseHelper {
  // Ejecutar consulta con parámetros
  static async query(text, params) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Obtener un solo registro
  static async get(text, params) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  // Obtener todos los registros
  static async all(text, params) {
    const result = await this.query(text, params);
    return result.rows;
  }

  // Ejecutar consulta sin retorno de datos (INSERT, UPDATE, DELETE)
  static async run(text, params) {
    const result = await this.query(text, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  }

  // Transacciones
  static async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Métodos específicos para la aplicación
  
  // USUARIOS
  static async getUsuario(usuario) {
    return await this.get(
      'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
      [usuario]
    );
  }

  static async getUserByCredentials(usuario) {
    return await this.get(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario]
    );
  }

  static async countUsuarios() {
    const result = await this.get('SELECT COUNT(*) as total FROM usuarios');
    return result ? result.total : 0;
  }

  static async createUsuario(usuario, hashedPassword, rol = 'Usuario') {
    const result = await this.query(
      'INSERT INTO usuarios (usuario, password, rol) VALUES ($1, $2, $3) RETURNING id',
      [usuario, hashedPassword, rol]
    );
    return result.rows[0].id;
  }

  // CLIENTES
  static async getAllClientes() {
    return await this.all('SELECT * FROM clientes WHERE activo = true ORDER BY nombre');
  }

  static async getCliente(id) {
    return await this.get('SELECT * FROM clientes WHERE id = $1 AND activo = true', [id]);
  }

  static async getClientesPaginados(limit, offset) {
    return await this.all(
      'SELECT * FROM clientes ORDER BY fecha_registro DESC, id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }

  static async countClientes() {
    const result = await this.get('SELECT COUNT(*) as total FROM clientes');
    return result ? result.total : 0;
  }

  static async searchClientesAvanzado(filtros, limit, offset) {
    let query = 'SELECT * FROM clientes WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (filtros.nombre) {
      query += ` AND LOWER(nombre) LIKE $${paramIndex}`;
      params.push(`%${filtros.nombre.toLowerCase()}%`);
      paramIndex++;
    }
    if (filtros.telefono) {
      query += ` AND telefono LIKE $${paramIndex}`;
      params.push(`%${filtros.telefono}%`);
      paramIndex++;
    }
    if (filtros.dui) {
      query += ` AND dui LIKE $${paramIndex}`;
      params.push(`%${filtros.dui}%`);
      paramIndex++;
    }

    query += ` ORDER BY fecha_registro DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return await this.all(query, params);
  }

  static async countClientesAvanzado(filtros) {
    let query = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (filtros.nombre) {
      query += ` AND LOWER(nombre) LIKE $${paramIndex}`;
      params.push(`%${filtros.nombre.toLowerCase()}%`);
      paramIndex++;
    }
    if (filtros.telefono) {
      query += ` AND telefono LIKE $${paramIndex}`;
      params.push(`%${filtros.telefono}%`);
      paramIndex++;
    }
    if (filtros.dui) {
      query += ` AND dui LIKE $${paramIndex}`;
      params.push(`%${filtros.dui}%`);
      paramIndex++;
    }

    const result = await this.get(query, params);
    return result ? result.total : 0;
  }

  static async createCliente(data) {
    const result = await this.query(
      `INSERT INTO clientes (fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, 
       monto, tipo_pago, categoria, empresa, descuento_porcentaje, direccion, fecha_registro) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) RETURNING id`,
      [data.fecha, data.dui, data.nombre, data.telefono, data.correo, data.membresia, 
       data.fecha_inicio, data.fecha_final, data.monto, data.tipo_pago, data.categoria,
       data.empresa, data.descuento_porcentaje, data.direccion]
    );
    return result.rows[0].id;
  }

  static async updateCliente(id, data) {
    return await this.query(
      `UPDATE clientes SET fecha = $2, dui = $3, nombre = $4, telefono = $5, correo = $6, 
       membresia = $7, fecha_inicio = $8, fecha_final = $9, monto = $10, tipo_pago = $11, 
       categoria = $12, empresa = $13, descuento_porcentaje = $14, direccion = $15 WHERE id = $1`,
      [id, data.fecha, data.dui, data.nombre, data.telefono, data.correo, data.membresia,
       data.fecha_inicio, data.fecha_final, data.monto, data.tipo_pago, data.categoria,
       data.empresa, data.descuento_porcentaje, data.direccion]
    );
  }

  static async deleteCliente(id) {
    return await this.query('DELETE FROM clientes WHERE id = $1', [id]);
  }

  static async getClienteByDui(dui) {
    return await this.get('SELECT * FROM clientes WHERE dui = $1', [dui]);
  }

  // EMPLEADOS
  static async getAllEmpleados() {
    return await this.all('SELECT * FROM empleados ORDER BY fecha DESC');
  }

  static async getEmpleado(id) {
    return await this.get('SELECT * FROM empleados WHERE id = $1 AND activo = true', [id]);
  }

  static async searchEmpleados(filtros) {
    let query = 'SELECT * FROM empleados WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (filtros.dui) {
      query += ` AND dui LIKE $${paramIndex}`;
      params.push(`%${filtros.dui}%`);
      paramIndex++;
    }
    if (filtros.nombre) {
      query += ` AND LOWER(nombre) LIKE $${paramIndex}`;
      params.push(`%${filtros.nombre.toLowerCase()}%`);
      paramIndex++;
    }

    query += ' ORDER BY fecha DESC';
    return await this.all(query, params);
  }

  static async createEmpleado(data) {
    const result = await this.query(
      `INSERT INTO empleados (fecha, dui, nombre, direccion, correo, nacimiento, salario, cargo, telefono, fecha_ingreso) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [data.fecha, data.dui, data.nombre, data.direccion, data.correo, 
       data.nacimiento, data.salario, data.cargo, data.telefono, data.fecha_ingreso]
    );
    return result.rows[0].id;
  }

  static async updateEmpleado(id, data) {
    return await this.query(
      `UPDATE empleados SET fecha = $2, dui = $3, nombre = $4, direccion = $5, correo = $6, 
       nacimiento = $7, salario = $8, cargo = $9, telefono = $10, fecha_ingreso = $11 WHERE id = $1`,
      [id, data.fecha, data.dui, data.nombre, data.direccion, data.correo,
       data.nacimiento, data.salario, data.cargo, data.telefono, data.fecha_ingreso]
    );
  }

  static async deleteEmpleado(id) {
    return await this.query('DELETE FROM empleados WHERE id = $1', [id]);
  }

  // PRODUCTOS
  static async getAllProductos() {
    return await this.all('SELECT * FROM productos WHERE activo = true ORDER BY nombre');
  }

  static async getProducto(id) {
    return await this.get('SELECT * FROM productos WHERE id = $1 AND activo = true', [id]);
  }

  static async createProducto(nombre, descripcion, precio, categoria, stock = 0) {
    const result = await this.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria, stock) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [nombre, descripcion, precio, categoria, stock]
    );
    return result.rows[0].id;
  }

  static async updateProducto(id, nombre, descripcion, precio, categoria, stock) {
    return await this.query(
      'UPDATE productos SET nombre = $2, descripcion = $3, precio = $4, categoria = $5, stock = $6 WHERE id = $1',
      [id, nombre, descripcion, precio, categoria, stock]
    );
  }

  static async deleteProducto(id) {
    return await this.query('UPDATE productos SET activo = false WHERE id = $1', [id]);
  }

  // VENTAS
  static async getAllVentas() {
    return await this.all(`
      SELECT v.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      LEFT JOIN empleados e ON v.empleado_id = e.id 
      ORDER BY v.fecha DESC
    `);
  }

  static async getVenta(id) {
    return await this.get('SELECT * FROM ventas WHERE id = $1', [id]);
  }

  static async createVenta(clienteId, empleadoId, fecha, subtotal, impuesto, total, metodoPago) {
    const result = await this.query(
      'INSERT INTO ventas (cliente_id, empleado_id, fecha, subtotal, impuesto, total, metodo_pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [clienteId, empleadoId, fecha, subtotal, impuesto, total, metodoPago]
    );
    return result.rows[0].id;
  }

  // DETALLE VENTAS
  static async getDetalleVenta(ventaId) {
    return await this.all(`
      SELECT dv.*, p.nombre as producto_nombre 
      FROM detalle_ventas dv 
      JOIN productos p ON dv.producto_id = p.id 
      WHERE dv.venta_id = $1
    `, [ventaId]);
  }

  static async createDetalleVenta(ventaId, productoId, cantidad, precioUnitario, subtotal) {
    return await this.query(
      'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
      [ventaId, productoId, cantidad, precioUnitario, subtotal]
    );
  }

  // CITAS
  static async getAllCitas() {
    return await this.all(`
      SELECT c.*, cl.nombre as cliente_nombre, e.nombre as empleado_nombre 
      FROM citas c 
      LEFT JOIN clientes cl ON c.cliente_id = cl.id 
      LEFT JOIN empleados e ON c.empleado_id = e.id 
      ORDER BY c.fecha DESC, c.hora DESC
    `);
  }

  static async createCita(clienteId, empleadoId, fecha, hora, servicio, estado = 'Programada', notas = '') {
    const result = await this.query(
      'INSERT INTO citas (cliente_id, empleado_id, fecha, hora, servicio, estado, notas) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [clienteId, empleadoId, fecha, hora, servicio, estado, notas]
    );
    return result.rows[0].id;
  }

  static async updateCita(id, clienteId, empleadoId, fecha, hora, servicio, estado, notas) {
    return await this.query(
      'UPDATE citas SET cliente_id = $2, empleado_id = $3, fecha = $4, hora = $5, servicio = $6, estado = $7, notas = $8 WHERE id = $1',
      [id, clienteId, empleadoId, fecha, hora, servicio, estado, notas]
    );
  }

  static async deleteCita(id) {
    return await this.query('DELETE FROM citas WHERE id = $1', [id]);
  }

  // GASTOS
  static async getAllGastos() {
    return await this.all('SELECT * FROM gastos ORDER BY fecha DESC');
  }

  static async createGasto(data) {
    const result = await this.query(
      `INSERT INTO gastos (fecha, categoria, descripcion, concepto, monto, es_inventario, cantidad, precio_unitario, stock_actual) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.fecha, data.categoria, data.descripcion, data.concepto || data.descripcion, data.monto, 
       data.es_inventario || 0, data.cantidad || 0, data.precio_unitario || 0, data.stock_actual || 0]
    );
    return result.rows[0].id;
  }

  static async updateGasto(id, data) {
    return await this.query(
      `UPDATE gastos SET fecha = $2, categoria = $3, descripcion = $4, concepto = $5, monto = $6, 
       es_inventario = $7, cantidad = $8, precio_unitario = $9, stock_actual = $10 WHERE id = $1`,
      [id, data.fecha, data.categoria, data.descripcion, data.concepto || data.descripcion, data.monto,
       data.es_inventario || 0, data.cantidad || 0, data.precio_unitario || 0, data.stock_actual || 0]
    );
  }

  static async deleteGasto(id) {
    return await this.query('DELETE FROM gastos WHERE id = $1', [id]);
  }

  // REPORTES
  static async getVentasPorPeriodo(fechaInicio, fechaFin) {
    return await this.all(
      'SELECT * FROM ventas WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha',
      [fechaInicio, fechaFin]
    );
  }

  static async getGastosPorPeriodo(fechaInicio, fechaFin) {
    return await this.all(
      'SELECT * FROM gastos WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha',
      [fechaInicio, fechaFin]
    );
  }

  // FACTURAS
  static async getAllFacturas() {
    return await this.all('SELECT * FROM facturas ORDER BY created_at DESC');
  }

  static async getFactura(id) {
    return await this.get('SELECT * FROM facturas WHERE id = $1', [id]);
  }

  static async getFacturasPorDia(fecha) {
    return await this.all('SELECT * FROM facturas WHERE fecha = $1 ORDER BY created_at DESC', [fecha]);
  }

  static async createFactura(data) {
    const result = await this.query(
      `INSERT INTO facturas (fecha, cliente_id, cliente_nombre, cliente_telefono, empleado, 
       servicios, productos, subtotal, descuento, total, metodo_pago, estado) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [data.fecha, data.cliente_id, data.cliente_nombre, data.cliente_telefono, data.empleado,
       data.servicios, data.productos, data.subtotal, data.descuento, data.total, 
       data.metodo_pago || 'Efectivo', data.estado || 'Completada']
    );
    return result.rows[0].id;
  }

  static async deleteFactura(id) {
    return await this.query('DELETE FROM facturas WHERE id = $1', [id]);
  }

  static async createDetalleFactura(facturaId, detalle) {
    return await this.query(
      'INSERT INTO detalle_facturas (factura_id, tipo, item_id, nombre, precio, cantidad, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [facturaId, detalle.tipo, detalle.item_id, detalle.nombre, detalle.precio, detalle.cantidad, detalle.subtotal]
    );
  }

  static async getDetalleFactura(facturaId) {
    return await this.all('SELECT * FROM detalle_facturas WHERE factura_id = $1', [facturaId]);
  }
}

module.exports = DatabaseHelper;