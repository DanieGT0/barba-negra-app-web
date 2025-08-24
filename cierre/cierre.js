// ========================================
// ARCHIVO CIERRE.JS CORREGIDO Y OPTIMIZADO
// Sin código redundante - Versión Final
// ========================================

// Variables globales
let datosActualesCierre = null;

// ========================================
// FUNCIONES DE INICIALIZACIÓN
// ========================================

function inicializarFecha() {
  console.log('📅 Inicializando fecha...');
  const fechaHoy = new Date();
  const anio = fechaHoy.getFullYear();
  const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaHoy.getDate()).padStart(2, '0');
  const fechaLocal = `${anio}-${mes}-${dia}`;
  
  const campofecha = document.getElementById("fechaCierre");
  if (campofecha) {
    campofecha.value = fechaLocal;
    console.log('✅ Fecha inicializada:', fechaLocal);
  } else {
    console.error('❌ Campo de fecha no encontrado');
  }
}

async function cargarEmpleados() {
  console.log('👥 Cargando empleados...');
  try {
    const res = await fetch("/api/empleados");
    
    if (!res.ok) {
      throw new Error(`Error al cargar empleados: ${res.status}`);
    }
    
    const empleados = await res.json();
    console.log(`✅ ${empleados.length} empleados cargados`);

    const select = document.getElementById("responsable");
    if (select) {
      select.innerHTML = '<option value="">Seleccionar responsable</option>';

      empleados.forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.nombre;
        opt.textContent = emp.nombre;
        select.appendChild(opt);
      });
      
      console.log('✅ Select de responsables actualizado');
    } else {
      console.error('❌ Select de responsable no encontrado');
    }
  } catch (error) {
    console.error("❌ Error al cargar empleados:", error);
    mostrarNotificacion("Error al cargar empleados", "error");
  }
}

function configurarEventListeners() {
  console.log('🔧 Configurando event listeners...');
  
  // Botón principal de consulta
  const btnConsultar = document.getElementById("btnConsultar");
  if (btnConsultar) {
    btnConsultar.addEventListener("click", consultarVentasCompleto);
    console.log('✅ Event listener agregado a btnConsultar');
  } else {
    console.error('❌ Botón consultar no encontrado');
  }
  
  // Botón Ver Cierre
  const btnVerCierre = document.getElementById("btnVerCierre");
  if (btnVerCierre) {
    btnVerCierre.addEventListener("click", verCierre);
    console.log('✅ Event listener agregado a btnVerCierre');
  } else {
    console.error('❌ Botón Ver Cierre no encontrado');
  }
}

function configurarCalculosEfectivo() {
  console.log('💵 Configurando cálculos de efectivo...');

  // Event listeners para denominaciones
  const denominaciones = ['billete100', 'billete50', 'billete20', 'billete10', 'billete5', 'billete1', 'monedas'];
  
  denominaciones.forEach(denominacion => {
    const elemento = document.getElementById(denominacion);
    if (elemento) {
      elemento.addEventListener('input', calcularTotalEfectivo);
      elemento.addEventListener('change', calcularTotalEfectivo);
    }
  });

  // Event listener para saldo inicial
  const saldoInicial = document.getElementById('saldoInicial');
  if (saldoInicial) {
    saldoInicial.addEventListener('input', calcularTotalEfectivo);
    saldoInicial.addEventListener('change', calcularTotalEfectivo);
  }

  console.log('✅ Cálculos de efectivo configurados');
}

// ========================================
// FUNCIÓN PRINCIPAL DE CONSULTA
// ========================================

async function consultarVentasCompleto() {
  const fechaISO = document.getElementById("fechaCierre").value;
  const responsable = document.getElementById("responsable").value;

  console.log('🔍 === INICIANDO CONSULTA DE DATOS ===');
  console.log('📅 Fecha ISO seleccionada:', fechaISO);
  console.log('👤 Responsable seleccionado:', responsable);

  if (!fechaISO) {
    mostrarNotificacion("⚠️ Debes seleccionar una fecha.", "warning");
    return;
  }

  // Convertir fecha de ISO (YYYY-MM-DD) a formato DD/MM/YYYY
  const [año, mes, dia] = fechaISO.split("-");
  const fechaCentroamericana = `${dia}/${mes}/${año}`;

  console.log('📅 Fecha convertida a formato centroamericano:', fechaCentroamericana);

  try {
    mostrarLoading(true);
    
    // Usar fecha centroamericana en la URL
    const urlConsulta = `/api/cierre-completo?fecha=${encodeURIComponent(fechaCentroamericana)}${responsable ? `&responsable=${encodeURIComponent(responsable)}` : ''}`;
    console.log('🌐 URL de consulta:', urlConsulta);
    
    const res = await fetch(urlConsulta);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error en respuesta del servidor:', res.status, errorText);
      throw new Error(`Error del servidor: ${res.status} - ${res.statusText}`);
    }
    
    const datos = await res.json();
    console.log('📊 Datos recibidos del servidor:', datos);

    // Verificar estructura de datos
    if (!datos || Object.keys(datos).length === 0) {
      console.warn('⚠️ Respuesta vacía del servidor');
      mostrarNotificacion("No se encontraron datos para la fecha seleccionada", "warning");
      return;
    }

    // Guardar datos para uso posterior
    datosActualesCierre = datos;

    // Procesar datos
    console.log('🔄 Procesando datos...');
    procesarDatosCierreCompleto(datos);
    
    // Actualizar efectivo y métricas
    calcularTotalEfectivo();
    actualizarIndicadoresRendimiento();
    
    console.log('✅ Consulta completada exitosamente');
    mostrarNotificacion("Datos consultados exitosamente", "success");
    
  } catch (err) {
    console.error("❌ Error detallado en consulta:", err);
    mostrarNotificacion(`Error al consultar los datos: ${err.message}`, "error");
  } finally {
    mostrarLoading(false);
  }
}

// ========================================
// FUNCIONES DE PROCESAMIENTO DE DATOS
// ========================================

function procesarDatosCierreCompleto(datos) {
  console.log('📋 === PROCESANDO DATOS DE CIERRE COMPLETO ===');
  
  // Debug de estructura
  console.log('🔍 Estructura de datos:', {
    ventas: datos.ventas ? datos.ventas.length : 0,
    servicios: datos.servicios ? datos.servicios.length : 0,
    productos: datos.productos ? datos.productos.length : 0,
    comisiones: datos.comisiones ? datos.comisiones.length : 0,
    resumen: datos.resumen ? 'Presente' : 'Ausente',
    rangos_en_resumen: datos.resumen?.rangos_comandas ? 'Sí' : 'No'
  });
  
  // Procesar cada sección
  if (datos.ventas && Array.isArray(datos.ventas)) {
    console.log('💰 Procesando ventas...');
    procesarVentasPorTipoPago(datos.ventas);
  }
  
  if (datos.servicios && Array.isArray(datos.servicios)) {
    console.log('✂️ Procesando servicios...');
    procesarDetalleServicios(datos.servicios);
  }
  
  if (datos.productos && Array.isArray(datos.productos)) {
    console.log('🛍️ Procesando productos...');
    procesarDetalleProductos(datos.productos);
  }
  
  if (datos.comisiones && Array.isArray(datos.comisiones)) {
    console.log('💰 Procesando comisiones...');
    procesarComisiones(datos.comisiones);
  }
  
  if (datos.resumen) {
    console.log('📈 Mostrando resumen ejecutivo...');
    mostrarResumenEjecutivo(datos.resumen);
  }
  
  // CRÍTICO: Procesar rangos
  console.log('📊 Procesando rangos de comandas y facturas...');
  procesarRangosComandaFactura(datos);
  
  console.log('✅ Procesamiento de datos completado');
}

function procesarVentasPorTipoPago(ventas) {
  console.log('💳 === PROCESANDO VENTAS POR TIPO DE PAGO ===');
  console.log('📊 Ventas recibidas:', ventas.length);
  
  // Debug: Mostrar estructura de la primera venta para verificar campos
  if (ventas.length > 0) {
    console.log('🔍 DEBUG - Primera venta completa:', ventas[0]);
    console.log('🔍 DEBUG - Campos disponibles:', Object.keys(ventas[0]));
  }
  
  let efectivo = 0, tarjeta = 0, otros = 0;
  let conteoFacturas = 0, conteoMembresias = 0;

  ventas.forEach((item, index) => {
    console.log(`   Procesando venta ${index + 1}:`, {
      tipo_registro: item.tipo_registro,
      tipo_pago: item.tipo_pago,
      total: item.total,
      es_pago_mixto: item.es_pago_mixto,
      monto_efectivo: item.monto_efectivo,
      monto_tarjeta: item.monto_tarjeta
    });
    
    const tipo = item.tipo_pago;
    const total = parseFloat(item.total || 0);

    // Contar tipos de registro
    if (item.tipo_registro === 'factura') {
      conteoFacturas++;
    } else if (item.tipo_registro === 'membresia') {
      conteoMembresias++;
    }

    // Sumar por tipo de pago - MEJORADO PARA PAGOS MIXTOS
    console.log(`   🔍 Evaluando pago: es_pago_mixto=${item.es_pago_mixto}, tipo=${typeof item.es_pago_mixto}, valor=${item.es_pago_mixto}`);
    
    if (item.es_pago_mixto == 1 || item.es_pago_mixto === true) {
      // Es pago mixto NUEVO - usar montos específicos
      const montoEfectivo = parseFloat(item.monto_efectivo || 0);
      const montoTarjeta = parseFloat(item.monto_tarjeta || 0);
      
      efectivo += montoEfectivo;
      tarjeta += montoTarjeta;
      
      console.log(`   💳 PAGO MIXTO NUEVO DETECTADO: Efectivo +$${montoEfectivo.toFixed(2)}, Tarjeta +$${montoTarjeta.toFixed(2)}`);
      console.log(`   📊 Acumulados después: Efectivo=$${efectivo.toFixed(2)}, Tarjeta=$${tarjeta.toFixed(2)}`);
    } else if (tipo && tipo.includes("Mixto") && tipo.includes("Efectivo:") && tipo.includes("Tarjeta:")) {
      // Es pago mixto LEGACY - extraer montos del texto
      console.log(`   🔄 PAGO MIXTO LEGACY DETECTADO: ${tipo}`);
      
      try {
        // Extraer montos usando regex
        const efectivoMatch = tipo.match(/Efectivo:\s*\$(\d+\.?\d*)/);
        const tarjetaMatch = tipo.match(/Tarjeta:\s*\$(\d+\.?\d*)/);
        
        const montoEfectivoLegacy = efectivoMatch ? parseFloat(efectivoMatch[1]) : 0;
        const montoTarjetaLegacy = tarjetaMatch ? parseFloat(tarjetaMatch[1]) : 0;
        
        efectivo += montoEfectivoLegacy;
        tarjeta += montoTarjetaLegacy;
        
        console.log(`   💳 EXTRAÍDO DEL TEXTO - Efectivo: +$${montoEfectivoLegacy.toFixed(2)}, Tarjeta: +$${montoTarjetaLegacy.toFixed(2)}`);
        console.log(`   📊 Acumulados después: Efectivo=$${efectivo.toFixed(2)}, Tarjeta=$${tarjeta.toFixed(2)}`);
      } catch (error) {
        console.error(`   ❌ Error procesando pago mixto legacy: ${error.message}`);
        console.log(`   ⚠️ Agregando a 'otros' por seguridad`);
        otros += total;
      }
    } else {
      // Pago tradicional - usar tipo_pago
      console.log(`   💰 Pago tradicional: tipo=${tipo}, total=$${total.toFixed(2)}`);
      if (tipo === "Efectivo") {
        efectivo += total;
        console.log(`   📊 Efectivo acumulado: $${efectivo.toFixed(2)}`);
      } else if (tipo === "Tarjeta") {
        tarjeta += total;
        console.log(`   📊 Tarjeta acumulado: $${tarjeta.toFixed(2)}`);
      } else if (tipo === "Otros") {
        otros += total;
        console.log(`   📊 Otros acumulado: $${otros.toFixed(2)}`);
      } else {
        console.log(`   ⚠️ Tipo de pago no reconocido: ${tipo}`);
        otros += total;
        console.log(`   📊 Agregado a Otros: $${otros.toFixed(2)}`);
      }
    }
  });

  const totalGeneral = efectivo + tarjeta + otros;

  console.log('💰 === TOTALES FINALES CALCULADOS ===');
  console.log(`   Efectivo: $${efectivo.toFixed(2)}`);
  console.log(`   Tarjeta: $${tarjeta.toFixed(2)}`);
  console.log(`   Otros: $${otros.toFixed(2)}`);
  console.log(`   Total General: $${totalGeneral.toFixed(2)}`);

  // Formatear valores para mostrar
  const efectivoFormateado = formatearMoneda(efectivo);
  const tarjetaFormateado = formatearMoneda(tarjeta);
  const otrosFormateado = formatearMoneda(otros);
  const totalFormateado = formatearMoneda(totalGeneral);

  console.log('💰 === VALORES FORMATEADOS ===');
  console.log(`   Efectivo formateado: ${efectivoFormateado}`);
  console.log(`   Tarjeta formateado: ${tarjetaFormateado}`);
  console.log(`   Otros formateado: ${otrosFormateado}`);
  console.log(`   Total formateado: ${totalFormateado}`);

  // Actualizar DOM
  actualizarElemento("ventasEfectivo", efectivoFormateado);
  actualizarElemento("ventasTarjeta", tarjetaFormateado);
  actualizarElemento("ventasTransferencia", otrosFormateado);
  actualizarElemento("totalVentas", totalFormateado);
  actualizarElemento("resumenVentasEfectivo", efectivoFormateado);
  actualizarElemento("conteoFacturas", conteoFacturas);
  actualizarElemento("conteoMembresias", conteoMembresias);
  actualizarElemento("totalTransacciones", conteoFacturas + conteoMembresias);
  
  console.log('✅ DOM actualizado con valores de ventas');
}

function procesarDetalleServicios(servicios) {
  console.log('✂️ === PROCESANDO DETALLE DE SERVICIOS CON AGRUPACIÓN ===');
  console.log('📊 Servicios recibidos:', servicios.length);

  if (!servicios || servicios.length === 0) {
    document.getElementById('detalleServiciosContainer').innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        <i class="fas fa-info-circle"></i> 
        No hay servicios registrados para esta fecha
      </p>
    `;
    actualizarElemento('cantidadServicios', 0);
    actualizarElemento('totalIngresoServicios', formatearMoneda(0));
    // También resetear cortes gratis
    procesarCortesGratis([]);
    return;
  }

  // Agrupar servicios por nombre
  const serviciosAgrupados = {};
  let totalCantidad = 0;
  let totalIngresos = 0;

  servicios.forEach(servicio => {
    const nombre = servicio.nombre;
    const cantidad = parseInt(servicio.cantidad || 0);
    const total = parseFloat(servicio.total || 0);
    
    const precioUnitario = cantidad > 0 ? total / cantidad : 0;

    if (!serviciosAgrupados[nombre]) {
      serviciosAgrupados[nombre] = {
        nombre: nombre,
        cantidad: 0,
        total: 0,
        precio_unitario: precioUnitario
      };
    }

    serviciosAgrupados[nombre].cantidad += cantidad;
    serviciosAgrupados[nombre].total += total;
    
    totalCantidad += cantidad;
    totalIngresos += total;
  });

  console.log('🔄 Servicios agrupados:', serviciosAgrupados);

  // Construir tabla HTML
  const serviciosArray = Object.values(serviciosAgrupados);
  let tablaHTML = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  serviciosArray.forEach(servicio => {
    tablaHTML += `
      <tr>
        <td>${servicio.nombre}</td>
        <td style="text-align: center;">${servicio.cantidad}</td>
        <td style="text-align: center;">${formatearMoneda(servicio.precio_unitario)}</td>
        <td style="text-align: center;">${formatearMoneda(servicio.total)}</td>
      </tr>
    `;
  });

  tablaHTML += `</tbody></table></div>`;

  // Actualizar DOM
  document.getElementById('detalleServiciosContainer').innerHTML = tablaHTML;
  actualizarElemento('cantidadServicios', totalCantidad);
  actualizarElemento('totalIngresoServicios', formatearMoneda(totalIngresos));

  // Procesar cortes gratis
  procesarCortesGratis(servicios);

  console.log(`✅ Servicios agrupados: ${serviciosArray.length} tipos diferentes, ${totalCantidad} servicios totales`);
}

function procesarDetalleProductos(productos) {
  console.log('🛍️ === PROCESANDO DETALLE DE PRODUCTOS CON AGRUPACIÓN ===');
  
  if (!productos || productos.length === 0) {
    document.getElementById('detalleProductosContainer').innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        <i class="fas fa-info-circle"></i> 
        No hay productos registrados para esta fecha
      </p>
    `;
    actualizarElemento('cantidadProductos', 0);
    actualizarElemento('totalIngresoProductos', formatearMoneda(0));
    return;
  }

  // Agrupar productos por nombre
  const productosAgrupados = {};
  let totalCantidad = 0;
  let totalIngresos = 0;

  productos.forEach(producto => {
    const nombre = producto.nombre;
    const cantidad = parseInt(producto.cantidad || 0);
    const total = parseFloat(producto.total || 0);
    
    const precioUnitario = cantidad > 0 ? total / cantidad : 0;

    if (!productosAgrupados[nombre]) {
      productosAgrupados[nombre] = {
        nombre: nombre,
        cantidad: 0,
        total: 0,
        precio_unitario: precioUnitario
      };
    }

    productosAgrupados[nombre].cantidad += cantidad;
    productosAgrupados[nombre].total += total;
    
    totalCantidad += cantidad;
    totalIngresos += total;
  });

  console.log('🔄 Productos agrupados:', productosAgrupados);

  // Construir tabla HTML
  const productosArray = Object.values(productosAgrupados);
  let tablaHTML = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  productosArray.forEach(producto => {
    tablaHTML += `
      <tr>
        <td>${producto.nombre}</td>
        <td style="text-align: center;">${producto.cantidad}</td>
        <td style="text-align: center;">${formatearMoneda(producto.precio_unitario)}</td>
        <td style="text-align: center;">${formatearMoneda(producto.total)}</td>
      </tr>
    `;
  });

  tablaHTML += `</tbody></table></div>`;

  // Actualizar DOM
  document.getElementById('detalleProductosContainer').innerHTML = tablaHTML;
  actualizarElemento('cantidadProductos', totalCantidad);
  actualizarElemento('totalIngresoProductos', formatearMoneda(totalIngresos));

  console.log(`✅ Productos agrupados: ${productosArray.length} tipos diferentes, ${totalCantidad} productos totales`);
}

function procesarComisiones(comisiones) {
  console.log('💰 === PROCESANDO COMISIONES ===');
  
  if (!comisiones || comisiones.length === 0) {
    document.getElementById('detalleComisionesContainer').innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        <i class="fas fa-info-circle"></i> 
        No hay comisiones registradas para esta fecha
      </p>
    `;
    actualizarElemento('totalComisiones', formatearMoneda(0));
    return;
  }

  // Construir tabla HTML
  let tablaHTML = `
    <div class="tabla-responsive">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Servicios</th>
            <th>Productos</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalComisiones = 0;

  comisiones.forEach(comision => {
    const servicios = parseFloat(comision.comision_servicios || 0);
    const productos = parseFloat(comision.comision_productos || 0);
    const total = parseFloat(comision.total_comision || 0);
    
    totalComisiones += total;

    tablaHTML += `
      <tr>
        <td>${comision.empleado}</td>
        <td style="text-align: center;">${formatearMoneda(servicios)}</td>
        <td style="text-align: center;">${formatearMoneda(productos)}</td>
        <td style="text-align: center;">${formatearMoneda(total)}</td>
      </tr>
    `;
  });

  tablaHTML += `</tbody></table></div>`;

  // Actualizar DOM
  document.getElementById('detalleComisionesContainer').innerHTML = tablaHTML;
  actualizarElemento('totalComisiones', formatearMoneda(totalComisiones));

  console.log('✅ Comisiones procesadas');
}

// ========================================
// FUNCIÓN PARA PROCESAR CORTES GRATIS
// ========================================

function procesarCortesGratis(servicios) {
  console.log('🎁 === PROCESANDO CORTES GRATIS (TARJETA FIDELIDAD) ===');
  
  if (!servicios || servicios.length === 0) {
    document.getElementById('detalleCortesGratisContainer').innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        <i class="fas fa-info-circle"></i> 
        No hay cortes gratis registrados para esta fecha
      </p>
    `;
    actualizarElemento('totalCortesGratis', 0);
    actualizarElemento('valorCortesGratis', formatearMoneda(0));
    actualizarElemento('clientesBeneficiados', 0);
    return;
  }

  // Filtrar solo los cortes gratis (aquellos con descuento_gratis = 1 o total = 0)
  const cortesGratis = [];
  
  servicios.forEach(servicio => {
    // Identificar cortes gratis por descuento_gratis o por total = 0
    if (servicio.descuento_gratis || (parseFloat(servicio.total || 0) === 0 && parseInt(servicio.cantidad || 0) > 0)) {
      cortesGratis.push({
        nombre: servicio.nombre,
        empleado: servicio.empleado || 'N/A',
        cliente: servicio.cliente || 'N/A',
        cantidad: parseInt(servicio.cantidad || 0),
        precio_original: parseFloat(servicio.precio_original || servicio.precio || 0),
        fecha_hora: servicio.fecha_hora || servicio.fecha || '',
        factura: servicio.factura || '',
        comanda: servicio.comanda || ''
      });
    }
  });

  console.log(`🎁 Cortes gratis encontrados: ${cortesGratis.length}`, cortesGratis);

  // Calcular métricas
  let totalCortes = 0;
  let valorTotal = 0;
  const clientesUnicos = new Set();

  cortesGratis.forEach(corte => {
    totalCortes += corte.cantidad;
    valorTotal += corte.precio_original * corte.cantidad;
    if (corte.cliente && corte.cliente !== 'N/A') {
      clientesUnicos.add(corte.cliente);
    }
  });

  // Actualizar métricas en el DOM
  actualizarElemento('totalCortesGratis', totalCortes);
  actualizarElemento('valorCortesGratis', formatearMoneda(valorTotal));
  actualizarElemento('clientesBeneficiados', clientesUnicos.size);

  // Construir tabla de detalle
  if (cortesGratis.length === 0) {
    document.getElementById('detalleCortesGratisContainer').innerHTML = `
      <div style="background: rgba(40, 167, 69, 0.1); border: 1px solid #28a745; border-radius: 8px; padding: 1.5rem; text-align: center;">
        <i class="fas fa-check-circle" style="color: #28a745; font-size: 2rem; margin-bottom: 0.5rem;"></i>
        <h4 style="color: #28a745; margin: 0.5rem 0;">¡Excelente!</h4>
        <p style="color: #666; margin: 0;">No se registraron cortes gratis en esta fecha</p>
      </div>
    `;
  } else {
    let tablaHTML = `
      <div class="tabla-responsive">
        <table class="tabla-detalle">
          <thead style="background: linear-gradient(135deg, #1a5928, #28a745); color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <tr>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Servicio</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Cliente</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Empleado</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Cantidad</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Precio Original</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Valor Regalado</th>
              <th style="color: white; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Factura</th>
            </tr>
          </thead>
          <tbody>
    `;

    cortesGratis.forEach(corte => {
      const valorRegalado = corte.precio_original * corte.cantidad;
      const clienteDisplay = corte.cliente && corte.cliente !== 'N/A' && corte.cliente.trim() !== '' 
        ? corte.cliente 
        : '<span style="color: #6c757d; font-style: italic;">Cliente sin registrar</span>';
      
      tablaHTML += `
        <tr style="background: rgba(40, 167, 69, 0.05);">
          <td>
            <i class="fas fa-gift" style="color: #28a745; margin-right: 0.5rem;"></i>
            ${corte.nombre}
          </td>
          <td>${clienteDisplay}</td>
          <td>${corte.empleado}</td>
          <td style="text-align: center; font-weight: bold;">${corte.cantidad}</td>
          <td style="text-align: center; font-weight: bold; color: #17a2b8;">
            ${formatearMoneda(corte.precio_original)}
          </td>
          <td style="text-align: center; font-weight: bold; color: #28a745;">
            ${formatearMoneda(valorRegalado)}
          </td>
          <td style="text-align: center;">${corte.factura || corte.comanda}</td>
        </tr>
      `;
    });

    tablaHTML += `</tbody></table></div>`;

    // Agregar resumen al final
    tablaHTML += `
      <div style="margin-top: 1rem; padding: 1rem; background: rgba(40, 167, 69, 0.1); border-radius: 8px; border-left: 4px solid #28a745;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; text-align: center;">
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${totalCortes}</div>
            <div style="font-size: 0.9rem; color: #666;">Cortes Gratis</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${formatearMoneda(valorTotal)}</div>
            <div style="font-size: 0.9rem; color: #666;">Valor Total</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${clientesUnicos.size}</div>
            <div style="font-size: 0.9rem; color: #666;">Clientes</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${cortesGratis.length}</div>
            <div style="font-size: 0.9rem; color: #666;">Transacciones</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('detalleCortesGratisContainer').innerHTML = tablaHTML;
  }

  console.log(`✅ Cortes gratis procesados: ${totalCortes} cortes, ${formatearMoneda(valorTotal)} regalados a ${clientesUnicos.size} clientes`);
}

function mostrarResumenEjecutivo(resumen) {
  console.log('📈 === MOSTRANDO RESUMEN EJECUTIVO ===');
  
  if (!resumen) {
    console.warn('⚠️ No hay resumen para mostrar');
    return;
  }

  // Actualizar métricas principales
  actualizarElemento('totalVentas', formatearMoneda(resumen.ingresos_totales || 0));
  actualizarElemento('totalTransacciones', resumen.total_transacciones || 0);
  actualizarElemento('totalComisiones', formatearMoneda(resumen.total_comisiones || 0));
  actualizarElemento('utilidadNeta', formatearMoneda(resumen.utilidad_neta || 0));

  // Actualizar indicadores adicionales
  actualizarElemento('ventaPromedio', formatearMoneda(resumen.venta_promedio || 0));
  actualizarElemento('margenUtilidad', `${(resumen.margen_utilidad || 0).toFixed(1)}%`);
  actualizarElemento('margenUtilidad2', `${(resumen.margen_utilidad || 0).toFixed(1)}%`);

  console.log('✅ Resumen ejecutivo mostrado');
}

// ========================================
// FUNCIÓN PARA PROCESAR RANGOS - CORREGIDA
// ========================================

function procesarRangosComandaFactura(datos) {
  console.log('📊 === PROCESANDO RANGOS DE COMANDAS Y FACTURAS ===');
  
  // MÉTODO 1: Verificar si tenemos rangos en el resumen del servidor
  if (datos.resumen && datos.resumen.rangos_comandas && datos.resumen.rangos_facturas) {
    console.log('✅ Usando rangos del resumen del servidor');
    
    const rangosComandas = datos.resumen.rangos_comandas;
    const rangosFacturas = datos.resumen.rangos_facturas;
    
    console.log('📋 Rangos de comandas del servidor:', rangosComandas);
    console.log('🧾 Rangos de facturas del servidor:', rangosFacturas);
    
    // Actualizar elementos en el DOM usando selectores específicos
    actualizarRangoEnDOM('Comanda Inicial', `#${rangosComandas.inicio || 0}`);
    actualizarRangoEnDOM('Comanda Final', `#${rangosComandas.fin || 0}`);
    actualizarRangoEnDOM('Total Comandas', `${rangosComandas.total || 0}`);
    
    actualizarRangoEnDOM('Factura Inicial', `#${rangosFacturas.inicio || 0}`);
    actualizarRangoEnDOM('Factura Final', `#${rangosFacturas.fin || 0}`);
    actualizarRangoEnDOM('Total Facturas', `${rangosFacturas.total || 0}`);
    
    return;
  }
  
  // MÉTODO 2: Calcular rangos desde los datos de ventas
  console.log('⚠️ Calculando rangos desde datos de ventas');
  
  if (!datos.ventas || datos.ventas.length === 0) {
    console.log('❌ No hay datos de ventas para calcular rangos');
    // Mostrar valores en 0
    actualizarRangoEnDOM('Comanda Inicial', '#0');
    actualizarRangoEnDOM('Comanda Final', '#0');
    actualizarRangoEnDOM('Total Comandas', '0');
    actualizarRangoEnDOM('Factura Inicial', '#0');
    actualizarRangoEnDOM('Factura Final', '#0');
    actualizarRangoEnDOM('Total Facturas', '0');
    return;
  }

  const comandas = [];
  const facturas = [];

  console.log('🔍 Analizando ventas para extraer rangos...');
  
  datos.ventas.forEach((venta, index) => {
    console.log(`   Venta ${index + 1}:`, {
      tipo_registro: venta.tipo_registro,
      comanda: venta.comanda,
      factura: venta.factura
    });

    if (venta.tipo_registro === 'factura') {
      // Extraer comandas
      if (venta.comanda) {
        const comandaNum = parseInt(venta.comanda);
        if (!isNaN(comandaNum) && comandaNum > 0) {
          comandas.push(comandaNum);
          console.log(`     ✅ Comanda extraída: ${comandaNum}`);
        }
      }
      
      // Extraer facturas
      if (venta.factura) {
        const facturaNum = parseInt(venta.factura);
        if (!isNaN(facturaNum) && facturaNum > 0) {
          facturas.push(facturaNum);
          console.log(`     ✅ Factura extraída: ${facturaNum}`);
        }
      }
    }
  });

  console.log('📊 Números extraídos:');
  console.log('   Comandas:', comandas);
  console.log('   Facturas:', facturas);

  // Calcular y actualizar rangos de comandas
  if (comandas.length > 0) {
    const comandaInicial = Math.min(...comandas);
    const comandaFinal = Math.max(...comandas);
    const totalComandas = comandas.length;

    actualizarRangoEnDOM('Comanda Inicial', `#${comandaInicial}`);
    actualizarRangoEnDOM('Comanda Final', `#${comandaFinal}`);
    actualizarRangoEnDOM('Total Comandas', `${totalComandas}`);
    
    console.log(`✅ Rangos de comandas calculados: ${comandaInicial} - ${comandaFinal} (${totalComandas} comandas)`);
  } else {
    actualizarRangoEnDOM('Comanda Inicial', '#0');
    actualizarRangoEnDOM('Comanda Final', '#0');
    actualizarRangoEnDOM('Total Comandas', '0');
    console.log('⚠️ No se encontraron comandas válidas');
  }

  // Calcular y actualizar rangos de facturas
  if (facturas.length > 0) {
    const facturaInicial = Math.min(...facturas);
    const facturaFinal = Math.max(...facturas);
    const totalFacturas = facturas.length;

    actualizarRangoEnDOM('Factura Inicial', `#${facturaInicial}`);
    actualizarRangoEnDOM('Factura Final', `#${facturaFinal}`);
    actualizarRangoEnDOM('Total Facturas', `${totalFacturas}`);
    
    console.log(`✅ Rangos de facturas calculados: ${facturaInicial} - ${facturaFinal} (${totalFacturas} facturas)`);
  } else {
    actualizarRangoEnDOM('Factura Inicial', '#0');
    actualizarRangoEnDOM('Factura Final', '#0');
    actualizarRangoEnDOM('Total Facturas', '0');
    console.log('⚠️ No se encontraron facturas válidas');
  }
}

// FUNCIÓN CORREGIDA PARA ACTUALIZAR RANGOS
function actualizarRangoEnDOM(textoTitulo, valor) {
  console.log(`🔄 Actualizando rango: "${textoTitulo}" = ${valor}`);
  
  let encontrado = false;
  
  // Buscar todos los elementos de texto
  const elementos = document.querySelectorAll('*');
  
  elementos.forEach(elemento => {
    // Solo verificar elementos que tienen texto directo
    if (elemento.textContent && elemento.children.length === 0) {
      if (elemento.textContent.trim() === textoTitulo) {
        // Encontrar el contenedor padre y buscar el elemento valor
        const contenedor = elemento.closest('.metrica-card, .rango-card, div');
        if (contenedor) {
          // Buscar span que contenga valor (típicamente el último)
          const spans = contenedor.querySelectorAll('span');
          if (spans.length > 0) {
            const spanValor = spans[spans.length - 1];
            if (spanValor !== elemento) { // Asegurar que no es el mismo elemento del título
              spanValor.textContent = valor;
              encontrado = true;
              console.log(`✅ ${textoTitulo} actualizado a: ${valor}`);
            }
          }
        }
      }
    }
  });
  
  if (!encontrado) {
    console.warn(`⚠️ No se pudo actualizar: ${textoTitulo}`);
    // Método alternativo por estructura
    actualizarRangoPorIndice(textoTitulo, valor);
  }
}

// MÉTODO ALTERNATIVO para actualizar rangos
function actualizarRangoPorIndice(textoTitulo, valor) {
  console.log(`🔧 Método alternativo para: ${textoTitulo}`);
  
  // Buscar secciones específicas de rangos
  const seccionesRango = document.querySelectorAll('.detalle-card');
  
  seccionesRango.forEach(seccion => {
    const titulo = seccion.querySelector('h3');
    
    if (titulo && titulo.textContent.includes('Rangos de Comandas')) {
      const valores = seccion.querySelectorAll('.metrica-valor span');
      
      if (textoTitulo === 'Comanda Inicial' && valores[0]) {
        valores[0].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
      else if (textoTitulo === 'Comanda Final' && valores[1]) {
        valores[1].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
      else if (textoTitulo === 'Total Comandas' && valores[2]) {
        valores[2].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
    }
    
    else if (titulo && titulo.textContent.includes('Rangos de Facturas')) {
      const valores = seccion.querySelectorAll('.metrica-valor span');
      
      if (textoTitulo === 'Factura Inicial' && valores[0]) {
        valores[0].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
      else if (textoTitulo === 'Factura Final' && valores[1]) {
        valores[1].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
      else if (textoTitulo === 'Total Facturas' && valores[2]) {
        valores[2].textContent = valor;
        console.log(`✅ ${textoTitulo} actualizado (método alternativo): ${valor}`);
      }
    }
  });
}

// ========================================
// FUNCIONES DE CÁLCULO DE EFECTIVO
// ========================================

function calcularTotalEfectivo() {
  console.log('💵 Calculando total de efectivo...');

  // Obtener valores de denominaciones
  const billetes100 = parseInt(document.getElementById('billete100')?.value || 0);
  const billetes50 = parseInt(document.getElementById('billete50')?.value || 0);
  const billetes20 = parseInt(document.getElementById('billete20')?.value || 0);
  const billetes10 = parseInt(document.getElementById('billete10')?.value || 0);
  const billetes5 = parseInt(document.getElementById('billete5')?.value || 0);
  const billetes1 = parseInt(document.getElementById('billete1')?.value || 0);
  const monedas = parseFloat(document.getElementById('monedas')?.value || 0);

  // Calcular subtotales
  const subtotal100 = billetes100 * 100;
  const subtotal50 = billetes50 * 50;
  const subtotal20 = billetes20 * 20;
  const subtotal10 = billetes10 * 10;
  const subtotal5 = billetes5 * 5;
  const subtotal1 = billetes1 * 1;

  // Total efectivo contado
  const totalEfectivo = subtotal100 + subtotal50 + subtotal20 + subtotal10 + subtotal5 + subtotal1 + monedas;

  // Actualizar subtotales en la interfaz
  const subtotales = document.querySelectorAll('.denominacion-subtotal');
  if (subtotales.length >= 7) {
    subtotales[0].textContent = formatearMoneda(subtotal100);
    subtotales[1].textContent = formatearMoneda(subtotal50);
    subtotales[2].textContent = formatearMoneda(subtotal20);
    subtotales[3].textContent = formatearMoneda(subtotal10);
    subtotales[4].textContent = formatearMoneda(subtotal5);
    subtotales[5].textContent = formatearMoneda(subtotal1);
    subtotales[6].textContent = formatearMoneda(monedas);
  }

  // Actualizar total efectivo
  actualizarElemento('totalEfectivo', formatearMoneda(totalEfectivo));
  actualizarElemento('efectivoContado', formatearMoneda(totalEfectivo));

  // Calcular diferencia
  calcularDiferenciaEfectivo(totalEfectivo);

  console.log(`💰 Total efectivo calculado: ${formatearMoneda(totalEfectivo)}`);
}

function calcularDiferenciaEfectivo(efectivoContado) {
  const saldoInicial = parseFloat(document.getElementById('saldoInicial')?.value || 0);
  const ventasEfectivo = obtenerValorNumerico('resumenVentasEfectivo');
  
  const efectivoEsperado = saldoInicial + ventasEfectivo;
  const diferencia = efectivoContado - efectivoEsperado;

  // Actualizar elementos
  actualizarElemento('resumenSaldoInicial', formatearMoneda(saldoInicial));
  actualizarElemento('diferencia', formatearMoneda(diferencia));

  // Aplicar clase de color según la diferencia
  const elementoDiferencia = document.getElementById('diferencia');
  if (elementoDiferencia) {
    elementoDiferencia.classList.remove('diferencia-positiva', 'diferencia-negativa', 'diferencia-neutra');
    
    if (diferencia > 0) {
      elementoDiferencia.classList.add('diferencia-positiva');
    } else if (diferencia < 0) {
      elementoDiferencia.classList.add('diferencia-negativa');
    } else {
      elementoDiferencia.classList.add('diferencia-neutra');
    }
  }

  console.log(`💰 Diferencia calculada: ${formatearMoneda(diferencia)}`);
}

// ========================================
// FUNCIONES DE UTILIDADES
// ========================================

function mostrarLoading(mostrar) {
  const loading = document.getElementById('loadingCierre');
  if (loading) {
    loading.style.display = mostrar ? 'flex' : 'none';
  }
}

function actualizarElemento(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = valor;
    console.log(`✅ Elemento actualizado: ${id} = ${valor}`);
  } else {
    console.warn(`⚠️ Elemento no encontrado: ${id}`);
  }
}

function obtenerValorNumerico(id) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    return 0;
  }
  
  const texto = elemento.textContent.replace(/[$,\s]/g, '');
  const valor = parseFloat(texto) || 0;
  return valor;
}

function formatearMoneda(numero) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero || 0);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  console.log(`📢 Notificación [${tipo}]: ${mensaje}`);
  
  // Crear elemento de notificación
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion-${tipo}`;
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 10000;
    max-width: 400px;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  // Colores según tipo
  const colores = {
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8'
  };
  
  notificacion.style.backgroundColor = colores[tipo] || colores.info;
  notificacion.textContent = mensaje;
  
  document.body.appendChild(notificacion);
  
  // Remover después de 5 segundos
  setTimeout(() => {
    if (document.body.contains(notificacion)) {
      document.body.removeChild(notificacion);
    }
  }, 5000);
}

function actualizarIndicadoresRendimiento() {
  const totalVentas = obtenerValorNumerico('totalVentas');
  const totalTransacciones = parseInt(document.getElementById('totalTransacciones')?.textContent || 0);
  const cantidadServicios = parseInt(document.getElementById('cantidadServicios')?.textContent || 0);
  
  // Calcular servicios por hora (estimado para 8 horas)
  const serviciosPorHora = Math.round(cantidadServicios / 8);
  actualizarElemento('serviciosPorHora', serviciosPorHora);

  // Calcular eficiencia
  const eficiencia = totalVentas > 0 ? Math.min(100, (totalVentas / 1000) * 100) : 0;
  actualizarElemento('eficienciaGeneral', `${eficiencia.toFixed(0)}%`);
}

// ========================================
// FUNCIÓN PARA GENERAR PDF
// ========================================

// ========================================
// NUEVA FUNCIÓN: Ver Cierre (Vista HTML)
// ========================================
function verCierre() {
  console.log('👁️ Abriendo vista HTML de cierre...');
  
  if (!datosActualesCierre) {
    mostrarNotificacion('Primero debes consultar los datos del cierre', 'warning');
    return;
  }
  
  try {
    // Obtener fecha y responsable de los datos actuales
    const fecha = document.getElementById('fechaCierre')?.value;
    const responsable = document.getElementById('responsable')?.value || '';
    
    if (!fecha) {
      mostrarNotificacion('Fecha es requerida para ver el cierre', 'error');
      return;
    }
    
    // Convertir fecha de formato ISO (YYYY-MM-DD) a formato URL
    let fechaUrl = fecha;
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      fechaUrl = fecha; // Mantener formato ISO para la URL
    }
    
    // Construir URL para la vista HTML
    let url = `/cierre/vista/${fechaUrl}`;
    if (responsable && responsable.trim() !== '') {
      url += `?responsable=${encodeURIComponent(responsable)}`;
    }
    
    console.log('🔗 Abriendo URL:', url);
    
    // Abrir en nueva pestaña
    window.open(url, '_blank');
    
    mostrarNotificacion('Vista de cierre abierta en nueva pestaña', 'success');
    
  } catch (error) {
    console.error('❌ Error abriendo vista de cierre:', error);
    mostrarNotificacion(`Error al abrir vista: ${error.message}`, 'error');
  }
}

// ========================================
// FUNCIÓN OPCIONAL: Generar PDF (Manual)
// ========================================
async function generarPDFCierreCompleto() {
  console.log('📄 Generando PDF de cierre completo...');
  
  if (!datosActualesCierre) {
    mostrarNotificacion('Primero debes consultar los datos del cierre', 'warning');
    return;
  }
  
  try {
    // Recopilar datos del cierre
    const datosCierre = recopilarDatosCierre();
    
    const response = await fetch('/api/generar-pdf-cierre', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosCierre)
    });
    
    if (response.ok) {
      const resultado = await response.json();
      mostrarNotificacion(`PDF generado exitosamente: ${resultado.archivo}`, 'success');
      console.log('✅ PDF generado:', resultado);
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar PDF');
    }
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    mostrarNotificación(`Error al generar PDF: ${error.message}`, 'error');
  }
}

// ========================================
// FUNCIÓN CORREGIDA: recopilarDatosCierre
// Reemplaza la función existente en cierre.js
// ========================================

// ========================================
// FUNCIÓN ACTUALIZADA: recopilarDatosCierre con GASTOS
// Reemplazar en cierre.js
// ========================================

function recopilarDatosCierre() {
  const fecha = document.getElementById('fechaCierre')?.value;
  const responsable = document.getElementById('responsable')?.value;
  const horaApertura = document.getElementById('horaApertura')?.value;
  const observaciones = document.getElementById('observaciones')?.value;
  const saldoInicial = parseFloat(document.getElementById('saldoInicial')?.value || 0);
  
  // Recopilar denominaciones
  const denominaciones = {
    billete100: parseInt(document.getElementById('billete100')?.value || 0),
    billete50: parseInt(document.getElementById('billete50')?.value || 0),
    billete20: parseInt(document.getElementById('billete20')?.value || 0),
    billete10: parseInt(document.getElementById('billete10')?.value || 0),
    billete5: parseInt(document.getElementById('billete5')?.value || 0),
    billete1: parseInt(document.getElementById('billete1')?.value || 0),
    monedas: parseFloat(document.getElementById('monedas')?.value || 0)
  };
  
  // Recopilar totales de la interfaz
  const ingresosTotales = obtenerValorNumerico('totalVentas');
  const totalTransacciones = parseInt(document.getElementById('totalTransacciones')?.textContent || 0);
  const totalComisiones = obtenerValorNumerico('totalComisiones');
  const ventasEfectivo = obtenerValorNumerico('ventasEfectivo');
  const ventasTarjeta = obtenerValorNumerico('ventasTarjeta');
  const ventasOtros = obtenerValorNumerico('ventasTransferencia');
  
  // Recopilar datos de cortes gratis
  const totalCortesGratis = parseInt(document.getElementById('totalCortesGratis')?.textContent || 0);
  const valorCortesGratis = obtenerValorNumerico('valorCortesGratis');
  const clientesBeneficiados = parseInt(document.getElementById('clientesBeneficiados')?.textContent || 0);

  // ========================================
  // NUEVO: CALCULAR TOTAL DE GASTOS
  // ========================================
  let totalGastos = 0;
  if (datosActualesCierre && datosActualesCierre.gastos) {
    datosActualesCierre.gastos.forEach(gasto => {
      totalGastos += parseFloat(gasto.monto || 0);
    });
  }

  // ========================================
  // CALCULAR RANGOS DESDE LOS DATOS ACTUALES
  // ========================================
  let rangos = {
    comanda_inicial: 0,
    comanda_final: 0,
    total_comandas: 0,
    factura_inicial: 0,
    factura_final: 0,
    total_facturas: 0
  };
  
  // Si tenemos datos globales del cierre, extraer rangos
  if (datosActualesCierre && datosActualesCierre.resumen) {
    if (datosActualesCierre.resumen.rangos_comandas) {
      rangos.comanda_inicial = datosActualesCierre.resumen.rangos_comandas.inicio || 0;
      rangos.comanda_final = datosActualesCierre.resumen.rangos_comandas.fin || 0;
      rangos.total_comandas = datosActualesCierre.resumen.rangos_comandas.total || 0;
    }
    
    if (datosActualesCierre.resumen.rangos_facturas) {
      rangos.factura_inicial = datosActualesCierre.resumen.rangos_facturas.inicio || 0;
      rangos.factura_final = datosActualesCierre.resumen.rangos_facturas.fin || 0;
      rangos.total_facturas = datosActualesCierre.resumen.rangos_facturas.total || 0;
    }
  }
  
  // ========================================
  // CONSTRUIR OBJETO COMPLETO PARA EL PDF CON GASTOS
  // ========================================
  const datosCierre = {
    // Datos básicos del cierre
    fecha: fecha,
    responsable: responsable,
    hora_apertura: horaApertura,
    observaciones: observaciones,
    saldo_inicial: saldoInicial,
    
    // Denominaciones de efectivo
    denominaciones: denominaciones,
    
    // Totales financieros
    ingresos_totales: ingresosTotales,
    total_transacciones: totalTransacciones,
    total_comisiones: totalComisiones,
    total_gastos: totalGastos, // ⬅️ NUEVO
    
    // Cortes gratis (tarjeta fidelidad) - NUEVO
    total_cortes_gratis: totalCortesGratis,
    valor_cortes_gratis: valorCortesGratis,
    clientes_beneficiados: clientesBeneficiados,
    
    // Ventas por tipo de pago
    ventas_efectivo: ventasEfectivo,
    ventas_tarjeta: ventasTarjeta,
    ventas_otros: ventasOtros,
    
    // Rangos de operación
    rangos: rangos,
    
    // ========================================
    // DATOS DETALLADOS PARA LAS TABLAS
    // ========================================
    servicios: datosActualesCierre?.servicios || [],
    productos: datosActualesCierre?.productos || [],
    comisiones: datosActualesCierre?.comisiones || [],
    gastos: datosActualesCierre?.gastos || [], // ⬅️ NUEVO
    
    // Datos adicionales para el PDF
    sucursal: 'Escalón',
    timestamp: new Date().toISOString()
  };
  
  console.log('📋 === DATOS COMPLETOS PARA PDF CON GASTOS Y CORTES GRATIS ===');
  console.log('💰 Totales financieros:', {
    ingresos: ingresosTotales,
    comisiones: totalComisiones,
    gastos: totalGastos, // ⬅️ NUEVO
    utilidad_real: ingresosTotales - totalComisiones - totalGastos, // ⬅️ NUEVO
    transacciones: totalTransacciones
  });
  console.log('🎁 Cortes gratis:', {
    cantidad: totalCortesGratis,
    valor: valorCortesGratis,
    clientes: clientesBeneficiados
  });
  console.log('💵 Ventas por tipo:', {
    efectivo: ventasEfectivo,
    tarjeta: ventasTarjeta,
    otros: ventasOtros
  });
  console.log('📊 Rangos:', rangos);
  console.log('🧾 Denominaciones:', denominaciones);
  console.log('📄 Datos para tablas:', {
    servicios: datosCierre.servicios.length,
    productos: datosCierre.productos.length,
    comisiones: datosCierre.comisiones.length,
    gastos: datosCierre.gastos.length // ⬅️ NUEVO
  });
  
  return datosCierre;
}
// FUNCIONES DE DEBUG
// ========================================

async function debugConsultaDatos() {
  console.log('🔍 === DEBUG CONSULTA DE DATOS ===');
  
  const fecha = document.getElementById("fechaCierre").value;
  const responsable = document.getElementById("responsable").value;
  
  console.log('📅 Fecha seleccionada (ISO):', fecha);
  console.log('👤 Responsable seleccionado:', responsable);
  
  if (!fecha) {
    console.error('❌ No hay fecha seleccionada');
    return;
  }
  
  // Convertir fecha para depuración
  const [año, mes, dia] = fecha.split("-");
  const fechaCentroamericana = `${dia}/${mes}/${año}`;
  console.log('📅 Fecha convertida (DD/MM/YYYY):', fechaCentroamericana);
  
  // Probar endpoint directo
  try {
    console.log('🔍 Probando endpoint directo...');
    const url = `/api/cierre-completo?fecha=${encodeURIComponent(fechaCentroamericana)}`;
    console.log('🌐 URL de prueba:', url);
    
    const response = await fetch(url);
    console.log('📡 Respuesta del servidor:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Datos recibidos en debug:', {
        ventas: data.ventas?.length || 0,
        servicios: data.servicios?.length || 0,
        productos: data.productos?.length || 0,
        comisiones: data.comisiones?.length || 0,
        resumen: data.resumen ? 'Presente' : 'Ausente',
        rangos: data.resumen?.rangos_comandas ? 'Disponibles' : 'No disponibles'
      });
      
      if (data.debug) {
        console.log('🐛 Info de debug del servidor:', data.debug);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Error del servidor:', errorText);
    }
  } catch (error) {
    console.error('❌ Error en prueba de endpoint:', error);
  }
  
  console.log('================================');
}

function debugElementosRangos() {
  console.log('🔍 === DEBUG ELEMENTOS DE RANGOS ===');
  
  // Verificar estructura del DOM para rangos
  console.log('🏗️ Estructura del DOM para rangos:');
  
  const seccionesDetalle = document.querySelectorAll('.detalle-card');
  console.log(`   Secciones detalle encontradas: ${seccionesDetalle.length}`);
  
  seccionesDetalle.forEach((seccion, index) => {
    const titulo = seccion.querySelector('.detalle-header h3');
    if (titulo) {
      console.log(`   Sección ${index + 1}: ${titulo.textContent}`);
      
      if (titulo.textContent.includes('Comandas') || titulo.textContent.includes('Facturas')) {
        console.log(`     📋 Analizando sección de rangos...`);
        const metricaTitulos = seccion.querySelectorAll('.metrica-titulo');
        const metricaValores = seccion.querySelectorAll('.metrica-valor span');
        
        console.log(`     Títulos encontrados: ${metricaTitulos.length}`);
        console.log(`     Valores encontrados: ${metricaValores.length}`);
        
        metricaTitulos.forEach((titulo, i) => {
          console.log(`       Título ${i}: "${titulo.textContent}"`);
        });
        
        metricaValores.forEach((valor, i) => {
          console.log(`       Valor ${i}: "${valor.textContent}"`);
        });
      }
    }
  });
  
  console.log('\n================================');
}

function probarActualizacionRangos() {
  console.log('🧪 === PROBANDO ACTUALIZACIÓN DE RANGOS ===');
  
  // Primero hacer debug
  debugElementosRangos();
  
  // Luego probar actualizaciones
  console.log('\n🔄 Probando actualizaciones...');
  
  const valoresPrueba = {
    'Comanda Inicial': '#1001',
    'Comanda Final': '#1025',
    'Total Comandas': '25',
    'Factura Inicial': '#5001',
    'Factura Final': '#5025',
    'Total Facturas': '25'
  };
  
  Object.entries(valoresPrueba).forEach(([titulo, valor]) => {
    console.log(`\n🎯 Probando: ${titulo} = ${valor}`);
    actualizarRangoEnDOM(titulo, valor);
  });
  
  console.log('\n✅ Prueba de rangos completada');
}

// ========================================
// INICIALIZACIÓN DEL SISTEMA
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 === INICIALIZACIÓN DEL SISTEMA DE CIERRE ===');
  
  // Esperar un momento para que todo se cargue
  setTimeout(() => {
    try {
      // Inicializar componentes
      inicializarFecha();
      cargarEmpleados();
      configurarEventListeners();
      configurarCalculosEfectivo();
      
      console.log('✅ Inicialización básica completada');
      
      // Mostrar fecha actual en el header
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
      
      // Animar elementos al cargar
      setTimeout(() => {
        document.querySelectorAll('.metrica-card, .detalle-card').forEach((el, index) => {
          setTimeout(() => {
            el.classList.add('fade-in');
          }, index * 100);
        });
      }, 500);
      
      // Verificar sistema después de un momento
      setTimeout(() => {
        console.log('\n🎯 === COMANDOS DISPONIBLES ===');
        console.log('• debugConsultaDatos() - Depurar consulta de datos');
        console.log('• debugElementosRangos() - Analizar estructura del DOM');
        console.log('• probarActualizacionRangos() - Probar actualización de rangos');
        console.log('• consultarVentasCompleto() - Consultar datos manualmente');
        console.log('================================\n');
        
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
    }
  }, 500);
});

// ========================================
// EXPONER FUNCIONES GLOBALMENTE
// ========================================

// Hacer funciones disponibles globalmente para debugging
window.debugConsultaDatos = debugConsultaDatos;
window.debugElementosRangos = debugElementosRangos;
window.probarActualizacionRangos = probarActualizacionRangos;
window.consultarVentasCompleto = consultarVentasCompleto;
window.generarPDFCierreCompleto = generarPDFCierreCompleto;

console.log('🎯 Sistema de cierre completamente configurado');
console.log('🔧 Funciones de debug disponibles globalmente');