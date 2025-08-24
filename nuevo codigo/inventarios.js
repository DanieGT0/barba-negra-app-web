document.addEventListener('DOMContentLoaded', () => {

  cargarProductos();

  document.getElementById('formProducto').addEventListener('submit', guardarProducto);
  document.getElementById('cancelar').addEventListener('click', limpiarFormulario);
  document.getElementById('exportarExcel').addEventListener('click', exportarExcel);
  document.getElementById('verVencimientos').addEventListener('click', () => alert('Seleccione un producto para ver sus fechas de vencimiento'));
  document.getElementById('reporteExistencias').addEventListener('click', generarReporteExistencias);
  document.getElementById('buscarProducto').addEventListener('input', filtrarProductos);
  
  // Configuración del modal
  const modal = document.getElementById('modalVencimientos');
  const span = document.getElementsByClassName('close')[0];
  
  span.onclick = function() {
    modal.style.display = "none";
  };
  
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
  
  // También podemos cerrar con la tecla Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = "none";
    }
  });
  
  // Configurar botones del modal
  if (document.getElementById('btnCerrarModal')) {
    document.getElementById('btnCerrarModal').addEventListener('click', () => {
      modal.style.display = "none";
    });
  }
});

const API_URL = '';

// Función para formatear fecha de ISO a dd/mm/yyyy
function formatearFecha(fechaISO) {
  if (!fechaISO) return '-';
  const fecha = new Date(fechaISO);
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

// Función para convertir fecha de dd/mm/yyyy a ISO
function fechaAIso(fechaStr) {
  if (!fechaStr) return '';
  const [dia, mes, anio] = fechaStr.split('/');
  return `${anio}-${mes}-${dia}`;
}

// Función para mostrar el formulario y desplazarse hasta arriba
function mostrarFormulario() {
  const formProducto = document.getElementById('formProducto');
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const icon = toggleFormBtn.querySelector('i');
  
  // Mostrar el formulario
  formProducto.classList.remove('form-hidden');
  
  // Cambiar el ícono a "arriba" (formulario abierto)
  icon.className = 'fas fa-chevron-up';
  
  // Desplazarse suavemente hasta arriba de la página
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  // Opcional: Enfocar el primer campo del formulario después de un pequeño delay
  setTimeout(() => {
    document.getElementById('producto').focus();
  }, 500);
}

// Función para ocultar el formulario
function ocultarFormulario() {
  const formProducto = document.getElementById('formProducto');
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const icon = toggleFormBtn.querySelector('i');
  
  // Ocultar el formulario
  formProducto.classList.add('form-hidden');
  
  // Cambiar el ícono a "abajo" (formulario cerrado)
  icon.className = 'fas fa-chevron-down';
}

async function cargarProductos() {
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

    const productos = await res.json();
    const tbody = document.querySelector('#tablaProductos tbody');
    tbody.innerHTML = '';

    productos.forEach(p => {
      const estadoStock = getEstadoStock(p.existencia, p.minimo || 5);
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${p.codigo}</td>
        <td>${p.producto}</td>
        <td>$${parseFloat(p.precio_venta).toFixed(2)}</td>
        <td>$${parseFloat(p.comision).toFixed(2)}</td>
        <td>${p.minimo || 5}</td>
        <td>${p.existencia}</td>
        <td><span class="estado-stock ${estadoStock.clase}">${estadoStock.texto}</span></td>
        <td>$${parseFloat(p.compra_promedio || 0).toFixed(2)}</td>
        <td>
          <button onclick="editarProducto('${p.codigo}')" class="btn-action btn-edit"><i class="fas fa-edit"></i></button>
          <button onclick="eliminarProducto('${p.codigo}')" class="btn-action btn-delete"><i class="fas fa-trash"></i></button>
          <button onclick="verVencimientoProducto('${p.codigo}')" class="btn-action btn-view"><i class="fas fa-calendar-check"></i></button>
        </td>`;
      tbody.appendChild(fila);
    });
  } catch (error) {
    console.error('Error al cargar productos:', error);
    alert('No se pudieron cargar los productos. Verifique la conexión al servidor.');
  }
}

function getEstadoStock(existencia, minimo) {
  if (existencia <= 0) {
    return { texto: 'Sin stock', clase: 'estado-critico' };
  } else if (existencia < minimo) {
    return { texto: 'Bajo', clase: 'estado-bajo' };
  } else {
    return { texto: 'Normal', clase: 'estado-normal' };
  }
}

async function guardarProducto(e) {
  e.preventDefault();
  console.log('🔍 === INICIANDO GUARDAR PRODUCTO (DEBUG) ===');
  
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const accion = document.getElementById('accion').value;
  const method = accion === 'crear' ? 'POST' : 'PUT';
  const codigo = document.getElementById('codigo').value;

  console.log('📝 Datos del formulario:', data);
  console.log('🎯 Acción:', accion);
  console.log('🔗 Método HTTP:', method);
  console.log('🆔 Código:', codigo);

  // Validaciones básicas en el frontend
  if (!data.producto || data.producto.trim() === '') {
    console.error('❌ Error: Nombre del producto vacío');
    alert('Error: El nombre del producto no puede estar vacío');
    return;
  }

  if (!data.precio_venta || parseFloat(data.precio_venta) <= 0) {
    console.error('❌ Error: Precio de venta inválido');
    alert('Error: El precio de venta debe ser mayor a 0');
    return;
  }

  if (!data.comision || parseFloat(data.comision) < 0) {
    console.error('❌ Error: Comisión inválida');
    alert('Error: La comisión no puede ser negativa');
    return;
  }

  try {
    const url = method === 'PUT'
      ? `${API_URL}/productos/${codigo}`
      : `${API_URL}/productos`;

    console.log('🌐 URL de la petición:', url);
    console.log('📦 Datos a enviar:', JSON.stringify(data, null, 2));

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    console.log('📡 Respuesta del servidor - Status:', res.status);
    console.log('📡 Respuesta del servidor - OK:', res.ok);

    // Intentar leer la respuesta como texto primero
    const responseText = await res.text();
    console.log('📄 Respuesta cruda del servidor:', responseText);

    let resultado;
    try {
      resultado = JSON.parse(responseText);
      console.log('✅ Respuesta parseada:', resultado);
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      console.error('📄 Texto de respuesta que no se pudo parsear:', responseText);
      throw new Error(`Error del servidor: ${responseText}`);
    }

    if (!res.ok) {
      console.error('❌ Error HTTP:', res.status);
      console.error('❌ Mensaje de error:', resultado.mensaje);
      throw new Error(resultado.mensaje || `Error HTTP: ${res.status}`);
    }

    console.log('🎉 Producto guardado exitosamente');
    alert(accion === 'crear' ? 'Producto guardado con éxito' : 'Producto actualizado con éxito');
    
    // 🚀 MEJORA: Limpiar formulario, ocultarlo y recargar productos
    limpiarFormulario();
    ocultarFormulario();
    cargarProductos();

  } catch (error) {
    console.error('💥 === ERROR COMPLETO ===');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    
    // Mostrar información más detallada al usuario
    let mensajeError = `Error al guardar el producto:\n\n`;
    mensajeError += `Mensaje: ${error.message}\n`;
    mensajeError += `\nRevisa la consola del navegador (F12) para más detalles.`;
    
    alert(mensajeError);
  }
}

async function editarProducto(codigo) {
  try {
    console.log('✏️ Editando producto:', codigo);
    
    const res = await fetch(`${API_URL}/productos/${codigo}`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    const p = await res.json();

    console.log('📝 Datos del producto a editar:', p);

    // Configurar el formulario para edición
    document.getElementById('accion').value = 'actualizar';
    document.getElementById('codigo').value = p.codigo;
    document.getElementById('producto').value = p.producto;
    document.getElementById('precio_venta').value = p.precio_venta;
    document.getElementById('comision').value = p.comision;
    document.getElementById('minimo').value = p.minimo || 5;
    
    // 🚀 MEJORA: Mostrar formulario y desplazarse hasta arriba
    mostrarFormulario();
    
    // 🎨 Configurar modo edición visual
    if (typeof window.configurarModoEdicion === 'function') {
      window.configurarModoEdicion(p);
    }
    
  } catch (error) {
    console.error('Error al editar producto:', error);
    alert('No se pudo cargar la información del producto para editar.');
  }
}

async function eliminarProducto(codigo) {
  if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
    try {
      const res = await fetch(`${API_URL}/productos/${codigo}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || `Error HTTP: ${res.status}`);
      }

      const resultado = await res.json();
      alert(resultado.mensaje || 'Producto eliminado correctamente');
      cargarProductos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert(`Error al eliminar el producto: ${error.message}`);
    }
  }
}

// Función mejorada para mostrar el modal de vencimientos
async function verVencimientoProducto(codigo) {
  try {
    // 1. Obtener información del producto
    const resProducto = await fetch(`${API_URL}/productos/${codigo}`);
    if (!resProducto.ok) throw new Error(`Error HTTP: ${resProducto.status}`);
    const producto = await resProducto.json();
    
    // 2. Obtener compras de este producto
    const resCompras = await fetch(`${API_URL}/api/compras?codigo=${codigo}`);
    if (!resCompras.ok) throw new Error(`Error HTTP: ${resCompras.status}`);
    const compras = await resCompras.json();
    
    // 3. Preparar y mostrar datos en el modal
    document.getElementById('productoSeleccionado').textContent = `${producto.codigo} - ${producto.producto}`;
    
    // 4. Calcular totales
    let totalAdquirido = 0;
    let costoTotal = 0;
    
    compras.forEach(c => {
      totalAdquirido += parseInt(c.cantidad) || 0;
      costoTotal += (parseFloat(c.precio_compra) || 0) * (parseInt(c.cantidad) || 0);
    });
    
    // 5. Calcular estadísticas
    const existenciaActual = producto.existencia || 0;
    const totalVendido = totalAdquirido - existenciaActual;
    const costoPromedio = totalAdquirido > 0 ? costoTotal / totalAdquirido : 0;
    
    // 6. Calcular porcentajes para la barra de progreso
    const porcentajeVendido = totalAdquirido > 0 ? (totalVendido / totalAdquirido) * 100 : 0;
    const porcentajeExistencia = totalAdquirido > 0 ? 100 - porcentajeVendido : 0;
    
    // 7. Actualizar la información en el modal
    document.getElementById('totalAdquirido').textContent = totalAdquirido;
    document.getElementById('totalVendido').textContent = totalVendido;
    document.getElementById('existenciaActual').textContent = existenciaActual;
    document.getElementById('costoPromedio').textContent = `$${costoPromedio.toFixed(2)}`;
    
    document.getElementById('balanceBarSold').style.width = `${porcentajeVendido}%`;
    document.getElementById('porcentajeVendido').textContent = `${Math.round(porcentajeVendido)}%`;
    document.getElementById('porcentajeExistencia').textContent = `${Math.round(porcentajeExistencia)}%`;
    
    // 8. Mostrar el historial de lotes en la tabla
    const tbody = document.querySelector('#tablaVencimientos tbody');
    tbody.innerHTML = '';
    
    if (compras.length === 0) {
      const fila = document.createElement('tr');
      fila.innerHTML = '<td colspan="5" style="text-align: center;">No hay compras registradas para este producto</td>';
      tbody.appendChild(fila);
    } else {
      // Ordenar las compras por fecha de vencimiento, las más cercanas primero
      compras.sort((a, b) => {
        if (!a.fecha_vencimiento) return 1; // Sin fecha al final
        if (!b.fecha_vencimiento) return -1;
        return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
      });
      
      compras.forEach(c => {
        const estado = evaluarEstadoVencimiento(c.fecha_vencimiento);
        const fila = document.createElement('tr');
        
        // Determinar la clase CSS de la fila según estado
        if (estado.clase === 'estado-critico') {
          fila.classList.add('vencido');
        } else if (estado.clase === 'estado-bajo') {
          fila.classList.add('por-vencer');
        }
        
        // Agregamos iconos a los estados de vencimiento
        let estadoHTML = `<span class="estado-vencimiento ${estado.clase}`;
        if (estado.texto === 'Vencido') {
          estadoHTML += ' vencido-icon';
        } else if (estado.texto === 'Pronto a vencer') {
          estadoHTML += ' por-vencer-icon';
        } else {
          estadoHTML += ' vigente-icon';
        }
        estadoHTML += `">${estado.texto}</span>`;
        
        fila.innerHTML = `
          <td>${formatearFecha(c.fecha)}</td>
          <td>${c.fecha_vencimiento ? formatearFecha(c.fecha_vencimiento) : 'No establecido'}</td>
          <td>${c.cantidad}</td>
          <td>$${parseFloat(c.precio_compra).toFixed(2)}</td>
          <td>${estadoHTML}</td>
        `;
        tbody.appendChild(fila);
      });
    }
    
    // 9. Mostrar el modal
    const modal = document.getElementById('modalVencimientos');
    modal.style.display = "block";
    
    // 10. Configurar botón de exportar
    if (document.getElementById('btnExportarLotes')) {
      document.getElementById('btnExportarLotes').onclick = () => exportarDetalleLotes(producto, compras);
    }
    
  } catch (error) {
    console.error('Error al cargar fechas de vencimiento:', error);
    alert('No se pudieron cargar las fechas de vencimiento para este producto.');
  }
}

// Función para exportar el detalle de lotes a Excel
function exportarDetalleLotes(producto, compras) {
  try {
    // Crear un libro nuevo
    const wb = XLSX.utils.book_new();
    
    // Crear hoja con información del producto
    const infoProducto = [
      ['INFORMACIÓN DEL PRODUCTO'],
      [''],
      ['Código', producto.codigo],
      ['Producto', producto.producto],
      ['Precio de Venta', `$${parseFloat(producto.precio_venta).toFixed(2)}`],
      ['Existencia Actual', producto.existencia],
      ['Stock Mínimo', producto.minimo],
      ['Precio Promedio de Compra', `$${parseFloat(producto.compra_promedio || 0).toFixed(2)}`],
      ['']
    ];
    
    // Calcular totales
    let totalAdquirido = 0;
    let totalVendido = 0;
    let costoTotal = 0;
    
    compras.forEach(c => {
      totalAdquirido += parseInt(c.cantidad) || 0;
      costoTotal += (parseFloat(c.precio_compra) || 0) * (parseInt(c.cantidad) || 0);
    });
    
    totalVendido = totalAdquirido - producto.existencia;
    
    // Agregar resumen
    const resumen = [
      ['RESUMEN DE INVENTARIO'],
      [''],
      ['Total Adquirido', totalAdquirido, 'unidades'],
      ['Total Vendido', totalVendido, 'unidades'],
      ['Existencia Actual', producto.existencia, 'unidades'],
      ['Costo Total de Adquisición', `$${costoTotal.toFixed(2)}`],
      ['Costo Promedio por Unidad', `$${(totalAdquirido > 0 ? costoTotal / totalAdquirido : 0).toFixed(2)}`],
      ['Valor de Inventario Actual', `$${(producto.existencia * (producto.compra_promedio || 0)).toFixed(2)}`],
      ['']
    ];
    
    // Preparar datos para la tabla de lotes
    const lotesData = [
      ['HISTORIAL DE LOTES'],
      [''],
      ['Fecha de Compra', 'Fecha de Vencimiento', 'Cantidad', 'Precio de Compra', 'Estado', 'Valor Total']
    ];
    
    compras.forEach(c => {
      const estado = evaluarEstadoVencimiento(c.fecha_vencimiento);
      const valorTotal = (parseFloat(c.precio_compra) || 0) * (parseInt(c.cantidad) || 0);
      
      lotesData.push([
        formatearFecha(c.fecha),
        c.fecha_vencimiento ? formatearFecha(c.fecha_vencimiento) : 'No establecido',
        parseInt(c.cantidad) || 0,
        `$${parseFloat(c.precio_compra || 0).toFixed(2)}`,
        estado.texto,
        `$${valorTotal.toFixed(2)}`
      ]);
    });
    
    // Crear las hojas de Excel
    const wsInfo = XLSX.utils.aoa_to_sheet(infoProducto);
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    const wsLotes = XLSX.utils.aoa_to_sheet(lotesData);
    
    // Agregar las hojas al libro
    XLSX.utils.book_append_sheet(wb, wsInfo, "Información del Producto");
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen de Inventario");
    XLSX.utils.book_append_sheet(wb, wsLotes, "Historial de Lotes");
    
    // Obtener fecha actual para el nombre del archivo
    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}${String(hoy.getMonth() + 1).padStart(2, '0')}${hoy.getFullYear()}`;
    
    // Guardar el archivo
    XLSX.writeFile(wb, `Detalle_${producto.codigo}_${fechaStr}.xlsx`);
    
  } catch (error) {
    console.error('Error al exportar detalle de lotes:', error);
    alert('Error al exportar detalle de lotes a Excel.');
  }
}

function evaluarEstadoVencimiento(fechaVenc) {
  if (!fechaVenc) return { texto: 'Sin fecha', clase: 'estado-normal' };
  
  const hoy = new Date();
  const fechaVencimiento = new Date(fechaVenc);
  const diferenciaDias = Math.floor((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
  
  if (diferenciaDias < 0) {
    return { texto: 'Vencido', clase: 'estado-critico' };
  } else if (diferenciaDias <= 30) {
    return { texto: 'Pronto a vencer', clase: 'estado-bajo' };
  } else {
    return { texto: 'Vigente', clase: 'estado-normal' };
  }
}

function limpiarFormulario() {
  console.log('🧹 Limpiando formulario...');
  
  // Limpiar el formulario
  document.getElementById('formProducto').reset();
  document.getElementById('accion').value = 'crear';
  document.getElementById('codigo').value = '';
  
  // 🎨 Configurar modo creación visual
  if (typeof window.configurarModoCreacion === 'function') {
    window.configurarModoCreacion();
  }
  
  console.log('✅ Formulario limpiado');
}

function exportarExcel() {
  try {
    const table = document.getElementById('tablaProductos');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "productos.xlsx");
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    alert('Error al exportar a Excel. Verifique que la biblioteca XLSX esté cargada correctamente.');
  }
}

function filtrarProductos() {
  const filtro = document.getElementById('buscarProducto').value.toLowerCase();
  const filas = document.querySelectorAll('#tablaProductos tbody tr');
  
  filas.forEach(fila => {
    const producto = fila.querySelector('td:nth-child(2)').textContent.toLowerCase();
    const codigo = fila.querySelector('td:first-child').textContent.toLowerCase();
    
    if (producto.includes(filtro) || codigo.includes(filtro)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

function generarReporteExistencias() {
  try {
    // Crear una tabla temporal para el reporte
    const tablaTemp = document.createElement('table');
    tablaTemp.innerHTML = `
      <thead>
        <tr>
          <th>Código</th>
          <th>Producto</th>
          <th>Existencia</th>
          <th>Stock Mínimo</th>
          <th>Estado</th>
          <th>Precio Compra</th>
          <th>Precio Venta</th>
          <th>Valor Inventario</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    
    // Copiar datos de productos filtrados
    const filas = document.querySelectorAll('#tablaProductos tbody tr');
    let valorTotal = 0;
    
    filas.forEach(fila => {
      if (fila.style.display !== 'none') {
        const codigo = fila.querySelector('td:nth-child(1)').textContent;
        const producto = fila.querySelector('td:nth-child(2)').textContent;
        const precioVenta = parseFloat(fila.querySelector('td:nth-child(3)').textContent.replace('$', ''));
        const minimo = fila.querySelector('td:nth-child(5)').textContent;
        const existencia = parseInt(fila.querySelector('td:nth-child(6)').textContent);
        const estado = fila.querySelector('td:nth-child(7)').textContent;
        const precioCompra = parseFloat(fila.querySelector('td:nth-child(8)').textContent.replace('$', ''));
        
        const valorInventario = existencia * precioCompra;
        valorTotal += valorInventario;
        
        const nuevaFila = document.createElement('tr');
        nuevaFila.innerHTML = `
          <td>${codigo}</td>
          <td>${producto}</td>
          <td>${existencia}</td>
          <td>${minimo}</td>
          <td>${estado}</td>
          <td>$${precioCompra.toFixed(2)}</td>
          <td>$${precioVenta.toFixed(2)}</td>
          <td>$${valorInventario.toFixed(2)}</td>
        `;
        tablaTemp.querySelector('tbody').appendChild(nuevaFila);
      }
    });
    
    // Agregar fila de total
    const filaTotal = document.createElement('tr');
    filaTotal.innerHTML = `
      <td colspan="7" style="text-align: right; font-weight: bold;">VALOR TOTAL DEL INVENTARIO:</td>
      <td style="font-weight: bold;">$${valorTotal.toFixed(2)}</td>
    `;
    tablaTemp.querySelector('tbody').appendChild(filaTotal);
    
    // Exportar a Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tablaTemp);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte de Existencias");
    
    // Generar fecha actual para el nombre del archivo
    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}${String(hoy.getMonth() + 1).padStart(2, '0')}${hoy.getFullYear()}`;
    
    XLSX.writeFile(wb, `Reporte_Existencias_${fechaStr}.xlsx`);
  } catch (error) {
    console.error('Error al generar reporte:', error);
    alert('Error al generar el reporte de existencias.');
  }
}