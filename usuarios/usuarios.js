/* ──────────────────────────────────────────────────────────────
   usuarios.js – Barba Negra  (versión corregida 13-may-2025)
──────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarios();
  verificarSiEsAdmin();
});

/* ───────────── Verificar si el usuario logueado es Admin ────── */
function verificarSiEsAdmin() {
  fetch('/api/verificarUsuario')
    .then(res => res.json())
    .then(data => {
      if (data.rol === 'Admin') {
        const btn = document.getElementById('btnCrearUsuario');
        btn.style.display = 'block';
        btn.querySelector('button').addEventListener('click', crearUsuario);
      }
    })
    .catch(err => console.error('Error al verificar usuario:', err));
}

/* ─────────────────── Cargar lista de usuarios ───────────────── */
function cargarUsuarios() {
  fetch('/api/usuarios')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#tablaUsuarios tbody');
      tbody.innerHTML = '';

      data.forEach(usuario => {
        const tr = document.createElement('tr');
        const iniciales = usuario.usuario.substring(0, 2).toUpperCase();
        const modulosBadges = usuario.modulos
          .map(m => `<span class="module-badge">${m}</span>`)
          .join('');

        tr.innerHTML = `
          <td>
            <div class="user-info">
              <div class="user-avatar">${iniciales}</div>
              <span>${usuario.usuario}</span>
            </div>
          </td>

          <td>
            <span class="user-role ${usuario.rol === 'Admin' ? 'role-admin' : 'role-user'}">
              ${usuario.rol}
            </span>
          </td>

          <td>
            <div class="module-badges">
              ${modulosBadges}
            </div>
          </td>

          <td class="actions">
            <!-- Editar rol -->
            <button class="btn-action btn-edit btn-tooltip"
                    data-tooltip="Editar Rol"
                    onclick="editarRol('${usuario.usuario}', '${usuario.rol}')">
              <i class="fas fa-user-shield"></i>
            </button>

            <!-- Editar módulos (solo para rol Usuario) -->
            ${usuario.rol === 'Admin' ? '' : `
              <button class="btn-action btn-modules btn-tooltip"
                      data-tooltip="Editar Módulos"
                      onclick='editarModulos("${usuario.usuario}", ${JSON.stringify(usuario.modulos)})'>
                <i class="fas fa-th-large"></i>
              </button>`}

            <!-- Cambiar contraseña -->
            <button class="btn-action btn-password btn-tooltip"
                    data-tooltip="Cambiar Contraseña"
                    onclick="cambiarPassword('${usuario.usuario}')">
              <i class="fas fa-key"></i>
            </button>

            <!-- Eliminar usuario -->
            <button class="btn-action btn-delete btn-tooltip"
                    data-tooltip="Eliminar Usuario"
                    onclick="eliminarUsuario('${usuario.usuario}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error('Error al cargar usuarios:', err);
      mostrarNotificacion('Error al cargar usuarios', 'error');
    });
}

/* ───────────────────── Crear nuevo usuario ──────────────────── */
function crearUsuario() {
  Swal.fire({
    title: 'Crear Nuevo Usuario',
    html: `
      <div style="text-align:left">
        <label>Nombre de Usuario</label>
        <input id="nuevoUsuario" class="swal2-input" placeholder="Usuario">

        <label style="margin-top:12px">Contraseña</label>
        <input id="nuevaPassword" type="password" class="swal2-input" placeholder="Contraseña">

        <label style="margin-top:12px">Rol</label>
        <select id="nuevoRol" class="swal2-select">
          <option value="Usuario">Usuario</option>
          <option value="Admin">Administrador</option>
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Crear',
    preConfirm: () => {
      const usuario  = document.getElementById('nuevoUsuario').value.trim();
      const password = document.getElementById('nuevaPassword').value.trim();
      const rol      = document.getElementById('nuevoRol').value;

      if (!usuario || !password) {
        Swal.showValidationMessage('Completa todos los campos');
        return false;
      }
      if (password.length < 5) {
        Swal.showValidationMessage('Contraseña mínimo 5 caracteres');
        return false;
      }
      return { usuario, password, rol };
    }
  }).then(({ isConfirmed, value }) => {
    if (!isConfirmed) return;

    const modulosDefecto = ['Clientes'];

    fetch('/api/crearUsuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...value,
        modulos: value.rol === 'Admin'
          ? ["Clientes","Empleados","Inventarios","Compras","Cortes",
             "Facturacion","DetalleCortes","DetalleProductos",
             "Nomina","AgendarCitas","Usuarios","Gastos","Salarios","Comisiones"]
          : modulosDefecto
      })
    })
      .then(res => res.json())
      .then(r => {
        if (r.error) throw new Error(r.mensaje);
        mostrarNotificacion('Usuario creado con éxito', 'success');
        cargarUsuarios();
      })
      .catch(err => mostrarNotificacion(err.message, 'error'));
  });
}

/* ───────────────────── Editar Rol ───────────────────────────── */
function editarRol(usuario, rolActual) {
  Swal.fire({
    title: `Editar Rol de ${usuario}`,
    input: 'select',
    inputOptions: { Admin: 'Administrador', Usuario: 'Usuario' },
    inputValue: rolActual,
    showCancelButton: true,
    confirmButtonText: 'Actualizar'
  }).then(({ isConfirmed, value }) => {
    if (!isConfirmed || value === rolActual) return;

    fetch('/api/editarUsuario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, nuevoRol: value })
    })
      .then(res => res.json())
      .then(r => {
        if (r.error) throw new Error(r.mensaje);
        mostrarNotificacion(r.mensaje, 'success');
        cargarUsuarios();
      })
      .catch(err => mostrarNotificacion(err.message, 'error'));
  });
}

/* ───────────────────── Eliminar usuario ─────────────────────── */
function eliminarUsuario(usuario) {
  Swal.fire({
    title: '¿Eliminar usuario?',
    text: `No podrás deshacer esta acción.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4d6d',
    confirmButtonText: 'Sí, eliminar'
  }).then(({ isConfirmed }) => {
    if (!isConfirmed) return;

    fetch(`/api/eliminarUsuario/${usuario}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(r => {
        mostrarNotificacion(r.mensaje, 'success');
        cargarUsuarios();
      })
      .catch(err => mostrarNotificacion(err.message, 'error'));
  });
}

/* ───────────────────── Editar módulos ───────────────────────── */
function editarModulos(usuario, modulosActuales) {
  const modulosArray = Array.isArray(modulosActuales) ? modulosActuales : [];
  const modulosDisponibles = [
    "Clientes","Empleados","Inventarios","Compras",
    "Cortes","Facturacion","DetalleCortes",
    "DetalleProductos","Nomina","AgendarCitas","Gastos","Comisiones","Usuarios","Salarios"
  ];

  let html = '<div style="max-height:300px;overflow-y:auto;padding:10px">';
  modulosDisponibles.forEach(m => {
    const checked = modulosArray.includes(m) ? 'checked' : '';
    html += `
      <div style="margin-bottom:8px">
        <input type="checkbox" id="chk_${m}" value="${m}" ${checked}>
        <label for="chk_${m}" style="margin-left:6px">${m}</label>
      </div>`;
  });
  html += '</div>';

  Swal.fire({
    title: `Editar módulos de ${usuario}`,
    html,
    showCancelButton: true,
    confirmButtonText: 'Actualizar',
    preConfirm: () => {
      const seleccionados = Array.from(
        document.querySelectorAll('input[type="checkbox"]:checked')
      ).map(chk => chk.value);

      if (!seleccionados.length) {
        Swal.showValidationMessage('Selecciona al menos un módulo');
        return false;
      }
      return seleccionados;
    }
  }).then(({ isConfirmed, value }) => {
    if (!isConfirmed) return;

    fetch('/api/editarModulosUsuario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, nuevosModulos: value })
    })
      .then(res => res.json())
      .then(r => {
        if (r.error) throw new Error(r.mensaje);
        mostrarNotificacion(r.mensaje, 'success');
        cargarUsuarios();
      })
      .catch(err => mostrarNotificacion(err.message, 'error'));
  });
}

/* ───────────────────── Cambiar contraseña ───────────────────── */
function cambiarPassword(usuario) {
  Swal.fire({
    title: `Cambiar contraseña de ${usuario}`,
    input: 'password',
    inputLabel: 'Nueva contraseña',
    inputPlaceholder: 'Contraseña',
    showCancelButton: true,
    confirmButtonText: 'Actualizar',
    inputValidator: val => {
      if (!val) return 'No puede estar vacía';
      if (val.length < 5) return 'Mínimo 5 caracteres';
    }
  }).then(({ isConfirmed, value }) => {
    if (!isConfirmed) return;

    fetch('/api/cambiarPassword', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, nuevaPassword: value })
    })
      .then(res => res.json())
      .then(r => {
        if (r.error) throw new Error(r.mensaje);
        mostrarNotificacion(r.mensaje, 'success');
      })
      .catch(err => mostrarNotificacion(err.message, 'error'));
  });
}

/* ───────────────────── Toast genérico ───────────────────────── */
function mostrarNotificacion(msg, tipo = 'success') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 2500,
    background: tipo === 'error' ? '#ff4d6d' : '#1f2937',
    color: '#fff'
  });
  Toast.fire({ icon: tipo, title: msg });
}
