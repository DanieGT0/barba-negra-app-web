document.addEventListener('DOMContentLoaded', () => {
  cargarCortes();

  document.getElementById('corteForm').addEventListener('submit', guardarCorte);
  document.getElementById('cancelBtn').addEventListener('click', limpiarFormulario);
  document.getElementById('filtrarBtn').addEventListener('click', cargarCortes);
  document.getElementById('excelBtn').addEventListener('click', exportarExcel);

  const toggleBtn = document.getElementById('toggleFormBtn');
  const formSection = document.getElementById('formSection');
  toggleBtn.addEventListener('click', () => {
    toggleBtn.classList.toggle('active');
    formSection.classList.toggle('hidden');
  });
});

async function cargarCortes() {
  const filtro = document.getElementById("buscarServicio").value;
  const res = await fetch(`/api/cortes?servicio=${encodeURIComponent(filtro)}`);
  const cortes = await res.json();
  const tbody = document.querySelector("#tablaCortes tbody");
  tbody.innerHTML = "";

  cortes.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.codigo}</td>
      <td>${c.servicio}</td>
      <td>$${parseFloat(c.precio).toFixed(2)}</td>
      <td>$${parseFloat(c.comision).toFixed(2)}</td>
      <td>
        <button class="btn-action btn-edit" onclick="editarCorte('${c.codigo}')"><i class="fas fa-edit"></i></button>
        <button class="btn-action btn-delete" onclick="eliminarCorte('${c.codigo}')"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(row);
  });
}

async function guardarCorte(e) {
  e.preventDefault();
  const accion = document.getElementById("accion").value;
  const codigo = document.getElementById("codigo").value;
  const codigoInput = document.getElementById("codigoInput").value.trim();
  
  const data = {
    codigo: accion === "crear" ? codigoInput : codigo, // Usar codigoInput para crear, codigo hidden para editar
    servicio: document.getElementById("servicio").value.trim(),
    precio: parseFloat(document.getElementById("precio").value),
    comision: parseFloat(document.getElementById("comision").value)
  };
  
  console.log('📝 Guardando corte:', { accion, data });

  const url = accion === "crear" ? "/api/cortes" : `/api/cortes/${codigo}`;
  const method = accion === "crear" ? "POST" : "PUT";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      alert(result.mensaje);
      limpiarFormulario();
      cargarCortes();
    } else {
      const errorData = await res.json();
      console.error('❌ Error del servidor:', errorData);
      alert(errorData.mensaje || "Error al guardar corte");
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert("Error al guardar corte: " + error.message);
  }
}

function limpiarFormulario() {
  document.getElementById("accion").value = "crear";
  document.getElementById("codigo").value = "";
  document.getElementById("codigoInput").value = "";
  document.getElementById("corteForm").reset();
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("submitBtn").textContent = "Guardar Corte";
  
  // Habilitar el campo código para creación
  document.getElementById("codigoInput").disabled = false;
}

async function editarCorte(codigo) {
  console.log('✏️ Editando corte:', codigo);
  
  try {
    const res = await fetch(`/api/cortes/${codigo}`);
    
    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.mensaje || 'Error al obtener el corte');
      return;
    }
    
    const data = await res.json();
    
    // Llenar formulario con datos existentes
    document.getElementById("accion").value = "actualizar";
    document.getElementById("codigo").value = data.codigo;
    document.getElementById("codigoInput").value = data.codigo;
    document.getElementById("servicio").value = data.servicio;
    document.getElementById("precio").value = data.precio;
    document.getElementById("comision").value = data.comision;
    document.getElementById("submitBtn").textContent = "Actualizar Corte";
    document.getElementById("cancelBtn").style.display = "block";
    
    // Deshabilitar el campo código durante la edición
    document.getElementById("codigoInput").disabled = true;
    
    // Mostrar formulario si está oculto
    const formSection = document.getElementById('formSection');
    if (formSection.classList.contains('hidden')) {
      formSection.classList.remove('hidden');
      document.getElementById('toggleFormBtn').classList.add('active');
    }
    
  } catch (error) {
    console.error('❌ Error al editar corte:', error);
    alert('Error al cargar datos del corte');
  }
}

async function eliminarCorte(codigo) {
  console.log('🗑️ Intentando eliminar corte:', codigo);
  
  if (!codigo || codigo === 'null' || codigo === 'undefined') {
    alert('Error: Código de corte inválido');
    return;
  }
  
  if (confirm("¿Deseas eliminar este corte?")) {
    try {
      const res = await fetch(`/api/cortes/${codigo}`, { method: "DELETE" });
      
      if (res.ok) {
        const result = await res.json();
        alert(result.mensaje);
        cargarCortes();
      } else {
        const errorData = await res.json();
        console.error('❌ Error del servidor:', errorData);
        alert(errorData.mensaje || 'Error al eliminar corte');
      }
    } catch (error) {
      console.error('❌ Error al eliminar corte:', error);
      alert('Error al eliminar corte: ' + error.message);
    }
  }
}

function exportarExcel() {
  const table = document.getElementById("tablaCortes");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Cortes");
  XLSX.writeFile(wb, "cortes.xlsx");
}