// Variables globales para el gráfico
let ventasMetasChart = null;
const colores = {
  meta: {
    principal: 'rgba(159, 216, 26, 0.8)',
    borde: 'rgba(159, 216, 26, 1)',
    resaltado: 'rgba(159, 216, 26, 0.9)'
  },
  ventas: {
    principal: 'rgba(52, 152, 219, 0.8)',
    borde: 'rgba(52, 152, 219, 1)',
    resaltado: 'rgba(52, 152, 219, 0.9)'
  },
  pendiente: {
    principal: 'rgba(231, 76, 60, 0.7)',
    borde: 'rgba(231, 76, 60, 1)',
    resaltado: 'rgba(231, 76, 60, 0.9)'
  },
  excedente: {
    principal: 'rgba(46, 204, 113, 0.8)', // Verde para mostrar excedente (por encima de la meta)
    borde: 'rgba(46, 204, 113, 1)',
    resaltado: 'rgba(46, 204, 113, 0.9)'
  },
  fondo: '#1a1a2e',
  texto: '#f1f1f1'
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("chart-ventas.js: DOM cargado");
  
  // Inicializar el gráfico como donas por defecto
  setTimeout(() => {
    inicializarGrafico("doughnut");
    console.log("Gráfico inicializado como donas");
    
    // Si ya hay datos cargados, actualizar el gráfico
    if (typeof ventasActuales !== 'undefined' && typeof metaActual !== 'undefined') {
      console.log(`Actualizando gráfico con datos existentes: meta=${metaActual}, ventas=${ventasActuales}`);
      actualizarGrafico(metaActual, ventasActuales);
    }
  }, 500);
  
  // Agregar eventos para los controles
  document.getElementById("tipoGrafico").addEventListener("change", (e) => {
    actualizarTipoGrafico(e.target.value);
  });
  
  document.getElementById("btnCargarDatos").addEventListener("click", () => {
    cargarMeta();
    cargarVentas();
  });
});

function inicializarGrafico(tipo) {
  const ctx = document.getElementById('chartVentasMetas').getContext('2d');
  
  // Destruir el gráfico anterior si existe
  if (ventasMetasChart) {
    ventasMetasChart.destroy();
  }
  
  // Usar valores existentes si están disponibles
  const meta = typeof metaActual !== 'undefined' ? metaActual : 0;
  const ventas = typeof ventasActuales !== 'undefined' ? ventasActuales : 0;
  
  // Verificar si se superó la meta
  const metaSuperada = ventas > meta && meta > 0;
  const pendiente = metaSuperada ? 0 : Math.max(0, meta - ventas);
  const excedente = metaSuperada ? ventas - meta : 0;
  
  console.log(`Inicializando gráfico ${tipo} con meta=${meta}, ventas=${ventas}, pendiente=${pendiente}, excedente=${excedente}`);
  
  // Configuración basada en el tipo de gráfico
  let configuracion = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colores.texto,
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Comparativa Ventas vs Meta Mensual',
        color: colores.texto,
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 16,
          weight: 'bold'
        },
        bodyFont: {
          size: 14
        },
        padding: 15,
        callbacks: {
          title: function(tooltipItems) {
            return '';
          },
          label: function(context) {
            // Obtener la etiqueta correcta del array de etiquetas
            const labelIndex = context.dataIndex;
            const label = context.chart.data.labels[labelIndex];
            
            // Formatear el valor
            const value = context.raw;
            return `${label}: ${formatearMoneda(value)}`;
          }
        }
      }
    }
  };
  
  let datasets = [];
  let labels = [];
  
  // Configuración específica según el tipo de gráfico
  if (tipo === 'pie' || tipo === 'doughnut') {
    if (metaSuperada) {
      // Si se superó la meta, mostrar Meta y Excedente
      labels = ['Meta Alcanzada', 'Excedente'];
      datasets = [{
        data: [meta, excedente],
        backgroundColor: [colores.meta.principal, colores.excedente.principal],
        borderColor: [colores.meta.borde, colores.excedente.borde],
        borderWidth: 2,
        hoverBackgroundColor: [colores.meta.resaltado, colores.excedente.resaltado],
        hoverBorderWidth: 3
      }];
    } else {
      // Si no se superó la meta, mostrar Ventas y Pendiente
      labels = ['Ventas Realizadas', 'Pendiente por Vender'];
      datasets = [{
        data: [ventas, pendiente],
        backgroundColor: [colores.ventas.principal, colores.pendiente.principal],
        borderColor: [colores.ventas.borde, colores.pendiente.borde],
        borderWidth: 2,
        hoverBackgroundColor: [colores.ventas.resaltado, colores.pendiente.resaltado],
        hoverBorderWidth: 3
      }];
    }
    
    // Quitar escalas para pie/doughnut
    delete configuracion.scales;
    
    // Agregar cutout para doughnut
    if (tipo === 'doughnut') {
      configuracion.cutout = '50%';
    }
  } else {
    // Para barras y otros, usamos comparativa directa
    labels = ['Comparativa'];
    if (metaSuperada) {
      datasets = [
        {
          label: 'Meta',
          data: [meta],
          backgroundColor: colores.meta.principal,
          borderColor: colores.meta.borde,
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: colores.meta.resaltado,
          hoverBorderWidth: 3
        },
        {
          label: 'Ventas Totales',
          data: [ventas],
          backgroundColor: colores.excedente.principal,
          borderColor: colores.excedente.borde,
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: colores.excedente.resaltado,
          hoverBorderWidth: 3
        }
      ];
    } else {
      datasets = [
        {
          label: 'Meta Mensual',
          data: [meta],
          backgroundColor: colores.meta.principal,
          borderColor: colores.meta.borde,
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: colores.meta.resaltado,
          hoverBorderWidth: 3
        },
        {
          label: 'Ventas Realizadas',
          data: [ventas],
          backgroundColor: colores.ventas.principal,
          borderColor: colores.ventas.borde,
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: colores.ventas.resaltado,
          hoverBorderWidth: 3
        }
      ];
    }
    
    // Configuración de escalas para barras
    configuracion.scales = {
      y: {
        beginAtZero: true,
        ticks: {
          color: colores.texto,
          font: {
            size: 12,
            weight: 'bold'
          },
          callback: function(value) {
            return formatearMoneda(value);
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        title: {
          display: true,
          text: 'Monto ($)',
          color: colores.texto,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      x: {
        ticks: {
          color: colores.texto,
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    };
  }
  
  // Crear un gráfico nuevo con la configuración apropiada
  ventasMetasChart = new Chart(ctx, {
    type: tipo,
    data: {
      labels: labels,
      datasets: datasets
    },
    options: configuracion
  });
}

function actualizarGrafico(meta, ventas) {
  console.log(`Actualizando gráfico con meta=${meta}, ventas=${ventas}`);
  
  if (!ventasMetasChart) {
    console.log("No hay gráfico para actualizar, inicializando uno nuevo");
    inicializarGrafico(document.getElementById("tipoGrafico").value);
    if (!ventasMetasChart) return;
  }
  
  const tipoActual = ventasMetasChart.config.type;
  const mes = document.getElementById("selectMes").value;
  const anio = document.getElementById("inputAnio").value;
  
  // Actualizar título con mes y año
  ventasMetasChart.options.plugins.title.text = `Comparativa Ventas vs Meta - ${mes} ${anio}`;
  
  // Verificar si se superó la meta
  const metaSuperada = ventas > meta && meta > 0;
  const pendiente = metaSuperada ? 0 : Math.max(0, meta - ventas);
  const excedente = metaSuperada ? ventas - meta : 0;
  
  // Mostrar la meta como subtítulo
  ventasMetasChart.options.plugins.subtitle = {
    display: true,
    text: `Meta: ${formatearMoneda(meta)}`,
    color: colores.texto,
    font: {
      size: 16,
      weight: 'bold'
    },
    padding: {
      bottom: 10
    }
  };
  
  // Actualizar datos según el tipo de gráfico
  if (tipoActual === 'pie' || tipoActual === 'doughnut') {
    if (metaSuperada) {
      // Si se superó la meta, mostrar Meta y Excedente
      ventasMetasChart.data.labels = ['Meta Alcanzada', 'Excedente'];
      ventasMetasChart.data.datasets[0].data = [meta, excedente];
      ventasMetasChart.data.datasets[0].backgroundColor = [colores.meta.principal, colores.excedente.principal];
      ventasMetasChart.data.datasets[0].borderColor = [colores.meta.borde, colores.excedente.borde];
      ventasMetasChart.data.datasets[0].hoverBackgroundColor = [colores.meta.resaltado, colores.excedente.resaltado];
    } else {
      // Si no se superó la meta, mostrar Ventas y Pendiente
      ventasMetasChart.data.labels = ['Ventas Realizadas', 'Pendiente por Vender'];
      ventasMetasChart.data.datasets[0].data = [ventas, pendiente];
      ventasMetasChart.data.datasets[0].backgroundColor = [colores.ventas.principal, colores.pendiente.principal];
      ventasMetasChart.data.datasets[0].borderColor = [colores.ventas.borde, colores.pendiente.borde];
      ventasMetasChart.data.datasets[0].hoverBackgroundColor = [colores.ventas.resaltado, colores.pendiente.resaltado];
    }
  } else {
    // Para barras y otros, actualizamos la comparativa directa
    if (metaSuperada) {
      ventasMetasChart.data.datasets[0].label = 'Meta';
      ventasMetasChart.data.datasets[1].label = 'Ventas Totales';
      ventasMetasChart.data.datasets[1].backgroundColor = colores.excedente.principal;
      ventasMetasChart.data.datasets[1].borderColor = colores.excedente.borde;
      ventasMetasChart.data.datasets[1].hoverBackgroundColor = colores.excedente.resaltado;
    } else {
      ventasMetasChart.data.datasets[0].label = 'Meta Mensual';
      ventasMetasChart.data.datasets[1].label = 'Ventas Realizadas';
      ventasMetasChart.data.datasets[1].backgroundColor = colores.ventas.principal;
      ventasMetasChart.data.datasets[1].borderColor = colores.ventas.borde;
      ventasMetasChart.data.datasets[1].hoverBackgroundColor = colores.ventas.resaltado;
    }
    ventasMetasChart.data.datasets[0].data = [meta];
    ventasMetasChart.data.datasets[1].data = [ventas];
  }
  
  // Actualizar el gráfico
  ventasMetasChart.update();
}

function actualizarTipoGrafico(tipo) {
  // Obtener los datos actuales
  let meta = 0;
  let ventas = 0;
  
  if (typeof metaActual !== 'undefined' && typeof ventasActuales !== 'undefined') {
    meta = metaActual;
    ventas = ventasActuales;
  } else if (ventasMetasChart) {
    // Obtener los datos dependiendo del tipo de gráfico actual
    const tipoActual = ventasMetasChart.config.type;
    
    if (tipoActual === 'pie' || tipoActual === 'doughnut') {
      // Verificar si es el modo "meta superada" o "meta pendiente"
      if (ventasMetasChart.data.labels[0] === 'Meta Alcanzada') {
        meta = ventasMetasChart.data.datasets[0].data[0] || 0;
        ventas = meta + (ventasMetasChart.data.datasets[0].data[1] || 0); // Meta + Excedente
      } else {
        ventas = ventasMetasChart.data.datasets[0].data[0] || 0;
        const pendiente = ventasMetasChart.data.datasets[0].data[1] || 0;
        meta = ventas + pendiente;
      }
    } else {
      meta = ventasMetasChart.data.datasets[0].data[0] || 0;
      ventas = ventasMetasChart.data.datasets[1].data[0] || 0;
    }
  }
  
  console.log(`Cambiando gráfico a ${tipo} con meta=${meta} y ventas=${ventas}`);
  
  // Reinicializar el gráfico con el nuevo tipo
  inicializarGrafico(tipo);
  
  // Actualizar con los datos existentes
  actualizarGrafico(meta, ventas);
}

// Hacemos la función disponible globalmente para que indexjs.js pueda acceder a ella
window.actualizarGrafico = actualizarGrafico;