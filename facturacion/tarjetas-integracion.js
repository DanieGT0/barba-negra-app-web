// tarjetas-integracion.js
// Integración del sistema de tarjetas de fidelidad con la facturación

let tarjetaClienteActual = null;

// Inicializar la integración cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que el sistema de facturación esté listo
    setTimeout(() => {
        inicializarIntegracionTarjetas();
    }, 2000);
});

function inicializarIntegracionTarjetas() {
    // Ya no necesitamos interceptar porque ahora se llama directamente desde factura.js
    console.log('Sistema de tarjetas de fidelidad inicializado');
}

// Verificar si el cliente tiene tarjeta de fidelidad
async function verificarTarjetaCliente() {
    // Verificar si la función está disponible
    if (typeof obtenerClienteIdSeleccionado !== 'function') {
        console.error('obtenerClienteIdSeleccionado no está disponible');
        return;
    }
    
    const clienteId = obtenerClienteIdSeleccionado();
    
    // Ocultar sección de tarjeta si no hay cliente seleccionado
    if (!clienteId || clienteId === '') {
        ocultarSeccionTarjeta();
        tarjetaClienteActual = null;
        return;
    }

    try {
        const response = await fetch(`/api/tarjetas-fidelidad/cliente/${clienteId}`);
        if (!response.ok) {
            throw new Error('Error al verificar tarjeta');
        }

        const tarjeta = await response.json();
        
        if (tarjeta) {
            tarjetaClienteActual = tarjeta;
            console.log('Tarjeta encontrada y asignada:', tarjeta);
            mostrarInformacionTarjeta(tarjeta);
        } else {
            tarjetaClienteActual = null;
            console.log('Cliente sin tarjeta de fidelidad');
            mostrarOpcionCrearTarjeta(clienteId);
        }
    } catch (error) {
        console.error('Error al verificar tarjeta:', error);
        ocultarSeccionTarjeta();
        tarjetaClienteActual = null;
    }
}

// Mostrar información de la tarjeta existente
function mostrarInformacionTarjeta(tarjeta) {
    const section = document.getElementById('tarjetaFidelidadSection');
    const info = document.getElementById('tarjetaInfo');
    
    const sellosVisuales = generarSellosVisuales(tarjeta.sellos_actuales);
    const progreso = (tarjeta.sellos_actuales / 10) * 100;
    
    let alertaEspecial = '';
    if (tarjeta.sellos_actuales === 9) {
        alertaEspecial = `
            <div style="background: linear-gradient(135deg, #ffc107, #ff8c00); color: #1a1a2e; padding: 12px; border-radius: 10px; margin-top: 15px; font-weight: bold; text-align: center; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4); animation: pulse 2s infinite;">
                <i class="fas fa-gift" style="margin-right: 8px; font-size: 1.2em;"></i>¡EL PRÓXIMO CORTE SERÁ GRATIS!
            </div>
        `;
    }
    
    info.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
            <div>
                <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px; color: #ffffff;">
                    <i class="fas fa-qrcode" style="margin-right: 8px; color: #00fff5;"></i>Código: ${tarjeta.codigo}
                </div>
                <div style="margin-bottom: 8px; font-size: 1.05em; color: #ffffff;">
                    <i class="fas fa-user" style="margin-right: 8px; color: #00fff5;"></i>Cliente: ${tarjeta.cliente_nombre}
                </div>
                <div style="margin-bottom: 8px; font-size: 0.95em; color: rgba(255, 255, 255, 0.8);">
                    <i class="fas fa-id-card" style="margin-right: 8px; color: #00fff5;"></i>DUI: ${tarjeta.cliente_dui || 'Sin DUI'}
                </div>
                <div style="margin-bottom: 12px; font-size: 1.1em; font-weight: bold; color: #ffffff;">
                    <i class="fas fa-stamp" style="margin-right: 8px; color: #00fff5;"></i>Sellos: ${tarjeta.sellos_actuales}/10
                </div>
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; height: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                    <div style="height: 100%; background: linear-gradient(90deg, #00fff5, #bb86fc); width: ${progreso}%; transition: width 0.3s; border-radius: 12px;"></div>
                </div>
            </div>
            <div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; max-width: 220px;">
                    ${sellosVisuales}
                </div>
            </div>
        </div>
        ${alertaEspecial}
    `;
    
    section.style.display = 'block';
}

// Mostrar opción para crear nueva tarjeta
function mostrarOpcionCrearTarjeta(clienteId) {
    const section = document.getElementById('tarjetaFidelidadSection');
    const info = document.getElementById('tarjetaInfo');
    
    info.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 15px;">
                <i class="fas fa-credit-card" style="font-size: 2.5em; color: rgba(255, 255, 255, 0.4);"></i>
            </div>
            <div style="margin-bottom: 20px; font-size: 1.1em; color: #ffffff; font-weight: 500;">
                Este cliente no tiene tarjeta de fidelidad
            </div>
            <button onclick="crearTarjetaCliente(${clienteId})" style="background: linear-gradient(135deg, #00fff5, #bb86fc); color: #1a1a2e; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(0, 255, 245, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 255, 245, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 255, 245, 0.3)'">
                <i class="fas fa-plus" style="margin-right: 8px;"></i>Crear Tarjeta de Fidelidad
            </button>
        </div>
    `;
    
    section.style.display = 'block';
}

// Ocultar sección de tarjeta
function ocultarSeccionTarjeta() {
    const section = document.getElementById('tarjetaFidelidadSection');
    section.style.display = 'none';
}

// Crear tarjeta para el cliente
async function crearTarjetaCliente(clienteId) {
    try {
        const response = await fetch('/api/tarjetas-fidelidad', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cliente_id: parseInt(clienteId) })
        });

        const result = await response.json();

        if (response.ok) {
            if (typeof Swal !== 'undefined') {
                Swal.fire('Éxito', 'Tarjeta de fidelidad creada exitosamente', 'success');
            } else {
                alert('Tarjeta de fidelidad creada exitosamente');
            }
            // Recargar información de la tarjeta
            verificarTarjetaCliente();
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error', result.mensaje, 'error');
            } else {
                alert('Error: ' + result.mensaje);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', 'No se pudo crear la tarjeta', 'error');
        } else {
            alert('Error: No se pudo crear la tarjeta');
        }
    }
}

// Generar sellos visuales
function generarSellosVisuales(sellos_actuales) {
    let html = '';
    for (let i = 1; i <= 10; i++) {
        if (i <= sellos_actuales) {
            html += `<div style="width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #00fff5, #bb86fc); color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 0.7em; font-weight: bold; box-shadow: 0 3px 8px rgba(0, 255, 245, 0.4);">${i}</div>`;
        } else if (i === 10 && sellos_actuales === 9) {
            html += `<div style="width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #ffc107, #ff8c00); color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 0.65em; animation: pulse 1.5s infinite; box-shadow: 0 4px 12px rgba(255, 193, 7, 0.6);"><i class="fas fa-gift"></i></div>`;
        } else {
            html += `<div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.4); border: 2px dashed rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center; font-size: 0.7em; font-weight: 500;">${i}</div>`;
        }
    }
    return html;
}

// Interceptar la función original guardarFactura
function interceptarGuardarFactura() {
    // Guardar referencia a la función original
    const guardarFacturaOriginal = window.guardarFactura;
    
    if (!guardarFacturaOriginal) {
        console.error('No se encontró la función guardarFactura original');
        // Intentar nuevamente después de un poco más de tiempo
        setTimeout(interceptarGuardarFactura, 2000);
        return;
    }

    console.log('Interceptando función guardarFactura...');

    // Sobrescribir la función
    window.guardarFactura = async function(e) {
        console.log('Función guardarFactura interceptada ejecutándose...');
        
        // Ejecutar la función original primero
        try {
            await guardarFacturaOriginal.call(this, e);
            console.log('Factura guardada exitosamente, procesando tarjeta...');
            
            // Si llegamos aquí, la factura se guardó exitosamente
            // Ahora procesamos la tarjeta de fidelidad
            await procesarTarjetaDespuesDeFactura();
            
        } catch (error) {
            console.error('Error en guardarFactura:', error);
            // Si hay error, no procesamos la tarjeta
            throw error;
        }
    };
}

// Interceptar el formulario directamente como alternativa
function interceptarFormularioFactura() {
    const form = document.getElementById('formFactura');
    if (!form) {
        console.error('No se encontró el formulario de factura');
        return;
    }

    console.log('Interceptando formulario de factura directamente...');

    // Agregar event listener al formulario
    form.addEventListener('submit', async function(e) {
        console.log('Evento submit del formulario interceptado');
        
        // No prevenir el evento, solo agregar procesamiento después
        setTimeout(async () => {
            console.log('Verificando si la factura se guardó para procesar tarjeta...');
            
            // Esperar un poco y luego procesar la tarjeta
            if (tarjetaClienteActual) {
                console.log('Procesando tarjeta después de submit del formulario...');
                await procesarTarjetaDespuesDeFactura();
            }
        }, 2000); // Esperar 2 segundos después del submit
    });
}

// Procesar tarjeta después de facturación exitosa (función global)
window.procesarTarjetaDespuesDeFactura = async function(comanda, factura, detalleCortes) {
    console.log('Procesando tarjeta después de factura. Cliente actual:', tarjetaClienteActual);
    console.log('Datos de factura recibidos:', { comanda, factura, cortesCount: detalleCortes?.length });
    
    if (!tarjetaClienteActual) {
        console.log('No hay tarjeta para procesar');
        return; // No hay tarjeta para procesar
    }

    // Verificar si la tarjeta ya está completada
    if (tarjetaClienteActual.estado === 'completada') {
        console.log('⚠️ Tarjeta ya completada, no se pueden agregar más sellos');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'ℹ️ Información',
                text: 'Esta tarjeta ya está completada. Para continuar acumulando sellos, el cliente debe solicitar una nueva tarjeta.',
                icon: 'info',
                confirmButtonText: 'Entendido'
            });
        }
        return;
    }

    // Verificar si hay cortes pasados como parámetro
    if (!detalleCortes || detalleCortes.length === 0) {
        console.log('No hay cortes en la factura para procesar');
        return; // No hay cortes para procesar
    }
    
    // Calcular total de cortes individuales (considerando cantidad)
    const totalCortes = detalleCortes.reduce((sum, corte) => sum + parseInt(corte.cantidad || 1), 0);
    
    // TODOS los cortes generan sellos, independientemente de si son gratis o no
    // La lógica de cortes gratis es solo para el precio, no afecta los sellos
    console.log(`Total cortes individuales: ${totalCortes} (de ${detalleCortes.length} filas)`);
    console.log(`Agregando ${totalCortes} sellos...`);

    try {
        // Agregar sellos por cada corte individual (considerando cantidad)
        let selloActual = 0;
        for (let i = 0; i < detalleCortes.length; i++) {
            const corte = detalleCortes[i];
            const cantidad = parseInt(corte.cantidad || 1);
            const esGratis = corte.descuento_gratis ? ' (fue gratis)' : '';
            
            // Agregar un sello por cada unidad de este corte
            for (let j = 0; j < cantidad; j++) {
                selloActual++;
                console.log(`Agregando sello ${selloActual} de ${totalCortes}: ${corte.tipo_corte} (${j + 1}/${cantidad})${esGratis}`);
            
                const response = await fetch(`/api/tarjetas-fidelidad/${tarjetaClienteActual.id}/sello`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        empleado: 'Sistema',
                        observaciones: `Sello automático por ${corte.tipo_corte} - Factura #${factura} (${selloActual}/${totalCortes})`
                    })
                });

                const result = await response.json();
                console.log(`Respuesta del servidor para sello ${selloActual}:`, result);

                // Si la tarjeta ya estaba completada, no continuar procesando
                if (response.ok && result.tarjeta_completada && result.mensaje.includes('ya completada')) {
                    console.log('⚠️ Tarjeta ya estaba completada, deteniendo procesamiento');
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: 'ℹ️ Información',
                            text: 'Esta tarjeta ya está completada. Para continuar acumulando sellos, el cliente debe solicitar una nueva tarjeta.',
                            icon: 'info',
                            confirmButtonText: 'Entendido'
                        });
                    }
                    break; // Salir del loop de procesamiento
                }

                // Solo mostrar alertas en el último sello procesado
                if (selloActual === totalCortes) {
                if (response.ok && result.tarjeta_completada) {
                    // Mostrar alerta especial para tarjeta completada
                    if (typeof Swal !== 'undefined') {
                        await Swal.fire({
                            title: '🎉 ¡TARJETA COMPLETADA!',
                            html: `
                                <div style="text-align: center;">
                                    <div style="font-size: 1.2em; margin-bottom: 15px;">
                                        ${result.mensaje}
                                    </div>
                                    <div style="background: #28a745; color: white; padding: 15px; border-radius: 10px; margin: 15px 0;">
                                        <i class="fas fa-gift" style="font-size: 2em; margin-bottom: 10px;"></i><br>
                                        <strong>¡YA SE APLICÓ EL CORTE GRATIS!</strong>
                                    </div>
                                    <div style="background: #ffc107; color: #1a1a2e; padding: 10px; border-radius: 5px; margin-top: 10px;">
                                        <i class="fas fa-info-circle"></i> <strong>Para continuar acumulando sellos, solicitar nueva tarjeta</strong>
                                    </div>
                                    <div style="font-size: 0.9em; color: #666; margin-top: 10px;">
                                        Sellos agregados en esta factura: ${totalCortes}
                                    </div>
                                </div>
                            `,
                            icon: 'success',
                            confirmButtonText: 'Entendido'
                        });
                    }
                } else if (response.ok && result.proximo_gratis) {
                    // Alerta para próximo corte gratis
                    if (typeof Swal !== 'undefined') {
                        await Swal.fire({
                            title: '⭐ ¡Próximo corte GRATIS!',
                            html: `
                                <div style="text-align: center;">
                                    <div style="margin-bottom: 15px;">
                                        ${result.mensaje}
                                    </div>
                                    <div style="font-size: 0.9em; color: #666;">
                                        Sellos agregados en esta factura: ${totalCortes}
                                    </div>
                                </div>
                            `,
                            icon: 'info',
                            confirmButtonText: 'Entendido'
                        });
                    }
                } else if (response.ok) {
                    // Solo mostrar notificación del total de sellos agregados
                    console.log(`Total de sellos agregados: ${totalCortes}`);
                }
                }

                // Pequeña pausa entre sellos para evitar problemas de concurrencia
                if (selloActual < totalCortes) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        // Actualizar la información de la tarjeta
        setTimeout(() => {
            verificarTarjetaCliente();
        }, 1000);

    } catch (error) {
        console.error('Error al procesar tarjeta de fidelidad:', error);
        // No mostramos error al usuario para no interrumpir el flujo de facturación
    }
};

// Función para obtener factura por comanda y número
async function obtenerFacturaPorComandaYNumero(comanda, factura) {
    try {
        const response = await fetch(`/api/facturas`);
        if (!response.ok) throw new Error('Error al obtener facturas');
        
        const facturas = await response.json();
        return facturas.find(f => f.comanda == comanda && f.factura == factura);
    } catch (error) {
        console.error('Error al buscar factura:', error);
        return null;
    }
}

// Agregar estilos CSS para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);