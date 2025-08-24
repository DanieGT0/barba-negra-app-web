document.addEventListener('DOMContentLoaded', () => {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const formSection = document.getElementById('formSection');

  toggleBtn.addEventListener('click', function () {
    toggleBtn.classList.toggle('active');
    formSection.classList.toggle('hidden');
  });

  cargarEmpleados();

  document.getElementById('empleadoForm').addEventListener('submit', guardarEmpleado);
  document.getElementById('cancelBtn').addEventListener('click', limpiarFormulario);
  document.getElementById('searchBtn').addEventListener('click', aplicarFiltros);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchDui').value = '';
    document.getElementById('searchNombre').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    cargarEmpleados();
  });

  document.getElementById("downloadExcelBtn").addEventListener("click", function () {
    const table = document.getElementById("empleadosTable");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, "empleados.xlsx");
  });
});

function validarDUI(dui) {
  const regexDUI = /^\d{8}-\d{1}$/;
  return regexDUI.test(dui);
}

async function guardarEmpleado(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (!validarDUI(data.dui)) {
    mostrarNotificacion("Formato de DUI inválido (00000000-0)", "error");
    return;
  }

  const method = data.accion === 'actualizar' ? 'PUT' : 'POST';
  const url = data.accion === 'actualizar' ? `/api/empleados/${data.empleado_id}` : '/api/empleados';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      limpiarFormulario();
      cargarEmpleados();
      mostrarNotificacion(data.accion === 'crear' ? "Empleado registrado" : "Empleado actualizado", "success");
    } else {
      const err = await res.json();
      mostrarNotificacion(err.mensaje || "Error al guardar", "error");
    }
  } catch (error) {
    console.error("Error al guardar:", error);
    mostrarNotificacion("Error de conexión", "error");
  }
}

function cargarEmpleadoEnFormulario(empleado) {
  document.getElementById("accion").value = "actualizar";
  document.getElementById("empleado_id").value = empleado.id || empleado.dui;
  document.getElementById("fecha").value = empleado.fecha;
  document.getElementById("dui").value = empleado.dui;
  document.getElementById("nombre").value = empleado.nombre;
  document.getElementById("direccion").value = empleado.direccion;
  document.getElementById("correo").value = empleado.correo;
  document.getElementById("nacimiento").value = empleado.nacimiento;
  document.getElementById("salario").value = empleado.salario;
  document.getElementById("cargo").value = empleado.cargo || "";
  document.getElementById("telefono").value = empleado.telefono || "";

  document.getElementById("submitBtn").textContent = "Actualizar Empleado";
  document.getElementById("cancelBtn").style.display = "block";
}

function limpiarFormulario() {
  document.getElementById("empleadoForm").reset();
  document.getElementById("accion").value = "crear";
  document.getElementById("empleado_id").value = "";
  document.getElementById("submitBtn").textContent = "Registrar Empleado";
  document.getElementById("cancelBtn").style.display = "none";

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
}

async function cargarEmpleados() {
  try {
    const res = await fetch("/api/empleados");
    const empleados = await res.json();
    const tbody = document.querySelector("#empleadosTable tbody");
    tbody.innerHTML = "";

    empleados.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatearFecha(emp.fecha)}</td>
        <td>${emp.dui}</td>
        <td>${emp.nombre}</td>
        <td>${emp.direccion}</td>
        <td>${emp.correo}</td>
        <td>${formatearFecha(emp.nacimiento)}</td>
        <td>$${parseFloat(emp.salario).toFixed(2)}</td>
        <td>${emp.cargo || ''}</td>
        <td>${emp.telefono || ''}</td>
        <td>
          <button class="btn-action btn-edit" onclick='editarEmpleado("${emp.dui}")'><i class="fas fa-edit"></i></button>
          <button class="btn-action btn-delete" onclick='eliminarEmpleado("${emp.dui}")'><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    mostrarNotificacion("Error al cargar empleados", "error");
  }
}

async function editarEmpleado(dui) {
  try {
    const res = await fetch(`/api/empleados/${dui}`);
    if (!res.ok) throw new Error("Empleado no encontrado");
    const emp = await res.json();
    cargarEmpleadoEnFormulario(emp);
    document.getElementById('formSection').classList.remove('hidden');
    document.getElementById('toggleFormBtn').classList.add('active');
    document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    mostrarNotificacion(err.message, "error");
  }
}

async function eliminarEmpleado(dui) {
  if (confirm("¿Deseas eliminar este empleado?")) {
    try {
      const res = await fetch(`/api/empleados/${dui}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      cargarEmpleados();
      mostrarNotificacion("Empleado eliminado", "success");
    } catch (err) {
      mostrarNotificacion(err.message, "error");
    }
  }
}

async function aplicarFiltros() {
  const params = new URLSearchParams();
  const dui = document.getElementById("searchDui").value.trim();
  const nombre = document.getElementById("searchNombre").value.trim();
  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;

  if (dui) params.append("dui", dui);
  if (nombre) params.append("nombre", nombre);
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);

  try {
    const res = await fetch(`/api/empleados/filtro?${params.toString()}`);
    const empleados = await res.json();
    const tbody = document.querySelector("#empleadosTable tbody");
    tbody.innerHTML = "";

    empleados.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatearFecha(emp.fecha)}</td>
        <td>${emp.dui}</td>
        <td>${emp.nombre}</td>
        <td>${emp.direccion}</td>
        <td>${emp.correo}</td>
        <td>${formatearFecha(emp.nacimiento)}</td>
        <td>$${parseFloat(emp.salario).toFixed(2)}</td>
        <td>${emp.cargo || ''}</td>
        <td>${emp.telefono || ''}</td>
        <td>
          <button class="btn-action btn-edit" onclick='editarEmpleado("${emp.dui}")'><i class="fas fa-edit"></i></button>
          <button class="btn-action btn-delete" onclick='eliminarEmpleado("${emp.dui}")'><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error al filtrar:", error);
    mostrarNotificacion("Error al filtrar empleados", "error");
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  const fecha = new Date(fechaStr);
  return isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-ES");
}

function mostrarNotificacion(mensaje, tipo) {
  const notificacionExistente = document.querySelector('.notificacion');
  if (notificacionExistente) notificacionExistente.remove();

  const notificacion = document.createElement('div');
  notificacion.className = `notificacion ${tipo}`;
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.classList.add('ocultar');
    setTimeout(() => {
      notificacion.remove();
    }, 300);
  }, 3000);
}
