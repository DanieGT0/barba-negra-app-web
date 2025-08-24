// tarjetas-fidelidad.js
// Módulo para el sistema de tarjetas de fidelidad - Versión PostgreSQL

class TarjetasFidelidad {
  constructor(app, pool) {
    this.app = app;
    this.pool = pool;
    this.initializeTables();
    this.setupRoutes();
  }

  // Crear tablas necesarias para el sistema de tarjetas
  async initializeTables() {
    try {
      const client = await this.pool.connect();
      
      // Tabla para tarjetas de fidelidad
      await client.query(`CREATE TABLE IF NOT EXISTS tarjetas_fidelidad (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE,
        cliente_id INTEGER,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sellos_actuales INTEGER DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'activa',
        fecha_completada TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )`);

      // Tabla para historial de sellos
      await client.query(`CREATE TABLE IF NOT EXISTS historial_sellos (
        id SERIAL PRIMARY KEY,
        tarjeta_id INTEGER,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo VARCHAR(50),
        empleado VARCHAR(200),
        factura_id INTEGER,
        observaciones TEXT,
        FOREIGN KEY (tarjeta_id) REFERENCES tarjetas_fidelidad(id)
      )`);
      
      client.release();
      console.log('✅ Tablas de tarjetas de fidelidad creadas');
    } catch (error) {
      console.error('❌ Error creando tablas de tarjetas:', error);
    }
  }

  // Generar código único para tarjeta
  generarCodigoTarjeta() {
    const prefix = 'TF';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  // Configurar todas las rutas del módulo
  setupRoutes() {
    // Obtener todas las tarjetas
    this.app.get('/api/tarjetas-fidelidad', async (req, res) => {
      try {
        const query = `
          SELECT tf.*, c.nombre as cliente_nombre, c.dui as cliente_dui
          FROM tarjetas_fidelidad tf
          LEFT JOIN clientes c ON tf.cliente_id = c.id
          ORDER BY tf.fecha_creacion DESC
        `;
        
        const result = await this.pool.query(query);
        res.json(result.rows);
      } catch (error) {
        console.error('Error al obtener tarjetas:', error);
        res.status(500).json({ mensaje: 'Error al obtener tarjetas' });
      }
    });

    // Crear nueva tarjeta
    this.app.post('/api/tarjetas-fidelidad', async (req, res) => {
      try {
        const { cliente_id, codigo_manual } = req.body;
        
        if (!cliente_id) {
          return res.status(400).json({ mensaje: 'Cliente ID es requerido' });
        }

        // Verificar si el cliente ya tiene una tarjeta activa
        const existingCard = await this.pool.query(
          'SELECT * FROM tarjetas_fidelidad WHERE cliente_id = $1 AND estado = $2', 
          [cliente_id, 'activa']
        );

        if (existingCard.rows.length > 0) {
          return res.status(400).json({ mensaje: 'El cliente ya tiene una tarjeta activa' });
        }

        // Usar código manual o generar uno automático
        const codigo = codigo_manual && codigo_manual.trim() 
          ? codigo_manual.trim() 
          : this.generarCodigoTarjeta();
        
        // Si hay código manual, verificar que no exista
        if (codigo_manual && codigo_manual.trim()) {
          const codeCheck = await this.pool.query(
            'SELECT * FROM tarjetas_fidelidad WHERE codigo = $1', [codigo]
          );
          
          if (codeCheck.rows.length > 0) {
            return res.status(400).json({ mensaje: 'El código ya existe, usa otro código' });
          }
        }

        // Crear la tarjeta
        const result = await this.pool.query(`
          INSERT INTO tarjetas_fidelidad (codigo, cliente_id, fecha_creacion)
          VALUES ($1, $2, CURRENT_DATE)
          RETURNING *
        `, [codigo, cliente_id]);

        res.json({
          mensaje: 'Tarjeta creada exitosamente',
          tarjeta: result.rows[0]
        });
      } catch (error) {
        console.error('Error al crear tarjeta:', error);
        res.status(500).json({ mensaje: 'Error al crear tarjeta' });
      }
    });

    // Agregar sello manual
    this.app.post('/api/tarjetas-fidelidad/:id/sello', async (req, res) => {
      try {
        const tarjeta_id = req.params.id;
        const { empleado, observaciones } = req.body;

        const result = await this.agregarSello(tarjeta_id, 'manual', empleado, null, observaciones);
        res.json(result);
      } catch (error) {
        console.error('Error al agregar sello:', error);
        res.status(500).json({ mensaje: 'Error al agregar sello' });
      }
    });

    // Obtener historial de una tarjeta
    this.app.get('/api/tarjetas-fidelidad/:id/historial', async (req, res) => {
      try {
        const tarjeta_id = req.params.id;
        
        const result = await this.pool.query(`
          SELECT * FROM historial_sellos 
          WHERE tarjeta_id = $1 
          ORDER BY fecha DESC
        `, [tarjeta_id]);
        
        res.json(result.rows);
      } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ mensaje: 'Error al obtener historial' });
      }
    });

    // Verificar estado de tarjeta por cliente
    this.app.get('/api/tarjetas-fidelidad/cliente/:cliente_id', async (req, res) => {
      try {
        const cliente_id = req.params.cliente_id;
        
        const result = await this.pool.query(`
          SELECT tf.*, c.nombre as cliente_nombre, c.dui as cliente_dui
          FROM tarjetas_fidelidad tf
          LEFT JOIN clientes c ON tf.cliente_id = c.id
          WHERE tf.cliente_id = $1 AND tf.estado = $2
        `, [cliente_id, 'activa']);
        
        res.json(result.rows[0] || null);
      } catch (error) {
        console.error('Error al obtener tarjeta del cliente:', error);
        res.status(500).json({ mensaje: 'Error al obtener tarjeta del cliente' });
      }
    });

    // Obtener clientes para el selector
    this.app.get('/api/clientes-disponibles', async (req, res) => {
      try {
        const result = await this.pool.query(`
          SELECT c.* FROM clientes c
          LEFT JOIN tarjetas_fidelidad tf ON c.id = tf.cliente_id AND tf.estado = 'activa'
          WHERE tf.id IS NULL
          ORDER BY c.nombre
        `);
        res.json(result.rows);
      } catch (error) {
        console.error('Error al obtener clientes disponibles:', error);
        res.status(500).json({ mensaje: 'Error al obtener clientes disponibles' });
      }
    });

    // Endpoint para procesar facturación desde el sistema de ventas
    this.app.post('/api/tarjetas-fidelidad/procesar-facturacion', async (req, res) => {
      try {
        const { factura_id, cliente_id, empleado } = req.body;
        
        const result = await this.procesarFacturacion(factura_id, cliente_id, empleado);
        res.json(result);
      } catch (error) {
        console.error('Error al procesar facturación:', error);
        res.status(500).json({ mensaje: 'Error al procesar tarjeta de fidelidad' });
      }
    });

    // Eliminar tarjeta
    this.app.delete('/api/tarjetas-fidelidad/:id', async (req, res) => {
      try {
        const tarjeta_id = req.params.id;
        
        // Primero eliminar el historial de sellos
        await this.pool.query('DELETE FROM historial_sellos WHERE tarjeta_id = $1', [tarjeta_id]);
        
        // Luego eliminar la tarjeta
        const result = await this.pool.query('DELETE FROM tarjetas_fidelidad WHERE id = $1', [tarjeta_id]);
        
        if (result.rowCount === 0) {
          return res.status(404).json({ mensaje: 'Tarjeta no encontrada' });
        }
        
        res.json({ mensaje: 'Tarjeta eliminada exitosamente' });
      } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        res.status(500).json({ mensaje: 'Error al eliminar tarjeta' });
      }
    });

    // Quitar sello
    this.app.post('/api/tarjetas-fidelidad/:id/quitar-sello', async (req, res) => {
      try {
        const tarjeta_id = req.params.id;
        const { empleado } = req.body;
        
        // Obtener tarjeta actual
        const tarjetaResult = await this.pool.query(
          'SELECT * FROM tarjetas_fidelidad WHERE id = $1', [tarjeta_id]
        );
        
        if (tarjetaResult.rows.length === 0) {
          return res.status(404).json({ mensaje: 'Tarjeta no encontrada' });
        }
        
        const tarjeta = tarjetaResult.rows[0];
        
        if (tarjeta.sellos_actuales <= 0) {
          return res.status(400).json({ mensaje: 'La tarjeta no tiene sellos para quitar' });
        }
        
        const nuevos_sellos = tarjeta.sellos_actuales - 1;
        
        // Actualizar tarjeta
        await this.pool.query(
          'UPDATE tarjetas_fidelidad SET sellos_actuales = $1 WHERE id = $2', 
          [nuevos_sellos, tarjeta_id]
        );
        
        // Agregar al historial
        await this.pool.query(`
          INSERT INTO historial_sellos (tarjeta_id, fecha, tipo, empleado, observaciones)
          VALUES ($1, CURRENT_DATE, $2, $3, $4)
        `, [tarjeta_id, 'quitar', empleado, `Sello quitado - Sellos restantes: ${nuevos_sellos}`]);
        
        res.json({
          mensaje: `Sello quitado. Sellos actuales: ${nuevos_sellos}/10`,
          sellos_actuales: nuevos_sellos
        });
      } catch (error) {
        console.error('Error al quitar sello:', error);
        res.status(500).json({ mensaje: 'Error al quitar sello' });
      }
    });
  }

  // Método principal para agregar sellos
  async agregarSello(tarjeta_id, tipo, empleado, factura_id = null, observaciones = '') {
    try {
      // Obtener tarjeta actual
      const tarjetaResult = await this.pool.query(
        'SELECT * FROM tarjetas_fidelidad WHERE id = $1', [tarjeta_id]
      );
      
      if (tarjetaResult.rows.length === 0) {
        throw new Error('Tarjeta no encontrada');
      }
      
      const tarjeta = tarjetaResult.rows[0];
      
      // Si la tarjeta ya está completada, no agregar más sellos
      if (tarjeta.estado === 'completada') {
        return {
          mensaje: 'Tarjeta ya completada. No se pueden agregar más sellos.',
          tarjeta_completada: true,
          sellos_actuales: tarjeta.sellos_actuales
        };
      }
      
      // Solo procesar si la tarjeta está activa
      if (tarjeta.estado !== 'activa') {
        throw new Error('Tarjeta no está activa');
      }

      const nuevos_sellos = tarjeta.sellos_actuales + 1;

      // Verificar si se completa la tarjeta (10 sellos)
      if (nuevos_sellos >= 10) {
        // Completar tarjeta actual
        await this.pool.query(`
          UPDATE tarjetas_fidelidad 
          SET sellos_actuales = $1, estado = 'completada', fecha_completada = CURRENT_DATE
          WHERE id = $2
        `, [10, tarjeta_id]);

        // Agregar al historial
        await this.pool.query(`
          INSERT INTO historial_sellos (tarjeta_id, fecha, tipo, empleado, factura_id, observaciones)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
        `, [tarjeta_id, tipo, empleado, factura_id, observaciones || 'Sello #10 - Tarjeta completada']);

        return {
          mensaje: '¡Tarjeta completada! Corte gratis aplicado. Cliente debe solicitar nueva tarjeta.',
          tarjeta_completada: true,
          nueva_tarjeta: null,
          sellos_completados: 10
        };
      } else {
        // Agregar sello normal
        await this.pool.query(`
          UPDATE tarjetas_fidelidad 
          SET sellos_actuales = $1
          WHERE id = $2
        `, [nuevos_sellos, tarjeta_id]);

        // Agregar al historial
        await this.pool.query(`
          INSERT INTO historial_sellos (tarjeta_id, fecha, tipo, empleado, factura_id, observaciones)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
        `, [tarjeta_id, tipo, empleado, factura_id, observaciones || `Sello #${nuevos_sellos}`]);

        return {
          mensaje: `Sello agregado. Total: ${nuevos_sellos}/10`,
          sellos_actuales: nuevos_sellos,
          faltan: 10 - nuevos_sellos,
          proximo_gratis: nuevos_sellos === 9
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Método para procesar sello automático desde facturación
  async procesarFacturacion(factura_id, cliente_id, empleado) {
    try {
      if (!cliente_id || cliente_id === '') {
        return { mensaje: 'Sin tarjeta de fidelidad (cliente general)' };
      }

      // Buscar tarjeta activa del cliente
      const tarjetaResult = await this.pool.query(
        'SELECT * FROM tarjetas_fidelidad WHERE cliente_id = $1 AND estado = $2', 
        [cliente_id, 'activa']
      );
      
      if (tarjetaResult.rows.length === 0) {
        return { mensaje: 'Cliente sin tarjeta de fidelidad' };
      }
      
      const tarjeta = tarjetaResult.rows[0];

      // Verificar si ya hay cortes en esta factura
      const cortesResult = await this.pool.query(
        'SELECT COUNT(*) as cantidad FROM detalle_cortes WHERE factura_id = $1', 
        [factura_id]
      );
      
      if (parseInt(cortesResult.rows[0].cantidad) > 0) {
        // Agregar sello automático
        return await this.agregarSello(tarjeta.id, 'automatico', empleado, factura_id, 
          `Sello por factura #${factura_id}`);
      } else {
        return { mensaje: 'No hay cortes en la factura para agregar sello' };
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TarjetasFidelidad;