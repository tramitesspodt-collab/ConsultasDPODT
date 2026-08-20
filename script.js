/* ============================================================================
   Portal Ciudadano — versión independiente (GitHub Pages)
   ============================================================================
   Esta página NO vive dentro de Apps Script, así que no tiene acceso a
   google.script.run (ese puente solo existe dentro del sandbox de Apps Script).
   En su lugar, llama por fetch() a la MISMA app web ya desplegada, usando una
   rama nueva y aislada que se agregó a doGet() en Codigo.gs: responde en JSON
   solo cuando la URL trae "?api=1", algo que ninguna otra parte de la app usa
   — así que esto no cambia en nada el comportamiento de tu Apps Script actual,
   solo le agrega una puerta de entrada más.

   CONFIGURACIÓN — lo único que hay que llenar antes de publicar:
   ============================================================================ */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBBuQJMoWBDqp7TVZGk0C9g_hbNsuMaPFcAzlSXeRBaqFsoAAOS4vNfUtyytQBdFFL/exec";
// Cómo conseguirla: en el editor de Apps Script → Implementar → Administrar
// implementaciones → (el ícono de engranaje/copiar) → "URL de la aplicación web".
// Debe verse algo así: https://script.google.com/macros/s/AKfycb.../exec

/* ============================================================================
   Puente hacia la API — todo lo demás del archivo llama a estas dos funciones
   en vez de a google.script.run directamente.
   ============================================================================ */
async function llamarApi(accion, params) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf("PEGAR_AQUI") === 0) {
    throw new Error("Falta configurar APPS_SCRIPT_URL en script.js con la URL real de tu app web.");
  }
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("api", "1");
  url.searchParams.set("accion", accion);
  Object.keys(params || {}).forEach(k => {
    if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k]);
  });

  let resp;
  try {
    resp = await fetch(url.toString());
  } catch (e) {
    throw new Error("No se pudo conectar con el servidor. Verifique su conexión.");
  }
  let json;
  try {
    json = await resp.json();
  } catch (e) {
    throw new Error("El servidor respondió de forma inesperada.");
  }
  if (!json.ok) throw new Error(json.error || "Ocurrió un error.");
  return json.datos;
}

/* ============================================================================
   Utilidades varias (idénticas a las del Inicio.html original)
   ============================================================================ */
const elAnio = document.getElementById('anio-footer');
if (elAnio) elAnio.textContent = new Date().getFullYear();

function openFolder(id) { document.getElementById('modal-' + id).classList.add('active'); }
function closeFolder(e) { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); }

// "Acceso Personal" no puede hacer document.write con html traído por google.script.run desde
// aquí afuera — en su lugar, simplemente navega a la app web real, que sirve el Login tal como
// siempre lo ha hecho (esta URL, sin "?api=1", cae exactamente en el camino de siempre).
function irALogin() {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf("PEGAR_AQUI") === 0) {
    alert("Falta configurar APPS_SCRIPT_URL en script.js.");
    return;
  }
  const loader = document.getElementById('top-loader');
  if (loader) loader.classList.add('active');
  window.location.href = APPS_SCRIPT_URL;
}

function _escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function _escHtmlCalc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ============================================================================
   Buscador de expedientes — se cargan los criterios activos al abrir la página. Si el
   administrador tiene más de uno activo en Admin → Origen de Datos, aparece el selector
   "Buscar por:"; si solo hay uno, la búsqueda se queda tal como siempre: un campo de texto
   que busca por expediente. Esto se vuelve a consultar cada vez que se carga la página, así
   que si el administrador cambia la configuración, esta página lo refleja de inmediato.
   ============================================================================ */
(async function _criteriosInicializar() {
  try {
    const criterios = await llamarApi('criterios');
    if (!criterios || criterios.length < 2) return; // comportamiento de siempre
    const sel = document.getElementById('criterioBusqueda');
    sel.innerHTML = criterios.map(c => `<option value="${c.clave}">${_escHtmlCalc(c.etiqueta)}</option>`).join('');
    document.getElementById('criterio-wrap').style.display = 'block';
  } catch (e) { /* si falla, la búsqueda se queda tal como siempre fue */ }
})();

function _colorEstado(estado) {
  let bg = "#e0f2fe", txt = "#0369a1";
  const e = (estado || "REGISTRADO").toUpperCase();
  if (e.includes("PENDIENTE") || e.includes("NOTIFICADO")) { bg = "#fef9c3"; txt = "#a16207"; }
  else if (e.includes("OBSERVADO")) { bg = "#fee2e2"; txt = "#991b1b"; }
  else if (e.includes("LISTO") || e.includes("MANDAMIENTO") || e.includes("FINALIZADO") || e.includes("COMPLETO") || e.includes("SUBSANADO")) { bg = "#dcfce7"; txt = "#15803d"; }
  return { bg, txt };
}

function _tarjetaExpediente(res) {
  const { bg, txt } = _colorEstado(res.ESTADO);
  const estado = (res.ESTADO || "REGISTRADO").toUpperCase();
  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; padding:18px 0; border-bottom:1px solid #f1f5f9;">
      <div>
        <h4 style="color:var(--accent); font-size:0.9rem; margin-bottom:12px; font-weight:800; letter-spacing:1px;">EXPEDIENTE LOCALIZADO</h4>
        <div style="font-size: 1rem; line-height:1.8;">
          <p><strong>Número:</strong> ${res.EXP}</p>
          <p><strong>Propietario:</strong> ${res.PROPIETARIO}</p>
          ${res.TRAMITE ? `<p><strong>Tipo de Trámite:</strong> ${res.TRAMITE}</p>` : ''}
          <p><strong>Fecha Ingreso:</strong> ${res.FECHA}</p>
          <p><strong>Ubicación:</strong> ${res.DIRECCION}</p>
        </div>
      </div>
      <div style="padding:10px 20px; background:${bg}; color:${txt}; border-radius:14px; font-weight:800; font-size:0.8rem; text-align:center; min-width:140px;">
        ${estado}
      </div>
    </div>
  `;
}

async function consultar() {
  const val = document.getElementById('expId').value;
  if (!val) return;
  const selCriterio = document.getElementById('criterioBusqueda');
  const criterio = (selCriterio && document.getElementById('criterio-wrap').style.display !== 'none') ? selCriterio.value : 'EXP';
  const box = document.getElementById('res-box');
  box.style.display = 'block';
  box.innerHTML = '<p style="text-align:center;"><i class="fas fa-circle-notch fa-spin"></i> Buscando expediente...</p>';

  try {
    const lista = await llamarApi('buscar', { valor: val, criterio: criterio });
    if (lista && lista.length) {
      box.innerHTML = lista.map(_tarjetaExpediente).join('');
    } else {
      box.innerHTML = '<p style="text-align:center; color:#991b1b; font-weight:600;"><i class="fas fa-circle-exclamation"></i> No se encontró ningún expediente con ese dato.</p>';
    }
  } catch (e) {
    box.innerHTML = '<p style="text-align:center; color:#991b1b; font-weight:600;">' + _escHtmlCalc(e.message) + '</p>';
  }
}

/* ============================================================================
   Calculadora de estimado — misma fórmula real (multa base 1%, inspección por
   zona/tipo de persona, 5% de fiestas exento si hay fianza) que ya calcula el backend en
   calcularEstimadoPublico. Si el administrador la apagó desde Admin, el backend devuelve una
   lista vacía de conceptos y la sección entera se queda oculta.
   ============================================================================ */
let _calcConceptos = [];
let _calcContadorFilas = 0;

(async function _calcInicializar() {
  try {
    const conceptos = await llamarApi('conceptos');
    _calcConceptos = conceptos || [];
    if (!_calcConceptos.length) return; // calculadora apagada, o sin tarifas cargadas
    document.getElementById('calculadora-section').style.display = '';
    _calcAgregarFila();
  } catch (e) { /* si falla, simplemente no se muestra la calculadora */ }
})();

function _calcAgregarFila() {
  const id = 'calc-fila-' + (_calcContadorFilas++);
  const opciones = _calcConceptos.map(c => `<option value="${_escAttr(c.proyecto)}">${_escHtmlCalc(c.proyecto)}</option>`).join('');
  const div = document.createElement('div');
  div.id = id;
  div.className = 'calc-fila';
  div.innerHTML = `
    <select class="calc-select">${opciones}</select>
    <input type="number" min="0" step="any" placeholder="Cantidad" class="calc-input">
    <button type="button" onclick="document.getElementById('${id}').remove()" style="background:#fee2e2; color:#991b1b; border:none; width:38px; height:38px; border-radius:10px; font-weight:700; cursor:pointer; flex-shrink:0;">×</button>
  `;
  document.getElementById('calc-filas').appendChild(div);
}

async function _calcCalcular() {
  const filas = document.querySelectorAll('#calc-filas > div');
  const items = [];
  filas.forEach(fila => {
    const select = fila.querySelector('select');
    const input = fila.querySelector('input');
    if (select.value && input.value) items.push({ proyecto: select.value, cantidad: input.value });
  });
  const cont = document.getElementById('calc-resultado');
  if (!items.length) {
    cont.style.display = 'block';
    cont.innerHTML = '<p style="text-align:center; color:#991b1b; font-weight:600;">Complete al menos un concepto con su cantidad.</p>';
    return;
  }
  const zona = document.getElementById('calc-zona').value;
  if (!zona) {
    cont.style.display = 'block';
    cont.innerHTML = '<p style="text-align:center; color:#991b1b; font-weight:600;">Seleccione la zona (urbana o rural).</p>';
    return;
  }
  const datos = {
    items: items,
    monto: document.getElementById('calc-monto').value,
    zona: zona,
    tipoPersona: document.getElementById('calc-tipoPersona').value
  };

  cont.style.display = 'block';
  cont.innerHTML = '<p style="text-align:center; color:var(--text-muted, #6b7280);">Calculando...</p>';

  try {
    const res = await llamarApi('calcular', { datos: JSON.stringify(datos) });

    const fila = (etiqueta, monto, atenuado) => `<div style="display:flex; justify-content:space-between; font-size:.85rem; padding:6px 0; ${atenuado ? 'color:var(--text-muted, #6b7280);' : 'color:var(--text-header, #111827); font-weight:600;'}">
      <span>${etiqueta}</span><span>$${monto.toFixed(2)}</span>
    </div>`;

    let html = '<div style="border-top:2px solid #f1f5f9; padding-top:14px;">';
    res.desglose.forEach(d => { html += fila(`${_escHtmlCalc(d.proyecto)} (${d.cantidad})`, d.subtotal, true); });
    if (res.multaBase > 0) html += fila('Multa base (1% del presupuesto)', res.multaBase, true);
    html += fila('Total Tasa', res.mult, false);
    html += fila('Inspección' + (res.inspeccion === 0 ? ' (no aplica)' : ''), res.inspeccion, true);
    html += fila('Subtotal', res.subtotal, false);
    html += fila('Fiestas' + (res.hayFianza ? ' (exento por fianza)' : ' (5%)'), res.fiestas, true);
    html += `<div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9; font-size:1.15rem; font-weight:800; color:var(--primary);">
      <span>Total estimado</span><span>$${res.total.toFixed(2)}</span>
    </div></div>`;
    cont.innerHTML = html;
  } catch (e) {
    cont.innerHTML = '<p style="text-align:center; color:#991b1b; font-weight:600;">' + _escHtmlCalc(e.message) + '</p>';
  }
}
