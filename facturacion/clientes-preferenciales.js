// clientes-preferenciales.js
// Sistema de autocompletado para clientes preferenciales en facturación

let clientesPreferenciales = [];
let clientesPreferencialesFiltrados = [];
let selectedIndexPreferencial = -1;

// Inicializar autocompletado cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('clientes-preferenciales.js: DOM listo, inicializando...');
    // Esperar un poco para que factura.js se cargue primero
    setTimeout(() => {
        inicializarAutocompletadoPreferenciales();
        cargarClientesPreferenciales();
    }, 500);
});

// Inicializar el sistema de autocompletado para clientes preferenciales
function inicializarAutocompletadoPreferenciales() {
    const input = document.getElementById('clientePreferencialInput');
    const dropdown = document.getElementById('clientesPreferencialesList');
    
    if (!input || !dropdown) {
        console.log('Elementos de autocompletado preferenciales no encontrados');
        return;
    }
    
    input.addEventListener('input', handleClientePreferencialInput);
    input.addEventListener('keydown', handleClientePreferencialKeydown);
    input.addEventListener('focus', handleClientePreferencialFocus);
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            ocultarDropdownPreferenciales();
        }
    });
}

// Cargar todos los clientes preferenciales
async function cargarClientesPreferenciales() {
    try {
        const response = await fetch('/api/clientes/preferenciales');
        if (!response.ok) throw new Error('Error al cargar clientes preferenciales');
        
        clientesPreferenciales = await response.json();
        console.log('Clientes preferenciales cargados:', clientesPreferenciales.length);
    } catch (error) {
        console.error('Error al cargar clientes preferenciales:', error);
        // Fallback: filtrar desde todos los clientes
        try {
            const response = await fetch('/api/clientes?limit=9999');
            if (response.ok) {
                const responseData = await response.json();
                const todosClientes = responseData.data || responseData; // Manejar respuesta con paginación
                clientesPreferenciales = todosClientes.filter(c => c.categoria === 'preferencial');
                console.log('Clientes preferenciales cargados (fallback):', clientesPreferenciales.length);
            }
        } catch (fallbackError) {
            console.error('Error en fallback:', fallbackError);
        }
    }
}

// Manejar input del usuario
function handleClientePreferencialInput(e) {
    const query = e.target.value.trim();
    selectedIndexPreferencial = -1;
    
    // Limpiar el cliente seleccionado si se está escribiendo
    document.getElementById('clientePreferencialSelected').value = '';
    
    if (query.length === 0) {
        mostrarTodosLosClientesPreferenciales();
    } else {
        filtrarClientesPreferenciales(query);
    }
}

// Manejar teclas de navegación
function handleClientePreferencialKeydown(e) {
    const dropdown = document.getElementById('clientesPreferencialesList');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndexPreferencial = Math.min(selectedIndexPreferencial + 1, items.length - 1);
            actualizarSeleccionPreferencial();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedIndexPreferencial = Math.max(selectedIndexPreferencial - 1, -1);
            actualizarSeleccionPreferencial();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndexPreferencial >= 0 && items[selectedIndexPreferencial]) {
                seleccionarClientePreferencial(items[selectedIndexPreferencial]);
            }
            break;
        case 'Escape':
            ocultarDropdownPreferenciales();
            break;
    }
}

// Manejar focus del input
function handleClientePreferencialFocus() {
    const query = document.getElementById('clientePreferencialInput').value.trim();
    if (query.length === 0) {
        mostrarTodosLosClientesPreferenciales();
    } else {
        filtrarClientesPreferenciales(query);
    }
}

// Mostrar todos los clientes preferenciales
function mostrarTodosLosClientesPreferenciales() {
    clientesPreferencialesFiltrados = [...clientesPreferenciales].sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    mostrarDropdownPreferenciales();
}

// Filtrar clientes preferenciales por query
function filtrarClientesPreferenciales(query) {
    const queryLower = query.toLowerCase();
    clientesPreferencialesFiltrados = clientesPreferenciales.filter(cliente => {
        const nombre = (cliente.nombre || '').toLowerCase();
        const dui = (cliente.dui || '').toLowerCase();
        const empresa = (cliente.empresa || '').toLowerCase();
        return nombre.includes(queryLower) || 
               dui.includes(queryLower) || 
               empresa.includes(queryLower);
    }).sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    mostrarDropdownPreferenciales();
}

// Mostrar dropdown con resultados preferenciales
function mostrarDropdownPreferenciales() {
    const dropdown = document.getElementById('clientesPreferencialesList');
    
    if (!dropdown) {
        console.log('Dropdown preferenciales no encontrado');
        return;
    }
    
    if (clientesPreferencialesFiltrados.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No se encontraron clientes preferenciales</div>';
    } else {
        dropdown.innerHTML = clientesPreferencialesFiltrados.map((cliente, index) => {
            return `
                <div class="autocomplete-item autocomplete-preferencial" data-id="${cliente.id}" data-index="${index}">
                    <div class="cliente-info-row">
                        <div class="cliente-datos">
                            <div class="cliente-nombre">${cliente.nombre}</div>
                            <div class="cliente-empresa">
                                <i class="fas fa-building"></i> ${cliente.empresa || 'Sin empresa'}
                            </div>
                            <div class="cliente-dui">DUI: ${cliente.dui || 'Sin DUI'}</div>
                        </div>
                        <div class="descuento-info">
                            <span class="descuento-badge">
                                <i class="fas fa-percentage"></i> ${cliente.descuento_porcentaje || 0}%
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar event listeners a los items
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => seleccionarClientePreferencial(item));
            item.addEventListener('mouseenter', () => {
                selectedIndexPreferencial = parseInt(item.dataset.index);
                actualizarSeleccionPreferencial();
            });
        });
    }
    
    dropdown.classList.add('show');
}

// Ocultar dropdown preferenciales
function ocultarDropdownPreferenciales() {
    const dropdown = document.getElementById('clientesPreferencialesList');
    dropdown.classList.remove('show');
    selectedIndexPreferencial = -1;
}

// Actualizar selección visual
function actualizarSeleccionPreferencial() {
    const dropdown = document.getElementById('clientesPreferencialesList');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    items.forEach((item, index) => {
        if (index === selectedIndexPreferencial) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Seleccionar cliente preferencial
function seleccionarClientePreferencial(item) {
    const clienteId = item.dataset.id;
    const cliente = clientesPreferencialesFiltrados.find(c => c.id == clienteId);
    
    if (cliente) {
        document.getElementById('clientePreferencialInput').value = cliente.nombre;
        document.getElementById('clientePreferencialSelected').value = cliente.id;
        ocultarDropdownPreferenciales();
        
        // Aplicar descuento automáticamente
        aplicarDescuentoAutomatico(cliente);
        
        // Mostrar información del cliente preferencial
        mostrarInfoClientePreferencial(cliente);
    }
}

// Aplicar descuento automático del cliente preferencial
function aplicarDescuentoAutomatico(cliente) {
    const descuentoInput = document.getElementById('descuento');
    if (descuentoInput && cliente.descuento_porcentaje) {
        descuentoInput.value = cliente.descuento_porcentaje;
        
        // Trigger evento para recalcular totales si existe la función
        if (typeof calcularTotales === 'function') {
            calcularTotales();
        }
        
        console.log(`✅ Descuento automático aplicado: ${cliente.descuento_porcentaje}%`);
    }
}

// Mostrar información del cliente preferencial seleccionado
function mostrarInfoClientePreferencial(cliente) {
    const infoSection = document.getElementById('clientePreferencialInfo');
    if (infoSection) {
        infoSection.innerHTML = `
            <div class="cliente-preferencial-card">
                <h4><i class="fas fa-star"></i> Cliente Preferencial Seleccionado</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Cliente:</label>
                        <span>${cliente.nombre}</span>
                    </div>
                    <div class="info-item">
                        <label>Empresa:</label>
                        <span>${cliente.empresa || 'Sin empresa'}</span>
                    </div>
                    <div class="info-item">
                        <label>Descuento:</label>
                        <span class="descuento-value">${cliente.descuento_porcentaje || 0}%</span>
                    </div>
                </div>
            </div>
        `;
        infoSection.style.display = 'block';
    }
}

// Función para limpiar el cliente preferencial seleccionado
function limpiarClientePreferencialSeleccionado() {
    document.getElementById('clientePreferencialInput').value = '';
    document.getElementById('clientePreferencialSelected').value = '';
    ocultarDropdownPreferenciales();
    
    const infoSection = document.getElementById('clientePreferencialInfo');
    if (infoSection) {
        infoSection.style.display = 'none';
    }
    
    // Limpiar descuento aplicado
    const descuentoInput = document.getElementById('descuento');
    if (descuentoInput) {
        descuentoInput.value = '';
        if (typeof calcularTotales === 'function') {
            calcularTotales();
        }
    }
}

// Función para obtener el cliente preferencial seleccionado
function obtenerClientePreferencialSeleccionado() {
    const clienteId = document.getElementById('clientePreferencialSelected').value;
    const clienteInput = document.getElementById('clientePreferencialInput').value.trim();
    
    if (clienteId) {
        return clienteInput;
    }
    
    return '';
}

// Función para obtener el ID del cliente preferencial seleccionado
function obtenerClientePreferencialIdSeleccionado() {
    const clienteId = document.getElementById('clientePreferencialSelected').value;
    return clienteId || '';
}

// Función para obtener información completa del cliente preferencial
function obtenerInfoClientePreferencial() {
    const clienteId = document.getElementById('clientePreferencialSelected').value;
    return clientesPreferencialesFiltrados.find(c => c.id == clienteId) || null;
}