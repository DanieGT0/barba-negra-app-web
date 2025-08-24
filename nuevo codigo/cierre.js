document.addEventListener("DOMContentLoaded", () => {
  // Configuración inicial
  inicializarFecha();
  cargarEmpleados();
  configurarEventListeners();
  configurarCalculosEfectivo();
});

// ========================================
// INICIALIZACIÓN Y CONFIGURACIÓN
// ========================================

function inicializarFecha() {
  const fechaHoy = new Date();
  const anio = fechaHoy.getFullYear();
  const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaHoy.getDate()).padStart(2, '0');
  const fechaLocal = `${anio}-${mes}-${dia}`;
  
  document.getElementById("fechaCierre").value = fechaLocal;
}

function configurarEventListeners() {
  // Botón principal de consulta
  document.getElementById("btnConsultar").addEventListener("click", consultarVentasCompleto);
  
  // Solo el botón PDF
  document.getElementById("btnPdfCierre").addEventListener("click", generarPDFCierreCompleto);
}

function configurarCalculosEfectivo() {
  document.querySelectorAll(".billete, #monedas, #saldoInicial").forEach(input => {
    input.addEventListener("input", calcularTotalEfectivo);
  });
  
  // Validación numérica para campos de dinero
  document.querySelectorAll('.denominacion-input, #saldoInicial').forEach(campo => {
    campo.addEventListener('input', validarEntradaNumerica);
    campo.addEventListener('blur', formatearDecimales);
  });
}

// ========================================
// CARGA DE DATOS INICIAL
// ========================================

async function cargarEmpleados() {
  try {
    const res = await fetch("/api/empleados");
    const empleados = await res.json();

    const select = document.getElementById("responsable");
    select.innerHTML = '<option value="">Seleccionar responsable</option>';

    empleados.forEach(emp => {
      const opt = document.createElement("option");
      opt.value = emp.nombre;
      opt.textContent = emp.nombre;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("❌ Error al cargar empleados:", error);
    mostrarNotificacion("Error al cargar empleados", "error");
  }
}

// ========================================
// CONSULTA PRINCIPAL DE CIERRE
// ========================================

async function consultarVentasCompleto() {
  const fechaISO = document.getElementById("fechaCierre").value;
  const responsable = document.getElementById("responsable").value;

  if (!fechaISO) {
    mostrarNotificacion("⚠️ Debes seleccionar una fecha.", "warning");
    return;
  }

  const [año, mes, dia] = fechaISO.split("-");
  const fechaLatino = `${dia}/${mes}/${año}`;

  try {
    console.log('🔍 Consultando cierre completo para fecha:', fechaLatino);
    
    mostrarLoading(true);
    
    const res = await fetch(`/api/cierre-completo?fecha=${fechaLatino}&responsable=${responsable}`);
    const datos = await res.json();

    console.log('📊 Datos completos recibidos:', datos);

    procesarDatosCierreCompleto(datos);
    calcularTotalEfectivo();
    actualizarIndicadoresRendimiento();
    
    mostrarLoading(false);
    mostrarNotificacion("Datos consultados exitosamente", "success");
    
  } catch (err) {
    console.error("❌ Error al consultar cierre completo:", err);
    mostrarNotificacion("Error al consultar los datos del cierre. Intente nuevamente.", "error");
    mostrarLoading(false);
  }
}

// ========================================
// PROCESAMIENTO DE DATOS
// ========================================

function procesarDatosCierreCompleto(datos) {
  console.log('📋 === PROCESANDO DATOS DE CIERRE COMPLETO ===');
  
  procesarVentasPorTipoPago(datos.ventas || []);
  procesarDetalleServicios(datos.servicios || []);
  procesarDetalleProductos(datos.productos || []);
  procesarComisiones(datos.comisiones || []);
  procesarRangosComandaFactura(datos.ventas || []);
  mostrarResumenEjecutivo(datos.resumen || {});
  actualizarGraficos(datos);
}

function procesarVentasPorTipoPago(ventas) {
  let efectivo = 0, tarjeta = 0, otros = 0;
  let conteoFacturas = 0, conteoMembresias = 0;

  ventas.forEach(item => {
    const tipo = item.tipo_pago;
    const total = parseFloat(item.total);

    if (item.tipo_registro === 'factura') {
      conteoFacturas++;
    } else if (item.tipo_registro === 'membresia') {
      conteoMembresias++;
    }

    if (tipo === "Efectivo") efectivo += total;
    else if (tipo === "Tarjeta") tarjeta += total;
    else if (tipo === "Otros") otros += total;
  });

  const totalGeneral = efectivo + tarjeta + otros;

  // Actualizar DOM
  actualizarElemento("ventasEfectivo", formatearMoneda(efectivo));
  actualizarElemento("ventasTarjeta", formatearMoneda(tarjeta));
  actualizarElemento("ventasTransferencia", formatearMoneda(otros));
  actualizarElemento("totalVentas", formatearMoneda(totalGeneral));
  actualizarElemento("resumenVentasEfectivo", formatearMoneda(efectivo));
  actualizarElemento("conteoFacturas", conteoFacturas);
  actualizarElemento("conteoMembresias", conteoMembresias);
  actualizarElemento("totalTransacciones", conteoFacturas + conteoMembresias);
}

function procesarDetalleServicios(servicios) {
  console.log('✂️ === PROCESANDO SERVICIOS (SOLO NOMBRES) ===');
  console.log('📊 Servicios recibidos del servidor:', servicios);
  
  if (!servicios || servicios.length === 0) {
    console.log('⚠️ No hay servicios para procesar');
    
    actualizarElemento("totalIngresoServicios", formatearMoneda(0));
    actualizarElemento("cantidadServicios", "0");
    
    mostrarDetalleServicios({});
    return;
  }
  
  let totalServicios = 0;
  let cantidadTotal = 0;
  let comisionTotal = 0;
  const serviciosPorTipo = {};
  
  servicios.forEach((servicio, index) => {
    console.log(`   Procesando servicio ${index + 1}:`, {
      nombre: servicio.nombre,
      cantidad: servicio.cantidad,
      total: servicio.total,
      comision: servicio.comision,
      factura: servicio.factura
    });
    
    const total = parseFloat(servicio.total || 0);
    const cantidad = parseInt(servicio.cantidad || 0);
    const comision = parseFloat(servicio.comision || 0);
    
    totalServicios += total;
    cantidadTotal += cantidad;
    comisionTotal += comision;
    
    // Agrupar SOLO por nombre de servicio (sin empleado)
    const nombreServicio = servicio.nombre || 'Servicio sin nombre';
    
    if (!serviciosPorTipo[nombreServicio]) {
      serviciosPorTipo[nombreServicio] = {
        nombre: nombreServicio,
        codigo: servicio.codigo || 'Sin código',
        cantidad: 0,
        total: 0,
        comision: 0,
        facturas: []
      };
    }
    
    serviciosPorTipo[nombreServicio].cantidad += cantidad;
    serviciosPorTipo[nombreServicio].total += total;
    serviciosPorTipo[nombreServicio].comision += comision;
    serviciosPorTipo[nombreServicio].facturas.push(servicio.factura);
  });
  
  console.log('📊 === TOTALES CALCULADOS ===');
  console.log(`💰 Total ingresos servicios: $${totalServicios.toFixed(2)}`);
  console.log(`🔢 Cantidad total servicios: ${cantidadTotal}`);
  console.log(`💵 Comisión total servicios: $${comisionTotal.toFixed(2)}`);
  console.log(`📋 Tipos de servicios únicos: ${Object.keys(serviciosPorTipo).length}`);
  
  // Actualizar DOM con valores calculados
  actualizarElemento("totalIngresoServicios", formatearMoneda(totalServicios));
  actualizarElemento("cantidadServicios", cantidadTotal.toString());
  
  // Mostrar servicios agrupados solo por nombre
  mostrarDetalleServicios(serviciosPorTipo);
}

function procesarDetalleProductos(productos) {
  console.log('🛍️ === PROCESANDO PRODUCTOS (SOLO NOMBRES) ===');
  console.log('📊 Productos recibidos del servidor:', productos);
  
  if (!productos || productos.length === 0) {
    console.log('⚠️ No hay productos para procesar');
    
    actualizarElemento("totalIngresoProductos", formatearMoneda(0));
    actualizarElemento("cantidadProductos", "0");
    
    mostrarDetalleProductos({});
    return;
  }
  
  let totalProductos = 0;
  let cantidadTotal = 0;
  let comisionTotal = 0;
  const productosPorTipo = {};
  
  productos.forEach((producto, index) => {
    console.log(`   Procesando producto ${index + 1}:`, {
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      total: producto.total,
      comision: producto.comision,
      factura: producto.factura
    });
    
    const total = parseFloat(producto.total || 0);
    const cantidad = parseInt(producto.cantidad || 0);
    const comision = parseFloat(producto.comision || 0);
    
    totalProductos += total;
    cantidadTotal += cantidad;
    comisionTotal += comision;
    
    // Agrupar SOLO por nombre de producto (sin empleado)
    const nombreProducto = producto.nombre || 'Producto sin nombre';
    
    if (!productosPorTipo[nombreProducto]) {
      productosPorTipo[nombreProducto] = {
        nombre: nombreProducto,
        codigo: producto.codigo || 'Sin código',
        cantidad: 0,
        total: 0,
        comision: 0,
        facturas: []
      };
    }
    
    productosPorTipo[nombreProducto].cantidad += cantidad;
    productosPorTipo[nombreProducto].total += total;
    productosPorTipo[nombreProducto].comision += comision;
    productosPorTipo[nombreProducto].facturas.push(producto.factura);
  });
  
  console.log('📊 === TOTALES PRODUCTOS CALCULADOS ===');
  console.log(`💰 Total ingresos productos: $${totalProductos.toFixed(2)}`);
  console.log(`🔢 Cantidad total productos: ${cantidadTotal}`);
  console.log(`💵 Comisión total productos: $${comisionTotal.toFixed(2)}`);
  console.log(`📋 Tipos de productos únicos: ${Object.keys(productosPorTipo).length}`);
  
  // Actualizar DOM con valores calculados
  actualizarElemento("totalIngresoProductos", formatearMoneda(totalProductos));
  actualizarElemento("cantidadProductos", cantidadTotal.toString());
  
  // Mostrar productos agrupados solo por nombre
  mostrarDetalleProductos(productosPorTipo);
}

function procesarComisiones(comisiones) {
  console.log('💰 Procesando comisiones:', comisiones);
  
  let totalComisiones = 0;
  const comisionesPorEmpleado = {};
  
  comisiones.forEach(com => {
    totalComisiones += parseFloat(com.total_comision || 0);
    
    const empleado = com.empleado || 'Sin empleado';
    if (!comisionesPorEmpleado[empleado]) {
      comisionesPorEmpleado[empleado] = { servicios: 0, productos: 0, total: 0 };
    }
    comisionesPorEmpleado[empleado].servicios += parseFloat(com.comision_servicios || 0);
    comisionesPorEmpleado[empleado].productos += parseFloat(com.comision_productos || 0);
    comisionesPorEmpleado[empleado].total += parseFloat(com.total_comision || 0);
  });
  
  // Actualizar DOM
  actualizarElemento("totalComisiones", formatearMoneda(totalComisiones));
  
  // Mostrar detalle
  mostrarDetalleComisiones(comisionesPorEmpleado);
}

function procesarRangosComandaFactura(ventas) {
  console.log('📊 === PROCESANDO RANGOS DE COMANDA Y FACTURA ===');
  
  if (!ventas || ventas.length === 0) {
    console.log('⚠️ No hay ventas para procesar rangos');
    return;
  }
  
  // Filtrar solo facturas (no membresías)
  const facturas = ventas.filter(v => v.tipo_registro === 'factura');
  
  if (facturas.length === 0) {
    console.log('⚠️ No hay facturas para calcular rangos');
    return;
  }
  
  // Obtener rangos de comandas
  const comandas = facturas.map(f => parseInt(f.comanda || 0)).filter(c => c > 0);
  const numeroFacturas = facturas.map(f => parseInt(f.factura || 0)).filter(f => f > 0);
  
  let rangoComandas = { inicio: 0, fin: 0, total: 0 };
  let rangoFacturas = { inicio: 0, fin: 0, total: 0 };
  
  if (comandas.length > 0) {
    rangoComandas = {
      inicio: Math.min(...comandas),
      fin: Math.max(...comandas),
      total: comandas.length
    };
  }
  
  if (numeroFacturas.length > 0) {
    rangoFacturas = {
      inicio: Math.min(...numeroFacturas),
      fin: Math.max(...numeroFacturas),
      total: numeroFacturas.length
    };
  }
  
  console.log('📋 Rangos calculados:', { rangoComandas, rangoFacturas });
  
  // Mostrar en el DOM
  mostrarRangosComandaFactura(rangoComandas, rangoFacturas);
}

// ========================================
// MOSTRAR DETALLES EN TABLAS
// ========================================

function mostrarDetalleServicios(serviciosPorTipo) {
  const container = document.getElementById('detalleServiciosContainer');
  if (!container) {
    console.error('❌ Container detalleServiciosContainer no encontrado');
    return;
  }
  
  console.log('📋 === MOSTRANDO DETALLE DE SERVICIOS (SIN EMPLEADO) ===');
  console.log('Datos recibidos:', serviciosPorTipo);
  
  if (!serviciosPorTipo || Object.keys(serviciosPorTipo).length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <i class="fas fa-info-circle"></i>
        <p>No se encontraron servicios para esta fecha</p>
      </div>
    `;
    return;
  }
  
  const html = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th><i class="fas fa-cut"></i> Servicio</th>
            <th><i class="fas fa-hashtag"></i> Cantidad</th>
            <th><i class="fas fa-dollar-sign"></i> Precio Unit.</th>
            <th><i class="fas fa-calculator"></i> Total</th>
            <th><i class="fas fa-handshake"></i> Comisión</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(serviciosPorTipo).map(([nombre, datos]) => `
            <tr>
              <td class="servicio-nombre">
                <strong>${nombre}</strong>
                <small style="display: block; color: #666; font-size: 0.8em;">
                  ${datos.codigo || 'Sin código'}
                </small>
              </td>
              <td class="cantidad" style="text-align: center;">
                <span class="badge">${datos.cantidad}</span>
              </td>
              <td class="precio-unitario" style="text-align: right;">
                ${formatearMoneda(datos.total / datos.cantidad)}
              </td>
              <td class="total" style="text-align: right;">
                <strong>${formatearMoneda(datos.total)}</strong>
              </td>
              <td class="comision" style="text-align: right;">
                ${formatearMoneda(datos.comision)}
              </td>
            </tr>
          `).join('')}
          <tr style="background: rgba(159, 216, 26, 0.1); font-weight: bold;">
            <td colspan="2">TOTALES</td>
            <td style="text-align: right;">—</td>
            <td style="text-align: right;">
              ${formatearMoneda(Object.values(serviciosPorTipo).reduce((sum, s) => sum + s.total, 0))}
            </td>
            <td style="text-align: right;">
              ${formatearMoneda(Object.values(serviciosPorTipo).reduce((sum, s) => sum + s.comision, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="resumen-servicios">
      <h4>📊 Resumen de Servicios</h4>
      <div class="resumen-grid">
        <div class="resumen-item">
          <span class="resumen-label">Total Servicios:</span>
          <strong class="resumen-valor">${Object.keys(serviciosPorTipo).length}</strong>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Cantidad Total:</span>
          <strong class="resumen-valor">${Object.values(serviciosPorTipo).reduce((sum, s) => sum + s.cantidad, 0)}</strong>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Promedio por Servicio:</span>
          <strong class="resumen-valor">${formatearMoneda(Object.values(serviciosPorTipo).reduce((sum, s) => sum + s.total, 0) / Object.keys(serviciosPorTipo).length)}</strong>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function mostrarDetalleProductos(productosPorTipo) {
  const container = document.getElementById('detalleProductosContainer');
  if (!container) return;
  
  if (!productosPorTipo || Object.keys(productosPorTipo).length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <i class="fas fa-info-circle"></i>
        <p>No se encontraron productos para esta fecha</p>
      </div>
    `;
    return;
  }
  
  const html = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th><i class="fas fa-shopping-bag"></i> Producto</th>
            <th><i class="fas fa-hashtag"></i> Cantidad</th>
            <th><i class="fas fa-dollar-sign"></i> Precio Unit.</th>
            <th><i class="fas fa-calculator"></i> Total</th>
            <th><i class="fas fa-handshake"></i> Comisión</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(productosPorTipo).map(([nombre, datos]) => `
            <tr>
              <td class="producto-nombre">
                <strong>${nombre}</strong>
                <small style="display: block; color: #666; font-size: 0.8em;">
                  ${datos.codigo || 'Sin código'}
                </small>
              </td>
              <td class="cantidad" style="text-align: center;">
                <span class="badge">${datos.cantidad}</span>
              </td>
              <td class="precio-unitario" style="text-align: right;">
                ${formatearMoneda(datos.total / datos.cantidad)}
              </td>
              <td class="total" style="text-align: right;">
                <strong>${formatearMoneda(datos.total)}</strong>
              </td>
              <td class="comision" style="text-align: right;">
                ${formatearMoneda(datos.comision)}
              </td>
            </tr>
          `).join('')}
          <tr style="background: rgba(159, 216, 26, 0.1); font-weight: bold;">
            <td colspan="2">TOTALES</td>
            <td style="text-align: right;">—</td>
            <td style="text-align: right;">
              ${formatearMoneda(Object.values(productosPorTipo).reduce((sum, p) => sum + p.total, 0))}
            </td>
            <td style="text-align: right;">
              ${formatearMoneda(Object.values(productosPorTipo).reduce((sum, p) => sum + p.comision, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="resumen-productos">
      <h4>📊 Resumen de Productos</h4>
      <div class="resumen-grid">
        <div class="resumen-item">
          <span class="resumen-label">Total Productos:</span>
          <strong class="resumen-valor">${Object.keys(productosPorTipo).length}</strong>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Cantidad Total:</span>
          <strong class="resumen-valor">${Object.values(productosPorTipo).reduce((sum, p) => sum + p.cantidad, 0)}</strong>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Promedio por Producto:</span>
          <strong class="resumen-valor">${formatearMoneda(Object.values(productosPorTipo).reduce((sum, p) => sum + p.total, 0) / Object.keys(productosPorTipo).length)}</strong>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function mostrarDetalleComisiones(comisionesPorEmpleado) {
  const container = document.getElementById('detalleComisionesContainer');
  if (!container) return;
  
  const html = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th><i class="fas fa-user"></i> Empleado</th>
            <th><i class="fas fa-cut"></i> Servicios</th>
            <th><i class="fas fa-shopping-bag"></i> Productos</th>
            <th><i class="fas fa-calculator"></i> Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(comisionesPorEmpleado).map(([empleado, datos]) => `
            <tr>
              <td class="empleado-nombre">${empleado}</td>
              <td class="comision-servicios">${formatearMoneda(datos.servicios)}</td>
              <td class="comision-productos">${formatearMoneda(datos.productos)}</td>
              <td class="comision-total"><strong>${formatearMoneda(datos.total)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}

function mostrarRangosComandaFactura(rangoComandas, rangoFacturas) {
  // Crear o actualizar el container de rangos
  let container = document.getElementById('rangosContainer');
  
  if (!container) {
    // Crear el container si no existe
    const detallesSection = document.querySelector('.detalles-section');
    if (detallesSection) {
      container = document.createElement('div');
      container.id = 'rangosContainer';
      container.style.marginBottom = '2rem';
      detallesSection.appendChild(container);
    } else {
      return;
    }
  }
  
  const html = `
    <div class="detalle-card">
      <div class="detalle-header">
        <i class="fas fa-chart-bar"></i>
        <h3>Rangos de Comandas y Facturas</h3>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="rango-card">
          <h4 style="color: var(--accent-color); margin-bottom: 1rem;">
            <i class="fas fa-clipboard-list"></i> Comandas del Día
          </h4>
          <div class="rango-info">
            <div class="rango-item">
              <span class="rango-label">Comanda Inicial:</span>
              <strong class="rango-valor">#${rangoComandas.inicio}</strong>
            </div>
            <div class="rango-item">
              <span class="rango-label">Comanda Final:</span>
              <strong class="rango-valor">#${rangoComandas.fin}</strong>
            </div>
            <div class="rango-item">
              <span class="rango-label">Total Comandas:</span>
              <strong class="rango-valor destacado">${rangoComandas.total}</strong>
            </div>
          </div>
        </div>
        
        <div class="rango-card">
          <h4 style="color: var(--accent-color); margin-bottom: 1rem;">
            <i class="fas fa-file-invoice"></i> Facturas del Día
          </h4>
          <div class="rango-info">
            <div class="rango-item">
              <span class="rango-label">Factura Inicial:</span>
              <strong class="rango-valor">#${rangoFacturas.inicio}</strong>
            </div>
            <div class="rango-item">
              <span class="rango-label">Factura Final:</span>
              <strong class="rango-valor">#${rangoFacturas.fin}</strong>
            </div>
            <div class="rango-item">
              <span class="rango-label">Total Facturas:</span>
              <strong class="rango-valor destacado">${rangoFacturas.total}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ========================================
// CÁLCULOS DE EFECTIVO Y DIFERENCIAS
// ========================================

function calcularTotalEfectivo() {
  const denominaciones = [
    { id: "billete100", valor: 100.0 },
    { id: "billete50", valor: 50.0 },
    { id: "billete20", valor: 20.0 },
    { id: "billete10", valor: 10.0 },
    { id: "billete5", valor: 5.0 },
    { id: "billete1", valor: 1.0 },
    { id: "monedas", valor: 1.0 }
  ];

  let total = 0;

  denominaciones.forEach(den => {
    const input = document.getElementById(den.id);
    if (!input) return;
    
    const cantidad = parseFloat(input.value) || 0;
    const subtotal = cantidad * den.valor;

    const subtotalElement = input.nextElementSibling;
    if (subtotalElement) {
      subtotalElement.textContent = formatearMoneda(subtotal);
    }
    
    total += subtotal;
  });

  // Actualizar totales
  actualizarElemento("totalEfectivo", formatearMoneda(total));
  actualizarElemento("efectivoContado", formatearMoneda(total));

  // Calcular diferencia
  calcularDiferencia(total);
}

function calcularDiferencia(totalEfectivo) {
  const ventasEfectivo = obtenerValorNumerico("resumenVentasEfectivo");
  const saldoInicial = parseFloat(document.getElementById("saldoInicial").value) || 0;
  const diferencia = totalEfectivo - (ventasEfectivo + saldoInicial);

  actualizarElemento("resumenSaldoInicial", formatearMoneda(saldoInicial));
  
  const elementoDiferencia = document.getElementById("diferencia");
  if (elementoDiferencia) {
    elementoDiferencia.textContent = formatearMoneda(diferencia);
    
    elementoDiferencia.className = '';
    if (diferencia > 0) {
      elementoDiferencia.classList.add('diferencia-positiva');
    } else if (diferencia < 0) {
      elementoDiferencia.classList.add('diferencia-negativa');
    } else {
      elementoDiferencia.classList.add('diferencia-neutra');
    }
  }
}

// ========================================
// INDICADORES Y MÉTRICAS
// ========================================

function mostrarResumenEjecutivo(resumen) {
  console.log('📈 Mostrando resumen ejecutivo:', resumen);
  
  const ventaPromedio = resumen.total_transacciones > 0 ? 
    (resumen.ingresos_totales / resumen.total_transacciones) : 0;
  
  const margenUtilidad = resumen.ingresos_totales > 0 ? 
    ((resumen.ingresos_totales - resumen.total_comisiones) / resumen.ingresos_totales * 100) : 0;
  
  actualizarElemento("ventaPromedio", formatearMoneda(ventaPromedio));
  actualizarElemento("margenUtilidad", `${margenUtilidad.toFixed(1)}%`);
  actualizarElemento("utilidadNeta", formatearMoneda(resumen.ingresos_totales - resumen.total_comisiones));
  
  if (resumen.comparacion_dia_anterior) {
    mostrarComparacionDiaAnterior(resumen.comparacion_dia_anterior);
  }
}

function actualizarIndicadoresRendimiento() {
  const totalVentas = obtenerValorNumerico("totalVentas");
  const totalTransacciones = parseInt(document.getElementById("totalTransacciones")?.textContent) || 0;
  const cantidadServicios = parseInt(document.getElementById("cantidadServicios")?.textContent) || 0;
  
  // Venta promedio
  const ventaPromedio = totalTransacciones > 0 ? totalVentas / totalTransacciones : 0;
  actualizarElemento("ventaPromedio", formatearMoneda(ventaPromedio));
  
  // Servicios por hora (asumiendo 8 horas)
  const serviciosPorHora = Math.round(cantidadServicios / 8);
  actualizarElemento("serviciosPorHora", serviciosPorHora.toString());
  
  // Eficiencia vs meta
  const metaServicios = 50;
  const eficiencia = Math.min(100, (cantidadServicios / metaServicios) * 100);
  actualizarElemento("eficienciaGeneral", `${eficiencia.toFixed(0)}%`);
}

function mostrarComparacionDiaAnterior(comparacion) {
  const cambio = comparacion.porcentaje_cambio || 0;
  const elemento = document.getElementById("comparacionAyer");
  if (elemento) {
    elemento.textContent = `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)}%`;
    elemento.className = cambio >= 0 ? 'diferencia-positiva' : 'diferencia-negativa';
  }
}

// ========================================
// GENERACIÓN DE PDF MEJORADO
// ========================================

async function generarPDFCierreCompleto() {
  if (!window.jspdf) {
    mostrarNotificacion("Librería PDF no disponible", "error");
    return;
  }

  if (!validarDatosCompletos()) {
    return;
  }

  try {
    mostrarLoading(true);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Configuración de colores
    const colores = {
      primario: [26, 26, 46],
      acento: [159, 216, 26],
      texto: [51, 51, 51],
      blanco: [255, 255, 255],
      exito: [40, 167, 69],
      peligro: [220, 53, 69]
    };

    // Obtener datos
    const datos = obtenerDatosFormulario();
    
    // Generar páginas del PDF mejorado
    await generarPaginaResumenMejorado(doc, datos, colores);
    
    doc.addPage();
    await generarPaginaDetallesMejorado(doc, datos, colores);
    
    doc.addPage();
    await generarPaginaAnalisisFinanciero(doc, datos, colores);
    
    // Guardar PDF
    const nombreArchivo = `CierreCompleto_Escalon_${datos.fechaFormateada.replace(/\//g, "-")}_${datos.responsable.replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
    
    mostrarNotificacion("PDF generado exitosamente", "success");
    
  } catch (error) {
    console.error("Error generando PDF:", error);
    mostrarNotificacion("Error al generar PDF: " + error.message, "error");
  } finally {
    mostrarLoading(false);
  }
}


// ========================================

async function generarPaginaResumenMejorado(doc, datos, colores) {
  let y = 15;
  
  // === HEADER PROFESIONAL ===
  doc.setFillColor(...colores.primario);
  doc.rect(0, 0, 210, 35, 'F');
  
  // Logo placeholder profesional
  doc.setFillColor(...colores.blanco);
  doc.roundedRect(15, 8, 25, 20, 3, 3, 'F');
  doc.setFillColor(...colores.primario);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("LOGO", 27.5, 19, { align: "center" });
  
  // Título principal
  doc.setTextColor(...colores.blanco);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CIERRE DE CAJA EJECUTIVO", 105, 18, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("BARBERÍA EL ESTILO - SUCURSAL ESCALÓN", 105, 26, { align: "center" });
  
  y = 45;
  
  // === INFORMACIÓN DE FECHA Y RESPONSABLE ===
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, 180, 20, 'F');
  
  doc.setTextColor(...colores.primario);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FECHA:", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(datos.fechaFormateada, 45, y + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("RESPONSABLE:", 20, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(datos.responsable, 60, y + 15);
  
  // Timestamp
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 195, y + 8, { align: "right" });
  
  y += 35;
  
  // === RESUMEN FINANCIERO PRINCIPAL ===
  doc.setTextColor(...colores.primario);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(" RESUMEN FINANCIERO DEL DÍA", 20, y);
  
  y += 15;
  
  // Cards de métricas principales
  const totalVentas = obtenerValorNumerico("totalVentas");
  const totalComisiones = obtenerValorNumerico("totalComisiones");
  const gananciaNeta = totalVentas - totalComisiones;
  
  const metricas = [
    { 
      label: "DINERO GENERADO", 
      valor: formatearMoneda(totalVentas), 
      color: [76, 175, 80],
      bg: [232, 245, 233]
    },
    { 
      label: "COMISIONES PAGADAS", 
      valor: formatearMoneda(totalComisiones), 
      color: [244, 67, 54],
      bg: [255, 235, 238]
    },
    { 
      label: "GANANCIA NETA", 
      valor: formatearMoneda(gananciaNeta), 
      color: [33, 150, 243],
      bg: [227, 242, 253]
    }
  ];
  
  metricas.forEach((metrica, index) => {
    const yPos = y + (index * 22);
    
    // Fondo de la métrica
    doc.setFillColor(...metrica.bg);
    doc.roundedRect(18, yPos - 3, 174, 18, 2, 2, 'F');
    
    // Línea lateral de color
    doc.setFillColor(...metrica.color);
    doc.rect(18, yPos - 3, 4, 18, 'F');
    
    // Texto
    doc.setTextColor(...colores.texto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(metrica.label + ":", 28, yPos + 5);
    
    doc.setTextColor(...metrica.color);
    doc.setFontSize(14);
    doc.text(metrica.valor, 185, yPos + 5, { align: "right" });
  });
  
  y += 80;
  
  // === ANÁLISIS DE SERVICIOS ===
  generarSeccionAnalisis(doc, y, " ANÁLISIS DE SERVICIOS", {
    titulo: "SERVICIOS REALIZADOS",
    items: [
      `Total de cortes realizados: ${parseInt(document.getElementById("cantidadServicios")?.textContent) || 0}`,
      `Ingresos por servicios: ${formatearMoneda(obtenerValorNumerico("totalIngresoServicios"))}`,
      `Ganancia por servicios: ${formatearMoneda(obtenerValorNumerico("totalIngresoServicios") - obtenerComisionServicios())}`,
      `Comisiones pagadas: ${formatearMoneda(obtenerComisionServicios())}`
    ]
  });
  
  y += 45;
  
  // === ANÁLISIS DE PRODUCTOS ===
  generarSeccionAnalisis(doc, y, " ANÁLISIS DE PRODUCTOS", {
    titulo: "PRODUCTOS VENDIDOS",
    items: [
      `Total de productos vendidos: ${parseInt(document.getElementById("cantidadProductos")?.textContent) || 0}`,
      `Ingresos por productos: ${formatearMoneda(obtenerValorNumerico("totalIngresoProductos"))}`,
      `Ganancia por productos: ${formatearMoneda(obtenerValorNumerico("totalIngresoProductos") - obtenerComisionProductos())}`,
      `Comisiones pagadas: ${formatearMoneda(obtenerComisionProductos())}`
    ]
  });
  
  y += 45;
  
  // === RANGOS DE OPERACIÓN ===
  const rangos = obtenerRangosComandaFactura();
  
  generarSeccionAnalisis(doc, y, "RANGOS DE OPERACIÓN", {
    titulo: "CONTROL OPERACIONAL",
    items: [
      `Comandas del día: Inició en #${rangos.comandaInicio} → Terminó en #${rangos.comandaFin} (Total: ${rangos.totalComandas})`,
      `Facturas del día: Inició en #${rangos.facturaInicio} → Terminó en #${rangos.facturaFin} (Total: ${rangos.totalFacturas})`
    ]
  });
  
  y += 35;
  
  // === CONTROL DE EFECTIVO ===
  generarSeccionEfectivo(doc, y);
}

// Función auxiliar para generar secciones de análisis
function generarSeccionAnalisis(doc, y, titulo, contenido) {
  // Header de sección
  doc.setFillColor(248, 249, 250);
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(titulo, 20, y + 5);
  
  y += 12;
  
  // Contenido
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(73, 80, 87);
  
  contenido.items.forEach((item, index) => {
    doc.text(`• ${item}`, 25, y + (index * 6) + 5);
  });
}

// Función para la sección de efectivo
function generarSeccionEfectivo(doc, y) {
  doc.setFillColor(248, 249, 250);
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONTROL DE EFECTIVO", 20, y + 5);
  
  y += 12;
  
  const efectivoContado = obtenerValorNumerico("efectivoContado");
  const ventasEfectivo = obtenerValorNumerico("ventasEfectivo");
  const saldoInicial = parseFloat(document.getElementById("saldoInicial").value) || 0;
  const diferencia = efectivoContado - (ventasEfectivo + saldoInicial);
  
  const itemsEfectivo = [
    `Efectivo contado en caja: ${formatearMoneda(efectivoContado)}`,
    `Ventas en efectivo del día: ${formatearMoneda(ventasEfectivo)}`,
    `Saldo inicial de caja: ${formatearMoneda(saldoInicial)}`
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(73, 80, 87);
  
  itemsEfectivo.forEach((item, index) => {
    doc.text(`• ${item}`, 25, y + (index * 6) + 5);
  });
  
  y += 25;
  
  // Estado del cierre con diseño mejorado
  if (diferencia === 0) {
    doc.setFillColor(212, 237, 218);
    doc.rect(20, y, 170, 12, 'F');
    doc.setTextColor(21, 87, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(" ESTADO DEL CIERRE: CUADRADO PERFECTAMENTE", 25, y + 7);
  } else if (diferencia > 0) {
    doc.setFillColor(255, 243, 205);
    doc.rect(20, y, 170, 12, 'F');
    doc.setTextColor(133, 100, 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(` SOBRANTE EN CAJA: ${formatearMoneda(diferencia)}`, 25, y + 7);
  } else {
    doc.setFillColor(248, 215, 218);
    doc.rect(20, y, 170, 12, 'F');
    doc.setTextColor(114, 28, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(` FALTANTE EN CAJA: ${formatearMoneda(Math.abs(diferencia))}`, 25, y + 7);
  }
}

async function generarPaginaDetallesMejorado(doc, datos, colores) {
  let y = 20;
  
  // Header de página con diseño mejorado
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(...colores.primario);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DETALLES DE SERVICIOS Y PRODUCTOS", 105, 15, { align: "center" });
  
  y = 35;
  
  // === TABLA DE SERVICIOS MEJORADA ===
  generarTablaEstetica(doc, y, "SERVICIOS REALIZADOS", obtenerServiciosParaPDF(), [
    { header: "SERVICIO", width: 80 },
    { header: "CANT.", width: 25 },
    { header: "PRECIO UNIT.", width: 35 },
    { header: "TOTAL", width: 35 }
  ]);
  
  y += 80;
  
  // === TABLA DE PRODUCTOS MEJORADA ===
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  
  generarTablaEstetica(doc, y, "PRODUCTOS VENDIDOS", obtenerProductosParaPDF(), [
    { header: "PRODUCTO", width: 80 },
    { header: "CANT.", width: 25 },
    { header: "PRECIO UNIT.", width: 35 },
    { header: "TOTAL", width: 35 }
  ]);
}

// Función para generar tablas estéticas
function generarTablaEstetica(doc, y, titulo, datos, columnas) {
  // Título de la tabla
  doc.setFillColor(33, 37, 41);
  doc.rect(15, y, 175, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(titulo, 20, y + 8);
  
  y += 15;
  
  // Headers de la tabla
  doc.setFillColor(233, 236, 239);
  doc.rect(15, y, 175, 10, 'F');
  
  let x = 20;
  doc.setTextColor(73, 80, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  
  columnas.forEach(col => {
    doc.text(col.header, x, y + 6);
    x += col.width;
  });
  
  y += 12;
  
  // Filas de datos
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  datos.forEach((item, index) => {
    // Alternar colores de fila
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, y - 2, 175, 8, 'F');
    }
    
    doc.setTextColor(33, 37, 41);
    
    let x = 20;
    doc.text(truncateText(item.nombre, 25), x, y + 4);
    x += columnas[0].width;
    
    doc.text(item.cantidad.toString(), x + (columnas[1].width / 2), y + 4, { align: "center" });
    x += columnas[1].width;
    
    doc.text(item.precioUnitario, x + columnas[2].width - 5, y + 4, { align: "right" });
    x += columnas[2].width;
    
    doc.text(item.total, x + columnas[3].width - 5, y + 4, { align: "right" });
    
    y += 8;
  });
  
  // Línea final
  doc.setDrawColor(206, 212, 218);
  doc.setLineWidth(0.5);
  doc.line(15, y, 190, y);
}

// Función para truncar texto largo
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}

async function generarPaginaAnalisisFinanciero(doc, datos, colores) {
  let y = 20;
  
  // Header de página
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(...colores.primario);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ANÁLISIS FINANCIERO DETALLADO", 105, 15, { align: "center" });
  
  y = 35;
  
  // === COMISIONES POR EMPLEADO ===
  const comisiones = obtenerComisionesParaPDF();
  
  if (comisiones.length > 0) {
    generarTablaEstetica(doc, y, "COMISIONES POR EMPLEADO", 
      comisiones.map(emp => ({
        nombre: emp.nombre,
        cantidad: emp.servicios + " | " + emp.productos,
        precioUnitario: "—",
        total: emp.total
      })), [
        { header: "EMPLEADO", width: 60 },
        { header: "SERV. | PROD.", width: 40 },
        { header: "—", width: 35 },
        { header: "TOTAL COMISIÓN", width: 40 }
      ]
    );
    
    y += 60;
  }
  
  // === OBSERVACIONES ===
  const observaciones = document.getElementById("observaciones").value;
  if (observaciones && observaciones.trim() !== '') {
    y += 20;
    
    // CORRECCIÓN: Separar el cálculo de altura
    const alturaObservaciones = Math.max(25, Math.ceil(observaciones.length / 80) * 6);
    
    doc.setFillColor(255, 248, 220);
    doc.rect(15, y, 175, alturaObservaciones, 'F');
    
    doc.setTextColor(133, 100, 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(" OBSERVACIONES DEL CIERRE", 20, y + 8);
    
    doc.setTextColor(73, 80, 87);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const lineasObservaciones = doc.splitTextToSize(observaciones, 165);
    doc.text(lineasObservaciones, 20, y + 18);
    
    // Actualizar Y para el siguiente contenido
    y += alturaObservaciones + 10;
  }
  
  // === PIE DE PÁGINA ===
  y = 270;
  doc.setTextColor(108, 117, 125);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Este documento fue generado automáticamente por el sistema de gestión.", 105, y, { align: "center" });
  doc.text(`Página generada el ${new Date().toLocaleString('es-ES')}`, 105, y + 6, { align: "center" });
}

console.log(" PDF mejorado estéticamente - más profesional y ordenado");
// ========================================
// FUNCIONES AUXILIARES PARA PDF
// ========================================

function obtenerServiciosParaPDF() {
  const servicios = [];
  const tabla = document.querySelector('#detalleServiciosContainer table tbody');
  
  if (tabla) {
    const filas = tabla.querySelectorAll('tr:not(:last-child)'); // Excluir fila de totales
    
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length >= 5) {
        servicios.push({
          nombre: celdas[0].textContent.trim(),
          cantidad: parseInt(celdas[1].textContent.trim()),
          precioUnitario: celdas[2].textContent.trim(),
          total: celdas[3].textContent.trim(),
          comision: celdas[4].textContent.trim()
        });
      }
    });
  }
  
  return servicios;
}

function obtenerProductosParaPDF() {
  const productos = [];
  const tabla = document.querySelector('#detalleProductosContainer table tbody');
  
  if (tabla) {
    const filas = tabla.querySelectorAll('tr:not(:last-child)'); // Excluir fila de totales
    
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length >= 5) {
        productos.push({
          nombre: celdas[0].textContent.trim(),
          cantidad: parseInt(celdas[1].textContent.trim()),
          precioUnitario: celdas[2].textContent.trim(),
          total: celdas[3].textContent.trim(),
          comision: celdas[4].textContent.trim()
        });
      }
    });
  }
  
  return productos;
}

function obtenerComisionesParaPDF() {
  const comisiones = [];
  const tabla = document.querySelector('#detalleComisionesContainer table tbody');
  
  if (tabla) {
    const filas = tabla.querySelectorAll('tr');
    
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length >= 4) {
        comisiones.push({
          nombre: celdas[0].textContent.trim(),
          servicios: celdas[1].textContent.trim(),
          productos: celdas[2].textContent.trim(),
          total: celdas[3].textContent.trim()
        });
      }
    });
  }
  
  return comisiones;
}

function obtenerComisionServicios() {
  const tabla = document.querySelector('#detalleServiciosContainer table tbody');
  let total = 0;
  
  if (tabla) {
    const filas = tabla.querySelectorAll('tr:not(:last-child)');
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length >= 5) {
        const comision = parseFloat(celdas[4].textContent.replace(/[$,]/g, '')) || 0;
        total += comision;
      }
    });
  }
  
  return total;
}

function obtenerComisionProductos() {
  const tabla = document.querySelector('#detalleProductosContainer table tbody');
  let total = 0;
  
  if (tabla) {
    const filas = tabla.querySelectorAll('tr:not(:last-child)');
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length >= 5) {
        const comision = parseFloat(celdas[4].textContent.replace(/[$,]/g, '')) || 0;
        total += comision;
      }
    });
  }
  
  return total;
}

function obtenerRangosComandaFactura() {
  // Buscar en el DOM los rangos ya calculados
  const rangosContainer = document.getElementById('rangosContainer');
  
  if (rangosContainer) {
    const rangosText = rangosContainer.textContent;
    
    // Extraer números usando regex
    const comandaInicio = rangosText.match(/Comanda Inicial:\s*#(\d+)/)?.[1] || '0';
    const comandaFin = rangosText.match(/Comanda Final:\s*#(\d+)/)?.[1] || '0';
    const totalComandas = rangosText.match(/Total Comandas:\s*(\d+)/)?.[1] || '0';
    
    const facturaInicio = rangosText.match(/Factura Inicial:\s*#(\d+)/)?.[1] || '0';
    const facturaFin = rangosText.match(/Factura Final:\s*#(\d+)/)?.[1] || '0';
    const totalFacturas = rangosText.match(/Total Facturas:\s*(\d+)/)?.[1] || '0';
    
    return {
      comandaInicio,
      comandaFin,
      totalComandas,
      facturaInicio,
      facturaFin,
      totalFacturas
    };
  }
  
  return {
    comandaInicio: '0',
    comandaFin: '0',
    totalComandas: '0',
    facturaInicio: '0',
    facturaFin: '0',
    totalFacturas: '0'
  };
}

// ========================================
// FUNCIONES DE VALIDACIÓN Y UTILIDADES
// ========================================

function validarDatosCompletos() {
  const fecha = document.getElementById("fechaCierre").value;
  const responsable = document.getElementById("responsable").value;
  
  if (!fecha) {
    mostrarNotificacion("Debe seleccionar una fecha", "warning");
    return false;
  }
  
  if (!responsable) {
    mostrarNotificacion("Debe seleccionar un responsable", "warning");
    return false;
  }
  
  const totalVentas = obtenerValorNumerico("totalVentas");
  if (totalVentas === 0) {
    mostrarNotificacion("Debe consultar los datos antes de generar reportes", "warning");
    return false;
  }
  
  return true;
}

function validarEntradaNumerica(e) {
  let valor = e.target.value.replace(/[^0-9.]/g, '');
  const partes = valor.split('.');
  
  if (partes.length > 2) {
    valor = partes[0] + '.' + partes.slice(1).join('');
  }
  
  if (partes[1] && partes[1].length > 2) {
    valor = partes[0] + '.' + partes[1].substring(0, 2);
  }
  
  e.target.value = valor;
}

function formatearDecimales(e) {
  const valor = parseFloat(e.target.value) || 0;
  e.target.value = valor.toFixed(2);
}

function obtenerDatosFormulario() {
  const fechaISO = document.getElementById("fechaCierre").value;
  const [año, mes, dia] = fechaISO.split("-");
  
  return {
    fecha: fechaISO,
    fechaFormateada: `${dia}/${mes}/${año}`,
    responsable: document.getElementById("responsable").value || "Sin especificar",
    saldoInicial: parseFloat(document.getElementById("saldoInicial").value) || 0,
    horaApertura: document.getElementById("horaApertura").value || "No registrada",
    observaciones: document.getElementById("observaciones").value || "Sin observaciones"
  };
}

// ========================================
// FUNCIONES DE INTERFAZ Y UTILIDADES
// ========================================

function mostrarLoading(mostrar) {
  const loading = document.getElementById('loadingCierre');
  if (loading) {
    loading.style.display = mostrar ? 'flex' : 'none';
  }
}

function actualizarGraficos(datos) {
  console.log('📊 Datos disponibles para gráficos:', datos);
}

function actualizarElemento(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = valor;
  }
}

function obtenerValorNumerico(id) {
  const elemento = document.getElementById(id);
  if (!elemento) return 0;
  
  const texto = elemento.textContent.replace(/[$,\s]/g, '');
  return parseFloat(texto) || 0;
}

function formatearMoneda(numero) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  // Remover notificaciones existentes
  const existentes = document.querySelectorAll('.notificacion-temporal');
  existentes.forEach(n => n.remove());
  
  // Crear nueva notificación
  const notif = document.createElement('div');
  notif.className = 'notificacion-temporal';
  
  const colores = {
    success: { bg: '#28a745', border: '#1e7e34' },
    error: { bg: '#dc3545', border: '#bd2130' },
    warning: { bg: '#ffc107', border: '#d39e00', color: '#212529' },
    info: { bg: '#17a2b8', border: '#117a8b' }
  };
  
  const colorConfig = colores[tipo] || colores.info;
  
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: ${colorConfig.color || 'white'};
    background: ${colorConfig.bg};
    border: 2px solid ${colorConfig.border};
    font-weight: 600;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
    word-wrap: break-word;
  `;
  
  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notif.innerHTML = `${iconos[tipo] || iconos.info} ${mensaje}`;
  
  document.body.appendChild(notif);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (notif.parentNode) {
      notif.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notif.remove(), 300);
    }
  }, 5000);
  
  // Click para cerrar
  notif.addEventListener('click', () => {
    notif.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notif.remove(), 300);
  });
}

// ========================================
// ESTILOS CSS DINÁMICOS
// ========================================

// Agregar estilos CSS para las animaciones y elementos mejorados
const estilosNotificaciones = document.createElement('style');
estilosNotificaciones.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .notificacion-temporal {
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .notificacion-temporal:hover {
    transform: translateX(-5px);
  }
  
  .badge {
    background: var(--accent-color);
    color: var(--primary-color);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: 600;
  }
  
  .tabla-detalle tbody tr:hover {
    background: rgba(159, 216, 26, 0.1);
    transform: translateX(2px);
    transition: all 0.2s ease;
  }
  
  .resumen-servicios, .resumen-productos {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 4px solid var(--accent-color);
  }
  
  .resumen-servicios h4, .resumen-productos h4 {
    color: var(--accent-color);
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
  
  .resumen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .resumen-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .resumen-label {
    color: #666;
    font-size: 0.9em;
  }
  
  .resumen-valor {
    color: var(--accent-color);
    font-size: 1.1em;
    font-weight: 600;
  }
  
  .rango-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .rango-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .rango-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .rango-item:last-child {
    border-bottom: none;
  }
  
  .rango-label {
    color: #ccc;
    font-size: 0.9em;
  }
  
  .rango-valor {
    color: var(--accent-color);
    font-weight: 600;
  }
  
  .rango-valor.destacado {
    background: var(--accent-color);
    color: var(--primary-color);
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 1.1em;
  }
`;

document.head.appendChild(estilosNotificaciones);

// ========================================
// FUNCIONES ADICIONALES PARA COMPLETAR
// ========================================

function crearGraficoVentas(datos) {
  console.log('🎯 Creando gráfico de ventas con:', datos);
}

function crearGraficoComisiones(datos) {
  console.log('🎯 Creando gráfico de comisiones con:', datos);
}

// Función para debug y testing
function debugCierre() {
  console.log('🔍 === DEBUG CIERRE DE CAJA ===');
  console.log('Fecha:', document.getElementById("fechaCierre").value);
  console.log('Responsable:', document.getElementById("responsable").value);
  console.log('Datos completos:', obtenerDatosCompletos());
  console.log('=================================');
}

function obtenerDatosCompletos() {
  const datosBase = obtenerDatosFormulario();
  
  return {
    ...datosBase,
    metricas: {
      ingresosTotales: obtenerValorNumerico("totalVentas"),
      totalTransacciones: parseInt(document.getElementById("totalTransacciones").textContent) || 0,
      totalComisiones: obtenerValorNumerico("totalComisiones"),
      utilidadNeta: obtenerValorNumerico("utilidadNeta")
    },
    ventasPorMetodo: {
      efectivo: obtenerValorNumerico("ventasEfectivo"),
      tarjeta: obtenerValorNumerico("ventasTarjeta"),
      otros: obtenerValorNumerico("ventasTransferencia")
    },
    efectivo: {
      contado: obtenerValorNumerico("totalEfectivo"),
      saldoInicial: datosBase.saldoInicial,
      diferencia: obtenerValorNumerico("diferencia")
    },
    denominaciones: obtenerDenominaciones(),
    timestamp: new Date().toISOString()
  };
}

function obtenerDenominaciones() {
  return {
    billete100: parseInt(document.getElementById("billete100").value) || 0,
    billete50: parseInt(document.getElementById("billete50").value) || 0,
    billete20: parseInt(document.getElementById("billete20").value) || 0,
    billete10: parseInt(document.getElementById("billete10").value) || 0,
    billete5: parseInt(document.getElementById("billete5").value) || 0,
    billete1: parseInt(document.getElementById("billete1").value) || 0,
    monedas: parseFloat(document.getElementById("monedas").value) || 0
  };
}

// Exponer función de debug en consola para testing
window.debugCierre = debugCierre;

// ========================================
// INICIALIZACIÓN FINAL
// ========================================

// Auto-actualizar fecha en el header
function actualizarFechaHeader() {
  const fechaHeader = document.getElementById('fechaHeader');
  if (fechaHeader) {
    const hoy = new Date();
    fechaHeader.textContent = hoy.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Ejecutar actualización de fecha al cargar
actualizarFechaHeader();

// Mensaje de confirmación de carga
console.log("✅ Sistema de cierre de caja completo cargado correctamente");
console.log("🔧 Funciones disponibles: consultarVentasCompleto, generarPDFCierreCompleto");
console.log("🐛 Para debug, usar: debugCierre() en la consola");

