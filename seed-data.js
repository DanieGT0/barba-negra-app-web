// seed-data.js - Crear datos de prueba
require('dotenv').config();
const DatabaseHelper = require('./db-helper');
const bcrypt = require('bcrypt');

async function seedData() {
  console.log('🌱 Creando datos de prueba...');
  
  try {
    // 1. Crear usuario admin
    console.log('👤 Creando usuario admin...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await DatabaseHelper.query(
      'INSERT INTO usuarios (usuario, password, rol) VALUES ($1, $2, $3) ON CONFLICT (usuario) DO NOTHING',
      ['admin', hashedPassword, 'Admin']
    );
    
    // 2. Crear algunos clientes de prueba
    console.log('👥 Creando clientes de prueba...');
    const clientes = [
      {
        fecha: '23/08/2025',
        dui: '12345678-9',
        nombre: 'Juan Pérez',
        telefono: '7123-4567',
        correo: 'juan@email.com',
        membresia: 'Premium',
        fecha_inicio: '23/08/2025',
        fecha_final: '23/08/2026',
        monto: 50.00,
        tipo_pago: 'Efectivo',
        categoria: 'normal',
        empresa: '',
        descuento_porcentaje: 0,
        direccion: 'San Salvador'
      },
      {
        fecha: '23/08/2025',
        dui: '98765432-1',
        nombre: 'María García',
        telefono: '7987-6543',
        correo: 'maria@email.com',
        membresia: 'Basic',
        fecha_inicio: '23/08/2025',
        fecha_final: '23/08/2026',
        monto: 30.00,
        tipo_pago: 'Tarjeta',
        categoria: 'preferencial',
        empresa: 'Empresa XYZ',
        descuento_porcentaje: 10,
        direccion: 'Santa Ana'
      }
    ];
    
    for (const cliente of clientes) {
      await DatabaseHelper.createCliente(cliente);
    }
    
    // 3. Crear algunos empleados de prueba
    console.log('👨‍💼 Creando empleados de prueba...');
    const empleados = [
      {
        fecha: '23/08/2025',
        dui: '11111111-1',
        nombre: 'Carlos Martínez',
        direccion: 'San Salvador',
        correo: 'carlos@barbería.com',
        nacimiento: '01/01/1990',
        salario: 800.00,
        cargo: 'Barbero Senior',
        telefono: '7111-1111',
        fecha_ingreso: '2025-01-01'
      },
      {
        fecha: '23/08/2025',
        dui: '22222222-2',
        nombre: 'Ana López',
        direccion: 'Santa Ana',
        correo: 'ana@barbería.com',
        nacimiento: '15/05/1992',
        salario: 600.00,
        cargo: 'Estilista',
        telefono: '7222-2222',
        fecha_ingreso: '2025-02-01'
      }
    ];
    
    for (const empleado of empleados) {
      await DatabaseHelper.createEmpleado(empleado);
    }
    
    // 4. Crear algunos productos de prueba
    console.log('🛒 Creando productos de prueba...');
    const productos = [
      {
        nombre: 'Corte Clásico',
        descripcion: 'Corte de cabello tradicional',
        precio: 8.00,
        categoria: 'Servicios',
        stock: 0
      },
      {
        nombre: 'Arreglo de Barba',
        descripcion: 'Recorte y arreglo de barba',
        precio: 5.00,
        categoria: 'Servicios', 
        stock: 0
      },
      {
        nombre: 'Shampoo Premium',
        descripcion: 'Shampoo de alta calidad',
        precio: 12.00,
        categoria: 'Productos',
        stock: 25
      }
    ];
    
    for (const producto of productos) {
      await DatabaseHelper.createProducto(producto.nombre, producto.descripcion, producto.precio, producto.categoria, producto.stock);
    }
    
    console.log('✅ Datos de prueba creados exitosamente');
    console.log('📝 Usuario: admin | Contraseña: admin123');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('🎉 Seeding completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en seeding:', error);
      process.exit(1);
    });
}

module.exports = { seedData };