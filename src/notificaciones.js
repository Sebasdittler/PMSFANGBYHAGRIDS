// src/notificaciones.js

const EMAILJS_SERVICE_ID = 'Hagrids fang-vite';
const EMAILJS_TEMPLATE_ID = 'template_snx624q';
const EMAILJS_PUBLIC_KEY = 'ydg83pym869m0Z-YJ';

function fmtFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
}

function calcNoches(ci, co) {
  if (!ci || !co) return '—';
  const diff = (new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24);
  return isNaN(diff) ? '—' : `${diff} noche${diff !== 1 ? 's' : ''}`;
}

export async function notificarNuevaReserva(reserva, propiedadNombre, usuarioEmail) {
  try {
    const cur = reserva.cur === 'USD' ? 'USD' : 'ARS';
    const monto = reserva.amt
      ? `${cur} ${(+reserva.amt).toLocaleString('es-AR')}`
      : '—';

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          propiedad:     propiedadNombre || '—',
          huesped:       reserva.guest   || '—',
          fecha_entrada: fmtFecha(reserva.ci),
          fecha_salida:  fmtFecha(reserva.co),
          noches:        calcNoches(reserva.ci, reserva.co),
          monto:         monto,
          usuario:       usuarioEmail    || 'Sistema',
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
