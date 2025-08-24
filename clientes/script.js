// FUNCIONES AUXILIARES PARA MANEJO DE FECHAS
function convertirISOaCentroamericano(fechaISO) {
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

function convertirCentroamericanoAISO(fechaCentro) {
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

// ===================================================
// VARIABLES GLOBALES PARA PAGINACIÓN DE CLIENTES
// ===================================================

let todosLosClientesData = [];
let clientesFiltrados = [];

// Configuración de paginación para clientes
let paginacionClientes = {
  paginaActual: 1,
  tamañoPagina: 25,
  totalPaginas: 1,
  totalRegistros: 0
};

// Establecer fecha actual por defecto
document.addEventListener('DOMContentLoaded', function() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const formSection = document.getElementById('formSection');

  toggleBtn.addEventListener('click', function() {
    toggleBtn.classList.toggle('active');
    if (formSection.classList.contains('hidden')) {
      formSection.classList.remove('hidden');
      formSection.style.animation = 'fadeIn 0.3s ease';
    } else {
      formSection.classList.add('hidden');
    }
  });

  cargarClientes();
  
  // Establecer valores por defecto para los nuevos campos
  document.getElementById('categoria').value = 'normal';
  document.getElementById('empresa').value = '';
  document.getElementById('descuento_porcentaje').value = '';
});

// FUNCIÓN MODIFICADA: Manejo de cambios en el estado de membresía
document.getElementById('membresia').addEventListener('change', function() {
  const esActivo = this.value === 'Activo';
  const fechaInicio = document.getElementById('fecha_inicio');
  const fechaFinal = document.getElementById('fecha_final');
  const monto = document.getElementById('monto');
  const tipoPago = document.getElementById('tipo_pago');

  // Habilitar/deshabilitar campos
  fechaInicio.disabled = !esActivo;
  fechaFinal.disabled = !esActivo;
  monto.disabled = !esActivo;
  tipoPago.disabled = !esActivo;

  if (esActivo) {
    // Solo establecer fecha por defecto si el campo está vacío
    if (!fechaInicio.value) {
      const hoy = new Date().toISOString().split('T')[0];
      fechaInicio.value = hoy;
    }
    
    // Calcular fecha final basada en la fecha de inicio actual
    if (fechaInicio.value) {
      calcularFechaFinal();
    }
    
    // Establecer tipo de pago por defecto si está vacío
    if (!tipoPago.value) {
      tipoPago.value = 'Efectivo';
    }
  } else {
    fechaInicio.value = '';
    fechaFinal.value = '';
    monto.value = '';
    tipoPago.value = 'Efectivo';
  }
});

// NUEVA FUNCIÓN: Calcular fecha final basada en fecha de inicio
function calcularFechaFinal() {
  const fechaInicio = document.getElementById('fecha_inicio');
  const fechaFinal = document.getElementById('fecha_final');
  
  if (fechaInicio.value) {
    const fechaInicioObj = new Date(fechaInicio.value);
    if (!isNaN(fechaInicioObj.getTime())) {
      const fechaFinCalc = new Date(fechaInicioObj);
      fechaFinCalc.setDate(fechaFinCalc.getDate() + 30);
      fechaFinal.value = fechaFinCalc.toISOString().split('T')[0];
    }
  }
}

// FUNCIÓN MODIFICADA: Escuchar cambios en fecha de inicio para recalcular fecha final
document.getElementById('fecha_inicio').addEventListener('change', function() {
  console.log('📅 Usuario cambió fecha de inicio:', this.value);
  calcularFechaFinal();
});

// NUEVA FUNCIÓN: Manejar cambio de categoría de cliente
function manejarCambioCategoria() {
  const categoria = document.getElementById('categoria').value;
  const empresaContainer = document.querySelector('.empresa-container');
  const descuentoContainer = document.querySelector('.descuento-container');
  const empresa = document.getElementById('empresa');
  const descuento = document.getElementById('descuento_porcentaje');

  if (categoria === 'preferencial') {
    empresaContainer.style.display = 'block';
    descuentoContainer.style.display = 'block';
    empresa.required = true;
    descuento.required = true;
  } else {
    empresaContainer.style.display = 'none';
    descuentoContainer.style.display = 'none';
    empresa.required = false;
    descuento.required = false;
    empresa.value = '';
    descuento.value = '';
  }
}

// NUEVA FUNCIÓN: Validar que fecha final no sea anterior a fecha inicio
document.getElementById('fecha_final').addEventListener('change', function() {
  const fechaInicio = document.getElementById('fecha_inicio').value;
  const fechaFinal = this.value;
  
  if (fechaInicio && fechaFinal) {
    const inicioObj = new Date(fechaInicio);
    const finalObj = new Date(fechaFinal);
    
    if (finalObj <= inicioObj) {
      mostrarNotificacion("La fecha final debe ser posterior a la fecha de inicio", "error");
      // Recalcular fecha final automáticamente
      calcularFechaFinal();
    }
  }
});

// FUNCIÓN MODIFICADA: Enviar datos con fechas en formato centroamericano
document.getElementById("clienteForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());
  const accion = data.accion;

  if (!validarDUI(data.dui)) {
    mostrarNotificacion("El formato del DUI no es válido. Use formato: 00000000-0", "error");
    return;
  }

  // Validar campos de cliente preferencial
  if (data.categoria === 'preferencial') {
    if (!data.empresa || !data.descuento_porcentaje) {
      mostrarNotificacion("Para clientes preferenciales debe especificar empresa y descuento", "error");
      return;
    }
    
    if (parseFloat(data.descuento_porcentaje) < 0 || parseFloat(data.descuento_porcentaje) > 100) {
      mostrarNotificacion("El descuento debe ser entre 0% y 100%", "error");
      return;
    }
  }

  if (data.membresia === 'Activo') {
    if (!data.fecha_inicio || !data.fecha_final || !data.monto || !data.tipo_pago) {
      mostrarNotificacion("Debe completar fecha de inicio, fecha final, monto y tipo de pago para membresías activas", "error");
      return;
    }
    
    // Validar que fecha final sea posterior a fecha inicio
    const inicioObj = new Date(data.fecha_inicio);
    const finalObj = new Date(data.fecha_final);
    
    if (finalObj <= inicioObj) {
      mostrarNotificacion("La fecha final debe ser posterior a la fecha de inicio", "error");
      return;
    }
  } else {
    data.fecha_inicio = '';
    data.fecha_final = '';
    data.monto = '';
    data.tipo_pago = 'Efectivo';
  }

  // CONVERSIÓN DE FECHAS A FORMATO CENTROAMERICANO ANTES DE ENVIAR
  console.log('📅 Fechas ANTES de conversión:', {
    fecha: data.fecha,
    fecha_inicio: data.fecha_inicio,
    fecha_final: data.fecha_final
  });

  // Convertir fechas principales
  data.fecha = convertirISOaCentroamericano(data.fecha);
  
  // Solo convertir fechas de membresía si existen
  if (data.fecha_inicio) {
    data.fecha_inicio = convertirISOaCentroamericano(data.fecha_inicio);
  }
  if (data.fecha_final) {
    data.fecha_final = convertirISOaCentroamericano(data.fecha_final);
  }

  console.log('📅 Fechas DESPUÉS de conversión:', {
    fecha: data.fecha,
    fecha_inicio: data.fecha_inicio,
    fecha_final: data.fecha_final
  });

  try {
    let url = "/api/clientes";
    let method = "POST";

    if (accion === 'actualizar') {
      url = `/api/clientes/${data.cliente_id}`;
      method = "PUT";
    }

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      limpiarFormulario();
      
      // Limpiar filtros para asegurar que el nuevo cliente sea visible
      if (accion === 'crear') {
        document.getElementById("searchDui").value = "";
        document.getElementById("searchNombre").value = "";
        document.getElementById("fechaDesde").value = "";
        document.getElementById("fechaHasta").value = "";
        
        // Restaurar eventos de paginación normales
        restaurarEventosPaginacionNormales();
        
        // Activar resaltado para el primer registro
        highlightFirstRow = true;
      }
      
      // Ir a la primera página para mostrar el cliente recién creado/actualizado
      cargarClientes(1);
      const mensaje = accion === 'crear' ? "Cliente registrado con éxito" : "Cliente actualizado con éxito";
      mostrarNotificacion(mensaje, "success");
    } else {
      const responseData = await response.json();
      mostrarNotificacion(responseData.mensaje || "Error en la operación", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    mostrarNotificacion("Error de conexión", "error");
  }
});

document.getElementById("searchBtn").addEventListener("click", function () {
  aplicarFiltros();
});

document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  document.getElementById("searchDui").value = "";
  document.getElementById("searchNombre").value = "";
  document.getElementById("fechaDesde").value = "";
  document.getElementById("fechaHasta").value = "";
  
  // Restaurar eventos de paginación normales
  restaurarEventosPaginacionNormales();
  
  // Cargar datos sin filtros
  cargarClientes(1);
});

document.getElementById("searchDui").addEventListener("keyup", function(e) {
  if (e.key === "Enter") {
    aplicarFiltros();
  }
});

document.getElementById("cancelBtn").addEventListener("click", function() {
  limpiarFormulario();
});

// ===================================================
// FUNCIÓN MODIFICADA: Filtros con paginación
// ===================================================

async function aplicarFiltros(pagina = 1) {
  const dui = document.getElementById("searchDui").value.trim();
  const nombre = document.getElementById("searchNombre").value.trim();
  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;

  const params = new URLSearchParams();
  if (dui) params.append("dui", dui);
  if (nombre) params.append("nombre", nombre);
  
  // Convertir fechas de filtro a formato centroamericano
  if (desde) {
    const desdeCentro = convertirISOaCentroamericano(desde);
    params.append("desde", desdeCentro);
    console.log('🔍 Filtro desde convertido:', desde, '->', desdeCentro);
  }
  if (hasta) {
    const hastaCentro = convertirISOaCentroamericano(hasta);
    params.append("hasta", hastaCentro);
    console.log('🔍 Filtro hasta convertido:', hasta, '->', hastaCentro);
  }

  // Agregar parámetros de paginación
  params.append("page", pagina);
  params.append("limit", paginacionClientes.tamañoPagina);

  try {
    const res = await fetch(`/api/clientes/filtro?${params.toString()}`);
    const response = await res.json();
    
    if (response.data) {
      // Respuesta con paginación
      clientesFiltrados = response.data;
      paginacionClientes = {
        paginaActual: response.pagination.currentPage,
        tamañoPagina: response.pagination.recordsPerPage,
        totalPaginas: response.pagination.totalPages,
        totalRegistros: response.pagination.totalRecords
      };
      
      mostrarClientesEnTabla(response.data);
      actualizarInfoPaginacionClientes(response.pagination);
      actualizarControlesPaginacionClientes();
      
      // Actualizar funciones de navegación para usar filtros
      window.irAPaginaClientesFiltrados = (numeroPagina) => {
        if (numeroPagina !== paginacionClientes.paginaActual && numeroPagina >= 1 && numeroPagina <= paginacionClientes.totalPaginas) {
          aplicarFiltros(numeroPagina);
        }
      };
      
      // Reasignar eventos de paginación para filtros
      reasignarEventosPaginacionParaFiltros();
      
    } else {
      // Fallback para respuesta sin paginación
      clientesFiltrados = response;
      mostrarClientesEnTabla(response);
      document.getElementById('contadorClientes').textContent = `${response.length} registros (filtrados)`;
      document.getElementById('paginationClientes').style.display = 'none';
    }
  } catch (error) {
    console.error("Error:", error);
    mostrarNotificacion("Error al filtrar clientes", "error");
  }
}

function reasignarEventosPaginacionParaFiltros() {
  // Reasignar botones de navegación
  document.getElementById('firstBtnClientes').onclick = () => aplicarFiltros(1);
  document.getElementById('prevBtnClientes').onclick = () => aplicarFiltros(paginacionClientes.paginaActual - 1);
  document.getElementById('nextBtnClientes').onclick = () => aplicarFiltros(paginacionClientes.paginaActual + 1);
  document.getElementById('lastBtnClientes').onclick = () => aplicarFiltros(paginacionClientes.totalPaginas);
  
  // Reasignar números de página
  const pageNumbers = document.querySelectorAll('#pageNumbersClientes .page-number');
  pageNumbers.forEach(button => {
    if (button.textContent !== '...') {
      const numeroPagina = parseInt(button.textContent);
      button.onclick = () => aplicarFiltros(numeroPagina);
    }
  });
}

function restaurarEventosPaginacionNormales() {
  // Restaurar eventos normales
  document.getElementById('firstBtnClientes').onclick = () => cambiarPaginaClientes('first');
  document.getElementById('prevBtnClientes').onclick = () => cambiarPaginaClientes('prev');
  document.getElementById('nextBtnClientes').onclick = () => cambiarPaginaClientes('next');
  document.getElementById('lastBtnClientes').onclick = () => cambiarPaginaClientes('last');
  
  // Regenerar números de página con eventos normales
  generarNumerosPaginaClientes();
}

// FUNCIÓN MODIFICADA: Cargar cliente en formulario con conversión de fechas
function cargarClienteEnFormulario(cliente) {
  document.getElementById("accion").value = "actualizar";
  document.getElementById("cliente_id").value = cliente.id;
  
  // Convertir fechas de centroamericano a ISO para los inputs tipo date
  document.getElementById("fecha").value = convertirCentroamericanoAISO(cliente.fecha);
  document.getElementById("dui").value = cliente.dui;
  document.getElementById("nombre").value = cliente.nombre;
  document.getElementById("telefono").value = cliente.telefono;
  document.getElementById("correo").value = cliente.correo;
  document.getElementById("membresia").value = cliente.membresia;
  
  // Cargar nuevos campos de categoría
  document.getElementById("categoria").value = cliente.categoria || 'normal';
  document.getElementById("empresa").value = cliente.empresa || '';
  document.getElementById("descuento_porcentaje").value = cliente.descuento_porcentaje || '';
  
  // Mostrar/ocultar campos según categoría
  manejarCambioCategoria();

  document.getElementById("submitBtn").textContent = "Actualizar Cliente";
  document.getElementById("cancelBtn").style.display = "block";

  const fechaInicio = document.getElementById('fecha_inicio');
  const fechaFinal = document.getElementById('fecha_final');
  const monto = document.getElementById('monto');
  const tipoPago = document.getElementById('tipo_pago');

  if (cliente.membresia === 'Activo') {
    fechaInicio.disabled = false;
    fechaFinal.disabled = false;
    monto.disabled = false;
    tipoPago.disabled = false;

    // Convertir fechas para inputs tipo date
    fechaInicio.value = convertirCentroamericanoAISO(cliente.fecha_inicio);
    fechaFinal.value = convertirCentroamericanoAISO(cliente.fecha_final);
    monto.value = cliente.monto;
    tipoPago.value = cliente.tipo_pago || 'Efectivo';
    
    console.log('📅 Cargando cliente para edición:', {
      fecha_inicio_bd: cliente.fecha_inicio,
      fecha_inicio_input: fechaInicio.value,
      fecha_final_bd: cliente.fecha_final,
      fecha_final_input: fechaFinal.value
    });
  } else {
    fechaInicio.disabled = true;
    fechaFinal.disabled = true;
    monto.disabled = true;
    tipoPago.disabled = true;

    fechaInicio.value = '';
    fechaFinal.value = '';
    monto.value = '';
    tipoPago.value = 'Efectivo';
  }
}

function limpiarFormulario() {
  document.getElementById("clienteForm").reset();
  document.getElementById("accion").value = "crear";
  document.getElementById("cliente_id").value = "";
  document.getElementById("submitBtn").textContent = "Registrar Cliente";
  document.getElementById("cancelBtn").style.display = "none";

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;

  document.getElementById('fecha_inicio').disabled = true;
  document.getElementById('fecha_final').disabled = true;
  document.getElementById('monto').disabled = true;
  document.getElementById('tipo_pago').disabled = true;
  document.getElementById('tipo_pago').value = 'Efectivo';
  
  // Resetear campos de categoría
  document.getElementById('categoria').value = 'normal';
  document.getElementById('empresa').value = '';
  document.getElementById('descuento_porcentaje').value = '';
  manejarCambioCategoria();
}

// ===================================================
// FUNCIÓN PRINCIPAL PARA CARGAR CLIENTES CON PAGINACIÓN
// ===================================================

async function cargarClientes(pagina = 1) {
  try {
    const limite = paginacionClientes.tamañoPagina;
    const res = await fetch(`/api/clientes?page=${pagina}&limit=${limite}`);
    const response = await res.json();
    
    if (response.data) {
      // Respuesta con paginación
      todosLosClientesData = response.data;
      paginacionClientes = {
        paginaActual: response.pagination.currentPage,
        tamañoPagina: response.pagination.recordsPerPage,
        totalPaginas: response.pagination.totalPages,
        totalRegistros: response.pagination.totalRecords
      };
      
      mostrarClientesEnTabla(response.data);
      actualizarInfoPaginacionClientes(response.pagination);
      actualizarControlesPaginacionClientes();
    } else {
      // Fallback para respuesta sin paginación
      todosLosClientesData = response;
      mostrarClientesEnTabla(response);
      document.getElementById('contadorClientes').textContent = `${response.length} registros`;
    }
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    mostrarNotificacion("Error al cargar datos", "error");
  }
}

// ===================================================
// FUNCIÓN PARA MOSTRAR CLIENTES EN LA TABLA
// ===================================================

let highlightFirstRow = false; // Flag para resaltar primera fila

function mostrarClientesEnTabla(clientes) {
  const tbody = document.querySelector("#clientesTable tbody");
  tbody.innerHTML = "";

  clientes.forEach((cliente, index) => {
    const row = document.createElement("tr");

    if (cliente.membresia === 'Activo') {
      row.classList.add('row-active');
    }
    
    // Resaltar el primer registro si es recién creado
    if (index === 0 && highlightFirstRow) {
      row.classList.add('newly-created');
      // Reset flag
      highlightFirstRow = false;
    }

    const categoriaText = cliente.categoria === 'preferencial' ? 'Preferencial' : 'Normal';
    const categoriaClass = cliente.categoria === 'preferencial' ? 'preferencial' : 'normal';
    
    row.innerHTML = `
      <td>${cliente.fecha || '-'}</td>
      <td>${cliente.dui}</td>
      <td>${cliente.nombre}</td>
      <td>${cliente.telefono}</td>
      <td>${cliente.correo}</td>
      <td><span class="status-${(cliente.membresia || 'inactivo').toLowerCase()}">${cliente.membresia || 'Inactivo'}</span></td>
      <td><span class="categoria-${categoriaClass}">${categoriaText}</span></td>
      <td>${cliente.empresa || '-'}</td>
      <td>${cliente.descuento_porcentaje ? cliente.descuento_porcentaje + '%' : '-'}</td>
      <td>${cliente.fecha_inicio || '-'}</td>
      <td>${cliente.fecha_final || '-'}</td>
      <td>${cliente.monto ? '$' + parseFloat(cliente.monto).toFixed(2) : '-'}</td>
      <td><span class="tipo-pago-${(cliente.tipo_pago || 'efectivo').toLowerCase()}">${cliente.tipo_pago || 'Efectivo'}</span></td>
      <td>
        <button class="btn-action btn-edit" onclick="editarCliente(${cliente.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-action btn-delete" onclick="eliminarCliente(${cliente.id})"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ===================================================
// FUNCIONES DE PAGINACIÓN PARA CLIENTES
// ===================================================

function actualizarInfoPaginacionClientes(pagination) {
  const contador = document.getElementById('contadorClientes');
  const paginationInfo = document.getElementById('paginationInfoClientes');
  const paginationContainer = document.getElementById('paginationClientes');
  
  if (pagination) {
    const inicio = ((pagination.currentPage - 1) * pagination.recordsPerPage) + 1;
    const fin = Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords);
    
    contador.textContent = `${pagination.totalRecords} registros`;
    paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${pagination.totalRecords} registros`;
    
    // Mostrar paginación solo si hay más de una página
    if (pagination.totalPages > 1) {
      paginationContainer.style.display = 'flex';
    } else {
      paginationContainer.style.display = 'none';
    }
  }
}

function actualizarControlesPaginacionClientes() {
  const { paginaActual, totalPaginas } = paginacionClientes;
  
  // Actualizar botones de navegación
  document.getElementById('firstBtnClientes').disabled = paginaActual === 1;
  document.getElementById('prevBtnClientes').disabled = paginaActual === 1;
  document.getElementById('nextBtnClientes').disabled = paginaActual === totalPaginas;
  document.getElementById('lastBtnClientes').disabled = paginaActual === totalPaginas;
  
  // Generar números de página
  generarNumerosPaginaClientes();
}

function generarNumerosPaginaClientes() {
  const { paginaActual, totalPaginas } = paginacionClientes;
  const container = document.getElementById('pageNumbersClientes');
  container.innerHTML = '';
  
  // Calcular rango de páginas a mostrar
  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, paginaActual + 2);
  
  // Ajustar si estamos cerca del inicio o fin
  if (fin - inicio < 4 && totalPaginas > 5) {
    if (inicio === 1) {
      fin = Math.min(5, totalPaginas);
    } else if (fin === totalPaginas) {
      inicio = Math.max(1, totalPaginas - 4);
    }
  }
  
  // Agregar página 1 si no está en el rango
  if (inicio > 1) {
    agregarBotonPaginaClientes(1);
    if (inicio > 2) {
      container.appendChild(crearElipsis());
    }
  }
  
  // Agregar páginas en el rango
  for (let i = inicio; i <= fin; i++) {
    agregarBotonPaginaClientes(i);
  }
  
  // Agregar última página si no está en el rango
  if (fin < totalPaginas) {
    if (fin < totalPaginas - 1) {
      container.appendChild(crearElipsis());
    }
    agregarBotonPaginaClientes(totalPaginas);
  }
}

function agregarBotonPaginaClientes(numeroPagina) {
  const container = document.getElementById('pageNumbersClientes');
  const button = document.createElement('span');
  button.className = `page-number ${numeroPagina === paginacionClientes.paginaActual ? 'active' : ''}`;
  button.textContent = numeroPagina;
  button.onclick = () => irAPaginaClientes(numeroPagina);
  container.appendChild(button);
}

function crearElipsis() {
  const span = document.createElement('span');
  span.textContent = '...';
  span.className = 'page-number';
  span.style.cursor = 'default';
  span.style.backgroundColor = 'transparent';
  return span;
}

function cambiarPaginaClientes(direccion) {
  const { paginaActual, totalPaginas } = paginacionClientes;
  
  switch(direccion) {
    case 'first':
      if (paginaActual !== 1) irAPaginaClientes(1);
      break;
    case 'prev':
      if (paginaActual > 1) irAPaginaClientes(paginaActual - 1);
      break;
    case 'next':
      if (paginaActual < totalPaginas) irAPaginaClientes(paginaActual + 1);
      break;
    case 'last':
      if (paginaActual !== totalPaginas) irAPaginaClientes(totalPaginas);
      break;
  }
}

function cambiarTamañoPaginaClientes() {
  const nuevoTamaño = parseInt(document.getElementById('pageSizeClientes').value);
  paginacionClientes.tamañoPagina = nuevoTamaño;
  cargarClientes(1); // Volver a la primera página
}

function irAPaginaClientes(numeroPagina) {
  if (numeroPagina !== paginacionClientes.paginaActual && numeroPagina >= 1 && numeroPagina <= paginacionClientes.totalPaginas) {
    cargarClientes(numeroPagina);
  }
}

async function editarCliente(id) {
  try {
    const res = await fetch(`/api/clientes/${id}`);
    if (res.ok) {
      const cliente = await res.json();
      cargarClienteEnFormulario(cliente);
      document.getElementById('formSection').classList.remove('hidden');
      document.getElementById('toggleFormBtn').classList.add('active');
      document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
    } else {
      mostrarNotificacion("Error al obtener datos del cliente", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    mostrarNotificacion("Error de conexión", "error");
  }
}

async function eliminarCliente(id) {
  if (confirm("¿Está seguro que desea eliminar este cliente?")) {
    try {
      const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (response.ok) {
        // Ir a la primera página después de eliminar
        cargarClientes(1);
        mostrarNotificacion("Cliente eliminado correctamente", "success");
      } else {
        mostrarNotificacion("Error al eliminar cliente", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      mostrarNotificacion("Error de conexión", "error");
    }
  }
}

function validarDUI(dui) {
  const regexDUI = /^\d{8}-\d{1}$/;
  return regexDUI.test(dui);
}

function mostrarNotificacion(mensaje, tipo) {
  const notificacionExistente = document.querySelector('.notificacion');
  if (notificacionExistente) notificacionExistente.remove();

  const notificacion = document.createElement('div');
  notificacion.className = `notificacion ${tipo}`;
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.classList.add('ocultar');
    setTimeout(() => {
      notificacion.remove();
    }, 300);
  }, 3000);
}

document.getElementById("downloadExcelBtn").addEventListener("click", async function () {
  try {
    // Obtener todos los datos para Excel (sin paginación)
    let todosLosDatos = [];
    
    // Verificar si hay filtros activos
    const dui = document.getElementById("searchDui").value.trim();
    const nombre = document.getElementById("searchNombre").value.trim();
    const desde = document.getElementById("fechaDesde").value;
    const hasta = document.getElementById("fechaHasta").value;
    
    if (dui || nombre || desde || hasta) {
      // Hay filtros activos, obtener datos filtrados completos
      const params = new URLSearchParams();
      if (dui) params.append("dui", dui);
      if (nombre) params.append("nombre", nombre);
      if (desde) {
        const desdeCentro = convertirISOaCentroamericano(desde);
        params.append("desde", desdeCentro);
      }
      if (hasta) {
        const hastaCentro = convertirISOaCentroamericano(hasta);
        params.append("hasta", hastaCentro);
      }
      params.append("limit", "9999"); // Obtener todos los registros
      
      const res = await fetch(`/api/clientes/filtro?${params.toString()}`);
      const response = await res.json();
      todosLosDatos = response.data || response;
    } else {
      // Sin filtros, obtener todos los clientes
      const res = await fetch("/api/clientes?limit=9999");
      const response = await res.json();
      todosLosDatos = response.data || response;
    }
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    
    // Convertir datos a formato para Excel
    const datosParaExcel = todosLosDatos.map(cliente => ({
      'Fecha Registro': cliente.fecha || '-',
      'DUI': cliente.dui,
      'Nombre': cliente.nombre,
      'Teléfono': cliente.telefono,
      'Correo': cliente.correo,
      'Membresía': cliente.membresia,
      'Categoría': cliente.categoria === 'preferencial' ? 'Preferencial' : 'Normal',
      'Empresa': cliente.empresa || '-',
      'Descuento (%)': cliente.descuento_porcentaje || 0,
      'Fecha Inicio': cliente.fecha_inicio || '-',
      'Fecha Final': cliente.fecha_final || '-',
      'Monto': cliente.monto ? parseFloat(cliente.monto).toFixed(2) : '-',
      'Tipo Pago': cliente.tipo_pago || 'Efectivo'
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosParaExcel);
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    
    const nombreArchivo = (dui || nombre || desde || hasta) 
      ? "clientes_filtrados.xlsx" 
      : "todos_los_clientes.xlsx";
    
    XLSX.writeFile(wb, nombreArchivo);
    
    mostrarNotificacion(`Excel descargado: ${todosLosDatos.length} registros`, "success");
  } catch (error) {
    console.error("Error al descargar Excel:", error);
    mostrarNotificacion("Error al generar archivo Excel", "error");
  }
});