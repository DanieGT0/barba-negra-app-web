// register.js

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('registerForm').addEventListener('submit', enviarRegistro);
  });
  
  async function enviarRegistro(e) {
    e.preventDefault();
  
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value.trim();
    const rolSeleccionado = document.querySelector('input[name="rol"]:checked').value;
    
    // Capturar módulos seleccionados
    const modulosSeleccionados = Array.from(document.querySelectorAll('input[name="modulos"]:checked'))
      .map(checkbox => checkbox.value);
  
    if (!usuario || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debes completar usuario y contraseña',
      });
      return;
    }
  
    if (modulosSeleccionados.length === 0 && rolSeleccionado !== 'Admin') {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debes seleccionar al menos un módulo para usuarios normales',
      });
      return;
    }
  
    try {
      Swal.fire({
        title: 'Registrando...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
  
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario,
          password,
          rol: rolSeleccionado,
          modulos: modulosSeleccionados // 🔥 enviamos módulos
        })
      });
  
      Swal.close();
  
      const data = await res.json();
  
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Ahora puedes iniciar sesión',
          timer: 2000,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2100);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.mensaje,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo conectar al servidor.',
      });
    }
  }
  