// ========================================
// CHART-MEMBRESIAS.JS
// Gráfico de membresías para el dashboard
// ========================================

// Variables globales para el gráfico de membresías
let membresiasChart = null;

const coloresMembresias = {
  activas: {
    principal: 'rgba(52, 152, 219, 0.8)',
    borde: 'rgba(52, 152, 219, 1)',
    resaltado: 'rgba(52, 152, 219, 0.9)'
  },
  nuevas: {
    principal: 'rgba(46, 204, 113, 0.8)',
    borde: 'rgba(46, 204, 113, 1)',
    resaltado: 'rgba(46, 204, 113, 0.9)'
  },
  vencidas: {
    principal: 'rgba(231, 76, 60, 0.8)',
    borde: 'rgba(231, 76, 60, 1)',
    resaltado: 'rgba(231, 76, 60, 0.9)'
  },
  proximasVencer: {
    principal: 'rgba(241, 196, 15, 0.8)',
    borde: 'rgba(241, 196, 15, 1)',
    resaltado: 'rgba(241, 196, 15, 0.9)'
  },
  fondo: '#1a1a2e',
  texto: '#f1f1f1'
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("chart-membresias.js: DOM cargado");
  
  // Verificar si existe el canvas de membresías
  const canvasMembresias = document.getElementById('membresiasChart');
  if (canvasMembresias) {
    console.log("Canvas de membresías encontrado, inicializando...");
    inicializarGraficoMembresias();
  } else {
    console.log("Canvas de membresías no encontrado - gráfico no inicializado");
  }
});

// Función para inicializar el gráfico de membresías
function inicializarGraficoMembresias() {
  const canvas = document.getElementById('membresiasChart');
  if (!canvas) {
    console.warn('Canvas membresiasChart no encontrado');
    return;
  }

  const ctx = canvas.getContext('2d');

  // Configuración básica del gráfico
  const config = {
    type: 'doughnut',
    data: {
      labels: ['Activas', 'Nuevas', 'Próximas a Vencer', 'Vencidas'],
      datasets: [{
        data: [0, 0, 0, 0], // Datos iniciales en 0
        backgroundColor: [
          coloresMembresias.activas.principal,
          coloresMembresias.nuevas.principal,
          coloresMembresias.proximasVencer.principal,
          coloresMembresias.vencidas.principal
        ],
        borderColor: [
          coloresMembresias.activas.borde,
          coloresMembresias.nuevas.borde,
          coloresMembresias.proximasVencer.borde,
          coloresMembresias.vencidas.borde
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          coloresMembresias.activas.resaltado,
          coloresMembresias.nuevas.resaltado,
          coloresMembresias.proximasVencer.resaltado,
          coloresMembresias.vencidas.resaltado
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: coloresMembresias.texto,
            font: {
              size: 12
            },
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 6,
          displayColors: true
        }
      }
    }
  };

  // Crear el gráfico
  membresiasChart = new Chart(ctx, config);
  console.log("Gráfico de membresías inicializado");
}

// Función para actualizar datos del gráfico de membresías
function actualizarGraficoMembresias(datos) {
  if (!membresiasChart) {
    console.warn('Gráfico de membresías no inicializado');
    return;
  }

  try {
    // Actualizar datos
    const datosArray = [
      datos.activas || 0,
      datos.nuevas || 0,
      datos.proximasVencer || 0,
      datos.vencidas || 0
    ];

    membresiasChart.data.datasets[0].data = datosArray;
    membresiasChart.update('active');
    
    console.log('Gráfico de membresías actualizado:', datosArray);
  } catch (error) {
    console.error('Error actualizando gráfico de membresías:', error);
  }
}

// Función para obtener datos de membresías desde el servidor
async function cargarDatosMembresias() {
  try {
    console.log('Cargando datos de membresías...');
    
    // Obtener fecha actual para consultar membresías
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    
    const response = await fetch(`/api/membresias/resumen?mes=${mes}&anio=${anio}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const datos = await response.json();
    console.log('Datos de membresías recibidos:', datos);
    
    // Actualizar gráfico con los datos recibidos
    actualizarGraficoMembresias(datos);
    
    return datos;
  } catch (error) {
    console.error('Error cargando datos de membresías:', error);
    
    // Mostrar datos de ejemplo en caso de error
    const datosEjemplo = {
      activas: 0,
      nuevas: 0,
      proximasVencer: 0,
      vencidas: 0
    };
    
    actualizarGraficoMembresias(datosEjemplo);
    return datosEjemplo;
  }
}

// Exportar funciones para uso global
window.cargarDatosMembresias = cargarDatosMembresias;
window.actualizarGraficoMembresias = actualizarGraficoMembresias;

console.log('✅ chart-membresias.js cargado correctamente');