// login.js mejorado

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', enviarLogin);
  
  // Verificar si hay un mensaje de redirección en la URL (por ejemplo, si intentó acceder a una página restringida)
  const urlParams = new URLSearchParams(window.location.search);
  const mensaje = urlParams.get('mensaje');
  if (mensaje) {
    mostrarNotificacion(decodeURIComponent(mensaje), 'warning');
  }
});

async function enviarLogin(e) {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!usuario || !password) {
    mostrarNotificacion('Debes completar todos los campos', 'warning');
    return;
  }

  try {
    // Mostrar loader mientras se procesa
    Swal.fire({
      title: 'Verificando credenciales',
      text: 'Por favor espera...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });

    // Cerrar el loader
    Swal.close();

    const data = await res.json();

    if (res.ok) {
      // Login exitoso - Mostrar animación de éxito
      Swal.fire({
        icon: 'success',
        title: `¡Bienvenido, ${data.usuario}!`,
        text: 'Accediendo al sistema...',
        timer: 1500,
        showConfirmButton: false,
        background: '#16213e',
        color: '#ffffff'
      });

      // Pequeño retraso antes de redireccionar para que se vea la animación
      setTimeout(() => {
        window.location.href = data.rol === 'Admin' ? '/indexreportes.html' : '/';
      }, 1600);
    } else {
      // Error de login
      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: data.mensaje || 'Credenciales incorrectas',
        background: '#16213e',
        color: '#ffffff',
        confirmButtonColor: '#bb86fc'
      });
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    
    // Error de conexión
    Swal.fire({
      icon: 'error',
      title: 'Error de conexión',
      text: 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.',
      background: '#16213e',
      color: '#ffffff',
      confirmButtonColor: '#bb86fc'
    });
  }
}

function mostrarNotificacion(mensaje, tipo) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: tipo,
    title: mensaje,
    background: '#16213e',
    color: '#ffffff'
  });
}