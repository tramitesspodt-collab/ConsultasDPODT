// ==========================================================================
// CONFIGURACIÓN PRINCIPAL
// Reemplaza esta URL por la URL de tu Web App de Google Apps Script
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_oWBKQfTqbWSgV7Wn4DWFN5DP3elRkoC_zCZVSmfAiGp-RaF6-pC9KRGohF_pzPn2/exec'; 
// ==========================================================================

// ==========================================
// ====== MÓDULO DE CONSULTA DE EXPEDIENTE ======
// ==========================================
function buscarExpediente() {
  const dui = document.getElementById('duiInput').value.trim();
  const resBox = document.getElementById('res-box');

  if (!dui) {
    resBox.innerHTML = '<p style="color: #991b1b; text-align: center; font-size: 0.9rem; font-weight: 600;">Por favor, ingrese un número de DUI válido.</p>';
    return;
  }

  resBox.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">Consultando base de datos municipal...</p>';

  // Petición al backend de Apps Script
  fetch(`${WEB_APP_URL}?action=buscarExpediente&dui=${encodeURIComponent(dui)}`)
    .then(response => response.json())
    .then(data => {
      // Ajusta las variables "data.encontrado", "nombre", "tramite", etc., 
      // a lo que exactamente devuelve tu archivo Código.gs
      if (data.encontrado) {
        resBox.innerHTML = `
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 16px; text-align: left;">
            <p style="margin-bottom: 8px; font-size: 0.9rem;"><strong>Propietario:</strong> ${data.nombre}</p>
            <p style="margin-bottom: 8px; font-size: 0.9rem;"><strong>Trámite:</strong> ${data.tramite}</p>
            <p style="margin-bottom: 0; font-size: 0.9rem;"><strong>Estado actual:</strong> <span style="color: var(--accent); font-weight: 600;">${data.estado}</span></p>
          </div>
        `;
      } else {
        resBox.innerHTML = '<p style="color: #991b1b; text-align: center; font-size: 0.9rem; font-weight: 600;">No se encontraron expedientes activos para el DUI ingresado.</p>';
      }
    })
    .catch(error => {
      console.error('Error de conexión:', error);
      resBox.innerHTML = '<p style="color: #991b1b; text-align: center; font-size: 0.9rem; font-weight: 600;">Error de red. Intente nuevamente en unos instantes.</p>';
    });
}

// ==========================================
// ====== GESTIÓN DE MODALES (CARPETAS) ======
// ==========================================
function openFolder(tipo) {
  document.getElementById('modal-' + tipo).classList.add('active');
}

function closeFolder(event) {
  if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.remove('active');
  }
}

// ==========================================
// ====== CALCULADORA DE ESTIMADOS ======
// ==========================================
let _calcConceptos = [];
let _calcContadorFilas = 0;

document.addEventListener('DOMContentLoaded', _calcInicializar);

function _calcInicializar() {
  fetch(`${WEB_APP_URL}?action=obtenerConceptos`)
    .then(response => response.json())
    .then(conceptos => {
      _calcConceptos = conceptos || [];
      if (!_calcConceptos.length) return; 
      
      // Mostrar la sección solo si el backend responde con datos
      document.getElementById('calculadora-section').style.display = 'block';
      _calcAgregarFila();
    })
    .catch(error => {
      console.warn('Servicio de calculadora temporalmente no disponible.', error);
    });
}

function _calcAgregarFila() {
  const id = 'calc-fila-' + (_calcContadorFilas++);
  const opciones = _calcConceptos.map(c => `<option value="${_escAttr(c.proyecto)}">${_escHtmlCalc(c.proyecto)}</option>`).join('');
  const div = document.createElement('div');
  
  div.id = id;
  div.className = 'calc-fila';
  div.innerHTML = `
    <select class="calc-select"><option value="">Seleccione concepto...</option>${opciones}</select>
    <input type="number" min="0" step="any" placeholder="Cant." class="calc-input">
    <button type="button" onclick="document.getElementById('${id}').remove()" style="background:#fee2e2; color:#991b1b; border:none; width:38px; height:38px; border-radius:10px; font-weight:700; cursor:pointer; flex-shrink:0; transition: transform 0.2s;">×</button>
  `;
  document.getElementById('calc-filas').appendChild(div);
}

function _escAttr(s) { 
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); 
}

function _escHtmlCalc(s) { 
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
}

function _calcCalcular() {
  const filas = document.querySelectorAll('#calc-filas > div');
  const items = [];
  
  filas.forEach(fila => {
    const select = fila.querySelector('select');
    const input = fila.querySelector('input');
    if (select.value && input.value) {
      items.push({ proyecto: select.value, cantidad: input.value });
    }
  });

  const cont = document.getElementById('calc-resultado');

  if (!items.length) {
    cont.style.display = 'block';
    cont.innerHTML = '<p style="text-align:center; color:#991b1b; font-size: 0.9rem; font-weight:600;">Complete al menos un concepto con su respectiva cantidad.</p>';
    return;
  }
  
  const zona = document.getElementById('calc-zona').value;
  if (!zona) {
    cont.style.display = 'block';
    cont.innerHTML = '<p style="text-align:center; color:#991b1b; font-size: 0.9rem; font-weight:600;">Seleccione el tipo de zona (Urbana o Rural).</p>';
    return;
  }

  const datos = {
    items: items,
    monto: document.getElementById('calc-monto').value || 0,
    zona: zona,
    tipoPersona: document.getElementById('calc-tipoPersona').value
  };

  cont.style.display = 'block';
  cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size: 0.9rem;">Procesando cálculo...</p>';

  fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'calcularEstimado', payload: datos })
  })
  .then(response => response.json())
  .then(res => {
    const fila = (etiqueta, monto, atenuado) => `
      <div style="display:flex; justify-content:space-between; font-size:.85rem; padding:6px 0; ${atenuado ? 'color:var(--text-muted);' : 'color:#111827; font-weight:600;'}">
        <span>${etiqueta}</span><span>$${parseFloat(monto).toFixed(2)}</span>
      </div>`;

    let html = '<div style="border-top:2px solid #f1f5f9; padding-top:14px; animation: fadeIn 0.4s ease;">';
    
    // Desglose de conceptos
    res.desglose.forEach(d => { 
      html += fila(`${_escHtmlCalc(d.proyecto)} (${d.cantidad})`, d.subtotal, true); 
    });
    
    if (res.multaBase > 0) html += fila('Multa base (1% del presupuesto)', res.multaBase, true);
    
    html += fila('Total Tasa', res.mult, false);
    html += fila('Inspección' + (res.inspeccion === 0 ? ' (no aplica)' : ''), res.inspeccion, true);
    html += fila('Subtotal', res.subtotal, false);
    html += fila('Fiestas' + (res.hayFianza ? ' (exento por fianza)' : ' (5%)'), res.fiestas, true);
    
    html += `
      <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9; font-size:1.15rem; font-weight:700; color:#111827;">
        <span>Total estimado</span><span>$${parseFloat(res.total).toFixed(2)}</span>
      </div>
    </div>`;
    
    cont.innerHTML = html;
  })
  .catch(e => {
    console.error('Error al calcular:', e);
    cont.innerHTML = `<p style="text-align:center; color:#991b1b; font-weight:600; font-size: 0.9rem;">No se pudo procesar el cálculo. Verifique la conexión.</p>`;
  });
}
