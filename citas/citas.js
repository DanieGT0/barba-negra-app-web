// citas.js con autocompletado

let calendar;
let citaActual = null;
let clientes = [];
let servicios = [];
let empleados = [];
let clientesFiltrados = [];
let serviciosFiltrados = [];
let empleadosFiltrados = [];
let selectedIndexCliente = -1;
let selectedIndexServicio = -1;
let selectedIndexEmpleado = -1;

// ===================================================
// FUNCIONES DE CARGA DE DATOS
// ===================================================

async function cargarClientesCitas() {
  try {
    console.log('Intentando cargar clientes desde /api/clientes-disponibles');
    const res = await fetch('/api/clientes-disponibles');
    console.log('Respuesta del servidor:', res.status, res.statusText);
    if (!res.ok) throw new Error(`Error al cargar clientes: ${res.status}`);
    clientes = await res.json();
    console.log('Clientes cargados para citas:', clientes.length, clientes);
  } catch (error) {
    console.error('Error cargando clientes:', error);
    clientes = []; // Asegurar que sea un array vacío
    // Mostrar alerta de error si falla la carga
    if (typeof Swal !== 'undefined') {
      Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
    }
  }
}

async function cargarServiciosCitas() {
  try {
    const res = await fetch('/api/cortes');
    if (!res.ok) throw new Error('Error al cargar servicios');
    servicios = await res.json();
    console.log('Servicios cargados para citas:', servicios.length);
  } catch (error) {
    console.error('Error cargando servicios:', error);
    // Mostrar alerta de error si falla la carga
    if (typeof Swal !== 'undefined') {
      Swal.fire('Error', 'No se pudieron cargar los servicios', 'error');
    }
  }
}

async function cargarEmpleadosCitas() {
  try {
    console.log('Intentando cargar empleados desde /api/empleados');
    const res = await fetch('/api/empleados');
    console.log('Respuesta del servidor:', res.status, res.statusText);
    if (!res.ok) throw new Error(`Error al cargar empleados: ${res.status}`);
    empleados = await res.json();
    console.log('Empleados cargados para citas:', empleados.length, empleados);
  } catch (error) {
    console.error('Error cargando empleados:', error);
    empleados = []; // Asegurar que sea un array vacío
    // Mostrar alerta de error si falla la carga
    if (typeof Swal !== 'undefined') {
      Swal.fire('Error', 'No se pudieron cargar los empleados', 'error');
    }
  }
}

// ===================================================
// FUNCIONES DE AUTOCOMPLETADO PARA CLIENTES
// ===================================================

function inicializarAutocompletadoClientes() {
  const input = document.getElementById('clienteNombre');
  const dropdown = document.getElementById('clientesList');
  
  input.addEventListener('input', handleInputCliente);
  input.addEventListener('keydown', handleKeydownCliente);
  input.addEventListener('focus', handleFocusCliente);
  
  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
      ocultarDropdownCliente();
    }
  });
}

function handleInputCliente(e) {
  const query = e.target.value.trim();
  selectedIndexCliente = -1;
  
  if (query.length === 0) {
    mostrarTodosLosClientes();
  } else {
    filtrarClientes(query);
  }
}

function handleKeydownCliente(e) {
  const dropdown = document.getElementById('clientesList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndexCliente = Math.min(selectedIndexCliente + 1, items.length - 1);
      actualizarSeleccionCliente();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndexCliente = Math.max(selectedIndexCliente - 1, -1);
      actualizarSeleccionCliente();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndexCliente >= 0 && items[selectedIndexCliente]) {
        seleccionarCliente(items[selectedIndexCliente]);
      }
      break;
    case 'Escape':
      ocultarDropdownCliente();
      break;
  }
}

function handleFocusCliente() {
  const query = document.getElementById('clienteNombre').value.trim();
  if (query.length === 0) {
    mostrarTodosLosClientes();
  } else {
    filtrarClientes(query);
  }
}

function mostrarTodosLosClientes() {
  // Validar que clientes sea un array
  if (!Array.isArray(clientes)) {
    console.error('Error: clientes no es un array:', clientes);
    clientesFiltrados = [];
  } else {
    clientesFiltrados = [...clientes];
  }
  mostrarDropdownClientes();
}

function filtrarClientes(query) {
  const queryLower = query.toLowerCase();
  
  // Si escribe "cliente general", incluirlo como opción especial
  clientesFiltrados = [];
  
  if ('cliente general'.includes(queryLower) || queryLower.includes('general')) {
    clientesFiltrados.push({
      id: 'general',
      nombre: 'Cliente General',
      dui: 'Sin identificación',
      telefono: '',
      esGeneral: true
    });
  }
  
  // Filtrar clientes existentes (igual que servicios)
  const clientesExistentes = Array.isArray(clientes) ? clientes.filter(cliente => {
    const nombre = (cliente.nombre || '').toLowerCase();
    const dui = (cliente.dui || '').toLowerCase();
    return nombre.includes(queryLower) || dui.includes(queryLower);
  }) : [];
  
  clientesFiltrados = [...clientesFiltrados, ...clientesExistentes];
  mostrarDropdownClientes();
}

function mostrarDropdownClientes() {
  const dropdown = document.getElementById('clientesList');
  
  if (clientesFiltrados.length === 0) {
    dropdown.innerHTML = '<div class="no-results">No se encontraron clientes</div>';
  } else {
    dropdown.innerHTML = clientesFiltrados.map((cliente, index) => {
      const claseEspecial = cliente.esGeneral ? 'cliente-general-item' : '';
      return `
        <div class="autocomplete-item ${claseEspecial}" data-id="${cliente.id}" data-index="${index}">
          <div class="cliente-nombre">${cliente.nombre}</div>
          <div class="cliente-dui">DUI: ${cliente.dui || 'Sin DUI'}</div>
        </div>
      `;
    }).join('');
    
    // Agregar event listeners a los items
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => seleccionarCliente(item));
      item.addEventListener('mouseenter', () => {
        selectedIndexCliente = parseInt(item.dataset.index);
        actualizarSeleccionCliente();
      });
    });
  }
  
  dropdown.classList.add('show');
}

function ocultarDropdownCliente() {
  const dropdown = document.getElementById('clientesList');
  dropdown.classList.remove('show');
  selectedIndexCliente = -1;
}

function actualizarSeleccionCliente() {
  const dropdown = document.getElementById('clientesList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  items.forEach((item, index) => {
    if (index === selectedIndexCliente) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function seleccionarCliente(item) {
  const clienteId = item.dataset.id;
  const cliente = clientesFiltrados.find(c => c.id == clienteId);
  
  if (cliente) {
    document.getElementById('clienteNombre').value = cliente.nombre;
    document.getElementById('clienteSelected').value = cliente.id;
    
    // Si es cliente general, limpiar teléfono, sino autocompletarlo si existe
    if (cliente.esGeneral) {
      document.getElementById('clienteTelefono').value = '';
    } else if (cliente.telefono) {
      document.getElementById('clienteTelefono').value = cliente.telefono;
    }
    
    ocultarDropdownCliente();
  }
}

// ===================================================
// FUNCIONES DE AUTOCOMPLETADO PARA SERVICIOS
// ===================================================

function inicializarAutocompletadoServicios() {
  const input = document.getElementById('servicio');
  const dropdown = document.getElementById('serviciosList');
  
  input.addEventListener('input', handleInputServicio);
  input.addEventListener('keydown', handleKeydownServicio);
  input.addEventListener('focus', handleFocusServicio);
}

function handleInputServicio(e) {
  const query = e.target.value.trim();
  selectedIndexServicio = -1;
  
  if (query.length === 0) {
    mostrarTodosLosServicios();
  } else {
    filtrarServicios(query);
  }
}

function handleKeydownServicio(e) {
  const dropdown = document.getElementById('serviciosList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndexServicio = Math.min(selectedIndexServicio + 1, items.length - 1);
      actualizarSeleccionServicio();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndexServicio = Math.max(selectedIndexServicio - 1, -1);
      actualizarSeleccionServicio();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndexServicio >= 0 && items[selectedIndexServicio]) {
        seleccionarServicio(items[selectedIndexServicio]);
      }
      break;
    case 'Escape':
      ocultarDropdownServicio();
      break;
  }
}

function handleFocusServicio() {
  const query = document.getElementById('servicio').value.trim();
  if (query.length === 0) {
    mostrarTodosLosServicios();
  } else {
    filtrarServicios(query);
  }
}

function mostrarTodosLosServicios() {
  serviciosFiltrados = [...servicios];
  mostrarDropdownServicios();
}

function filtrarServicios(query) {
  const queryLower = query.toLowerCase();
  serviciosFiltrados = servicios.filter(servicio => {
    const nombre = (servicio.servicio || '').toLowerCase();
    return nombre.includes(queryLower);
  });
  mostrarDropdownServicios();
}

function mostrarDropdownServicios() {
  const dropdown = document.getElementById('serviciosList');
  
  if (serviciosFiltrados.length === 0) {
    dropdown.innerHTML = '<div class="no-results">No se encontraron servicios</div>';
  } else {
    dropdown.innerHTML = serviciosFiltrados.map((servicio, index) => `
      <div class="autocomplete-item" data-value="${servicio.servicio}" data-index="${index}">
        <div class="servicio-nombre">${servicio.servicio}</div>
        <div class="servicio-precio">Precio: $${parseFloat(servicio.precio || 0).toFixed(2)}</div>
      </div>
    `).join('');
    
    // Agregar event listeners a los items
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => seleccionarServicio(item));
      item.addEventListener('mouseenter', () => {
        selectedIndexServicio = parseInt(item.dataset.index);
        actualizarSeleccionServicio();
      });
    });
  }
  
  dropdown.classList.add('show');
}

function ocultarDropdownServicio() {
  const dropdown = document.getElementById('serviciosList');
  dropdown.classList.remove('show');
  selectedIndexServicio = -1;
}

function actualizarSeleccionServicio() {
  const dropdown = document.getElementById('serviciosList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  items.forEach((item, index) => {
    if (index === selectedIndexServicio) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function seleccionarServicio(item) {
  const servicioNombre = item.dataset.value;
  
  document.getElementById('servicio').value = servicioNombre;
  document.getElementById('servicioSelected').value = servicioNombre;
  ocultarDropdownServicio();
}

// ===================================================
// FUNCIONES DE AUTOCOMPLETADO PARA EMPLEADOS
// ===================================================

function inicializarAutocompletadoEmpleados() {
  const input = document.getElementById('empleado');
  const dropdown = document.getElementById('empleadosList');
  
  input.addEventListener('input', handleInputEmpleado);
  input.addEventListener('keydown', handleKeydownEmpleado);
  input.addEventListener('focus', handleFocusEmpleado);
}

function handleInputEmpleado(e) {
  const query = e.target.value.trim();
  selectedIndexEmpleado = -1;
  
  if (query.length === 0) {
    mostrarTodosLosEmpleados();
  } else {
    filtrarEmpleados(query);
  }
}

function handleKeydownEmpleado(e) {
  const dropdown = document.getElementById('empleadosList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndexEmpleado = Math.min(selectedIndexEmpleado + 1, items.length - 1);
      actualizarSeleccionEmpleado();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndexEmpleado = Math.max(selectedIndexEmpleado - 1, -1);
      actualizarSeleccionEmpleado();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndexEmpleado >= 0 && items[selectedIndexEmpleado]) {
        seleccionarEmpleado(items[selectedIndexEmpleado]);
      }
      break;
    case 'Escape':
      ocultarDropdownEmpleado();
      break;
  }
}

function handleFocusEmpleado() {
  const query = document.getElementById('empleado').value.trim();
  if (query.length === 0) {
    mostrarTodosLosEmpleados();
  } else {
    filtrarEmpleados(query);
  }
}

function mostrarTodosLosEmpleados() {
  // Validar que empleados sea un array
  if (!Array.isArray(empleados)) {
    console.error('Error: empleados no es un array:', empleados);
    empleadosFiltrados = [];
  } else {
    empleadosFiltrados = [...empleados];
  }
  mostrarDropdownEmpleados();
}

function filtrarEmpleados(query) {
  const queryLower = query.toLowerCase();
  empleadosFiltrados = Array.isArray(empleados) ? empleados.filter(empleado => {
    const nombre = (empleado.nombre || '').toLowerCase();
    return nombre.includes(queryLower);
  }) : [];
  mostrarDropdownEmpleados();
}

function mostrarDropdownEmpleados() {
  const dropdown = document.getElementById('empleadosList');
  
  if (empleadosFiltrados.length === 0) {
    dropdown.innerHTML = '<div class="no-results">No se encontraron empleados</div>';
  } else {
    dropdown.innerHTML = empleadosFiltrados.map((empleado, index) => `
      <div class="autocomplete-item" data-value="${empleado.nombre}" data-id="${empleado.id}" data-index="${index}">
        <div class="empleado-nombre">${empleado.nombre}</div>
        <div class="empleado-rol">Barbero</div>
      </div>
    `).join('');
    
    // Agregar event listeners a los items
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => seleccionarEmpleado(item));
      item.addEventListener('mouseenter', () => {
        selectedIndexEmpleado = parseInt(item.dataset.index);
        actualizarSeleccionEmpleado();
      });
    });
  }
  
  dropdown.classList.add('show');
}

function ocultarDropdownEmpleado() {
  const dropdown = document.getElementById('empleadosList');
  dropdown.classList.remove('show');
  selectedIndexEmpleado = -1;
}

function actualizarSeleccionEmpleado() {
  const dropdown = document.getElementById('empleadosList');
  const items = dropdown.querySelectorAll('.autocomplete-item');
  
  items.forEach((item, index) => {
    if (index === selectedIndexEmpleado) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function seleccionarEmpleado(item) {
  const empleadoNombre = item.dataset.value;
  const empleadoId = item.dataset.id;
  
  document.getElementById('empleado').value = empleadoNombre;
  document.getElementById('empleadoSelected').value = empleadoId;
  ocultarDropdownEmpleado();
}

// ===================================================
// INICIALIZACIÓN DEL CALENDARIO Y EVENTOS
// ===================================================

document.addEventListener('DOMContentLoaded', async function() {
  const calendarEl = document.getElementById('calendar');

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    selectable: true,
    editable: true,
    eventSources: [
      {
        url: '/api/citas',
        method: 'GET',
        failure: function(error) {
          console.error('❌ Error cargando eventos del calendario:', error);
          if (typeof Swal !== 'undefined') {
            Swal.fire('Error', 'No se pudieron cargar las citas del calendario', 'error');
          }
        },
        success: function(data) {
          console.log('✅ Eventos cargados exitosamente:', data.length, 'citas');
          if (data.length > 0) {
            console.log('🔍 Primer evento:', data[0]);
            console.log('🔍 Formato de start:', typeof data[0].start, data[0].start);
            
            // Validar que el formato de start sea correcto
            data.forEach((evento, index) => {
              const startStr = evento.start;
              if (typeof startStr === 'string' && !startStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
                console.error(`❌ Formato de fecha inválido en evento ${index}:`, startStr);
              } else {
                console.log(`✅ Evento ${index} tiene formato válido:`, startStr);
              }
            });
          }
        }
      }
    ],
    eventDidMount: function(info) {
      console.log('📌 Evento montado en calendario:', info.event.title, 'ID:', info.event.id);
    },
    eventRender: function(info) {
      console.log('🎨 Renderizando evento:', info.event.title);
    },
    loading: function(bool) {
      if (bool) {
        console.log('🔄 Cargando eventos del calendario...');
      } else {
        console.log('✅ Eventos del calendario cargados');
      }
    },
    eventSourceFailure: function(error) {
      console.error('❌ Error en fuente de eventos:', error);
    },
    eventSourceSuccess: function(content, xhr) {
      console.log('📊 Fuente de eventos exitosa, contenido recibido');
    },

    dateClick: function(info) {
      // Limpiar formulario y abrir modal
      limpiarFormulario();
      document.getElementById('fechaCita').value = info.dateStr;
      abrirModal('citaModal');
    },

    eventClick: function(info) {
      citaActual = { id: info.event.id, title: info.event.title };
      
      // Extraer información del título
      const titleParts = info.event.title.split(' - ');
      const cliente = titleParts[0] || 'Sin cliente';
      const servicio = titleParts[1] || 'Sin servicio';
      const empleadoPart = titleParts[2] || 'Sin empleado';
      const empleado = empleadoPart.split(' (')[0];
      const telefono = empleadoPart.includes('(') ? empleadoPart.match(/\((.*?)\)/)?.[1] : '';
      
      // Crear texto informativo
      let infoText = `Cliente: ${cliente}\nServicio: ${servicio}\nEmpleado: ${empleado}`;
      if (telefono) {
        infoText += `\nTeléfono: ${telefono}`;
      }
      
      document.getElementById('citaAEliminar').innerHTML = infoText.replace(/\n/g, '<br>');
      abrirModal('eliminarModal');
    },

    eventDrop: async function(info) {
      const citaActualizada = { title: info.event.title, start: info.event.start.toISOString() };
      try {
        const res = await fetch(`/api/citas/${info.event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(citaActualizada)
        });
        if (!res.ok) { info.revert(); alert('No se pudo actualizar la cita'); }
      } catch (error) {
        info.revert(); console.error('Error:', error);
      }
    }
  });

  calendar.render();

  // Cargar datos y configurar autocompletado
  await cargarClientesCitas();
  await cargarServiciosCitas();
  await cargarEmpleadosCitas();
  inicializarAutocompletadoClientes();
  inicializarAutocompletadoServicios();
  inicializarAutocompletadoEmpleados();

  // Event listeners para botones
  document.getElementById('nuevaCita').addEventListener('click', () => {
    limpiarFormulario();
    let now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('fechaCita').value = now.toISOString().slice(0, 16);
    abrirModal('citaModal');
  });

  document.getElementById('guardarCita').addEventListener('click', async () => {
    // Obtener el botón y proteger contra múltiples clics
    const guardarBtn = document.getElementById('guardarCita');
    const textoOriginal = guardarBtn.textContent;
    
    // Deshabilitar el botón
    guardarBtn.disabled = true;
    guardarBtn.textContent = 'Guardando...';
    guardarBtn.style.opacity = '0.6';
    guardarBtn.style.cursor = 'not-allowed';
    
    try {
      const form = document.getElementById('citaForm');
      if (form.checkValidity()) {
        const cliente = document.getElementById('clienteNombre').value.trim();
        const clienteId = document.getElementById('clienteSelected').value;
        const telefono = document.getElementById('clienteTelefono').value.trim();
        const fecha = document.getElementById('fechaCita').value;
        const servicio = document.getElementById('servicio').value.trim();
        const servicioId = document.getElementById('servicioSelected').value;
        const empleado = document.getElementById('empleado').value.trim();
        const empleadoId = document.getElementById('empleadoSelected').value;

        console.log('Datos del formulario:', { cliente, clienteId, telefono, fecha, servicio, servicioId, empleado, empleadoId });

        // Validar que se haya seleccionado cliente, servicio y empleado
        if (!cliente || !servicio || !empleado) {
          if (typeof Swal !== 'undefined') {
            Swal.fire('Error', 'Por favor selecciona cliente, servicio y empleado', 'error');
          } else {
            alert('Por favor selecciona cliente, servicio y empleado');
          }
          return;
        }

      const nuevaCita = {
        title: `${cliente} - ${servicio} - ${empleado}` + (telefono ? ` (${telefono})` : ''),
        start: fecha,
        cliente_nombre: cliente,
        cliente_id: clienteId || null,
        servicio_nombre: servicio,
        empleado_nombre: empleado,
        empleado_id: empleadoId || null,
        telefono: telefono || null
      };

      console.log('Enviando cita:', nuevaCita);

      try {
        const res = await fetch('/api/citas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nuevaCita)
        });

        const result = await res.json();
        console.log('Respuesta del servidor:', result);

        if (res.ok) {
          console.log('✅ Cita guardada exitosamente, refrescando calendario...');
          console.log('📅 ID de la cita creada:', result.id);
          
          // Refrescar eventos del calendario
          console.log('🔄 Ejecutando calendar.refetchEvents()...');
          calendar.refetchEvents();
          
          // Pequeña pausa para asegurar que se actualice
          setTimeout(() => {
            console.log('🔄 Renderizando calendario...');
            calendar.render();
          }, 500);
          
          cerrarModal('citaModal');
          if (typeof Swal !== 'undefined') {
            Swal.fire('Éxito', 'Cita guardada exitosamente', 'success');
          } else {
            alert('Cita guardada exitosamente');
          }
          limpiarFormulario();
          
          // Refrescar eventos del calendario para mostrar la nueva cita
          calendar.refetchEvents();
        } else {
          console.error('Error del servidor:', result);
          if (typeof Swal !== 'undefined') {
            Swal.fire('Error', result.mensaje || 'No se pudo guardar la cita', 'error');
          } else {
            alert(result.mensaje || 'No se pudo guardar la cita');
          }
        }
      } catch (error) {
        console.error('Error de red:', error);
        if (typeof Swal !== 'undefined') {
          Swal.fire('Error', 'Error al conectar con el servidor', 'error');
        } else {
          alert('Error al guardar la cita');
        }
      }
    } else {
      form.reportValidity();
    }
    } finally {
      // Rehabilitar el botón siempre
      guardarBtn.disabled = false;
      guardarBtn.textContent = textoOriginal;
      guardarBtn.style.opacity = '1';
      guardarBtn.style.cursor = 'pointer';
    }
  });

  document.getElementById('confirmarEliminar').addEventListener('click', async () => {
    if (citaActual) {
      try {
        const res = await fetch(`/api/citas/${citaActual.id}`, { method: 'DELETE' });
        if (res.ok) { 
          calendar.refetchEvents(); 
          cerrarModal('eliminarModal');
          alert('Cita eliminada exitosamente');
        } else { 
          alert('No se pudo eliminar la cita'); 
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la cita');
      }
    }
  });

  document.getElementById('exportarExcel').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/citas');
      const citas = await res.json();
      const data = citas.map(cita => {
        const fecha = new Date(cita.start);
        const titleParts = cita.title.split(' - ');
        const cliente = titleParts[0] || 'Sin cliente';
        const servicio = titleParts[1] || 'Sin servicio';
        const empleadoPart = titleParts[2] || 'Sin empleado';
        // Remover el teléfono si existe (formato: "Empleado (telefono)")
        const empleado = empleadoPart.split(' (')[0];
        
        return {
          'Cliente': cliente,
          'Servicio': servicio,
          'Empleado': empleado,
          'Fecha': fecha.toLocaleDateString('es-ES'),
          'Hora': fecha.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Citas');
      XLSX.writeFile(wb, `citas_barbershop_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`);
      alert('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exportando citas:', error);
      alert('Error al exportar citas');
    }
  });

  // Event listeners para cerrar modales
  document.getElementById('closeModal').addEventListener('click', () => cerrarModal('citaModal'));
  document.getElementById('cancelarCita').addEventListener('click', () => cerrarModal('citaModal'));
  document.getElementById('closeEliminarModal').addEventListener('click', () => cerrarModal('eliminarModal'));
  document.getElementById('cancelarEliminar').addEventListener('click', () => cerrarModal('eliminarModal'));
});

// ===================================================
// FUNCIONES AUXILIARES
// ===================================================

function cambiarVista(vista) { 
  calendar.changeView(vista); 
}

function abrirModal(id) { 
  document.getElementById(id).style.display = 'flex'; 
}

function cerrarModal(id) { 
  document.getElementById(id).style.display = 'none';
  // Ocultar dropdowns al cerrar modal
  ocultarDropdownCliente();
  ocultarDropdownServicio();
  ocultarDropdownEmpleado();
}

function limpiarFormulario() {
  document.getElementById('citaForm').reset();
  document.getElementById('clienteSelected').value = '';
  document.getElementById('servicioSelected').value = '';
  document.getElementById('empleadoSelected').value = '';
  ocultarDropdownCliente();
  ocultarDropdownServicio();
  ocultarDropdownEmpleado();
}
