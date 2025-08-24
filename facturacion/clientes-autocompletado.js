// clientes-autocompletado.js
// Sistema de autocompletado para clientes en facturación

let todosLosClientes = [];
let clientesFiltrados = [];
let selectedIndex = -1;

// Inicializar autocompletado cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('clientes-autocompletado.js: DOM listo, inicializando...');
    // Esperar un poco para que factura.js se cargue primero
    setTimeout(() => {
        inicializarAutocompletadoClientes();
        cargarTodosLosClientes();
    }, 500);
});

// Inicializar el sistema de autocompletado
function inicializarAutocompletadoClientes() {
    const input = document.getElementById('clienteInput');
    const dropdown = document.getElementById('clientesList');
    
    if (!input || !dropdown) {
        console.log('Elementos de autocompletado no encontrados');
        return;
    }
    
    input.addEventListener('input', handleClienteInput);
    input.addEventListener('keydown', handleClienteKeydown);
    input.addEventListener('focus', handleClienteFocus);
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            ocultarDropdownClientes();
        }
    });
}

// Cargar todos los clientes NORMALES con información de tarjetas
async function cargarTodosLosClientes() {
    try {
        let clientes;
        
        // Cargar solo clientes normales (no preferenciales)
        const responseClientes = await fetch('/api/clientes/normales');
        if (!responseClientes.ok) {
            // Fallback: cargar todos y filtrar
            const fallbackResponse = await fetch('/api/clientes?limit=9999');
            if (!fallbackResponse.ok) throw new Error('Error al cargar clientes');
            const responseData = await fallbackResponse.json();
            const todosClientes = responseData.data || responseData; // Manejar respuesta con paginación
            // Filtrar solo clientes normales (categoria null, undefined, o 'normal')
            clientes = todosClientes.filter(c => !c.categoria || c.categoria === 'normal');
        } else {
            clientes = await responseClientes.json();
        }
        
        // Cargar tarjetas activas para verificar qué clientes tienen tarjeta
        const responseTarjetas = await fetch('/api/tarjetas-fidelidad');
        if (!responseTarjetas.ok) throw new Error('Error al cargar tarjetas');
        
        const tarjetas = await responseTarjetas.json();
        const clientesConTarjeta = new Set(
            tarjetas
                .filter(t => t.estado === 'activa')
                .map(t => t.cliente_id)
        );
        
        // Agregar información de tarjeta a cada cliente
        todosLosClientes = clientes.map(cliente => ({
            ...cliente,
            tieneTarjeta: clientesConTarjeta.has(cliente.id),
            tarjetaInfo: tarjetas.find(t => t.cliente_id === cliente.id && t.estado === 'activa') || null
        }));
        
        console.log('Clientes NORMALES cargados para autocompletado:', todosLosClientes.length);
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

// Manejar input del usuario
function handleClienteInput(e) {
    const query = e.target.value.trim();
    selectedIndex = -1;
    
    // Limpiar el cliente seleccionado si se está escribiendo
    document.getElementById('clienteSelected').value = '';
    
    if (query.length === 0) {
        mostrarTodosLosClientesFactura();
    } else {
        filtrarClientesFactura(query);
    }
}

// Manejar teclas de navegación
function handleClienteKeydown(e) {
    const dropdown = document.getElementById('clientesList');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            actualizarSeleccionCliente();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            actualizarSeleccionCliente();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                seleccionarClienteFactura(items[selectedIndex]);
            }
            break;
        case 'Escape':
            ocultarDropdownClientes();
            break;
    }
}

// Manejar focus del input
function handleClienteFocus() {
    const query = document.getElementById('clienteInput').value.trim();
    if (query.length === 0) {
        mostrarTodosLosClientesFactura();
    } else {
        filtrarClientesFactura(query);
    }
}

// Mostrar todos los clientes
function mostrarTodosLosClientesFactura() {
    clientesFiltrados = [...todosLosClientes].sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    mostrarDropdownClientes();
}

// Filtrar clientes por query
function filtrarClientesFactura(query) {
    const queryLower = query.toLowerCase();
    clientesFiltrados = todosLosClientes.filter(cliente => {
        const nombre = (cliente.nombre || '').toLowerCase();
        const dui = (cliente.dui || '').toLowerCase();
        return nombre.includes(queryLower) || dui.includes(queryLower);
    }).sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    mostrarDropdownClientes();
}

// Mostrar dropdown con resultados
function mostrarDropdownClientes() {
    const dropdown = document.getElementById('clientesList');
    
    if (clientesFiltrados.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No se encontraron clientes</div>';
    } else {
        dropdown.innerHTML = clientesFiltrados.map((cliente, index) => {
            const tarjetaBadge = cliente.tieneTarjeta 
                ? `<span class="tarjeta-badge tarjeta-activa"><i class="fas fa-credit-card"></i> ${cliente.tarjetaInfo.sellos_actuales}/10</span>`
                : `<span class="tarjeta-badge sin-tarjeta"><i class="fas fa-plus-circle"></i> Sin tarjeta</span>`;
            
            return `
                <div class="autocomplete-item" data-id="${cliente.id}" data-index="${index}">
                    <div class="cliente-info-row">
                        <div class="cliente-datos">
                            <div class="cliente-nombre">${cliente.nombre}</div>
                            <div class="cliente-dui">DUI: ${cliente.dui || 'Sin DUI'}</div>
                        </div>
                        ${tarjetaBadge}
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar event listeners a los items
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => seleccionarClienteFactura(item));
            item.addEventListener('mouseenter', () => {
                selectedIndex = parseInt(item.dataset.index);
                actualizarSeleccionCliente();
            });
        });
    }
    
    dropdown.classList.add('show');
}

// Ocultar dropdown
function ocultarDropdownClientes() {
    const dropdown = document.getElementById('clientesList');
    dropdown.classList.remove('show');
    selectedIndex = -1;
}

// Actualizar selección visual
function actualizarSeleccionCliente() {
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
function seleccionarClienteFactura(item) {
    const clienteId = item.dataset.id;
    const cliente = clientesFiltrados.find(c => c.id == clienteId);
    
    if (cliente) {
        document.getElementById('clienteInput').value = cliente.nombre;
        document.getElementById('clienteSelected').value = cliente.id;
        ocultarDropdownClientes();
        
        // Verificar tarjeta de fidelidad (si existe la función)
        if (typeof verificarTarjetaCliente === 'function') {
            verificarTarjetaCliente();
        }
    }
}

// Función para limpiar el cliente seleccionado (útil para reset del formulario)
function limpiarClienteSeleccionado() {
    document.getElementById('clienteInput').value = '';
    document.getElementById('clienteSelected').value = '';
    ocultarDropdownClientes();
}

// Función para obtener el cliente seleccionado (para usar en factura.js)
function obtenerClienteSeleccionado() {
    const clienteId = document.getElementById('clienteSelected').value;
    const clienteInput = document.getElementById('clienteInput').value.trim();
    
    // Si hay ID seleccionado, devolver el nombre del cliente
    if (clienteId) {
        return clienteInput; // El input ya contiene el nombre
    }
    
    // Si no hay ID pero hay texto, es "Cliente General"
    if (clienteInput === '') {
        return ''; // Cliente General
    }
    
    // Si escribió algo pero no seleccionó, también es Cliente General
    return '';
}

// Función para obtener el ID del cliente seleccionado (para tarjetas de fidelidad)
function obtenerClienteIdSeleccionado() {
    const clienteId = document.getElementById('clienteSelected').value;
    return clienteId || '';
}