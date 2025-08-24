/**
 * ===================================================
 * PAGINATION-SCRIPT.JS - MODIFICADO PARA MOSTRAR SIEMPRE
 * Script universal para paginación de tablas
 * Incluye este archivo en tus HTML existentes
 * ===================================================
 */

/**
 * Clase universal para manejar paginación de tablas
 * Funciona con cualquier tabla existente sin modificar el HTML
 */
class UniversalTablePagination {
  constructor(options) {
    // Configuración por defecto
    this.config = {
      tableSelector: '#tablaNomina', // Selector de la tabla
      recordsPerPage: 25,
      maxVisiblePages: 5,
      showRecordsInfo: true,
      showRecordsSelector: true,
      showJumpToPage: true,
      responsive: true,
      alwaysShow: true, // NUEVO: Siempre mostrar paginación
      ...options
    };
    
    // Datos y estado
    this.originalData = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.totalPages = 0;
    
    // Elementos DOM
    this.table = null;
    this.tbody = null;
    this.paginationContainer = null;
    
    this.init();
  }
  
  /**
   * Inicializar la paginación
   */
  init() {
    this.table = document.querySelector(this.config.tableSelector);
    if (!this.table) {
      console.error(`Tabla no encontrada: ${this.config.tableSelector}`);
      return;
    }
    
    this.tbody = this.table.querySelector('tbody');
    if (!this.tbody) {
      console.error('No se encontró tbody en la tabla');
      return;
    }
    
    // Extraer datos originales de la tabla
    this.extractOriginalData();
    
    // Crear contenedor de paginación
    this.createPaginationContainer();
    
    // Renderizar primera página
    this.render();
    
    console.log(`✅ Paginación inicializada para ${this.config.tableSelector}`);
  }
  
  /**
   * Extraer datos originales de las filas de la tabla
   */
  extractOriginalData() {
    const rows = Array.from(this.tbody.querySelectorAll('tr'));
    this.originalData = rows.map((row, index) => ({
      index,
      element: row.cloneNode(true),
      html: row.outerHTML,
      text: row.textContent.toLowerCase() // Para búsquedas
    }));
    this.filteredData = [...this.originalData];
    console.log(`📊 Extraídos ${this.originalData.length} registros`);
  }
  
  /**
   * Crear contenedor de paginación
   */
  createPaginationContainer() {
    // Buscar si ya existe un contenedor
    this.paginationContainer = document.querySelector('.pagination-container');
    
    if (!this.paginationContainer) {
      this.paginationContainer = document.createElement('div');
      this.paginationContainer.className = 'pagination-container';
      
      // Insertar después de la tabla
      const tableParent = this.table.closest('.table-responsive') || this.table.parentNode;
      tableParent.parentNode.insertBefore(this.paginationContainer, tableParent.nextSibling);
    }
    
    this.paginationContainer.innerHTML = this.getPaginationHTML();
    this.bindEvents();
  }
  
  /**
   * Generar HTML del contenedor de paginación
   */
  getPaginationHTML() {
    return `
      <!-- Información de registros -->
      <div class="pagination-info">
        <div class="records-count">
          <span id="recordsInfo">Mostrando 0 de 0 registros</span>
        </div>
        
        ${this.config.showRecordsSelector ? `
        <div class="records-per-page">
          <label for="recordsPerPage">Mostrar:</label>
          <select id="recordsPerPage">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25" ${this.config.recordsPerPage === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${this.config.recordsPerPage === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${this.config.recordsPerPage === 100 ? 'selected' : ''}>100</option>
          </select>
          <span>registros por página</span>
        </div>
        ` : ''}
      </div>
      
      <!-- Controles de paginación -->
      <div class="pagination-controls" id="paginationControls">
        <!-- Los botones se generan dinámicamente -->
      </div>
      
      ${this.config.showJumpToPage ? `
      <div class="pagination-jump">
        <span>Ir a página:</span>
        <input type="number" id="jumpToPage" min="1" max="1">
        <button class="jump-btn" onclick="window.universalPagination.jumpToPage()">Ir</button>
      </div>
      ` : ''}
    `;
  }
  
  /**
   * Vincular eventos
   */
  bindEvents() {
    // Selector de registros por página
    if (this.config.showRecordsSelector) {
      const recordsSelect = document.getElementById('recordsPerPage');
      if (recordsSelect) {
        recordsSelect.addEventListener('change', (e) => {
          this.config.recordsPerPage = parseInt(e.target.value);
          this.currentPage = 1;
          this.render();
        });
      }
    }
  }
  
  /**
   * Actualizar datos (para cuando se filtran externamente)
   */
  updateData(newData = null) {
    if (newData) {
      // Si se proporcionan nuevos datos como array de objetos
      this.filteredData = newData.map((item, index) => ({
        index,
        element: null,
        html: this.createRowFromData(item),
        text: Object.values(item).join(' ').toLowerCase()
      }));
    } else {
      // Extraer datos actuales de la tabla
      this.extractOriginalData();
    }
    this.currentPage = 1;
    this.render();
  }
  
  /**
   * Crear fila HTML a partir de datos
   */
  createRowFromData(data) {
    // Esta función debe ser sobrescrita por cada implementación específica
    console.warn('createRowFromData debe ser implementada para datos externos');
    return '<tr><td>Error: función no implementada</td></tr>';
  }
  
  /**
   * Filtrar datos por texto
   */
  filter(searchText) {
    if (!searchText || searchText.trim() === '') {
      this.filteredData = [...this.originalData];
    } else {
      const search = searchText.toLowerCase();
      this.filteredData = this.originalData.filter(row => 
        row.text.includes(search)
      );
    }
    this.currentPage = 1;
    this.render();
  }
  
  /**
   * Renderizar tabla y paginación
   */
  render() {
    this.calculatePagination();
    this.renderTable();
    this.renderPaginationControls();
    this.updateInfo();
  }
  
  /**
   * Calcular datos de paginación
   */
  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.config.recordsPerPage);
    this.totalPages = Math.max(1, this.totalPages);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.currentPage = Math.max(1, this.currentPage);
  }
  
  /**
   * Renderizar filas de la tabla
   */
  renderTable() {
    if (!this.tbody) return;
    
    // Mostrar indicador de carga
    this.tbody.innerHTML = '<tr><td colspan="100%" class="text-center">Cargando...</td></tr>';
    
    setTimeout(() => {
      if (this.filteredData.length === 0) {
        this.tbody.innerHTML = `
          <tr>
            <td colspan="100%" class="table-no-data" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6); background: transparent !important;">
              <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i><br>
              <p>No se encontraron registros</p>
            </td>
          </tr>
        `;
        return;
      }
      
      const startIndex = (this.currentPage - 1) * this.config.recordsPerPage;
      const endIndex = startIndex + this.config.recordsPerPage;
      const pageData = this.filteredData.slice(startIndex, endIndex);
      
      this.tbody.innerHTML = '';
      pageData.forEach(row => {
        if (row.element) {
          this.tbody.appendChild(row.element.cloneNode(true));
        } else {
          this.tbody.innerHTML += row.html;
        }
      });
    }, 100);
  }
  
  /**
   * Renderizar controles de paginación - MODIFICADO PARA MOSTRAR SIEMPRE
   */
  renderPaginationControls() {
    const controls = document.getElementById('paginationControls');
    if (!controls) return;
    
    // CAMBIO: Siempre mostrar controles, incluso con 1 página
    let html = '';
    
    // Botón Primera página
    html += `<button class="pagination-btn first ${this.currentPage === 1 ? 'disabled' : ''}" 
             onclick="window.universalPagination.goToPage(1)" 
             ${this.currentPage === 1 ? 'disabled' : ''}>
             <i class="fas fa-angle-double-left"></i>
            </button>`;
    
    // Botón Anterior
    html += `<button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
             onclick="window.universalPagination.goToPage(${this.currentPage - 1})" 
             ${this.currentPage === 1 ? 'disabled' : ''}>
             <i class="fas fa-angle-left"></i>
            </button>`;
    
    // Páginas numéricas
    const { start, end } = this.getVisiblePageRange();
    
    // Mostrar primera página y puntos suspensivos si es necesario
    if (start > 1) {
      html += `<button class="pagination-btn" onclick="window.universalPagination.goToPage(1)">1</button>`;
      if (start > 2) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }
    
    // Páginas visibles
    for (let i = start; i <= end; i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
               onclick="window.universalPagination.goToPage(${i})">${i}</button>`;
    }
    
    // Mostrar última página y puntos suspensivos si es necesario
    if (end < this.totalPages) {
      if (end < this.totalPages - 1) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
      html += `<button class="pagination-btn" onclick="window.universalPagination.goToPage(${this.totalPages})">${this.totalPages}</button>`;
    }
    
    // Botón Siguiente
    html += `<button class="pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
             onclick="window.universalPagination.goToPage(${this.currentPage + 1})" 
             ${this.currentPage === this.totalPages ? 'disabled' : ''}>
             <i class="fas fa-angle-right"></i>
            </button>`;
    
    // Botón Última página
    html += `<button class="pagination-btn last ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
             onclick="window.universalPagination.goToPage(${this.totalPages})" 
             ${this.currentPage === this.totalPages ? 'disabled' : ''}>
             <i class="fas fa-angle-double-right"></i>
            </button>`;
    
    controls.innerHTML = html;
    
    // Actualizar input de salto a página
    const jumpInput = document.getElementById('jumpToPage');
    if (jumpInput) {
      jumpInput.max = this.totalPages;
      jumpInput.value = this.currentPage;
    }
  }
  
  /**
   * Obtener rango de páginas visibles
   */
  getVisiblePageRange() {
    const half = Math.floor(this.config.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + this.config.maxVisiblePages - 1);
    
    // Ajustar el inicio si el final está en el límite
    if (end === this.totalPages) {
      start = Math.max(1, end - this.config.maxVisiblePages + 1);
    }
    
    return { start, end };
  }
  
  /**
   * Actualizar información de registros
   */
  updateInfo() {
    const recordsInfo = document.getElementById('recordsInfo');
    if (!recordsInfo) return;
    
    if (this.filteredData.length === 0) {
      recordsInfo.textContent = 'No hay registros para mostrar';
      return;
    }
    
    const startRecord = (this.currentPage - 1) * this.config.recordsPerPage + 1;
    const endRecord = Math.min(startRecord + this.config.recordsPerPage - 1, this.filteredData.length);
    
    recordsInfo.textContent = `Mostrando ${startRecord} - ${endRecord} de ${this.filteredData.length} registros`;
  }
  
  /**
   * Ir a una página específica
   */
  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.render();
  }
  
  /**
   * Saltar a página desde input
   */
  jumpToPage() {
    const jumpInput = document.getElementById('jumpToPage');
    if (!jumpInput) return;
    
    const page = parseInt(jumpInput.value);
    if (isNaN(page)) return;
    
    this.goToPage(page);
  }
  
  /**
   * Obtener estadísticas actuales
   */
  getStats() {
    return {
      totalRecords: this.originalData.length,
      filteredRecords: this.filteredData.length,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      recordsPerPage: this.config.recordsPerPage
    };
  }
}

/**
 * ===================================================
 * FUNCIONES AUXILIARES Y INICIALIZACIÓN AUTOMÁTICA
 * ===================================================
 */

/**
 * Inicializar paginación automáticamente al cargar la página
 * MODIFICADO: SIEMPRE SE INICIA, SIN IMPORTAR EL NÚMERO DE FILAS
 */
document.addEventListener('DOMContentLoaded', function() {
  // Detectar automáticamente qué tabla se debe paginar
  const tableSelectors = [
    '#tablaNomina',
    '#tablaSalarios', 
    '#tablaDescuentos',
    '#gastosTable',
    '#tablaHistorial',
    '#tablaResumen',
    '#tablaDetalle',
    '#tablaDetalleCortes',
    '#tablaDetalleProductos',
    '#tablaClientes tbody',
    '#tablaEmpleados tbody'
  ];
  
  // Buscar la primera tabla que exista en la página
  let foundTable = null;
  let tableSelector = null;
  
  for (const selector of tableSelectors) {
    const table = document.querySelector(selector);
    if (table) {
      foundTable = table;
      tableSelector = selector;
      break;
    }
  }
  
  // Si encontramos una tabla, inicializar paginación
  if (foundTable && foundTable.querySelector('tbody')) {
    // Esperar un poco para que la tabla se llene con datos
    setTimeout(() => {
      const tbody = foundTable.querySelector('tbody');
      const rows = tbody.querySelectorAll('tr');
      
      // CAMBIO: SIEMPRE INICIALIZAR, sin importar el número de filas
      console.log(`🔄 Inicializando paginación automática para: ${tableSelector} (${rows.length} filas)`);
      
      // Configuración específica según el tipo de tabla
      let config = {
        tableSelector: tableSelector,
        recordsPerPage: 5, // Reducido para ver paginación más fácil
        maxVisiblePages: 5,
        alwaysShow: true
      };
      
      // Ajustes específicos por tipo de tabla
      if (tableSelector.includes('Salarios') || tableSelector.includes('Nomina')) {
        config.recordsPerPage = 2; // Muy pocos para ver paginación inmediatamente
      } else if (tableSelector.includes('Detalle')) {
        config.recordsPerPage = 10; // Más registros para detalles
      }
      
      // Crear instancia global
      window.universalPagination = new UniversalTablePagination(config);
      
      // Agregar funcionalidad de búsqueda si existe un campo de búsqueda
      addSearchFunctionality();
    }, 1000); // Esperar 1 segundo para que los datos se carguen
  }
});

/**
 * Agregar funcionalidad de búsqueda a campos existentes
 */
function addSearchFunctionality() {
  // Buscar campos de búsqueda comunes
  const searchSelectors = [
    '#searchCategoria',
    '#filtroCliente', 
    '#filtroEmpleado',
    'input[placeholder*="buscar"]',
    'input[placeholder*="Buscar"]'
  ];
  
  searchSelectors.forEach(selector => {
    const searchField = document.querySelector(selector);
    if (searchField && window.universalPagination) {
      // Agregar evento de búsqueda en tiempo real
      let searchTimeout;
      searchField.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          window.universalPagination.filter(e.target.value);
        }, 300); // Esperar 300ms después de que el usuario deje de escribir
      });
      
      console.log(`🔍 Búsqueda en tiempo real agregada a: ${selector}`);
    }
  });
}

/**
 * ===================================================
 * EXTENSIONES ESPECÍFICAS PARA DIFERENTES TIPOS DE TABLA
 * ===================================================
 */

/**
 * Extensión para tabla de nómina
 */
class NominaPagination extends UniversalTablePagination {
  createRowFromData(data) {
    return `
      <tr>
        <td>${data.id}</td>
        <td>${data.factura}</td>
        <td>${data.comanda}</td>
        <td>$${parseFloat(data.total || 0).toFixed(2)}</td>
        <td>${this.formatearFecha(data.fecha)}</td>
        <td>${data.dui}</td>
        <td>${data.cliente}</td>
        <td>${data.empleado}</td>
        <td>${data.cargo}</td>
        <td>${data.cortes || ''}</td>
        <td>${data.cantidad_corte || 0}</td>
        <td>${data.productos || ''}</td>
        <td>${data.cantidad_producto || 0}</td>
        <td>$${parseFloat(data.precio_producto || 0).toFixed(2)}</td>
        <td>$${parseFloat(data.comision_corte || 0).toFixed(2)}</td>
        <td>$${parseFloat(data.comision_producto || 0).toFixed(2)}</td>
        <td>${data.tipo_pago}</td>
        <td>$${parseFloat(data.descuento || 0).toFixed(2)}</td>
        <td>$${parseFloat(data.salario_total || 0).toFixed(2)}</td>
      </tr>
    `;
  }
  
  formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return fechaStr;
  }
}

/**
 * Extensión para tabla de gastos
 */
class GastosPagination extends UniversalTablePagination {
  createRowFromData(data) {
    return `
      <tr>
        <td>${data.id}</td>
        <td>${this.formatearFecha(data.fecha)}</td>
        <td>${data.categoria}</td>
        <td>${data.descripcion}</td>
        <td>$${parseFloat(data.monto).toFixed(2)}</td>
        <td>
          <button class="btn-action btn-edit" onclick="editarGasto(${data.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action btn-delete" onclick="eliminarGasto(${data.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }
  
  formatearFecha(fecha) {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES');
  }
}

/**
 * ===================================================
 * FUNCIONES GLOBALES DE UTILIDAD
 * ===================================================
 */

/**
 * Inicializar paginación manualmente para una tabla específica
 */
window.initPagination = function(tableSelector, options = {}) {
  const defaultOptions = {
    tableSelector: tableSelector,
    recordsPerPage: 5, // Reducido para ver mejor la paginación
    maxVisiblePages: 5,
    alwaysShow: true,
    ...options
  };
  
  return new UniversalTablePagination(defaultOptions);
};

/**
 * Refrescar datos de paginación (útil después de agregar/eliminar registros)
 */
window.refreshPagination = function() {
  if (window.universalPagination) {
    window.universalPagination.updateData();
  }
};

/**
 * Función para integrar con sistemas de filtrado existentes
 */
window.updatePaginationData = function(newData) {
  if (window.universalPagination) {
    window.universalPagination.updateData(newData);
  }
};

/**
 * Función para obtener estadísticas de paginación
 */
window.getPaginationStats = function() {
  if (window.universalPagination) {
    return window.universalPagination.getStats();
  }
  return null;
};

/**
 * ===================================================
 * MEJORAS PARA TABLAS EXISTENTES
 * ===================================================
 */

/**
 * Observer para detectar cambios dinámicos en las tablas
 */
const tableObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
      // Si se agregaron o eliminaron filas, refrescar paginación
      if (window.universalPagination) {
        setTimeout(() => {
          window.universalPagination.updateData();
        }, 100);
      }
    }
  });
});

// Observar cambios en todas las tablas después de que se cargue la página
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    const tables = document.querySelectorAll('table tbody');
    tables.forEach(tbody => {
      tableObserver.observe(tbody, {
        childList: true,
        subtree: true
      });
    });
  }, 2000);
});

/**
 * ===================================================
 * INTEGRACIÓN CON SISTEMAS EXISTENTES
 * ===================================================
 */

/**
 * Hook para integrar con la función cargarNomina existente
 */
const originalCargarNomina = window.cargarNomina;
if (originalCargarNomina) {
  window.cargarNomina = function(...args) {
    // Ejecutar la función original
    const result = originalCargarNomina.apply(this, args);
    
    // Refrescar paginación después de cargar datos
    setTimeout(() => {
      if (window.universalPagination) {
        window.universalPagination.updateData();
      }
    }, 500);
    
    return result;
  };
}

/**
 * Hook para integrar con la función cargarGastos existente
 */
const originalCargarGastos = window.cargarGastos;
if (originalCargarGastos) {
  window.cargarGastos = function(...args) {
    const result = originalCargarGastos.apply(this, args);
    setTimeout(() => {
      if (window.universalPagination) {
        window.universalPagination.updateData();
      }
    }, 500);
    return result;
  };
}

/**
 * ===================================================
 * MENSAJES DE CONSOLA Y DEPURACIÓN
 * ===================================================
 */
console.log('📄 pagination-script.js MODIFICADO cargado correctamente');
console.log('🔧 Paginación configurada para mostrarse SIEMPRE');
console.log('🔧 Funciones disponibles: initPagination(), refreshPagination(), updatePaginationData()');

/**
 * Exportar para uso en módulos si es necesario
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UniversalTablePagination,
    NominaPagination,
    GastosPagination
  };
}