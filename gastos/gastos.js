// ========================================
// MÓDULO HÍBRIDO: GASTOS E INVENTARIOS
// Sistema completo para manejo de gastos de servicios e inventarios
// ========================================

// ========================================
// VARIABLES GLOBALES PARA PAGINACIÓN
// ========================================
let gastosData = []; // Datos completos de gastos
let salidasData = []; // Datos completos de salidas
let gastosPaginaActual = 1;
let salidasPaginaActual = 1;
let gastosPorPagina = 25;
let salidasPorPagina = 25;

document.addEventListener('DOMContentLoaded', function () {
  // Establecer fecha actual en zona horaria de Centroamérica
  const hoy = new Date();
  document.getElementById('fecha').value = formatearFechaParaInput(hoy);

  // Event listeners principales
  document.getElementById('toggleFormBtn').addEventListener('click', () => {
    document.getElementById('formSection').classList.toggle('hidden');
  });

  document.getElementById('toggleSalidasBtn').addEventListener('click', () => {
    const seccionSalidas = document.getElementById('seccion-salidas');
    const esVisible = seccionSalidas.style.display !== 'none';
    seccionSalidas.style.display = esVisible ? 'none' : 'block';
    
    if (!esVisible) {
      cargarProductosInventario();
      cargarEmpleados();
    }
  });

  // Event listeners para paginación de gastos
  document.getElementById('gastosPrevBtn').addEventListener('click', () => {
    if (gastosPaginaActual > 1) {
      gastosPaginaActual--;
      mostrarGastosPaginados();
    }
  });

  document.getElementById('gastosNextBtn').addEventListener('click', () => {
    const totalPaginas = Math.ceil(gastosData.length / gastosPorPagina);
    if (gastosPaginaActual < totalPaginas) {
      gastosPaginaActual++;
      mostrarGastosPaginados();
    }
  });

  document.getElementById('gastosPorPagina').addEventListener('change', (e) => {
    gastosPorPagina = parseInt(e.target.value);
    gastosPaginaActual = 1;
    mostrarGastosPaginados();
  });

  // Event listeners para paginación de salidas
  document.getElementById('salidasPrevBtn').addEventListener('click', () => {
    if (salidasPaginaActual > 1) {
      salidasPaginaActual--;
      mostrarSalidasPaginadas();
    }
  });

  document.getElementById('salidasNextBtn').addEventListener('click', () => {
    const totalPaginas = Math.ceil(salidasData.length / salidasPorPagina);
    if (salidasPaginaActual < totalPaginas) {
      salidasPaginaActual++;
      mostrarSalidasPaginadas();
    }
  });

  document.getElementById('salidasPorPagina').addEventListener('change', (e) => {
    salidasPorPagina = parseInt(e.target.value);
    salidasPaginaActual = 1;
    mostrarSalidasPaginadas();
  });

  // Checkbox inventario toggle
  document.getElementById('es_inventario').addEventListener('change', function() {
    toggleCamposInventario();
  });

  // Auto-cálculo para inventarios
  document.getElementById('cantidad').addEventListener('input', calcularTotalInventario);
  document.getElementById('precio_unitario').addEventListener('input', calcularTotalInventario);

  // Auto-cálculo para salidas
  document.getElementById('producto_salida').addEventListener('change', actualizarInfoProducto);
  document.getElementById('cantidad_salida').addEventListener('input', calcularTotalSalida);

  // Formulario principal
  document.getElementById("gastoForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    await guardarGasto(e);
  });

  // Formulario de salidas
  document.getElementById("salidaForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    await registrarSalida(e);
  });

  // Event listeners para búsquedas y filtros
  document.getElementById("searchBtn").addEventListener("click", aplicarFiltros);
  document.getElementById("searchSalidasBtn").addEventListener("click", aplicarFiltrosSalidas);

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    document.getElementById("searchCategoria").value = "";
    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";
    cargarGastos();
  });

  document.getElementById("clearSalidasBtn").addEventListener("click", () => {
    document.getElementById("searchEmpleado").value = "";
    document.getElementById("fechaDesdeSalidas").value = "";
    document.getElementById("fechaHastaSalidas").value = "";
    cargarHistorialSalidas();
  });

  document.getElementById("cancelBtn").addEventListener("click", limpiarFormulario);
  document.getElementById("cancelSalidaBtn").addEventListener("click", limpiarFormularioSalida);

  // Descargas Excel
  document.getElementById("downloadExcelBtn").addEventListener("click", () => {
    const table = document.getElementById("gastosTable");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Gastos e Inventarios");
    XLSX.writeFile(wb, "gastos_inventarios.xlsx");
  });

  document.getElementById("downloadSalidasExcelBtn").addEventListener("click", () => {
    const table = document.getElementById("salidasTable");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Salidas de Inventario");
    XLSX.writeFile(wb, "salidas_inventario.xlsx");
  });

  // Cargar datos iniciales
  cargarGastos();
  cargarHistorialSalidas();
});

// ========================================
// FUNCIONES PARA MANEJO DE INVENTARIOS
// ========================================

function toggleCamposInventario() {
  const esInventario = document.getElementById('es_inventario').checked;
  const camposGasto = document.getElementById('campos-gasto');
  const camposInventario = document.getElementById('campos-inventario');

  if (esInventario) {
    camposGasto.style.display = 'none';
    camposInventario.style.display = 'block';
    document.getElementById('monto').required = false;
    document.getElementById('cantidad').required = true;
    document.getElementById('precio_unitario').required = true;
  } else {
    camposGasto.style.display = 'block';
    camposInventario.style.display = 'none';
    document.getElementById('monto').required = true;
    document.getElementById('cantidad').required = false;
    document.getElementById('precio_unitario').required = false;
  }
}

function calcularTotalInventario() {
  const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
  const precio = parseFloat(document.getElementById('precio_unitario').value) || 0;
  const total = cantidad * precio;
  document.getElementById('total_calculado').value = total.toFixed(2);
}

function calcularTotalSalida() {
  const cantidad = parseInt(document.getElementById('cantidad_salida').value) || 0;
  const productoSelect = document.getElementById('producto_salida');
  const selectedOption = productoSelect.options[productoSelect.selectedIndex];
  
  if (selectedOption && selectedOption.dataset.precio) {
    const precioUnitario = parseFloat(selectedOption.dataset.precio);
    const total = cantidad * precioUnitario;
    document.getElementById('valor_calculado_salida').value = total.toFixed(2);
  }
}

async function cargarProductosInventario() {
  try {
    const res = await fetch('/api/inventarios');
    if (!res.ok) throw new Error('Error al cargar inventarios');
    
    const inventarios = await res.json();
    const select = document.getElementById('producto_salida');
    select.innerHTML = '<option value="">Seleccionar producto...</option>';
    
    inventarios.forEach(inv => {
      if (inv.stock_actual > 0) {
        const option = document.createElement('option');
        option.value = inv.id;
        option.textContent = `${inv.descripcion} (Stock: ${inv.stock_actual})`;
        option.dataset.stock = inv.stock_actual;
        option.dataset.precio = inv.precio_unitario;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error al cargar productos:', error);
    mostrarNotificacion('Error al cargar productos de inventario', 'error');
  }
}

async function cargarEmpleados() {
  try {
    const res = await fetch('/api/empleados-lista');
    if (!res.ok) throw new Error('Error al cargar empleados');
    
    const empleados = await res.json();
    const select = document.getElementById('empleado_salida');
    select.innerHTML = '<option value="">Seleccionar empleado...</option>';
    
    empleados.forEach(empleado => {
      const option = document.createElement('option');
      option.value = empleado;
      option.textContent = empleado;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar empleados:', error);
    mostrarNotificacion('Error al cargar empleados', 'error');
  }
}

function actualizarInfoProducto() {
  const select = document.getElementById('producto_salida');
  const selectedOption = select.options[select.selectedIndex];
  const stockInfo = document.getElementById('stock_disponible');
  
  if (selectedOption && selectedOption.value) {
    const stock = selectedOption.dataset.stock;
    stockInfo.textContent = `Stock disponible: ${stock} unidades`;
    document.getElementById('cantidad_salida').max = stock;
    calcularTotalSalida();
  } else {
    stockInfo.textContent = '';
    document.getElementById('cantidad_salida').max = '';
  }
}

// ========================================
// FUNCIONES CRUD PRINCIPALES
// ========================================

async function guardarGasto(e) {
  const submitBtn = document.getElementById('submitBtn');
  
  // Bloquear botón para evitar múltiples clics
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  const textoOriginal = submitBtn.textContent;
  submitBtn.textContent = "Guardando...";
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const accion = data.accion;

    // Convertir fecha a formato centroamericano
    if (data.fecha) {
      data.fecha = convertirFechaInputACentroamericana(data.fecha);
    }

    // Agregar campos específicos de inventario
    data.es_inventario = document.getElementById('es_inventario').checked;
    
    if (data.es_inventario) {
      data.cantidad = parseInt(data.cantidad) || 0;
      data.precio_unitario = parseFloat(data.precio_unitario) || 0;
      data.monto = data.cantidad * data.precio_unitario;
    } else {
      data.cantidad = 0;
      data.precio_unitario = 0;
    }

    const url = accion === 'crear' ? '/api/gastos' : `/api/gastos/${data.gasto_id}`;
    const method = accion === 'crear' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    mostrarNotificacion(result.mensaje, res.ok ? "success" : "error");
    
    if (res.ok) {
      cargarGastos();
      limpiarFormulario();
      if (data.es_inventario) {
        cargarProductosInventario(); // Actualizar lista de productos
      }
    }
  } catch (error) {
    mostrarNotificacion("Error al guardar", "error");
  } finally {
    // Rehabilitar botón
    submitBtn.disabled = false;
    submitBtn.textContent = textoOriginal;
  }
}

async function registrarSalida(e) {
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  // Bloquear botón para evitar múltiples clics
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  const textoOriginal = submitBtn.textContent;
  submitBtn.textContent = "Registrando...";
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/salidas-inventario', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gasto_id: data.producto_salida,
        empleado: data.empleado_salida,
        cantidad_salida: data.cantidad_salida,
        observaciones: data.observaciones_salida
      })
    });

    const result = await res.json();
    mostrarNotificacion(result.mensaje, res.ok ? "success" : "error");
    
    if (res.ok) {
      cargarHistorialSalidas();
      cargarGastos(); // Actualizar tabla principal para mostrar nuevo stock
      cargarProductosInventario(); // Actualizar lista de productos disponibles
      limpiarFormularioSalida();
    }
  } catch (error) {
    mostrarNotificacion("Error al registrar salida", "error");
  } finally {
    // Rehabilitar botón
    submitBtn.disabled = false;
    submitBtn.textContent = textoOriginal;
  }
}

async function cargarGastos() {
  try {
    const res = await fetch("/api/gastos");
    if (!res.ok) throw new Error("Error al cargar gastos");
    
    gastosData = await res.json();
    gastosPaginaActual = 1;
    mostrarGastosPaginados();
  } catch (error) {
    console.error("Error al cargar gastos:", error);
    mostrarNotificacion("Error al cargar gastos", "error");
  }
}

async function cargarHistorialSalidas() {
  try {
    const res = await fetch("/api/salidas-inventario");
    if (!res.ok) throw new Error("Error al cargar historial");
    
    salidasData = await res.json();
    salidasPaginaActual = 1;
    mostrarSalidasPaginadas();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    mostrarNotificacion("Error al cargar historial de salidas", "error");
  }
}

// ========================================
// FUNCIONES DE PAGINACIÓN PARA GASTOS
// ========================================

function mostrarGastosPaginados() {
  const inicio = (gastosPaginaActual - 1) * gastosPorPagina;
  const fin = inicio + gastosPorPagina;
  const gastosPagina = gastosData.slice(inicio, fin);
  
  mostrarGastosEnTabla(gastosPagina);
  actualizarControlesPaginacionGastos();
}

function actualizarControlesPaginacionGastos() {
  const total = gastosData.length;
  const totalPaginas = total > 0 ? Math.ceil(total / gastosPorPagina) : 1;
  const inicio = total > 0 ? (gastosPaginaActual - 1) * gastosPorPagina + 1 : 0;
  const fin = Math.min(gastosPaginaActual * gastosPorPagina, total);
  
  // Actualizar información
  document.getElementById('gastosInfo').textContent = 
    `Mostrando ${inicio}-${fin} de ${total} registros`;
  
  // Actualizar página actual
  document.getElementById('gastosPaginaActual').textContent = 
    `Página ${gastosPaginaActual} de ${totalPaginas}`;
  
  // Actualizar botones
  document.getElementById('gastosPrevBtn').disabled = gastosPaginaActual <= 1;
  document.getElementById('gastosNextBtn').disabled = gastosPaginaActual >= totalPaginas || total === 0;
}

function mostrarGastosEnTabla(gastos) {
  const tbody = document.querySelector("#gastosTable tbody");
  tbody.innerHTML = "";
  
  if (!gastos || gastos.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10" style="text-align:center; color: #ccc;">No se encontraron resultados</td>`;
    tbody.appendChild(row);
    return;
  }

  gastos.forEach(g => {
    const row = document.createElement("tr");
    const esInventario = g.es_inventario == 1;
    const stockStatus = esInventario && g.stock_actual < 5 ? 'style="color: red; font-weight: bold;"' : '';
    
    row.innerHTML = `
      <td>${g.id}</td>
      <td>${formatearFechaCentroamericana(g.fecha)}</td>
      <td>${g.categoria}</td>
      <td>${g.descripcion}</td>
      <td>
        <span class="badge ${esInventario ? 'badge-inventory' : 'badge-expense'}">
          ${esInventario ? 'Inventario' : 'Gasto'}
        </span>
      </td>
      <td>${esInventario ? g.cantidad || 0 : '-'}</td>
      <td>${esInventario ? '$' + parseFloat(g.precio_unitario || 0).toFixed(2) : '-'}</td>
      <td>$${parseFloat(g.monto).toFixed(2)}</td>
      <td ${stockStatus}>${esInventario ? g.stock_actual || 0 : '-'}</td>
      <td>
        <button class="btn-action btn-edit" onclick="editarGasto(${g.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-action btn-delete" onclick="eliminarGasto(${g.id})"><i class="fas fa-trash"></i></button>
        ${esInventario && g.stock_actual > 0 ? `<button class="btn-action btn-out" onclick="mostrarFormularioSalida(${g.id})" title="Registrar Salida"><i class="fas fa-minus-circle"></i></button>` : ''}
      </td>`;
    tbody.appendChild(row);
  });
}

// ========================================
// FUNCIONES DE PAGINACIÓN PARA SALIDAS
// ========================================

function mostrarSalidasPaginadas() {
  const inicio = (salidasPaginaActual - 1) * salidasPorPagina;
  const fin = inicio + salidasPorPagina;
  const salidasPagina = salidasData.slice(inicio, fin);
  
  mostrarSalidasEnTabla(salidasPagina);
  actualizarControlesPaginacionSalidas();
}

function actualizarControlesPaginacionSalidas() {
  const total = salidasData.length;
  const totalPaginas = total > 0 ? Math.ceil(total / salidasPorPagina) : 1;
  const inicio = total > 0 ? (salidasPaginaActual - 1) * salidasPorPagina + 1 : 0;
  const fin = Math.min(salidasPaginaActual * salidasPorPagina, total);
  
  // Actualizar información
  document.getElementById('salidasInfo').textContent = 
    `Mostrando ${inicio}-${fin} de ${total} registros`;
  
  // Actualizar página actual
  document.getElementById('salidasPaginaActual').textContent = 
    `Página ${salidasPaginaActual} de ${totalPaginas}`;
  
  // Actualizar botones
  document.getElementById('salidasPrevBtn').disabled = salidasPaginaActual <= 1;
  document.getElementById('salidasNextBtn').disabled = salidasPaginaActual >= totalPaginas || total === 0;
}

function mostrarSalidasEnTabla(salidas) {
  const tbody = document.querySelector("#salidasTable tbody");
  tbody.innerHTML = "";
  
  if (!salidas || salidas.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8" style="text-align:center; color: #ccc;">No se encontraron salidas</td>`;
    tbody.appendChild(row);
    return;
  }

  salidas.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.id}</td>
      <td>${formatearFechaCentroamericana(s.fecha_salida)}</td>
      <td>${s.producto_nombre}</td>
      <td>${s.empleado}</td>
      <td>${s.cantidad_salida}</td>
      <td>$${parseFloat(s.precio_unitario).toFixed(2)}</td>
      <td>$${parseFloat(s.valor_total).toFixed(2)}</td>
      <td>${s.observaciones || '-'}</td>`;
    tbody.appendChild(row);
  });
}

function mostrarFormularioSalida(gastoId) {
  document.getElementById('seccion-salidas').style.display = 'block';
  document.getElementById('producto_salida').value = gastoId;
  actualizarInfoProducto();
  cargarEmpleados();
  document.getElementById('producto_salida').scrollIntoView({ behavior: 'smooth' });
}

async function editarGasto(id) {
  try {
    const res = await fetch(`/api/gastos/${id}`);
    if (!res.ok) {
      mostrarNotificacion("Error al obtener el gasto", "error");
      return;
    }
    
    const g = await res.json();
    document.getElementById("accion").value = "actualizar";
    document.getElementById("gasto_id").value = g.id;
    document.getElementById("fecha").value = convertirFechaCentroamericanaAInput(g.fecha);
    document.getElementById("categoria").value = g.categoria;
    document.getElementById("descripcion").value = g.descripcion;
    
    // Manejar campos de inventario
    const esInventario = g.es_inventario == 1;
    document.getElementById("es_inventario").checked = esInventario;
    
    if (esInventario) {
      document.getElementById("cantidad").value = g.cantidad;
      document.getElementById("precio_unitario").value = g.precio_unitario;
      toggleCamposInventario();
      calcularTotalInventario();
    } else {
      document.getElementById("monto").value = g.monto;
      toggleCamposInventario();
    }
    
    document.getElementById("submitBtn").textContent = "Actualizar";
    document.getElementById("cancelBtn").style.display = "inline-block";
    document.getElementById("formSection").classList.remove("hidden");
  } catch (error) {
    console.error("Error al editar:", error);
    mostrarNotificacion("Error al editar", "error");
  }
}

async function eliminarGasto(id) {
  if (!confirm("¿Eliminar este elemento?")) return;
  
  try {
    const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" });
    const msg = await res.json();
    mostrarNotificacion(msg.mensaje, res.ok ? "success" : "error");
    if (res.ok) {
      cargarGastos();
      cargarProductosInventario();
    }
  } catch (error) {
    mostrarNotificacion("Error al eliminar", "error");
  }
}

async function aplicarFiltros() {
  const categoria = document.getElementById("searchCategoria").value.trim();
  let desde = document.getElementById("fechaDesde").value;
  let hasta = document.getElementById("fechaHasta").value;

  if (desde) desde = convertirFechaInputACentroamericana(desde);
  if (hasta) hasta = convertirFechaInputACentroamericana(hasta);

  const params = new URLSearchParams();
  if (categoria) params.append("categoria", categoria);
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);

  try {
    const res = await fetch(`/api/gastos/filtro?${params}`);
    if (!res.ok) throw new Error("Error al filtrar");
    
    gastosData = await res.json();
    gastosPaginaActual = 1;
    mostrarGastosPaginados();
  } catch (error) {
    mostrarNotificacion("Error al filtrar", "error");
  }
}

async function aplicarFiltrosSalidas() {
  const empleado = document.getElementById("searchEmpleado").value.trim();
  let desde = document.getElementById("fechaDesdeSalidas").value;
  let hasta = document.getElementById("fechaHastaSalidas").value;

  if (desde) desde = convertirFechaInputACentroamericana(desde);
  if (hasta) hasta = convertirFechaInputACentroamericana(hasta);

  const params = new URLSearchParams();
  if (empleado) params.append("empleado", empleado);
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);

  try {
    const res = await fetch(`/api/salidas-inventario/filtro?${params}`);
    if (!res.ok) throw new Error("Error al filtrar salidas");
    
    salidasData = await res.json();
    salidasPaginaActual = 1;
    mostrarSalidasPaginadas();
  } catch (error) {
    mostrarNotificacion("Error al filtrar salidas", "error");
  }
}

function limpiarFormulario() {
  document.getElementById("gastoForm").reset();
  document.getElementById("accion").value = "crear";
  document.getElementById("gasto_id").value = "";
  document.getElementById("submitBtn").textContent = "Guardar Gasto";
  document.getElementById("cancelBtn").style.display = "none";
  
  // Resetear campos de inventario
  document.getElementById("es_inventario").checked = false;
  toggleCamposInventario();
  
  const hoy = new Date();
  document.getElementById("fecha").value = formatearFechaParaInput(hoy);
}

function limpiarFormularioSalida() {
  document.getElementById("salidaForm").reset();
  document.getElementById("stock_disponible").textContent = "";
  document.getElementById("valor_calculado_salida").value = "";
}

// ========================================
// FUNCIONES AUXILIARES PARA FECHAS
// ========================================

function convertirFechaInputACentroamericana(fechaInput) {
  try {
    if (fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fechaInput.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    if (fechaInput.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fechaInput;
    }
    const fecha = new Date(fechaInput);
    if (!isNaN(fecha.getTime())) {
      fecha.setHours(fecha.getHours() + 6);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}/${mes}/${anio}`;
    }
    return fechaInput;
  } catch (error) {
    return fechaInput;
  }
}

function convertirFechaCentroamericanaAInput(fechaCentro) {
  try {
    if (fechaCentro.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, anio] = fechaCentro.split('/');
      return `${anio}-${mes}-${dia}`;
    }
    if (fechaCentro.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fechaCentro;
    }
    return fechaCentro;
  } catch (error) {
    return fechaCentro;
  }
}

function formatearFechaParaInput(fecha) {
  try {
    let fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    const offsetCentroamerica = 6 * 60;
    const fechaLocal = new Date(fechaObj.getTime() - (offsetCentroamerica * 60 * 1000));
    
    const anio = fechaLocal.getFullYear();
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    
    return `${anio}-${mes}-${dia}`;
  } catch (error) {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}

function formatearFechaCentroamericana(fecha) {
  try {
    if (fecha && fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fecha;
    }
    if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    const d = new Date(fecha);
    if (!isNaN(d.getTime())) {
      d.setHours(d.getHours() + 6);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      return `${dia}/${mes}/${anio}`;
    }
    return fecha;
  } catch (error) {
    return fecha;
  }
}

function mostrarNotificacion(mensaje, tipo) {
  const ahora = new Date();
  const horaLocal = ahora.toLocaleString('es-GT', { 
    timeZone: 'America/Guatemala',
    hour12: true 
  });
  
  console.log(`📢 [${horaLocal} GMT-6] ${tipo.toUpperCase()}: ${mensaje}`);
  alert(`${mensaje}\n\n[${horaLocal} - Centroamérica]`);
}