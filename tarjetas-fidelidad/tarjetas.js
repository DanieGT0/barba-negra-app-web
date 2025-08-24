// tarjetas.js
// JavaScript para la gestión de tarjetas de fidelidad

let tarjetas = [];
let clientes = [];
let clientesFiltrados = [];
let selectedIndex = -1;

// Función helper para alertas con estilo oscuro
function mostrarAlerta(tipo, titulo, mensaje) {
    const config = {
        title: `<span style="color: #00fff5;"><i class="fas fa-${tipo === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i> ${titulo}</span>`,
        text: mensaje,
        icon: tipo,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#ffffff',
        iconColor: tipo === 'error' ? '#dc3545' : '#28a745',
        confirmButtonColor: '#00fff5',
        confirmButtonText: 'Entendido',
        customClass: {
            popup: 'swal-dark-popup'
        }
    };
    
    return Swal.fire(config);
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
    cargarTarjetas();
    cargarEmpleados();
    
    // Event listeners
    document.getElementById('formNuevaTarjeta').addEventListener('submit', crearNuevaTarjeta);
    document.getElementById('formSelloManual').addEventListener('submit', agregarSelloManual);
    
    // Event listeners para autocompletado
    inicializarAutocompletado();
});

// Cargar clientes disponibles (sin tarjeta activa)
async function cargarClientes() {
    try {
        const response = await fetch('/api/clientes-disponibles');
        if (!response.ok) throw new Error('Error al cargar clientes');
        
        clientes = await response.json();
        console.log('Clientes cargados:', clientes.length);
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
    }
}

// Cargar empleados para el select del modal
async function cargarEmpleados() {
    try {
        const response = await fetch('/api/empleados');
        if (!response.ok) throw new Error('Error al cargar empleados');
        
        const empleados = await response.json();
        const select = document.getElementById('empleadoSello');
        
        // Limpiar opciones existentes excepto la primera
        select.innerHTML = '<option value="">Seleccionar empleado...</option>';
        
        // Agregar empleados al select
        empleados.forEach(empleado => {
            const option = document.createElement('option');
            option.value = empleado.nombre;
            option.textContent = empleado.nombre;
            select.appendChild(option);
        });
        
        console.log('Empleados cargados:', empleados.length);
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        // Si falla, mantener como input de texto
        console.log('Fallback: manteniendo input de texto para empleado');
    }
}

// Inicializar autocompletado
function inicializarAutocompletado() {
    const input = document.getElementById('clienteInput');
    const dropdown = document.getElementById('clientesList');
    
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('focus', handleFocus);
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            ocultarDropdown();
        }
    });
}

// Manejar input del usuario
function handleInput(e) {
    const query = e.target.value.trim();
    selectedIndex = -1;
    
    if (query.length === 0) {
        mostrarTodosLosClientes();
    } else {
        filtrarClientes(query);
    }
}

// Manejar teclas de navegación
function handleKeydown(e) {
    const dropdown = document.getElementById('clientesList');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            actualizarSeleccion();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            actualizarSeleccion();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                seleccionarCliente(items[selectedIndex]);
            }
            break;
        case 'Escape':
            ocultarDropdown();
            break;
    }
}

// Manejar focus del input
function handleFocus() {
    const query = document.getElementById('clienteInput').value.trim();
    if (query.length === 0) {
        mostrarTodosLosClientes();
    } else {
        filtrarClientes(query);
    }
}

// Mostrar todos los clientes
function mostrarTodosLosClientes() {
    clientesFiltrados = [...clientes];
    mostrarDropdown();
}

// Filtrar clientes por query
function filtrarClientes(query) {
    const queryLower = query.toLowerCase();
    clientesFiltrados = clientes.filter(cliente => {
        const nombre = (cliente.nombre || '').toLowerCase();
        const dui = (cliente.dui || '').toLowerCase();
        return nombre.includes(queryLower) || dui.includes(queryLower);
    });
    mostrarDropdown();
}

// Mostrar dropdown con resultados
function mostrarDropdown() {
    const dropdown = document.getElementById('clientesList');
    
    if (clientesFiltrados.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No se encontraron clientes</div>';
    } else {
        dropdown.innerHTML = clientesFiltrados.map((cliente, index) => `
            <div class="autocomplete-item" data-id="${cliente.id}" data-index="${index}">
                <div class="cliente-nombre">${cliente.nombre}</div>
                <div class="cliente-dui">DUI: ${cliente.dui || 'Sin DUI'}</div>
            </div>
        `).join('');
        
        // Agregar event listeners a los items
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => seleccionarCliente(item));
            item.addEventListener('mouseenter', () => {
                selectedIndex = parseInt(item.dataset.index);
                actualizarSeleccion();
            });
        });
    }
    
    dropdown.classList.add('show');
}

// Ocultar dropdown
function ocultarDropdown() {
    const dropdown = document.getElementById('clientesList');
    dropdown.classList.remove('show');
    selectedIndex = -1;
}

// Actualizar selección visual
function actualizarSeleccion() {
    const dropdown = document.getElementById('clientesList');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Seleccionar cliente
function seleccionarCliente(item) {
    const clienteId = item.dataset.id;
    const cliente = clientesFiltrados.find(c => c.id == clienteId);
    
    if (cliente) {
        document.getElementById('clienteInput').value = cliente.nombre;
        document.getElementById('clienteSelected').value = cliente.id;
        ocultarDropdown();
    }
}

// Cargar todas las tarjetas
async function cargarTarjetas() {
    try {
        const response = await fetch('/api/tarjetas-fidelidad');
        if (!response.ok) throw new Error('Error al cargar tarjetas');
        
        tarjetas = await response.json();
        mostrarTarjetas(tarjetas);
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron cargar las tarjetas', 'error');
    }
}

// Mostrar tarjetas en la interfaz
function mostrarTarjetas(listaTarjetas) {
    const container = document.getElementById('listaTarjetas');
    
    if (listaTarjetas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card" style="font-size: 4em; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No hay tarjetas de fidelidad</h3>
                <p>Crea la primera tarjeta para comenzar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = listaTarjetas.map(tarjeta => crearTarjetaHTML(tarjeta)).join('');
}

// Crear HTML para una tarjeta
function crearTarjetaHTML(tarjeta) {
    const progreso = (tarjeta.sellos_actuales / 10) * 100;
    const sellosVisuales = generarSellosVisuales(tarjeta.sellos_actuales);
    
    return `
        <div class="tarjeta-card" data-estado="${tarjeta.estado}">
            <!-- Header compacto con código y estado -->
            <div class="tarjeta-header">
                <div class="codigo-tarjeta">${tarjeta.codigo}</div>
                <div class="estado-badge estado-${tarjeta.estado}">
                    ${tarjeta.estado === 'activa' ? 'ACTIVA' : 'COMPLETADA'}
                </div>
            </div>
            
            <!-- Información del cliente -->
            <div class="cliente-info-compact" style="margin-top: 15px;">
                <h4 style="margin: 0 0 5px 0; font-size: 1.05em;"><i class="fas fa-user" style="margin-right: 8px; color: #00fff5;"></i>${tarjeta.cliente_nombre || 'Sin nombre'}</h4>
                <p style="margin: 0 0 12px 0; font-size: 0.85em; opacity: 0.8;"><i class="fas fa-id-card" style="margin-right: 8px;"></i>DUI: ${tarjeta.cliente_dui || 'Sin DUI'}</p>
                
                <!-- Progreso de sellos -->
                <div style="margin-bottom: 12px;">
                    <span style="font-weight: bold; color: #00fff5; font-size: 0.9em;">Sellos: ${tarjeta.sellos_actuales}/10</span>
                    <div class="progreso-container" style="margin-top: 5px;">
                        <div class="progreso-bar" style="width: ${progreso}%"></div>
                    </div>
                </div>
                
                <!-- Sellos visuales -->
                <div class="sellos-visuales" style="display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; margin-bottom: 10px;">
                    ${sellosVisuales}
                </div>
                
                <!-- Fecha en la parte inferior -->
                <div style="font-size: 0.75em; opacity: 0.6; text-align: center;">
                    <i class="fas fa-calendar"></i> ${formatearFecha(tarjeta.fecha_creacion)}
                </div>
            </div>

            <!-- Alerta de próximo gratis -->
            ${tarjeta.sellos_actuales === 9 && tarjeta.estado === 'activa' ? `
                <div style="margin: 15px 0; padding: 8px 12px; background: rgba(255, 193, 7, 0.15); border-radius: 8px; border-left: 3px solid #ffc107; font-size: 0.9em;">
                    <strong><i class="fas fa-gift" style="color: #ffc107; margin-right: 5px;"></i>¡Próximo corte GRATIS!</strong>
                </div>
            ` : ''}

            <!-- Botones de acción -->
            <div class="tarjeta-actions" style="margin-top: 15px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                ${tarjeta.estado === 'activa' ? `
                    <button class="btn-action btn-primary" onclick="abrirModalSello(${tarjeta.id})" title="Agregar sello">
                        <i class="fas fa-stamp"></i> <span style="font-size: 0.8em;">Agregar</span>
                    </button>
                    ${tarjeta.sellos_actuales > 0 ? `
                        <button class="btn-action btn-warning btn-icon-only" onclick="quitarSello(${tarjeta.id})" title="Quitar sello">
                            <i class="fas fa-minus"></i>
                        </button>
                    ` : ''}
                ` : ''}
                <button class="btn-action btn-secondary" onclick="verHistorial(${tarjeta.id})" title="Ver historial">
                    <i class="fas fa-history"></i> <span style="font-size: 0.8em;">Historial</span>
                </button>
                <button class="btn-action btn-danger btn-icon-only" onclick="eliminarTarjeta(${tarjeta.id})" title="Eliminar tarjeta">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Generar sellos visuales
function generarSellosVisuales(sellos_actuales) {
    let html = '';
    for (let i = 1; i <= 10; i++) {
        if (i <= sellos_actuales) {
            html += `<div style="width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #00fff5, #bb86fc); color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 0.65em; font-weight: bold; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">${i}</div>`;
        } else if (i === 10 && sellos_actuales === 9) {
            html += `<div style="width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #ffc107, #ff8c00); color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 0.6em; animation: pulse 1.5s infinite; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.4);"><i class="fas fa-gift"></i></div>`;
        } else {
            html += `<div style="width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.4); border: 1px dashed rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center; font-size: 0.65em;">${i}</div>`;
        }
    }
    return html;
}

// Crear nueva tarjeta
async function crearNuevaTarjeta(e) {
    e.preventDefault();
    
    // Obtener el botón y proteger contra múltiples clics
    const btnCrearTarjeta = document.getElementById('btnCrearTarjeta');
    const textoOriginal = btnCrearTarjeta.innerHTML;
    
    // Deshabilitar el botón
    btnCrearTarjeta.disabled = true;
    btnCrearTarjeta.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando Tarjeta...';
    btnCrearTarjeta.style.opacity = '0.6';
    btnCrearTarjeta.style.cursor = 'not-allowed';
    
    try {
        const cliente_id = document.getElementById('clienteSelected').value;
        const clienteInput = document.getElementById('clienteInput').value.trim();
        const codigoManual = document.getElementById('codigoManual').value.trim();
        
        if (!cliente_id || !clienteInput) {
            mostrarAlerta('error', 'Error', 'Debe seleccionar un cliente válido');
            return;
        }

        const requestBody = { cliente_id: parseInt(cliente_id) };
        if (codigoManual) {
            requestBody.codigo_manual = codigoManual;
        }

        const response = await fetch('/api/tarjetas-fidelidad', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                title: '<span style="color: #00fff5;"><i class="fas fa-check-circle"></i> Éxito</span>',
                text: result.mensaje,
                icon: 'success',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
                iconColor: '#28a745',
                confirmButtonColor: '#00fff5',
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'swal-dark-popup'
                }
            });
            // Limpiar formulario
            document.getElementById('clienteInput').value = '';
            document.getElementById('clienteSelected').value = '';
            document.getElementById('codigoManual').value = '';
            ocultarDropdown();
            cargarClientes(); // Recargar clientes disponibles
            cargarTarjetas(); // Recargar tarjetas
        } else {
            mostrarAlerta('error', 'Error', result.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo crear la tarjeta', 'error');
    } finally {
        // Rehabilitar el botón siempre, incluso si hay error
        btnCrearTarjeta.disabled = false;
        btnCrearTarjeta.innerHTML = textoOriginal;
        btnCrearTarjeta.style.opacity = '1';
        btnCrearTarjeta.style.cursor = 'pointer';
    }
}

// Abrir modal para agregar sello manual
function abrirModalSello(tarjeta_id) {
    document.getElementById('tarjetaIdModal').value = tarjeta_id;
    document.getElementById('modalSello').style.display = 'block';
    
    // Enfocar el select de empleados
    setTimeout(() => {
        document.getElementById('empleadoSello').focus();
    }, 100);
}

// Cerrar modal de sello
function cerrarModalSello() {
    document.getElementById('modalSello').style.display = 'none';
    document.getElementById('formSelloManual').reset();
}

// Agregar sello manual
async function agregarSelloManual(e) {
    e.preventDefault();
    
    const tarjeta_id = document.getElementById('tarjetaIdModal').value;
    const empleado = document.getElementById('empleadoSello').value;
    const observaciones = document.getElementById('observacionesSello').value;

    try {
        const response = await fetch(`/api/tarjetas-fidelidad/${tarjeta_id}/sello`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ empleado, observaciones })
        });

        const result = await response.json();

        if (response.ok) {
            if (result.tarjeta_completada) {
                Swal.fire({
                    title: '¡Felicitaciones!',
                    text: result.mensaje,
                    icon: 'success',
                    confirmButtonText: 'Generar nueva tarjeta'
                });
            } else {
                let mensaje = result.mensaje;
                if (result.proximo_gratis) {
                    mensaje += '\n¡El próximo corte será GRATIS!';
                }
                
                Swal.fire({
                    title: '<span style="color: #00fff5;"><i class="fas fa-stamp"></i> Sello Agregado</span>',
                    text: mensaje,
                    icon: 'success',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#ffffff',
                    iconColor: '#28a745',
                    confirmButtonColor: '#00fff5',
                    confirmButtonText: 'Entendido',
                    customClass: {
                        popup: 'swal-dark-popup'
                    }
                });
            }
            
            cerrarModalSello();
            cargarTarjetas();
            cargarClientes(); // Recargar por si se completó una tarjeta
        } else {
            mostrarAlerta('error', 'Error', result.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo agregar el sello', 'error');
    }
}

// Ver historial de una tarjeta
async function verHistorial(tarjeta_id) {
    try {
        const response = await fetch(`/api/tarjetas-fidelidad/${tarjeta_id}/historial`);
        if (!response.ok) throw new Error('Error al cargar historial');
        
        const historial = await response.json();
        
        let html = `
            <div style="
                max-height: 500px; 
                overflow-y: auto; 
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 10px;
                padding: 20px;
                color: #ffffff;
            ">
        `;
        
        if (historial.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                    <i class="fas fa-history" style="font-size: 3em; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No hay historial de sellos para esta tarjeta.</p>
                </div>
            `;
        } else {
            html += `
                <style>
                    .historial-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    }
                    .historial-table th {
                        background: linear-gradient(135deg, #00fff5, #bb86fc);
                        color: #1a1a2e;
                        padding: 12px 8px;
                        font-weight: bold;
                        font-size: 0.9em;
                        text-align: center;
                        border: none;
                    }
                    .historial-table td {
                        padding: 10px 8px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        text-align: center;
                        font-size: 0.85em;
                        color: #ffffff;
                    }
                    .historial-table tr:nth-child(even) {
                        background: rgba(255,255,255,0.05);
                    }
                    .historial-table tr:hover {
                        background: rgba(0,255,245,0.1);
                    }
                    .badge-automatico {
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.75em;
                        font-weight: bold;
                    }
                    .badge-manual {
                        background: linear-gradient(135deg, #ffc107, #fd7e14);
                        color: #1a1a2e;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.75em;
                        font-weight: bold;
                    }
                    .badge-quitar {
                        background: linear-gradient(135deg, #dc3545, #e74c3c);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.75em;
                        font-weight: bold;
                    }
                </style>
                <table class="historial-table">
                    <thead>
                        <tr>
                            <th><i class="fas fa-calendar"></i> Fecha</th>
                            <th><i class="fas fa-user"></i> Empleado</th>
                            <th><i class="fas fa-comment"></i> Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            historial.forEach(registro => {
                html += `
                    <tr>
                        <td>${formatearFecha(registro.fecha)}</td>
                        <td style="font-weight: 500;">${registro.empleado}</td>
                        <td style="text-align: left; max-width: 300px; font-size: 0.85em; opacity: 0.9;">
                            ${registro.observaciones || '-'}
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
        }
        
        html += '</div>';
        
        Swal.fire({
            title: '<span style="color: #00fff5;"><i class="fas fa-history"></i> Historial de Sellos</span>',
            html: html,
            width: '90%',
            background: 'transparent',
            showCloseButton: true,
            focusConfirm: false,
            customClass: {
                popup: 'swal-dark-popup'
            }
        });
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo cargar el historial', 'error');
    }
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const total = tarjetas.length;
    const activas = tarjetas.filter(t => t.estado === 'activa').length;
    const completadas = tarjetas.filter(t => t.estado === 'completada').length;
    const totalSellos = tarjetas.reduce((sum, t) => sum + t.sellos_actuales, 0);

    document.getElementById('totalTarjetas').textContent = total;
    document.getElementById('tarjetasActivas').textContent = activas;
    document.getElementById('tarjetasCompletadas').textContent = completadas;
    document.getElementById('totalSellos').textContent = totalSellos;
}

// Aplicar filtros
function aplicarFiltros() {
    const estado = document.getElementById('filtroEstado').value;
    const cliente = document.getElementById('filtroCliente').value.toLowerCase();

    const tarjetasFiltradas = tarjetas.filter(tarjeta => {
        const coincideEstado = !estado || tarjeta.estado === estado;
        const coincideCliente = !cliente || (tarjeta.cliente_nombre && tarjeta.cliente_nombre.toLowerCase().includes(cliente));
        
        return coincideEstado && coincideCliente;
    });

    mostrarTarjetas(tarjetasFiltradas);
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroCliente').value = '';
    mostrarTarjetas(tarjetas);
}

// Formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES');
}

// Eliminar tarjeta
async function eliminarTarjeta(tarjeta_id) {
    const confirmar = await Swal.fire({
        title: '¿Eliminar tarjeta?',
        text: 'Esta acción no se puede deshacer. Se eliminará la tarjeta y todo su historial.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    try {
        const response = await fetch(`/api/tarjetas-fidelidad/${tarjeta_id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                title: '<span style="color: #00fff5;"><i class="fas fa-trash"></i> Tarjeta Eliminada</span>',
                text: result.mensaje,
                icon: 'success',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
                iconColor: '#28a745',
                confirmButtonColor: '#00fff5',
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'swal-dark-popup'
                }
            });
            cargarTarjetas();
            cargarClientes(); // Recargar clientes disponibles
        } else {
            mostrarAlerta('error', 'Error', result.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo eliminar la tarjeta', 'error');
    }
}

// Quitar sello
async function quitarSello(tarjeta_id) {
    const confirmar = await Swal.fire({
        title: '¿Quitar un sello?',
        text: 'Se eliminará el último sello agregado.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    try {
        const response = await fetch(`/api/tarjetas-fidelidad/${tarjeta_id}/quitar-sello`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ empleado: 'Administrador' })
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                title: '<span style="color: #00fff5;"><i class="fas fa-minus-circle"></i> Sello Quitado</span>',
                text: result.mensaje,
                icon: 'success',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
                iconColor: '#28a745',
                confirmButtonColor: '#00fff5',
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'swal-dark-popup'
                }
            });
            cargarTarjetas();
        } else {
            mostrarAlerta('error', 'Error', result.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo quitar el sello', 'error');
    }
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalSello');
    if (event.target === modal) {
        cerrarModalSello();
    }
}