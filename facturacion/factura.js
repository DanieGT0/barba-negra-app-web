// ===================================================
// VARIABLES GLOBALES PARA PAGINACIÓN Y DATOS
// ===================================================

let todasLasFacturas = [];
let facturasFiltradas = [];

// Configuración de paginación
let paginacion = {
  paginaActual: 1,
  tamañoPagina: 25,
  totalPaginas: 1
};

// Variables para el formulario
let cortesList = [], productosList = [], empleadosList = [], inventarioActual = {};

// Variables globales para filtros
const filtros = {
  desde: '', hasta: '', comanda: '', factura: '',
  empleado: '', cliente: '', pago: ''
};

// ===================================================
// FUNCIONES AUXILIARES PARA MANEJO DE FECHAS CORREGIDAS
// ===================================================

/**
 * Convierte fecha de formato ISO (YYYY-MM-DD) a formato centroamericano (DD/MM/YYYY)
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
 * Convierte fecha centroamericana (DD/MM/YYYY) a objeto Date para comparaciones
 */
function convertirFechaCentroamericanaADate(fechaCentro) {
  if (!fechaCentro) return null;
  
  // Si está en formato DD/MM/YYYY
  if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, anio] = fechaCentro.split('/');
    return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
  }
  
  return null;
}

/**
 * Compara si una fecha está dentro de un rango
 */
function fechaEstaEnRango(fechaComparar, fechaDesde, fechaHasta) {
  if (!fechaComparar) return false;
  
  // Convertir la fecha a comparar a objeto Date
  const fechaObj = convertirFechaCentroamericanaADate(fechaComparar);
  if (!fechaObj) return false;
  
  // Convertir fecha desde (si existe)
  let fechaDesdeObj = null;
  if (fechaDesde) {
    const fechaDesdeCentro = convertirFechaISOaCentroamericana(fechaDesde);
    fechaDesdeObj = convertirFechaCentroamericanaADate(fechaDesdeCentro);
  }
  
  // Convertir fecha hasta (si existe)
  let fechaHastaObj = null;
  if (fechaHasta) {
    const fechaHastaCentro = convertirFechaISOaCentroamericana(fechaHasta);
    fechaHastaObj = convertirFechaCentroamericanaADate(fechaHastaCentro);
  }
  
  // Comparar rangos
  if (fechaDesdeObj && fechaObj < fechaDesdeObj) return false;
  if (fechaHastaObj && fechaObj > fechaHastaObj) return false;
  
  return true;
}

/**
 * Función para debugging de fechas
 */
function debugFiltrosFecha() {
  const desde = document.getElementById('filtroDesde').value;
  const hasta = document.getElementById('filtroHasta').value;
  
  console.log('🔍 === DEBUG FILTROS DE FECHA ===');
  console.log('📅 Fecha desde (input):', desde);
  console.log('📅 Fecha hasta (input):', hasta);
  
  if (desde) {
    const desdeCentro = convertirFechaISOaCentroamericana(desde);
    console.log('📅 Fecha desde convertida:', desdeCentro);
  }
  
  if (hasta) {
    const hastaCentro = convertirFechaISOaCentroamericana(hasta);
    console.log('📅 Fecha hasta convertida:', hastaCentro);
  }
  
  // Probar con algunas fechas de ejemplo de la BD
  const fechasEjemplo = ['01/06/2025', '15/06/2025', '30/06/2025'];
  fechasEjemplo.forEach(fecha => {
    const enRango = fechaEstaEnRango(fecha, desde, hasta);
    console.log(`📅 ${fecha} está en rango: ${enRango}`);
  });
}

/**
 * Verificar si hay filtros activos
 */
function tienesFiltrosActivos() {
  return filtros.desde || filtros.hasta || filtros.comanda || filtros.factura || 
         filtros.empleado || filtros.pago;
}

// ===================================================
// INICIALIZACIÓN
// ===================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Obtener la fecha actual
  const fechaActual = new Date();
  const año = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaActual.getDate()).padStart(2, '0');
  
  document.getElementById('fecha').value = `${año}-${mes}-${dia}`;

  // Cargar datos iniciales en el orden correcto
  cargarClientes();
  await cargarEmpleados(); // Esperar a que se carguen los empleados primero
  cargarCortes();
  cargarProductos();
  cargarHistorialFacturas();

  // Configurar eventos del formulario
  document.getElementById('formFactura').addEventListener('submit', guardarFactura);
  document.getElementById('toggleForm').addEventListener('click', toggleFormulario);
  document.getElementById('descuento').addEventListener('input', calcularTotal);
  document.getElementById('exportarExcel').addEventListener('click', exportarExcel);
  
  // Configurar eventos de filtros
  document.getElementById('btnAplicarFiltro').addEventListener('click', aplicarFiltros);
  document.getElementById('btnLimpiarFiltro').addEventListener('click', limpiarFiltros);
  document.getElementById('filtroCliente').addEventListener('input', filtrarDinamicamente);

  // Cargar datos para filtros
  cargarListasFiltro();
});

// ===================================================
// FUNCIONES DEL FORMULARIO DE FACTURACIÓN
// ===================================================

function isoToLatam(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function obtenerFechaLatamActual() {
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
}

function toggleFormulario() {
  const form = document.getElementById('formFactura');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  document.getElementById('toggleForm').textContent = form.style.display === 'none' ? 'Mostrar formulario' : 'Ocultar formulario';
}

async function cargarClientes() {
  const res = await fetch('http://localhost:3001/api/clientes?limit=9999'); // Obtener todos los clientes
  const response = await res.json();
  
  // Manejar respuesta con paginación
  const clientes = response.data || response;
  
  // Ya no necesitamos cargar el select porque usamos autocompletado
  // El autocompletado se maneja en clientes-autocompletado.js
  
  const datalist = document.getElementById('listaClientes');
  if (datalist) {
    datalist.innerHTML = '';
    clientes.forEach(c => {
      const option = document.createElement('option');
      option.value = c.nombre;
      datalist.appendChild(option);
    });
  }
}

async function cargarEmpleados() {
  const res = await fetch('http://localhost:3001/api/empleados');
  const empleados = await res.json();
  empleadosList = empleados;
  
  const filtroSelect = document.getElementById('filtroEmpleado');
  if (filtroSelect) {
    filtroSelect.innerHTML = '<option value="">Todos</option>';
    empleados.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.nombre;
      opt.textContent = emp.nombre;
      filtroSelect.appendChild(opt);
    });
  }
  
  // Actualizar todos los selects de empleados existentes
  actualizarSelectsEmpleados();
}

function actualizarSelectsEmpleados() {
  if (!empleadosList || empleadosList.length === 0) return;
  
  // Actualizar selects en cortes
  const cortesContainer = document.getElementById('cortesContainer');
  if (cortesContainer) {
    const selectsEmpleadosCortes = cortesContainer.querySelectorAll('.empleado-select');
    selectsEmpleadosCortes.forEach(select => {
      const selectedValue = select.value;
      select.innerHTML = `
        <option disabled selected>Seleccione Barbero</option>
        ${empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')}
      `;
      if (selectedValue) select.value = selectedValue;
    });
  }
  
  // Actualizar selects en productos
  const productosContainer = document.getElementById('productosContainer');
  if (productosContainer) {
    const selectsEmpleadosProductos = productosContainer.querySelectorAll('.empleado-select');
    selectsEmpleadosProductos.forEach(select => {
      const selectedValue = select.value;
      select.innerHTML = `
        <option disabled selected>Seleccione Vendedor</option>
        ${empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')}
      `;
      if (selectedValue) select.value = selectedValue;
    });
  }
}

async function cargarCortes() {
  const res = await fetch('http://localhost:3001/api/cortes');
  cortesList = await res.json();
  // Solo agregar corte inicial si no hay elementos ya presentes
  const cortesContainer = document.getElementById('cortesContainer');
  if (cortesContainer && cortesContainer.children.length === 0) {
    agregarCorte();
  }
}

async function cargarProductos() {
  const res = await fetch('http://localhost:3001/productos');
  productosList = await res.json();
  productosList.forEach(p => inventarioActual[p.codigo] = p.existencia);
  // Solo agregar producto inicial si no hay elementos ya presentes
  const productosContainer = document.getElementById('productosContainer');
  if (productosContainer && productosContainer.children.length === 0) {
    agregarProducto();
  }
}

// ===================================================
// FUNCIONES DEL FORMULARIO - PARTE 2
// ===================================================

function agregarCorte() {
  const div = document.createElement('div');
  div.classList.add('form-grid');
  
  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'btn-eliminar-item';
  btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
  btnEliminar.style.gridColumn = '6';
  btnEliminar.onclick = function() {
    div.remove();
    calcularTotal();
  };
  
  // Verificar si los empleados están cargados
  const empleadosOptions = empleadosList && empleadosList.length > 0 
    ? empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')
    : '<option disabled>Cargando empleados...</option>';

  div.innerHTML = `
    <select class="corte-select" onchange="actualizarCorte(this)">
      <option disabled selected>Seleccione Corte</option>
      ${cortesList.map(c => `<option value="${c.codigo}" data-precio="${c.precio}" data-comision="${c.comision}">${c.servicio}</option>`).join('')}
    </select>
    <input type="number" value="0" min="0" oninput="actualizarCorte(this)">
    <select class="empleado-select">
      <option disabled selected>Seleccione Barbero</option>
      ${empleadosOptions}
    </select>
    <input type="text" class="precioUnitario" readonly placeholder="Precio Unit." />
    <input type="text" class="precioCorte" readonly placeholder="Precio Total" />
    <input type="text" class="comisionCorte" readonly />
  `;
  
  div.appendChild(btnEliminar);
  document.getElementById('cortesContainer').appendChild(div);
  
  // Si los empleados no están cargados, intentar recargarlos
  if (!empleadosList || empleadosList.length === 0) {
    cargarEmpleados().then(() => {
      // Actualizar el select de empleados en este div específico
      const empleadoSelect = div.querySelector('.empleado-select');
      if (empleadoSelect && empleadosList && empleadosList.length > 0) {
        empleadoSelect.innerHTML = `
          <option disabled selected>Seleccione Barbero</option>
          ${empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')}
        `;
      }
    });
  }
}

function agregarProducto() {
  const div = document.createElement('div');
  div.classList.add('form-grid');
  
  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'btn-eliminar-item';
  btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
  btnEliminar.style.gridColumn = '6';
  btnEliminar.onclick = function() {
    div.remove();
    calcularTotal();
  };
  
  // Verificar si los empleados están cargados
  const empleadosOptions = empleadosList && empleadosList.length > 0 
    ? empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')
    : '<option disabled>Cargando empleados...</option>';

  div.innerHTML = `
    <select class="producto-select" onchange="actualizarProducto(this)">
      <option disabled selected>Seleccione Producto</option>
      ${productosList.map(p => `<option value="${p.codigo}" data-precio="${p.precio_venta}" data-comision="${p.comision}" data-existencia="${p.existencia}">${p.producto}</option>`).join('')}
    </select>
    <input type="number" value="0" min="0" oninput="actualizarProducto(this)">
    <select class="empleado-select">
      <option disabled selected>Seleccione Vendedor</option>
      ${empleadosOptions}
    </select>
    <input type="text" class="precioUnitario" readonly placeholder="Precio Unit." />
    <input type="text" class="precioProducto" readonly placeholder="Precio Total" />
    <input type="text" class="comisionProducto" readonly />
  `;
  
  div.appendChild(btnEliminar);
  document.getElementById('productosContainer').appendChild(div);
  
  // Si los empleados no están cargados, intentar recargarlos
  if (!empleadosList || empleadosList.length === 0) {
    cargarEmpleados().then(() => {
      // Actualizar el select de empleados en este div específico
      const empleadoSelect = div.querySelector('.empleado-select');
      if (empleadoSelect && empleadosList && empleadosList.length > 0) {
        empleadoSelect.innerHTML = `
          <option disabled selected>Seleccione Vendedor</option>
          ${empleadosList.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('')}
        `;
      }
    });
  }
}

function actualizarCorte(el) {
  const div = el.closest('.form-grid');
  const cantidadInput = div.querySelector('input[type=number]');
  const select = div.querySelector('.corte-select');
  
  if (!select.value || select.selectedIndex === 0) {
    cantidadInput.value = 0;
    div.querySelector('.precioUnitario').value = '';
    div.querySelector('.precioCorte').value = '';
    div.querySelector('.comisionCorte').value = '';
    calcularTotal();
    return;
  }
  
  if (parseInt(cantidadInput.value) === 0) cantidadInput.value = 1;

  const cantidad = parseInt(cantidadInput.value || 1);
  const precioUnitario = parseFloat(select.selectedOptions[0].dataset.precio || 0);
  const comisionUnitaria = parseFloat(select.selectedOptions[0].dataset.comision || 0);
  
  div.querySelector('.precioUnitario').value = precioUnitario.toFixed(2);
  div.querySelector('.precioCorte').value = (precioUnitario * cantidad).toFixed(2);
  div.querySelector('.comisionCorte').value = (comisionUnitaria * cantidad).toFixed(2);
  
  calcularTotal();
}

function actualizarProducto(el) {
  const div = el.closest('.form-grid');
  const cantidadInput = div.querySelector('input[type=number]');
  const select = div.querySelector('.producto-select');
  
  if (!select.value || select.selectedIndex === 0) {
    cantidadInput.value = 0;
    div.querySelector('.precioUnitario').value = '';
    div.querySelector('.precioProducto').value = '';
    div.querySelector('.comisionProducto').value = '';
    calcularTotal();
    return;
  }
  
  const existencia = parseInt(select.selectedOptions[0].dataset.existencia || 0);
  
  if (existencia <= 0) {
    alert("❌ No hay existencia para este producto.");
    select.selectedIndex = 0;
    cantidadInput.value = 0;
    div.querySelector('.precioUnitario').value = '';
    div.querySelector('.precioProducto').value = '';
    div.querySelector('.comisionProducto').value = '';
    calcularTotal();
    return;
  }
  
  if (parseInt(cantidadInput.value) === 0) cantidadInput.value = 1;
  
  const cantidad = parseInt(cantidadInput.value || 1);

  if (cantidad > existencia) {
    alert(`❌ Solo hay ${existencia} unidades disponibles de este producto.`);
    cantidadInput.value = existencia;
  }

  const precioUnitario = parseFloat(select.selectedOptions[0].dataset.precio || 0);
  const comisionUnitaria = parseFloat(select.selectedOptions[0].dataset.comision || 0);
  
  const cantidadFinal = parseInt(cantidadInput.value || 0);
  const precioTotal = precioUnitario * cantidadFinal;
  const comisionTotal = comisionUnitaria * cantidadFinal;
  
  div.querySelector('.precioUnitario').value = precioUnitario.toFixed(2);
  div.querySelector('.precioProducto').value = precioTotal.toFixed(2);
  div.querySelector('.comisionProducto').value = comisionTotal.toFixed(2);
  
  calcularTotal();
}

async function calcularTotal() {
  console.log('🧮 === EJECUTANDO CALCULAR TOTAL ===');
  // Primero verificar y aplicar cortes gratis en tiempo real
  await verificarYAplicarCorteGratisEnTiempoReal();
  
  // IMPORTANTE: Usar un pequeño delay para que los campos DOM se actualicen
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const precioVenta = [...document.querySelectorAll('.precioCorte, .precioProducto')]
    .reduce((sum, el) => sum + parseFloat(el.value || 0), 0);

  const precioVentaField = document.getElementById('precioVenta');
  const totalField = document.getElementById('total');
  
  precioVentaField.value = precioVenta.toFixed(2);

  const descuentoInput = document.getElementById('descuento').value;
  let descuento = 0;

  // El campo ahora es numérico y representa porcentaje directamente
  const porcentajeDescuento = parseFloat(descuentoInput) || 0;
  descuento = precioVenta * (porcentajeDescuento / 100);

  const totalFinal = precioVenta - descuento;
  totalField.value = totalFinal.toFixed(2);
  
  // Agregar indicadores visuales cuando hay cortes gratis
  const cortesGratis = document.querySelectorAll('.indicador-gratis');
  if (cortesGratis.length > 0) {
    // Estilo especial para campos de resumen cuando hay cortes gratis
    precioVentaField.style.backgroundColor = '#fff3cd';
    precioVentaField.style.borderColor = '#ffc107';
    precioVentaField.setAttribute('title', `Precio con ${cortesGratis.length} corte(s) gratis aplicado(s)`);
    
    totalField.style.backgroundColor = '#d1ecf1';
    totalField.style.borderColor = '#17a2b8';
    totalField.setAttribute('title', `Total final con ${cortesGratis.length} corte(s) gratis`);
    
    // Mostrar información adicional
    mostrarInfoCortesGratis(cortesGratis.length, precioVenta, totalFinal);
  } else {
    // Limpiar estilos cuando no hay cortes gratis
    precioVentaField.style.backgroundColor = '';
    precioVentaField.style.borderColor = '';
    precioVentaField.removeAttribute('title');
    
    totalField.style.backgroundColor = '';
    totalField.style.borderColor = '';
    totalField.removeAttribute('title');
    
    ocultarInfoCortesGratis();
  }
}

// Función para mostrar información de cortes gratis en el resumen
function mostrarInfoCortesGratis(cantidadGratis, precioVenta, totalFinal) {
  let infoDiv = document.getElementById('info-cortes-gratis');
  
  if (!infoDiv) {
    infoDiv = document.createElement('div');
    infoDiv.id = 'info-cortes-gratis';
    infoDiv.style.cssText = `
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
      border: 2px solid #28a745;
      border-radius: 10px;
      padding: 10px;
      margin: 10px 0;
      text-align: center;
      animation: pulse-green 2s infinite;
    `;
    
    // Insertar después de los campos de totales
    const totalField = document.getElementById('total');
    totalField.parentNode.parentNode.insertAdjacentElement('afterend', infoDiv);
    
    // Agregar animación CSS
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.textContent = `
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  const ahorroTotal = cantidadGratis * 35; // Estimación, podrías calcular el ahorro real
  
  infoDiv.innerHTML = `
    <div style="color: #155724; font-weight: bold; font-size: 1.1em;">
      🎉 ¡${cantidadGratis} CORTE${cantidadGratis > 1 ? 'S' : ''} GRATIS APLICADO${cantidadGratis > 1 ? 'S' : ''}! 🎉
    </div>
    <div style="margin-top: 5px; color: #155724;">
      <strong>Precio final: $${totalFinal.toFixed(2)}</strong>
      ${cantidadGratis > 0 ? `<br><small>¡El cliente ahorra dinero por su fidelidad!</small>` : ''}
    </div>
  `;
}

// Función para ocultar información de cortes gratis
function ocultarInfoCortesGratis() {
  const infoDiv = document.getElementById('info-cortes-gratis');
  if (infoDiv) {
    infoDiv.style.display = 'none';
  }
}

// Alias para compatibilidad con otros módulos
function calcularTotales() {
  calcularTotal();
}

/**
 * Versión silenciosa de verificarYAplicarCorteGratis para uso en tiempo real
 * No muestra alertas, solo aplica descuentos visualmente
 */
async function verificarYAplicarCorteGratisEnTiempoReal() {
  console.log('🔍 === INICIO VERIFICACIÓN TIEMPO REAL ===');
  try {
    // Obtener detalles de cortes del formulario actual
    const detalleCortes = [...document.querySelectorAll('#cortesContainer .form-grid')]
      .map((div, index) => {
        const selectCorte = div.querySelector('.corte-select');
        const selectEmpleado = div.querySelector('.empleado-select');
        
        if (!selectCorte.value || selectCorte.value === "" || 
            selectCorte.selectedIndex === 0 || 
            !selectEmpleado.value || selectEmpleado.value === "" ||
            selectEmpleado.selectedIndex === 0) {
          return null;
        }
        
        const nombre = selectCorte.selectedOptions[0].textContent;
        const codigo = selectCorte.value;
        const empleado = selectEmpleado.value;
        const cantidad = parseInt(div.querySelector('input[type=number]').value || 0);
        
        if (cantidad === 0) return null;
        
        const precioUnitario = parseFloat(div.querySelector('.precioUnitario').value || 0);
        const precioTotal = precioUnitario * cantidad;
        
        return {
          tipo_corte: nombre,
          codigo,
          empleado,
          cantidad,
          precio_unitario: precioUnitario,
          precio: precioTotal,
          indiceDOM: index // Para poder actualizar el DOM
        };
      })
      .filter(c => c !== null);
    
    console.log(`📊 Cortes detectados en formulario: ${detalleCortes.length}`);
    detalleCortes.forEach((corte, i) => {
      console.log(`   Corte ${i + 1}: ${corte.tipo_corte} - $${corte.precio} (cantidad: ${corte.cantidad})`);
    });
    
    if (detalleCortes.length === 0) {
      console.log('❌ No hay cortes para procesar');
      return; // No hay cortes para procesar
    }
    
    const clienteId = obtenerClienteIdActivo();
    console.log(`👤 Cliente ID obtenido: ${clienteId}`);
    
    if (!clienteId || clienteId === '') {
      console.log('❌ Sin cliente seleccionado');
      return; // Sin cliente seleccionado
    }
    
    // Obtener información de la tarjeta del cliente
    console.log(`🌐 Consultando tarjeta: /api/tarjetas-fidelidad/cliente/${clienteId}`);
    const response = await fetch(`/api/tarjetas-fidelidad/cliente/${clienteId}`);
    console.log(`📡 Respuesta API status: ${response.status}`);
    
    if (!response.ok) {
      console.log('❌ Error al consultar tarjeta del cliente');
      return; // Error al consultar tarjeta
    }
    
    const tarjeta = await response.json();
    console.log(`🎯 Datos de tarjeta recibidos:`, tarjeta);
    
    if (!tarjeta) {
      console.log('❌ Cliente sin tarjeta de fidelidad');
      return; // Cliente sin tarjeta
    }
    
    console.log(`🔍 Verificación en tiempo real: Cliente con ${tarjeta.sellos_actuales} sellos`);
    
    // Simular los sellos después de agregar los cortes de esta factura
    let sellosSimulados = tarjeta.sellos_actuales;
    let cortesGratis = [];
    
    console.log(`🎯 Estado inicial: Cliente tiene ${sellosSimulados} sellos`);
    
    // Crear lista de cortes individuales (expandir cantidades)
    const cortesIndividuales = [];
    detalleCortes.forEach((corte, corteIndex) => {
      const cantidad = parseInt(corte.cantidad || 1);
      for (let i = 0; i < cantidad; i++) {
        cortesIndividuales.push({
          ...corte,
          indiceCorteOriginal: corteIndex,
          indiceIndividual: i,
          identificador: `${corte.tipo_corte} (${i + 1}/${cantidad})`
        });
      }
    });
    
    // Ordenar cortes individuales por precio (más baratos primero para descuentos)
    const cortesOrdenados = cortesIndividuales.sort((a, b) => parseFloat(a.precio_unitario || 0) - parseFloat(b.precio_unitario || 0));
    
    console.log(`📝 Total cortes individuales a procesar: ${cortesOrdenados.length}`);
    
    // Simular agregado de sellos uno por uno
    for (let i = 0; i < cortesOrdenados.length; i++) {
      const corteActual = cortesOrdenados[i];
      sellosSimulados++;
      
      console.log(`   📊 Procesando corte individual ${i + 1}/${cortesOrdenados.length}: ${corteActual.identificador} - Sellos: ${sellosSimulados}`);
      
      // Si llegamos exactamente a 10 sellos, este corte individual es gratis
      if (sellosSimulados === 10) {
        // Marcar el corte original como gratis (solo si no está ya marcado)
        const indiceOriginal = corteActual.indiceCorteOriginal;
        if (!cortesGratis.includes(indiceOriginal)) {
          cortesGratis.push(indiceOriginal);
          console.log(`🎁 ¡CORTE GRATIS! (tiempo real): ${corteActual.identificador} - Corte original #${indiceOriginal} (sello #10)`);
        }
        // NO reiniciar contador - tarjeta queda completada sin nueva tarjeta automática
        console.log(`   ✅ Tarjeta completada - Cliente debe solicitar nueva tarjeta manualmente`);
        // Los siguientes cortes se cobran normalmente
        break; // Solo permitir UN corte gratis por sesión
      }
    }
    
    // Aplicar descuentos visuales a los cortes gratis
    const cortesContainers = document.querySelectorAll('#cortesContainer .form-grid');
    
    // Primero limpiar indicadores previos
    cortesContainers.forEach(container => {
      const precioCorteInput = container.querySelector('.precioCorte');
      const precioUnitarioInput = container.querySelector('.precioUnitario');
      const indicadorGratis = container.querySelector('.indicador-gratis');
      
      if (precioCorteInput) {
        precioCorteInput.style.backgroundColor = '';
        precioCorteInput.style.color = '';
        precioCorteInput.style.fontWeight = '';
        precioCorteInput.removeAttribute('title');
      }
      if (precioUnitarioInput) {
        precioUnitarioInput.style.backgroundColor = '';
        precioUnitarioInput.style.color = '';
        precioUnitarioInput.style.fontWeight = '';
        precioUnitarioInput.removeAttribute('title');
      }
      if (indicadorGratis) {
        indicadorGratis.remove();
      }
    });
    
    // Aplicar estilos a cortes gratis
    cortesGratis.forEach(indiceCorte => {
      const corte = detalleCortes[indiceCorte];
      const container = cortesContainers[corte.indiceDOM];
      
      if (container) {
        const precioCorteInput = container.querySelector('.precioCorte');
        const precioUnitarioInput = container.querySelector('.precioUnitario');
        
        if (precioCorteInput) {
          precioCorteInput.value = '0.00';
          precioCorteInput.style.backgroundColor = '#d4edda';
          precioCorteInput.style.color = '#155724';
          precioCorteInput.style.fontWeight = 'bold';
          precioCorteInput.setAttribute('title', '¡Este corte es GRATIS por tarjeta de fidelidad!');
        }
        if (precioUnitarioInput) {
          precioUnitarioInput.value = '0.00';
          precioUnitarioInput.style.backgroundColor = '#d4edda';
          precioUnitarioInput.style.color = '#155724';
          precioUnitarioInput.style.fontWeight = 'bold';
          precioUnitarioInput.setAttribute('title', '¡Este corte es GRATIS por tarjeta de fidelidad!');
        }
        
        // Agregar indicador visual
        const indicadorGratis = document.createElement('div');
        indicadorGratis.className = 'indicador-gratis';
        indicadorGratis.innerHTML = '🎁 GRATIS';
        indicadorGratis.style.cssText = `
          position: absolute;
          top: -5px;
          right: -5px;
          background: #28a745;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 0.7em;
          font-weight: bold;
          z-index: 100;
        `;
        container.style.position = 'relative';
        container.appendChild(indicadorGratis);
      }
    });
    
    if (cortesGratis.length > 0) {
      console.log(`🎉 ¡${cortesGratis.length} CORTES GRATIS DETECTADOS Y APLICADOS!`);
    } else {
      console.log(`ℹ️ No hay cortes gratis en esta combinación`);
    }
    
    console.log(`✅ Verificación en tiempo real completada: ${cortesGratis.length} cortes gratis aplicados`);
    console.log('🔍 === FIN VERIFICACIÓN TIEMPO REAL ===');
    
  } catch (error) {
    console.error('❌ Error en verificación en tiempo real:', error);
    // No interrumpir el flujo
  }
}

/**
 * Obtener ID del cliente activo (normal o preferencial)
 */
function obtenerClienteIdActivo() {
  const tipoCliente = document.getElementById('tipoCliente').value;
  console.log(`🔍 Tipo de cliente seleccionado: ${tipoCliente}`);
  
  let clienteId = '';
  
  switch(tipoCliente) {
    case 'normal':
      if (typeof obtenerClienteIdSeleccionado === 'function') {
        clienteId = obtenerClienteIdSeleccionado();
        console.log(`👤 Cliente normal ID: ${clienteId}`);
      }
      break;
    case 'preferencial':
      if (typeof obtenerClientePreferencialIdSeleccionado === 'function') {
        clienteId = obtenerClientePreferencialIdSeleccionado();
        console.log(`⭐ Cliente preferencial ID: ${clienteId}`);
      }
      break;
    case 'general':
    default:
      console.log(`👤 Cliente general - sin ID específico`);
      break;
  }
  
  console.log(`✅ ID final del cliente activo: ${clienteId}`);
  return clienteId || '';
}

async function existeFacturaYComanda(comanda, factura) {
  const res = await fetch("http://localhost:3001/facturas");
  const data = await res.json();
  return data.some(f => f.comanda == comanda && f.factura == factura);
}

function hayItemsValidos() {
  const cortesValidos = [...document.querySelectorAll('#cortesContainer .form-grid')]
    .some(div => {
      const selectCorte = div.querySelector('.corte-select');
      const selectEmpleado = div.querySelector('.empleado-select');
      const cantidad = parseInt(div.querySelector('input[type=number]').value || 0);
      
      return selectCorte.value && 
             selectCorte.selectedIndex > 0 && 
             selectEmpleado.value && 
             selectEmpleado.selectedIndex > 0 && 
             cantidad > 0;
    });
  
  const productosValidos = [...document.querySelectorAll('#productosContainer .form-grid')]
    .some(div => {
      const selectProducto = div.querySelector('.producto-select');
      const selectEmpleado = div.querySelector('.empleado-select');
      const cantidad = parseInt(div.querySelector('input[type=number]').value || 0);
      
      let existencia = 0;
      if (selectProducto.selectedIndex > 0) {
        existencia = parseInt(selectProducto.selectedOptions[0].dataset.existencia || 0);
      }
      
      return selectProducto.value && 
             selectProducto.selectedIndex > 0 && 
             selectEmpleado.value && 
             selectEmpleado.selectedIndex > 0 && 
             cantidad > 0 &&
             existencia >= cantidad;
    });
  
  return cortesValidos || productosValidos;
}

async function actualizarInventarioEnMemoria() {
  const res = await fetch('http://localhost:3001/productos');
  const productos = await res.json();
  productosList = productos;
  productos.forEach(p => inventarioActual[p.codigo] = p.existencia);
}

async function eliminarFactura(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Se restaurará la existencia y se eliminará el PDF generado.")) 
    return;

  try {
    const res = await fetch(`/facturas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    
    let mensaje = data.mensaje;
    
    if (data.hasOwnProperty('pdf_eliminado')) {
      if (data.pdf_eliminado) {
        mensaje += "\n✅ El archivo PDF también fue eliminado.";
      } else if (data.error_pdf) {
        mensaje += "\n⚠️ Nota: No se pudo eliminar el archivo PDF: " + data.error_pdf;
      } else {
        mensaje += "\n⚠️ Nota: No se encontró el archivo PDF asociado.";
      }
    }
    
    alert(mensaje);
    cargarHistorialFacturas();
    
    await actualizarInventarioEnMemoria();
  } catch (err) {
    console.error("❌ Error al eliminar factura:", err);
    alert("Error al eliminar la factura. Por favor, intenta de nuevo o contacta al administrador.");
  }
}

// ===================================================
// FUNCIÓN GUARDAR FACTURA Y FILTROS CORREGIDOS - PARTE 3
// ===================================================

async function guardarFactura(e) {
  e.preventDefault();

  // Obtener el botón y proteger contra múltiples clics
  const btnGuardar = document.getElementById('btnGuardar');
  const textoOriginal = btnGuardar.textContent;
  
  // Deshabilitar el botón con estilos visuales
  btnGuardar.disabled = true;
  btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando factura...';
  btnGuardar.style.opacity = '0.6';
  btnGuardar.style.cursor = 'not-allowed';

  const comanda = document.getElementById("comanda").value;
  const factura = document.getElementById("factura").value;
  
  if (!comanda || !factura) {
    alert("⚠️ Debe ingresar número de comanda y factura.");
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
    return;
  }

  if (await existeFacturaYComanda(comanda, factura)) {
    alert("⚠️ Ya existe una factura con esta comanda.");
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
    return;
  }

  if (!hayItemsValidos()) {
    alert("⚠️ Debe tener al menos un corte o producto válido con cantidad mayor a cero para facturar.");
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
    return;
  }

  const detalleCortes = [...document.querySelectorAll('#cortesContainer .form-grid')]
    .map(div => {
      const selectCorte = div.querySelector('.corte-select');
      const selectEmpleado = div.querySelector('.empleado-select');
      
      if (!selectCorte.value || selectCorte.value === "" || 
          selectCorte.selectedIndex === 0 || 
          !selectEmpleado.value || selectEmpleado.value === "" ||
          selectEmpleado.selectedIndex === 0) {
        return null;
      }
      
      const nombre = selectCorte.selectedOptions[0].textContent;
      const codigo = selectCorte.value;
      const empleado = selectEmpleado.value;
      const cantidad = parseInt(div.querySelector('input[type=number]').value || 0);

      if (cantidad === 0) return null;

      const precioUnitario = parseFloat(div.querySelector('.precioUnitario').value || 0);
      const precioTotal = precioUnitario * cantidad;
      const comision = parseFloat(div.querySelector('.comisionCorte').value || 0);

      return {
        codigo,
        nombre,
        cantidad,
        empleado,
        precio_unitario: precioUnitario,
        precio: precioTotal,
        comision: comision
      };
    })
    .filter(c => c !== null);

  const detalleProductos = [...document.querySelectorAll('#productosContainer .form-grid')]
  .map(div => {
    const selectProducto = div.querySelector('.producto-select');
    const selectEmpleado = div.querySelector('.empleado-select');
    
    if (!selectProducto.value || selectProducto.value === "" || 
        selectProducto.selectedIndex === 0 || 
        !selectEmpleado.value || selectEmpleado.value === "" ||
        selectEmpleado.selectedIndex === 0) {
      return null;
    }
    
    const nombre = selectProducto.selectedOptions[0].textContent;
    const codigo = selectProducto.value;
    const empleado = selectEmpleado.value;
    const cantidad = parseInt(div.querySelector('input[type=number]').value || 0);
    
    const existencia = parseInt(selectProducto.selectedOptions[0].dataset.existencia || 0);
    if (cantidad > existencia) {
      alert(`⚠️ No hay suficiente existencia para '${nombre}'. Disponible: ${existencia}, Solicitado: ${cantidad}`);
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = textoOriginal;
      btnGuardar.style.opacity = '1';
      btnGuardar.style.cursor = 'pointer';
      throw new Error("Existencia insuficiente");
    }

    if (cantidad === 0) return null;

    const precioUnitario = parseFloat(div.querySelector('.precioUnitario').value || 0);
    const precioTotal = precioUnitario * cantidad;
    const comision = parseFloat(div.querySelector('.comisionProducto').value || 0);

    return {
      codigo,
      nombre,
      cantidad,
      empleado,
      precio_unitario: precioUnitario,
      precio: precioTotal,
      comision
    };
  })
  .filter(p => p !== null);

  if (detalleCortes.length === 0 && detalleProductos.length === 0) {
    alert("⚠️ Debes seleccionar al menos un corte o producto.");
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
    return;
  }

  // Validar pago mixto si es necesario
  if (!validarPagoMixto()) {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
    return;
  }

  const isoFecha = document.getElementById("fecha").value;
  const fecha = isoToLatam(isoFecha);

  const clienteSeleccionado = (typeof obtenerNombreClienteActivo === 'function') 
    ? obtenerNombreClienteActivo() 
    : "";
  const clienteFinal = (!clienteSeleccionado || clienteSeleccionado.trim() === "") 
                       ? "Cliente General" 
                       : clienteSeleccionado;

  // Obtener datos del pago (incluyendo pago mixto)
  const datosPago = obtenerDatosPagoMixto();
  
  const data = {
    fecha,
    comanda,
    factura,
    cliente: clienteFinal,
    empleado_principal: detalleCortes.length > 0 ? detalleCortes[0].empleado : (detalleProductos.length > 0 ? detalleProductos[0].empleado : ""),
    tipo_pago: datosPago.tipoPagoTexto,
    precio_venta: document.getElementById("precioVenta").value,
    descuento: document.getElementById("descuento").value,
    total: document.getElementById("total").value,
    detalleCortes,
    detalleProductos,
    // Datos del pago mixto
    es_pago_mixto: datosPago.esPagoMixto,
    monto_efectivo: datosPago.montoEfectivo,
    monto_tarjeta: datosPago.montoTarjeta
  };

  try {
    const res = await fetch('http://localhost:3001/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    alert(result.mensaje);
    
    // ========================================
    // PDF AUTOMÁTICO DESHABILITADO - SOLO VISTA HTML
    // ========================================
    // Ya no generamos PDF automáticamente al crear facturas
    // Los usuarios pueden ver la factura en HTML o descargar PDF manualmente
    
    /* 
    try {
      console.log('📄 Generando PDF de factura para descarga...');
      await generarYDescargarFacturaPDF(data);
    } catch (pdfError) {
      console.error('❌ Error al generar PDF:', pdfError);
      alert('⚠️ Factura guardada correctamente, pero hubo un error al generar el PDF');
    }
    */
    
    cargarHistorialFacturas();
    document.getElementById('formFactura').reset();
    
    document.getElementById('cortesContainer').innerHTML = '';
    document.getElementById('productosContainer').innerHTML = '';
    
    agregarCorte();
    agregarProducto();
    
    const fechaActual = new Date();
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    document.getElementById('fecha').value = `${año}-${mes}-${dia}`;
    
    // Limpiar cliente usando la función del autocompletado
    if (typeof limpiarClienteSeleccionado === 'function') {
      limpiarClienteSeleccionado();
    }
    
    // Verificar y aplicar corte gratis ANTES de guardar
    await verificarYAplicarCorteGratis(detalleCortes, data);
    
    await actualizarInventarioEnMemoria();
    
    // Procesar tarjeta de fidelidad después de guardar exitosamente
    if (typeof procesarTarjetaDespuesDeFactura === 'function') {
      console.log('Iniciando procesamiento de tarjeta de fidelidad...');
      try {
        // Pasar información de los cortes que se acabaron de guardar
        await procesarTarjetaDespuesDeFactura(comanda, factura, detalleCortes);
      } catch (errorTarjeta) {
        console.error('Error al procesar tarjeta de fidelidad:', errorTarjeta);
        // No detener el flujo por error en tarjeta
      }
    } else {
      console.log('Función procesarTarjetaDespuesDeFactura no disponible');
    }
    
  } catch (err) {
    console.error("❌ Error detallado:", err);
    alert(`❌ Error al procesar la solicitud: ${err.message}`);
  } finally {
    // Rehabilitar el botón siempre, incluso si hay error
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
    btnGuardar.style.opacity = '1';
    btnGuardar.style.cursor = 'pointer';
  }
}

// ===================================================
// FUNCIONES DE FILTROS CORREGIDAS CON FECHAS
// ===================================================

async function cargarListasFiltro() {
  const empleados = await (await fetch('http://localhost:3001/api/empleados')).json();
  const selEmpleado = document.getElementById('filtroEmpleado');

  selEmpleado.innerHTML = '<option value="">Todos</option>';
  empleados.forEach(e => {
    const o = document.createElement('option'); 
    o.value = o.textContent = e.nombre;
    selEmpleado.appendChild(o);
  });
}

function filtrarDinamicamente() {
  const textoBusqueda = document.getElementById('filtroCliente').value;
  buscarEnFacturas(textoBusqueda);
}

// ✅ FUNCIÓN DE FILTRADO LOCAL CORREGIDA CON FECHAS
function filtrarFacturasLocalmente() {
  console.log('🔍 Aplicando filtros localmente...');
  console.log('📅 Filtros de fecha:', { desde: filtros.desde, hasta: filtros.hasta });
  
  let facturasResultado = todasLasFacturas.filter(factura => {
    // ✅ CORRECCIÓN: Usar función de rango de fechas mejorada
    if ((filtros.desde || filtros.hasta) && !fechaEstaEnRango(factura.fecha, filtros.desde, filtros.hasta)) {
      return false;
    }
    
    if (filtros.comanda && factura.comanda != filtros.comanda) return false;
    if (filtros.factura && factura.factura != filtros.factura) return false;
    if (filtros.empleado) {
      if (!factura.empleado_principal.includes(filtros.empleado)) return false;
    }
    if (filtros.cliente && !factura.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
    if (filtros.pago && factura.tipo_pago !== filtros.pago) return false;
    
    return true;
  });

  console.log(`✅ Filtros aplicados: ${facturasResultado.length} de ${todasLasFacturas.length} facturas`);
  
  facturasFiltradas = facturasResultado;
  paginacion.paginaActual = 1;
  renderizarTablaFacturas(facturasResultado);
}

// ✅ FUNCIÓN DE BÚSQUEDA CORREGIDA CON FECHAS
function buscarEnFacturas(texto) {
  if (!texto.trim()) {
    if (tienesFiltrosActivos()) {
      filtrarFacturasLocalmente();
    } else {
      facturasFiltradas = [...todasLasFacturas];
      paginacion.paginaActual = 1;
      renderizarTablaFacturas(facturasFiltradas);
    }
  } else {
    const textoBusqueda = texto.toLowerCase();
    
    const baseParaBuscar = tienesFiltrosActivos() ? 
      todasLasFacturas.filter(factura => {
        // ✅ CORRECCIÓN: Usar función de rango de fechas mejorada
        if ((filtros.desde || filtros.hasta) && !fechaEstaEnRango(factura.fecha, filtros.desde, filtros.hasta)) {
          return false;
        }
        if (filtros.comanda && factura.comanda != filtros.comanda) return false;
        if (filtros.factura && factura.factura != filtros.factura) return false;
        if (filtros.empleado && !factura.empleado_principal.includes(filtros.empleado)) return false;
        if (filtros.pago && factura.tipo_pago !== filtros.pago) return false;
        return true;
      }) : todasLasFacturas;
    
    facturasFiltradas = baseParaBuscar.filter(factura => 
      factura.cliente.toLowerCase().includes(textoBusqueda) ||
      factura.empleado_principal.toLowerCase().includes(textoBusqueda) ||
      factura.factura.toString().includes(textoBusqueda) ||
      factura.comanda.toString().includes(textoBusqueda) ||
      factura.fecha.includes(textoBusqueda) ||
      factura.tipo_pago.toLowerCase().includes(textoBusqueda)
    );
  }
  
  paginacion.paginaActual = 1;
  renderizarTablaFacturas(facturasFiltradas);
  
  console.log(`🔍 Búsqueda aplicada: "${texto}" - ${facturasFiltradas.length} resultados`);
}

// ===================================================
// FUNCIONES DE RENDERIZADO Y PAGINACIÓN CORREGIDAS
// ===================================================

function renderizarTablaFacturas(facturas) {
  if (facturas) {
    facturasFiltradas = facturas;
  }
  
  console.log('Renderizando ' + facturasFiltradas.length + ' facturas');
  
  const tbody = document.querySelector('#tablaHistorial tbody');
  tbody.innerHTML = '';

  if (facturasFiltradas.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="8" style="text-align: center; padding: 40px;">No hay facturas para mostrar</td>';
    tbody.appendChild(row);
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('contadorFacturas').textContent = '0 registros';
    return;
  }

  // Calcular paginación
  paginacion.totalPaginas = Math.ceil(facturasFiltradas.length / paginacion.tamañoPagina);
  
  if (paginacion.paginaActual > paginacion.totalPaginas) {
    paginacion.paginaActual = paginacion.totalPaginas;
  }
  if (paginacion.paginaActual < 1) {
    paginacion.paginaActual = 1;
  }

  const inicio = (paginacion.paginaActual - 1) * paginacion.tamañoPagina;
  const fin = inicio + paginacion.tamañoPagina;
  const datosPagina = facturasFiltradas.slice(inicio, fin);

  console.log('Página ' + paginacion.paginaActual + ' de ' + paginacion.totalPaginas);
  console.log('Mostrando registros ' + (inicio + 1) + ' a ' + Math.min(fin, facturasFiltradas.length) + ' de ' + facturasFiltradas.length);

  // Renderizar filas
  datosPagina.forEach(function(f) {
    const fechaParts = f.fecha.split('/');
    const dia = fechaParts[0];
    const mes = fechaParts[1]; 
    const anio = fechaParts[2];
    
    const pdfNombre = anio + '_' + String(f.factura).padStart(4,'0') + '.pdf';
    const pdfRuta = 'http://localhost:3001/factura/Fac/' + mes + '/' + pdfNombre;
    
    // Construir información del tipo de pago
    let tipoPagoTexto = f.tipo_pago;
    if (f.es_pago_mixto) {
      tipoPagoTexto = `
        <div style="font-size: 0.8em;">
          <div style="color: #28a745; font-weight: bold;">🔄 Pago Mixto</div>
          <div style="color: #666;">💵 Efectivo: $${(f.monto_efectivo || 0).toFixed(2)}</div>
          <div style="color: #666;">💳 Tarjeta: $${(f.monto_tarjeta || 0).toFixed(2)}</div>
        </div>
      `;
    }

    const row = document.createElement('tr');
    row.innerHTML = 
      '<td>' + f.fecha + '</td>' +
      '<td>' + f.factura + '</td>' +
      '<td>' + f.comanda + '</td>' +
      '<td>' + f.cliente + '</td>' +
      '<td>' + tipoPagoTexto + '</td>' +
      '<td>$' + parseFloat(f.total).toFixed(2) + '</td>' +
      '<td><button class="btn-pdf" onclick="verFactura(' + f.id + ')"><i class="fas fa-eye"></i> Ver Factura</button></td>' +
      '<td><button class="btn-action btn-delete" onclick="eliminarFactura(' + f.id + ')">🗑</button></td>';
    
    tbody.appendChild(row);
  });

  // Actualizar contador y paginación
  document.getElementById('contadorFacturas').textContent = facturasFiltradas.length + ' registros';
  
  var paginationElement = document.getElementById('pagination');
  if (paginationElement) {
    paginationElement.style.display = facturasFiltradas.length > 0 ? 'flex' : 'none';
  }
  
  actualizarPaginacion();
  
  console.log('Tabla renderizada con ' + datosPagina.length + ' facturas visibles');
}

function actualizarPaginacion() {
  const totalRegistros = facturasFiltradas.length;
  paginacion.totalPaginas = Math.ceil(totalRegistros / paginacion.tamañoPagina);
  
  if (paginacion.totalPaginas === 0) {
    paginacion.totalPaginas = 1;
    paginacion.paginaActual = 1;
  }
  
  const inicio = (paginacion.paginaActual - 1) * paginacion.tamañoPagina + 1;
  const fin = Math.min(paginacion.paginaActual * paginacion.tamañoPagina, totalRegistros);
  
  document.getElementById('paginationInfo').textContent = 
    totalRegistros === 0 ? 'No hay registros' : `Mostrando ${inicio}-${fin} de ${totalRegistros} registros`;
  
  document.getElementById('firstBtn').disabled = paginacion.paginaActual === 1 || totalRegistros === 0;
  document.getElementById('prevBtn').disabled = paginacion.paginaActual === 1 || totalRegistros === 0;
  document.getElementById('nextBtn').disabled = paginacion.paginaActual === paginacion.totalPaginas || totalRegistros === 0;
  document.getElementById('lastBtn').disabled = paginacion.paginaActual === paginacion.totalPaginas || totalRegistros === 0;
  
  actualizarNumerosPagina();
}

function actualizarNumerosPagina() {
  const numbersContainer = document.getElementById('pageNumbers');
  numbersContainer.innerHTML = '';
  
  const totalPaginas = paginacion.totalPaginas;
  const paginaActual = paginacion.paginaActual;
  
  if (facturasFiltradas.length === 0) {
    return;
  }
  
  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, paginaActual + 2);
  
  if (fin - inicio < 4) {
    if (inicio === 1) {
      fin = Math.min(totalPaginas, 5);
    } else {
      inicio = Math.max(1, totalPaginas - 4);
    }
  }
  
  for (let i = inicio; i <= fin; i++) {
    const pageBtn = document.createElement('span');
    pageBtn.className = `page-number ${i === paginaActual ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => irAPagina(i);
    numbersContainer.appendChild(pageBtn);
  }
}

function cambiarPagina(direccion) {
  switch (direccion) {
    case 'first':
      paginacion.paginaActual = 1;
      break;
    case 'prev':
      if (paginacion.paginaActual > 1) paginacion.paginaActual--;
      break;
    case 'next':
      if (paginacion.paginaActual < paginacion.totalPaginas) paginacion.paginaActual++;
      break;
    case 'last':
      paginacion.paginaActual = paginacion.totalPaginas;
      break;
  }
  
  renderizarTablaFacturas();
}

function irAPagina(pagina) {
  if (pagina >= 1 && pagina <= paginacion.totalPaginas) {
    paginacion.paginaActual = pagina;
    renderizarTablaFacturas();
  }
}

function cambiarTamañoPagina() {
  paginacion.tamañoPagina = parseInt(document.getElementById('pageSize').value);
  paginacion.paginaActual = 1;
  renderizarTablaFacturas();
}

// ✅ APLICAR FILTROS CON DEBUG DE FECHAS
function aplicarFiltros() {
  filtros.desde = document.getElementById('filtroDesde').value;
  filtros.hasta = document.getElementById('filtroHasta').value;
  filtros.comanda = document.getElementById('filtroComanda').value;
  filtros.factura = document.getElementById('filtroFactura').value;
  filtros.empleado = document.getElementById('filtroEmpleado').value;
  filtros.cliente = document.getElementById('filtroCliente').value;
  filtros.pago = document.getElementById('filtroPago').value;
  
  console.log('🔍 Aplicando filtros:', filtros);
  
  if (filtros.desde || filtros.hasta) {
    debugFiltrosFecha();
  }
  
  filtrarFacturasLocalmente();
}

function limpiarFiltros() {
  console.log('Limpiando todos los filtros...');
  
  // Limpiar objeto de filtros
  Object.keys(filtros).forEach(function(k) {
    filtros[k] = '';
  });
  
  // Limpiar elementos del DOM
  var elementos = document.querySelectorAll('#filtrosFactura input, #filtrosFactura select');
  elementos.forEach(function(el) {
    el.value = '';
  });
  
  var searchInput = document.getElementById('searchFacturas');
  if (searchInput) {
    searchInput.value = '';
  }
  
  console.log('Filtros limpiados');
  
  // Reiniciar paginación
  paginacion.paginaActual = 1;
  
  // Recargar todas las facturas
  facturasFiltradas = todasLasFacturas.slice();
  renderizarTablaFacturas(facturasFiltradas);
  
  console.log('Mostrando ' + facturasFiltradas.length + ' facturas sin filtros');
}

async function cargarHistorialFacturas() {
  try {
    console.log('Cargando historial de facturas...');
    
    let url = '/facturas';
    const parametros = [];
    
    if (tienesFiltrosActivos()) {
      console.log('Aplicando filtros activos:', filtros);
      
      if (filtros.desde) parametros.push('desde=' + encodeURIComponent(filtros.desde));
      if (filtros.hasta) parametros.push('hasta=' + encodeURIComponent(filtros.hasta));
      if (filtros.comanda) parametros.push('comanda=' + encodeURIComponent(filtros.comanda));
      if (filtros.factura) parametros.push('factura=' + encodeURIComponent(filtros.factura));
      if (filtros.empleado) parametros.push('empleado=' + encodeURIComponent(filtros.empleado));
      if (filtros.cliente) parametros.push('cliente=' + encodeURIComponent(filtros.cliente));
      if (filtros.pago) parametros.push('pago=' + encodeURIComponent(filtros.pago));
      
      if (parametros.length > 0) {
        url += '?' + parametros.join('&');
      }
    }
    
    console.log('URL de consulta:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error('Error HTTP: ' + res.status + ' ' + res.statusText);
    }
    
    const facturas = await res.json();
    
    console.log('Facturas recibidas del servidor: ' + facturas.length);
    
    // Verificar facturas de junio y julio
    const facturasJunio = facturas.filter(f => f.fecha && f.fecha.includes('/06/2025'));
    const facturasJulio = facturas.filter(f => f.fecha && f.fecha.includes('/07/2025'));
    
    console.log('Facturas de junio 2025: ' + facturasJunio.length);
    console.log('Facturas de julio 2025: ' + facturasJulio.length);
    
    if (facturas.length > 0) {
      console.log('Primeras 5 facturas (verificar orden):');
      facturas.slice(0, 5).forEach((f, index) => {
        console.log('  ' + (index + 1) + '. Fecha: ' + f.fecha + ', Factura: #' + f.factura + ', Cliente: ' + f.cliente);
      });
    }
    
    todasLasFacturas = facturas;
    
    if (tienesFiltrosActivos()) {
      filtrarFacturasLocalmente();
    } else {
      facturasFiltradas = facturas.slice();
      paginacion.paginaActual = 1;
      renderizarTablaFacturas(facturasFiltradas);
    }
    
    console.log('Historial de facturas cargado y renderizado');
    
  } catch (error) {
    console.error('Error al cargar facturas:', error);
    mostrarError('Error al cargar las facturas: ' + error.message);
  }
}

function mostrarError(mensaje) {
  const tbody = document.querySelector('#tablaHistorial tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 40px; color: #ef476f;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>
        ${mensaje}
      </td>
    </tr>
  `;
  document.getElementById('pagination').style.display = 'none';
  document.getElementById('contadorFacturas').textContent = '0 registros';
}

// ✅ EXPORT EXCEL CORREGIDO
function exportarExcel() {
  if (facturasFiltradas.length === 0) {
    alert('⚠️ No hay datos para exportar');
    return;
  }
  
  try {
    console.log(`📊 Exportando ${facturasFiltradas.length} facturas a Excel...`);
    
    const datosExcel = facturasFiltradas.map(f => ({
      'Fecha': f.fecha,
      'Factura': f.factura,
      'Comanda': f.comanda,
      'Cliente': f.cliente,
      'Empleado': f.empleado_principal,
      'Tipo Pago': f.tipo_pago,
      'Precio Venta': parseFloat(f.precio_venta || 0).toFixed(2),
      'Descuento': f.descuento || '0',
      'Total': parseFloat(f.total).toFixed(2)
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, 
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    
    const fechaActual = new Date().toISOString().split('T')[0];
    let nombreArchivo = `historial_facturas_${fechaActual}`;
    
    if (tienesFiltrosActivos()) {
      nombreArchivo += '_filtrado';
      if (filtros.desde || filtros.hasta) {
        const desdeFiltro = filtros.desde ? filtros.desde.replace(/-/g, '') : 'inicio';
        const hastaFiltro = filtros.hasta ? filtros.hasta.replace(/-/g, '') : 'fin';
        nombreArchivo += `_${desdeFiltro}_a_${hastaFiltro}`;
      }
    }
    nombreArchivo += '.xlsx';
    
    XLSX.writeFile(wb, nombreArchivo);
    
    console.log(`✅ Archivo Excel exportado: ${nombreArchivo}`);
    alert(`✅ Excel exportado exitosamente:\n📄 Archivo: ${nombreArchivo}\n📊 Registros: ${facturasFiltradas.length} facturas`);
    
  } catch (error) {
    console.error('❌ Error al exportar Excel:', error);
    alert('❌ Error al exportar el archivo. Por favor, intenta nuevamente.');
  }
}

// ===================================================
// FUNCIÓN PARA VERIFICAR Y APLICAR CORTE GRATIS
// ===================================================

/**
 * Verifica y aplica cortes gratis según la lógica de tarjetas de fidelidad
 * - Cada corte genera 1 sello
 * - Al llegar a 10 sellos, el corte más barato de esa factura es gratis
 * - Se pueden aplicar múltiples cortes gratis en una misma factura
 * @param {Array} detalleCortes - Array de cortes en la factura
 * @param {Object} data - Datos de la factura
 */
async function verificarYAplicarCorteGratis(detalleCortes, data) {
  try {
    // Solo procesar si hay cortes y cliente seleccionado
    if (!detalleCortes || detalleCortes.length === 0) {
      return;
    }
    
    const clienteId = obtenerClienteIdActivo();
    if (!clienteId || clienteId === '') {
      console.log('Sin cliente seleccionado, no se puede aplicar corte gratis');
      return;
    }
    
    console.log('Verificando corte gratis para cliente:', clienteId);
    
    // Obtener información de la tarjeta del cliente
    const response = await fetch(`/api/tarjetas-fidelidad/cliente/${clienteId}`);
    if (!response.ok) {
      console.log('Error al consultar tarjeta del cliente');
      return;
    }
    
    const tarjeta = await response.json();
    if (!tarjeta) {
      console.log('Cliente sin tarjeta de fidelidad');
      return;
    }
    
    console.log(`🎯 ANÁLISIS DE CORTES GRATIS - Cliente: ${clienteId}`);
    console.log(`📊 Sellos actuales: ${tarjeta.sellos_actuales}`);
    console.log(`📝 Cortes en factura: ${detalleCortes.length}`);
    
    // Simular los sellos después de agregar los cortes de esta factura
    let sellosSimulados = tarjeta.sellos_actuales;
    let cortesGratis = [];
    
    console.log(`🎯 Estado inicial para verificación: Cliente tiene ${sellosSimulados} sellos`);
    
    // Crear lista de cortes individuales (expandir cantidades) 
    const cortesIndividuales = [];
    detalleCortes.forEach((corte, corteIndex) => {
      const cantidad = parseInt(corte.cantidad || 1);
      for (let i = 0; i < cantidad; i++) {
        cortesIndividuales.push({
          ...corte,
          indiceCorteOriginal: corteIndex,
          indiceIndividual: i,
          identificador: `${corte.tipo_corte || corte.nombre} (${i + 1}/${cantidad})`
        });
      }
    });
    
    // Ordenar cortes individuales por precio unitario (más baratos primero para descuentos)
    const cortesOrdenados = cortesIndividuales.sort((a, b) => 
      parseFloat(a.precio_unitario || 0) - parseFloat(b.precio_unitario || 0)
    );
    
    console.log('🔄 Simulando agregado de sellos:');
    console.log(`📝 Total cortes individuales a procesar: ${cortesOrdenados.length}`);
    
    // Simular agregado de sellos uno por uno
    for (let i = 0; i < cortesOrdenados.length; i++) {
      const corteActual = cortesOrdenados[i];
      sellosSimulados++;
      
      console.log(`   Corte individual ${i + 1}/${cortesOrdenados.length}: ${corteActual.identificador} -> Sellos: ${sellosSimulados}`);
      
      // Si llegamos exactamente a 10 sellos, este corte individual es gratis
      if (sellosSimulados === 10) {
        // Marcar el corte original como gratis (solo si no está ya marcado)
        const indiceOriginal = corteActual.indiceCorteOriginal;
        if (!cortesGratis.includes(indiceOriginal)) {
          cortesGratis.push(indiceOriginal);
          console.log(`   🎁 ¡CORTE GRATIS! ${corteActual.identificador} - Corte original #${indiceOriginal} (sello #10)`);
        }
        // NO reiniciar contador - tarjeta queda completada sin nueva tarjeta automática
        console.log(`   ✅ Tarjeta completada - Cliente debe solicitar nueva tarjeta manualmente`);
        // Los siguientes cortes se cobran normalmente
        break; // Solo permitir UN corte gratis por sesión
      }
    }
    
    console.log(`✅ Resultado: ${cortesGratis.length} cortes gratis detectados`);
    
    if (cortesGratis.length === 0) {
      console.log('No hay cortes gratis en esta factura');
      return;
    }
    
    // Aplicar descuentos a los cortes gratis
    let totalDescuentoAplicado = 0;
    const cortesAfectados = [];
    
    cortesGratis.forEach(indice => {
      const precioOriginal = detalleCortes[indice].precio;
      const precioUnitarioOriginal = detalleCortes[indice].precio_unitario;
      
      // Actualizar datos del array
      detalleCortes[indice].precio = 0;
      detalleCortes[indice].precio_unitario = 0;
      detalleCortes[indice].descuento_gratis = true;
      detalleCortes[indice].precio_original = precioOriginal;
      detalleCortes[indice].precio_unitario_original = precioUnitarioOriginal;
      
      // IMPORTANTE: También actualizar los campos visuales del DOM
      const cortesContainers = document.querySelectorAll('#cortesContainer .form-grid');
      if (cortesContainers[indice]) {
        const precioCorteInput = cortesContainers[indice].querySelector('.precioCorte');
        const precioUnitarioInput = cortesContainers[indice].querySelector('.precioUnitario');
        
        if (precioCorteInput) {
          precioCorteInput.value = '0.00';
          precioCorteInput.style.backgroundColor = '#d4edda'; // Verde claro para indicar gratis
          precioCorteInput.style.color = '#155724';
          precioCorteInput.style.fontWeight = 'bold';
          precioCorteInput.setAttribute('title', '¡Este corte es GRATIS por tarjeta de fidelidad!');
          console.log(`✅ Campo visual precio total actualizado a $0.00`);
        }
        if (precioUnitarioInput) {
          precioUnitarioInput.value = '0.00';
          precioUnitarioInput.style.backgroundColor = '#d4edda'; // Verde claro para indicar gratis
          precioUnitarioInput.style.color = '#155724';
          precioUnitarioInput.style.fontWeight = 'bold';
          precioUnitarioInput.setAttribute('title', '¡Este corte es GRATIS por tarjeta de fidelidad!');
          console.log(`✅ Campo visual precio unitario actualizado a $0.00`);
        }
        
        // Agregar indicador visual de corte gratis
        let indicadorGratis = cortesContainers[indice].querySelector('.indicador-gratis');
        if (!indicadorGratis) {
          indicadorGratis = document.createElement('div');
          indicadorGratis.className = 'indicador-gratis';
          indicadorGratis.innerHTML = '🎁 GRATIS';
          indicadorGratis.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7em;
            font-weight: bold;
            z-index: 100;
          `;
          cortesContainers[indice].style.position = 'relative';
          cortesContainers[indice].appendChild(indicadorGratis);
        }
      }
      
      totalDescuentoAplicado += parseFloat(precioOriginal);
      cortesAfectados.push({
        nombre: detalleCortes[indice].tipo_corte,
        precio: precioOriginal
      });
      
      console.log(`Corte gratis aplicado: ${detalleCortes[indice].tipo_corte} - $${precioOriginal} → $0`);
    });
    
    // Recalcular totales
    const nuevoPrecioVenta = detalleCortes.reduce((sum, corte) => sum + parseFloat(corte.precio || 0), 0) +
                            [...document.querySelectorAll('.precioProducto')].reduce((sum, el) => sum + parseFloat(el.value || 0), 0);
    const descuentoPorcentaje = parseFloat(data.descuento || 0);
    const descuentoMonto = nuevoPrecioVenta * (descuentoPorcentaje / 100);
    const nuevoTotal = nuevoPrecioVenta - descuentoMonto;
    
    // Actualizar los campos en el formulario
    document.getElementById('precioVenta').value = nuevoPrecioVenta.toFixed(2);
    document.getElementById('total').value = nuevoTotal.toFixed(2);
    
    // Actualizar data object
    data.precio_venta = nuevoPrecioVenta;
    data.total = nuevoTotal;
    
    // Forzar recálculo de totales para asegurar sincronización
    setTimeout(() => {
      if (typeof calcularTotal === 'function') {
        calcularTotal();
        console.log('🔄 Totales recalculados después de aplicar cortes gratis');
      }
    }, 100);
    
    // Mostrar notificación al usuario
    if (typeof Swal !== 'undefined') {
      const listaCortes = cortesAfectados
        .map(corte => `<li><strong>${corte.nombre}</strong> - $${corte.precio}</li>`)
        .join('');
      
      Swal.fire({
        title: '🎉 ¡CORTES GRATIS APLICADOS!',
        html: `
          <div style="text-align: center;">
            <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px; border-radius: 10px; margin: 15px 0;">
              <i class="fas fa-gift" style="font-size: 2em; margin-bottom: 10px;"></i><br>
              <strong>${cortesGratis.length} corte${cortesGratis.length > 1 ? 's' : ''} gratis</strong><br>
              <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                ${listaCortes}
              </ul>
              <span style="font-size: 1.1em; font-weight: bold;">Total ahorrado: $${totalDescuentoAplicado.toFixed(2)}</span>
            </div>
            <div style="font-size: 0.9em; color: #666;">
              ${cortesGratis.length === 1 ? 'El cliente completó su tarjeta de fidelidad' : 'El cliente completó múltiples tarjetas de fidelidad'}
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continuar',
        timer: 8000,
        timerProgressBar: true
      });
    }
    
  } catch (error) {
    console.error('Error al verificar corte gratis:', error);
    // No interrumpir el flujo de facturación por este error
  }
}

// ===================================================
// FUNCIONES PARA PAGO MIXTO
// ===================================================

/**
 * Maneja el cambio del tipo de pago
 */
function manejarCambioTipoPago() {
  const tipoPago = document.getElementById('tipoPago').value;
  const pagoMixtoSection = document.getElementById('pagoMixtoSection');
  
  if (tipoPago === 'Mixto') {
    pagoMixtoSection.style.display = 'block';
    // Limpiar campos de pago mixto
    document.getElementById('montoEfectivo').value = '';
    document.getElementById('montoTarjeta').value = '';
    calcularPagoMixto();
  } else {
    pagoMixtoSection.style.display = 'none';
    // Limpiar campos cuando no es pago mixto
    document.getElementById('montoEfectivo').value = '';
    document.getElementById('montoTarjeta').value = '';
  }
}

/**
 * Calcula y valida los montos del pago mixto
 */
function calcularPagoMixto() {
  const montoEfectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
  const montoTarjeta = parseFloat(document.getElementById('montoTarjeta').value) || 0;
  const totalFactura = parseFloat(document.getElementById('total').value) || 0;
  
  const totalIngresado = montoEfectivo + montoTarjeta;
  const diferencia = totalFactura - totalIngresado;
  
  // Actualizar el label del total ingresado
  document.getElementById('totalMixtoLabel').textContent = `Total Ingresado: $${totalIngresado.toFixed(2)}`;
  
  // Mostrar la diferencia
  const diferenciaPago = document.getElementById('diferenciaPago');
  if (Math.abs(diferencia) < 0.01) {
    // Pago exacto
    diferenciaPago.innerHTML = '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Pago completo</span>';
  } else if (diferencia > 0) {
    // Falta dinero
    diferenciaPago.innerHTML = `<span style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Faltan: $${diferencia.toFixed(2)}</span>`;
  } else {
    // Sobra dinero
    diferenciaPago.innerHTML = `<span style="color: #ffc107;"><i class="fas fa-info-circle"></i> Cambio: $${Math.abs(diferencia).toFixed(2)}</span>`;
  }
}

/**
 * Valida si el pago mixto está completo y correcto
 */
function validarPagoMixto() {
  const tipoPago = document.getElementById('tipoPago').value;
  if (tipoPago !== 'Mixto') {
    return true; // No es pago mixto, no hay que validar
  }
  
  const montoEfectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
  const montoTarjeta = parseFloat(document.getElementById('montoTarjeta').value) || 0;
  const totalFactura = parseFloat(document.getElementById('total').value) || 0;
  
  // Validar que ambos montos sean positivos
  if (montoEfectivo < 0 || montoTarjeta < 0) {
    alert('⚠️ Los montos no pueden ser negativos');
    return false;
  }
  
  // Validar que al menos uno de los montos sea mayor a 0
  if (montoEfectivo === 0 && montoTarjeta === 0) {
    alert('⚠️ Debe ingresar al menos un monto para el pago mixto');
    return false;
  }
  
  const totalIngresado = montoEfectivo + montoTarjeta;
  const diferencia = Math.abs(totalFactura - totalIngresado);
  
  // Permitir una pequeña diferencia por redondeo (1 centavo)
  if (diferencia > 0.01) {
    const falta = totalFactura - totalIngresado;
    if (falta > 0) {
      alert(`⚠️ El pago mixto no está completo. Faltan: $${falta.toFixed(2)}`);
    } else {
      const confirmacion = confirm(`El pago excede el total por $${Math.abs(falta).toFixed(2)}. ¿Continuar?`);
      if (!confirmacion) return false;
    }
  }
  
  return true;
}

/**
 * Obtiene los datos del pago mixto para guardar en la base de datos
 */
function obtenerDatosPagoMixto() {
  const tipoPago = document.getElementById('tipoPago').value;
  
  if (tipoPago === 'Mixto') {
    const montoEfectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
    const montoTarjeta = parseFloat(document.getElementById('montoTarjeta').value) || 0;
    
    return {
      esPagoMixto: true,
      montoEfectivo: montoEfectivo,
      montoTarjeta: montoTarjeta,
      tipoPagoTexto: `Mixto (Efectivo: $${montoEfectivo.toFixed(2)}, Tarjeta: $${montoTarjeta.toFixed(2)})`
    };
  } else {
    return {
      esPagoMixto: false,
      montoEfectivo: tipoPago === 'Efectivo' ? parseFloat(document.getElementById('total').value) || 0 : 0,
      montoTarjeta: tipoPago === 'Tarjeta' ? parseFloat(document.getElementById('total').value) || 0 : 0,
      tipoPagoTexto: tipoPago
    };
  }
}

// ========================================
// NUEVA FUNCIÓN PARA GENERAR Y DESCARGAR PDF DE FACTURA
// ========================================
async function generarYDescargarFacturaPDF(datosFactura) {
  try {
    console.log('🧾 Iniciando generación de PDF de factura...');
    
    // Preparar datos para el PDF incluyendo detalles de servicios y productos
    const datosPDF = {
      fecha: datosFactura.fecha,
      comanda: datosFactura.comanda,
      factura: datosFactura.factura,
      cliente: datosFactura.cliente,
      empleado: datosFactura.empleado,
      tipo_pago: datosFactura.tipo_pago,
      descuento: datosFactura.descuento,
      total: datosFactura.total,
      detalles: []
    };
    
    // Agregar detalles de cortes
    if (datosFactura.detalleCortes && datosFactura.detalleCortes.length > 0) {
      datosFactura.detalleCortes.forEach(corte => {
        if (corte && corte.cantidad > 0) {
          datosPDF.detalles.push({
            nombre: corte.nombre || 'Servicio',
            cantidad: corte.cantidad,
            precio: corte.precio || 0,
            total: corte.total || 0
          });
        }
      });
    }
    
    // Agregar detalles de productos
    if (datosFactura.detalleProductos && datosFactura.detalleProductos.length > 0) {
      datosFactura.detalleProductos.forEach(producto => {
        if (producto && producto.cantidad > 0) {
          datosPDF.detalles.push({
            nombre: producto.nombre || 'Producto',
            cantidad: producto.cantidad,
            precio: producto.precio || 0,
            total: producto.total || 0
          });
        }
      });
    }
    
    console.log('📋 Datos preparados para PDF:', datosPDF);
    
    // Enviar solicitud al servidor para generar PDF
    const response = await fetch('http://localhost:3001/api/generar-factura-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosPDF)
    });
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
    }
    
    // Obtener el PDF como blob
    const pdfBlob = await response.blob();
    
    // Crear URL temporal para el blob
    const url = window.URL.createObjectURL(pdfBlob);
    
    // Crear elemento <a> temporal para descargar
    const link = document.createElement('a');
    link.href = url;
    
    // Generar nombre del archivo
    const fechaLimpia = datosFactura.fecha ? datosFactura.fecha.replace(/\//g, '-') : 'sin-fecha';
    link.download = `Factura_${datosFactura.factura || 'SIN_NUM'}_${fechaLimpia}.pdf`;
    
    // Agregar al DOM temporalmente, hacer clic y remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL temporal
    window.URL.revokeObjectURL(url);
    
    console.log('✅ PDF de factura descargado exitosamente');
    
  } catch (error) {
    console.error('❌ Error al generar/descargar PDF de factura:', error);
    throw error;
  }
}

// ========================================
// FUNCIÓN PARA DESCARGAR PDF DE FACTURA EXISTENTE (DESDE HISTORIAL)
// ========================================
async function descargarPDFFactura(facturaId, numeroFactura, fecha) {
  try {
    console.log('📥 Descargando PDF de factura existente:', numeroFactura);
    
    // Obtener datos completos de la factura desde el servidor
    const responseFactura = await fetch(`/api/factura/${facturaId}`);
    if (!responseFactura.ok) {
      throw new Error('No se pudo obtener los datos de la factura');
    }
    
    const datosFactura = await responseFactura.json();
    
    // Usar la función existente para generar y descargar
    await generarYDescargarFacturaPDF(datosFactura);
    
  } catch (error) {
    console.error('❌ Error al descargar PDF de factura existente:', error);
    alert('Error al descargar el PDF de la factura');
  }
}

// ========================================
// NUEVA FUNCIÓN PARA VER FACTURA COMO HTML
// ========================================
function verFactura(facturaId) {
  console.log('👁️ Abriendo vista de factura:', facturaId);
  
  // Abrir la nueva ruta en una nueva pestaña
  const url = `/factura/vista/${facturaId}`;
  window.open(url, '_blank');
}

console.log('✅ factura.js cargado correctamente con vista HTML de facturas');