let ventasActuales = 0;
let metaActual = 0;

document.addEventListener("DOMContentLoaded", () => {
  // Establecer mes y año actual para ventas
  const selectMes = document.getElementById("selectMes");
  const mesActual = new Date().getMonth();
  if (selectMes) selectMes.selectedIndex = mesActual;

  const inputAnio = document.getElementById("inputAnio");
  if (inputAnio) inputAnio.value = new Date().getFullYear();

  // Establecer mes y año actual para membresías
  const selectMesMembresias = document.getElementById("selectMesMembresias");
  if (selectMesMembresias) selectMesMembresias.selectedIndex = mesActual;

  const inputAnioMembresias = document.getElementById("inputAnioMembresias");
  if (inputAnioMembresias) inputAnioMembresias.value = new Date().getFullYear();

  // Cargar datos iniciales
  cargarMeta();
  cargarVentas();

  // Eventos para ventas
  document.getElementById("selectMes").addEventListener("change", () => {
    cargarMeta();
    cargarVentas();
  });

  document.getElementById("inputAnio").addEventListener("input", () => {
    cargarMeta();
    cargarVentas();
  });

  document.getElementById("btnGuardarMeta").addEventListener("click", guardarMeta);
  document.getElementById("btnCargarDatos").addEventListener("click", () => {
    cargarMeta();
    cargarVentas();
  });

  // Eventos para membresías
  if (document.getElementById("selectMesMembresias")) {
    document.getElementById("selectMesMembresias").addEventListener("change", cargarDatosMembresias);
  }
  
  if (document.getElementById("inputAnioMembresias")) {
    document.getElementById("inputAnioMembresias").addEventListener("input", cargarDatosMembresias);
  }
  
  if (document.getElementById("btnCargarMembresias")) {
    document.getElementById("btnCargarMembresias").addEventListener("click", cargarDatosMembresias);
  }

  // Cargar datos iniciales de membresías
  if (typeof cargarDatosMembresias === 'function') {
    cargarDatosMembresias();
  }
});

function obtenerNumeroMes(nombreMes) {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const index = meses.indexOf(nombreMes);
  return index !== -1 ? String(index + 1).padStart(2, '0') : '01';
}

function formatearMoneda(valor) {
  return valor.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });
}

async function cargarVentas() {
  const mesNombre = document.getElementById("selectMes").value;
  const anio = document.getElementById("inputAnio").value;
  const mes = obtenerNumeroMes(mesNombre);

  try {
    const res = await fetch(`/api/ventas?mes=${mes}&anio=${anio}`);
    const data = await res.json();
    ventasActuales = parseFloat(data.total || 0);

    document.getElementById("valorVentas").textContent = formatearMoneda(ventasActuales);
    calcularPorcentaje();
  } catch (error) {
    console.error("Error al cargar ventas:", error);
    ventasActuales = 0;
    document.getElementById("valorVentas").textContent = '$0.00';
    calcularPorcentaje();
  }
}

async function cargarMeta() {
  const mes = document.getElementById("selectMes").value;
  const anio = document.getElementById("inputAnio").value;

  try {
    const res = await fetch(`/api/metas?mes=${mes}&anio=${anio}`);
    const data = await res.json();
    metaActual = parseFloat(data.monto || 0);

    document.getElementById("inputMeta").value = metaActual;
    document.getElementById("valorMeta").textContent = formatearMoneda(metaActual);
    calcularPorcentaje();
  } catch (error) {
    console.error("Error al cargar meta:", error);
    metaActual = 0;
    document.getElementById("valorMeta").textContent = '$0.00';
    calcularPorcentaje();
  }
}

function calcularPorcentaje() {
  let porcentaje = 0;
  if (metaActual > 0) {
    porcentaje = (ventasActuales / metaActual) * 100;
  }

  const porcentajeEntero = Math.min(Math.round(porcentaje), 100);
  const barra = document.getElementById("progresoMeta");

  document.getElementById("valorPorcentaje").textContent = `${porcentaje.toFixed(1)}%`;
  barra.style.width = `${porcentajeEntero}%`;

  // Cambiar color
  if (porcentajeEntero < 50) {
    barra.style.backgroundColor = '#e74c3c'; // rojo
  } else if (porcentajeEntero < 80) {
    barra.style.backgroundColor = '#f39c12'; // naranja
  } else {
    barra.style.backgroundColor = '#4caf50'; // verde
  }

  // Mostrar estado y diferencia
  const badge = document.getElementById("estadoMeta");
  const faltante = document.getElementById("faltanteMeta");

  if (ventasActuales >= metaActual && metaActual > 0) {
    badge.textContent = "Cumplida";
    badge.className = "badge cumplida";
    faltante.innerHTML = `<i class="fas fa-check-circle dato-icon"></i> ¡Meta lograda!`;
  } else {
    badge.textContent = "Pendiente";
    badge.className = "badge pendiente";
    const diferencia = metaActual - ventasActuales;
    faltante.innerHTML = `<i class="fas fa-info-circle dato-icon"></i> Faltan ${formatearMoneda(diferencia)}`;
  }
  
  // Actualizar el gráfico automáticamente cuando se calculan los porcentajes
  if (window.actualizarGrafico) {
    window.actualizarGrafico(metaActual, ventasActuales);
  }
}

async function guardarMeta() {
  const mes = document.getElementById("selectMes").value.trim();
  const anio = document.getElementById("inputAnio").value.trim();
  const monto = parseFloat(document.getElementById("inputMeta").value);

  if (!mes || !anio || isNaN(monto)) {
    Swal.fire("Error", "Todos los campos son obligatorios y el monto debe ser numérico", "error");
    return;
  }

  try {
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, anio, monto })
    });

    const data = await res.json();

    if (res.ok) {
      Swal.fire("✅ Éxito", data.message || "Meta guardada correctamente", "success");
      cargarMeta();
    } else {
      Swal.fire("Error", data.error || "No se pudo guardar la meta", "error");
    }
  } catch (error) {
    Swal.fire("Error", "Hubo un problema al conectar con el servidor", "error");
    console.error(error);
  }
}

// ========================================
// FUNCIONES PARA MEMBRESÍAS
// ========================================

let datosMembresias = {
  activas: 0,
  nuevas: 0,
  ingresos: 0,
  proximasVencer: 0
};

function obtenerNumeroMesMembresias(nombreMes) {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const index = meses.indexOf(nombreMes);
  return index !== -1 ? String(index + 1).padStart(2, '0') : '01';
}

async function cargarDatosMembresias() {
  const mesNombre = document.getElementById("selectMesMembresias").value;
  const anio = document.getElementById("inputAnioMembresias").value;
  const mes = obtenerNumeroMesMembresias(mesNombre);

  console.log(`🔍 Cargando datos de membresías para ${mesNombre} ${anio} (mes: ${mes})`);

  try {
    const res = await fetch(`/api/membresias?mes=${mes}&anio=${anio}`);
    const data = await res.json();
    
    console.log('📊 Datos de membresías recibidos:', data);

    // Actualizar variables globales
    datosMembresias = {
      activas: data.activas || 0,
      nuevas: data.nuevas || 0,
      ingresos: parseFloat(data.ingresos || 0),
      proximasVencer: data.proximasVencer || 0
    };

    // Actualizar la interfaz
    actualizarInterfazMembresias();

    // Actualizar gráfico si existe la función
    if (typeof actualizarGraficoMembresias === 'function') {
      actualizarGraficoMembresias();
    }

  } catch (error) {
    console.error("❌ Error al cargar datos de membresías:", error);
    
    // Resetear datos en caso de error
    datosMembresias = {
      activas: 0,
      nuevas: 0,
      ingresos: 0,
      proximasVencer: 0
    };
    
    actualizarInterfazMembresias();
    
    // Mostrar mensaje de error
    Swal.fire("Error", "No se pudieron cargar los datos de membresías", "error");
  }
}

function actualizarInterfazMembresias() {
  // Verificar que los elementos existen antes de actualizarlos
  const elementos = {
    valorActivas: document.getElementById("valorActivas"),
    valorNuevas: document.getElementById("valorNuevas"),
    valorIngresos: document.getElementById("valorIngresos"),
    valorVencimiento: document.getElementById("valorVencimiento")
  };

  if (elementos.valorActivas) elementos.valorActivas.textContent = datosMembresias.activas;
  if (elementos.valorNuevas) elementos.valorNuevas.textContent = datosMembresias.nuevas;
  if (elementos.valorIngresos) elementos.valorIngresos.textContent = formatearMoneda(datosMembresias.ingresos);
  if (elementos.valorVencimiento) elementos.valorVencimiento.textContent = datosMembresias.proximasVencer;

  console.log('✅ Interfaz de membresías actualizada:', datosMembresias);
}