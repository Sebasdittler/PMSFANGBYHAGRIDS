// src/notificaciones.js

const EMAILJS_SERVICE_ID = 'Hagrids fang-vite';
const EMAILJS_TEMPLATE_ID = 'template_snx624q';
const EMAILJS_PUBLIC_KEY = 'ydg83pym869m0Z-YJ';

export async function notificarNuevaReserva(reserva, propiedadNombre, usuarioNombre) {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          propiedad: propiedadNombre,
          huesped: reserva.huesped || reserva.nombre || '—',
          fecha_entrada: reserva.fechaEntrada || reserva.inicio || '—',
          fecha_salida: reserva.fechaSalida || reserva.fin || '—',
          noches: reserva.noches || '—',
          monto: reserva.montoTotal ? `$${reserva.montoTotal.toLocaleString()}` : '—',
          usuario: usuarioNombre || 'Sistema',
        }
      })
    });

    if (response.ok) {
      console.log('✅ Notificación enviada');
    } else {
      console.warn('⚠️ Error al enviar notificación:', response.status);
    }
  } catch (error) {
    console.error('❌ Error EmailJS:', error);
  }
}
