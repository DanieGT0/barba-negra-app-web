document.addEventListener('DOMContentLoaded', () => {
  // 1) Inicializar Flatpickr en los campos de fecha
  flatpickr("#fecha", {
    dateFormat: "d/m/Y",
    defaultDate: new Date()
  });

  flatpickr("#fecha_vencimiento", {
    dateFormat: "d/m/Y"
  });

  flatpickr("#filtroDesde", {
    dateFormat: "d/m/Y"
  });

  flatpickr("#filtroHasta", {
    dateFormat: "d/m/Y"
  });

  // 2) Cargar productos y compras
  cargarProductos();
  cargarCompras();

  // 3) Bind de eventos
  document.getElementById('compraForm').addEventListener('submit', guardarCompra);
  document.getElementById('cancelBtn').addEventListener('click', limpiarFormulario);
  document.getElementById('filtrarBtn').addEventListener('click', cargarCompras);
  document.getElementById('excelBtn').addEventListener('click', exportarExcel);

  // 4) Toggle del formulario
  const toggleBtn = document.getElementById('toggleFormBtn');
  const formSection = document.getElementById('formSection');
  toggleBtn.addEventListener('click', () => {
    toggleBtn.classList.toggle('active');
    formSection.classList.toggle('hidden');
  });
});


// Función para formatear fecha en formato dd/mm/yyyy para formularios
function formatearFechaFormulario(fecha) {
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

// Función para transformar fecha de dd/mm/yyyy a formato ISO para la API
function fechaToISO(fechaStr) {
  if (!fechaStr) return '';
  const [dia, mes, anio] = fechaStr.split('/');
  return `${anio}-${mes}-${dia}`;
}

// Función para transformar fecha de ISO a dd/mm/yyyy para mostrar en la interfaz
function fechaFromISO(fechaISO) {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

async function cargarProductos() {
  try {
    const res = await fetch('/productos');
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const productos = await res.json();
    const select = document.getElementById('codigo_producto');
    const filtro = document.getElementById('filtroProducto');
    
    // Limpiar opciones actuales
    select.innerHTML = '<option value="">Seleccione un producto</option>';
    if (filtro) {
      filtro.innerHTML = '<option value="">Todos los productos</option>';
    }
    
    productos.forEach(p => {
      const option1 = new Option(`${p.codigo} - ${p.producto}`, p.codigo);
      const option2 = new Option(`${p.codigo} - ${p.producto}`, p.codigo);
      select.appendChild(option1);
      if (filtro) {
        filtro.appendChild(option2);
      }
    });
    
    console.log(`✅ Cargados ${productos.length} productos`);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    alert('Error al cargar productos: ' + error.message);
  }
}

async function cargarCompras() {
  try {
    const params = new URLSearchParams();
    const codigo = document.getElementById("filtroProducto")?.value || '';
    const desde = document.getElementById("filtroDesde")?.value || '';
    const hasta = document.getElementById("filtroHasta")?.value || '';
    
    if (codigo) params.append("codigo", codigo);
    if (desde) params.append("desde", fechaToISO(desde));
    if (hasta) params.append("hasta", fechaToISO(hasta));

    const res = await fetch(`/api/compras?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const compras = await res.json();
    const tbody = document.querySelector("#tablaCompras tbody");
    tbody.innerHTML = "";

    compras.forEach(c => {
      // Calcular total
      const total = (c.precio_compra * c.cantidad).toFixed(2);
      
      // Evaluar si el producto está cercano a vencer
      const estadoVencimiento = evaluarVencimiento(c.fecha_vencimiento);
      
      const row = document.createElement("tr");
      row.className = estadoVencimiento.clase;
      row.innerHTML = `
        <td>${c.codigo}</td>
        <td>${c.fecha}</td>
        <td>${c.fecha_vencimiento || '-'}</td>
        <td>${c.codigo_producto}</td>
        <td>${c.producto}</td>
        <td>$${parseFloat(c.precio_compra).toFixed(2)}</td>
        <td>${c.cantidad}</td>
        <td>$${total}</td>
        <td>
          <button class="btn-action btn-edit" onclick="editarCompra('${c.codigo}')"><i class="fas fa-edit"></i></button>
          <button class="btn-action btn-delete" onclick="eliminarCompra('${c.codigo}')"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    console.log(`✅ Cargadas ${compras.length} compras`);
  } catch (error) {
    console.error('❌ Error cargando compras:', error);
    alert('Error al cargar compras: ' + error.message);
  }
}

function evaluarVencimiento(fechaVencimiento) {
  if (!fechaVencimiento) return { clase: '' };
  
  const hoy = new Date();
  const fechaVenc = new Date(fechaVencimiento);
  const diferenciaDias = Math.floor((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
  
  if (diferenciaDias < 0) {
    return { clase: 'vencido' };
  } else if (diferenciaDias <= 30) {
    return { clase: 'por-vencer' };
  }
  return { clase: '' };
}

async function guardarCompra(e) {
  e.preventDefault();
  
  // Obtener el botón de submit
  const submitBtn = document.getElementById('submitBtn');
  const textoOriginal = submitBtn.textContent;
  
  // Deshabilitar el botón y cambiar el texto
  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';
  submitBtn.style.opacity = '0.6';
  submitBtn.style.cursor = 'not-allowed';
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    console.log('📝 Guardando compra:', data);
    
    // Validar campos requeridos
    if (!data.codigo || !data.fecha || !data.codigo_producto || !data.precio_compra || !data.cantidad) {
      alert('Por favor complete todos los campos requeridos');
      throw new Error('Campos requeridos faltantes');
    }
    
    // Mantener fechas en formato dd/mm/yyyy para el backend
    // No necesitamos convertir a ISO ya que el backend espera dd/mm/yyyy
    
    const method = data.accion === "actualizar" ? "PUT" : "POST";
    const url = data.accion === "actualizar" ? `/api/compras/${data.compra_id}` : "/api/compras";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('❌ Error del servidor:', errorData);
      throw new Error(errorData.mensaje || `Error HTTP: ${res.status}`);
    }

    const result = await res.json();
    alert(result.mensaje);
    limpiarFormulario();
    cargarCompras();
    
  } catch (error) {
    console.error("Error al guardar compra:", error);
    alert(`Error: ${error.message}`);
  } finally {
    // Rehabilitar el botón siempre, incluso si hay error
    submitBtn.disabled = false;
    submitBtn.textContent = textoOriginal;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }
}

function limpiarFormulario() {
  document.getElementById("compraForm").reset();
  document.getElementById("accion").value = "crear";
  document.getElementById("compra_id").value = "";
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("submitBtn").textContent = "Guardar Compra";
  
  // Establecer fecha actual en formato dd/mm/yyyy
  const hoy = new Date();
  document.getElementById('fecha').value = formatearFechaFormulario(hoy);
}

async function editarCompra(id) {
  try {
    const res = await fetch(`/api/compras/${id}`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    
    const data = await res.json();

    document.getElementById("accion").value = "actualizar";
    document.getElementById("compra_id").value = data.id;
    
    // Convertir fechas de ISO a formato dd/mm/yyyy
    document.getElementById("fecha").value = fechaFromISO(data.fecha);
    document.getElementById("codigo").value = data.codigo;
    document.getElementById("precio_compra").value = data.precio_compra;
    document.getElementById("cantidad").value = data.cantidad;
    
    // Establecer fecha de vencimiento si existe
    if (data.fecha_vencimiento) {
      document.getElementById("fecha_vencimiento").value = fechaFromISO(data.fecha_vencimiento);
    } else {
      document.getElementById("fecha_vencimiento").value = '';
    }

    document.getElementById("submitBtn").textContent = "Actualizar Compra";
    document.getElementById("cancelBtn").style.display = "block";
    
    // Asegurar que el formulario es visible
    document.getElementById('formSection').classList.remove('hidden');
    document.getElementById('toggleFormBtn').classList.add('active');
  } catch (error) {
    console.error("Error al editar compra:", error);
    alert(`Error: ${error.message}`);
  }
}

async function eliminarCompra(codigo) {
  console.log('🗑️ Intentando eliminar compra:', codigo);
  
  if (!codigo || codigo === 'null' || codigo === 'undefined') {
    alert('Error: Código de compra inválido');
    return;
  }
  
  if (confirm("¿Deseas eliminar esta compra? Esto afectará la existencia en inventario.")) {
    try {
      const res = await fetch(`/api/compras/${codigo}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || `Error HTTP: ${res.status}`);
      }
      
      const result = await res.json();
      alert(result.mensaje);
      cargarCompras();
    } catch (error) {
      console.error("Error al eliminar compra:", error);
      alert(`Error: ${error.message}`);
    }
  }
}

function exportarExcel() {
  try {
    // Crear una tabla temporal con datos formateados
    const tablaOriginal = document.getElementById("tablaCompras");
    const tablaTemp = tablaOriginal.cloneNode(true);
    
    // Agregar fecha y filtros al reporte
    const fechaHoy = formatearFechaFormulario(new Date());
    const filtroProducto = document.getElementById('filtroProducto').options[document.getElementById('filtroProducto').selectedIndex].text;
    const filtroDesde = document.getElementById('filtroDesde').value || 'No especificado';
    const filtroHasta = document.getElementById('filtroHasta').value || 'No especificado';
    
    // Crear título y filtros
    const titulo = document.createElement('caption');
    titulo.textContent = `REPORTE DE COMPRAS - GENERADO: ${fechaHoy}`;
    titulo.style.fontWeight = 'bold';
    
    const infoFiltros = document.createElement('caption');
    infoFiltros.textContent = `Filtros: Producto: ${filtroProducto} | Desde: ${filtroDesde} | Hasta: ${filtroHasta}`;
    
    tablaTemp.prepend(titulo);
    tablaTemp.prepend(infoFiltros);
    
    // Crear libro Excel y añadir hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tablaTemp);
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    
    // Generar nombre de archivo con fecha
    const fechaStr = fechaHoy.replace(/\//g, '');
    XLSX.writeFile(wb, `Reporte_Compras_${fechaStr}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    alert('Error al exportar a Excel. Verifique que la biblioteca XLSX esté cargada correctamente.');
  }
}