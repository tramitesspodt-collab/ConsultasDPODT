function openFolder(id) { document.getElementById('modal-' + id).classList.add('active'); }
function closeFolder(e) { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); }

function buscarExpediente() {
  const raw = document.getElementById('duiInput').value.trim();
  const box = document.getElementById('res-box');
  if(!raw) return;

  // Quitar cualquier caracter que no sea numero (guiones, espacios, puntos, etc.)
  const soloDigitos = raw.replace(/\D/g, '');
  if(!soloDigitos) return;

  // Normalizamos quitando ceros a la izquierda para comparar sin importar el formato guardado en la hoja
  const duiNormalizado = soloDigitos.replace(/^0+/, '') || '0';

  box.style.display = 'block';
  box.classList.remove('fade-in');
  void box.offsetWidth; // Trigger reflow para reiniciar animación
  box.classList.add('fade-in');
  
  box.innerHTML = '<p style="text-align:center; font-size: 0.9rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Consultando base de datos...</p>';

  const sheetId = '1dijmg1eUKdXQgEpRZQYmrLQl8uMqLmqqI1IJdWAaUio';
  const sheetName = 'Respuestas de formulario 2';
  
  // SQL: E(0), G(1), H(2), I(3), K(4), N(5), P(6), T(7), Q(8), U(9), V(10), Y(11), Z(12), AK(13)
  const query = encodeURIComponent(`SELECT E, G, H, I, K, N, P, T, Q, U, V, Y, Z, AK`);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${query}&tqx=responseHandler:procesarRespuesta&_=${Date.now()}`;

  window.duiBuscadoNormalizado = duiNormalizado;

  // Eliminar el script anterior (si existe) para evitar que una respuesta vieja/cacheada sobreescriba la nueva
  const scriptAnterior = document.getElementById('gviz-script');
  if (scriptAnterior) scriptAnterior.remove();

  const script = document.createElement('script');
  script.id = 'gviz-script';
  script.src = url;
  document.body.appendChild(script);
}

window.procesarRespuesta = function(data) {
  const box = document.getElementById('res-box');
  const duiBuscado = window.duiBuscadoNormalizado || '';

  if (data.status === 'error') {
    console.error('Error de Google Sheets:', data.errors);
    box.innerHTML = '<div style="color:#991b1b; text-align:center; padding: 20px; background:#fee2e2; border-radius:14px; font-weight:600;">No se encontraron registros para el DUI ingresado.</div>';
    return;
  }

  console.log('DUI buscado (normalizado):', duiBuscado);
  console.log('Total de filas recibidas de la hoja:', data.table.rows.length);
  console.log('Valores columna N:', data.table.rows.map(r => r.c[5] ? r.c[5].v : null));
  console.log('Valores columna P:', data.table.rows.map(r => r.c[6] ? r.c[6].v : null));
  console.log('Valores columna T:', data.table.rows.map(r => r.c[7] ? r.c[7].v : null));

  // Filtramos en el cliente comparando el DUI normalizado (sin guiones, espacios ni ceros a la izquierda)
  // contra las columnas N, P y T, para que coincida sin importar en cual de las tres este el dato
  const normalizar = (v) => String(v || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
  const filasCoincidentes = data.table.rows.filter(row => {
    const valN = row.c[5] ? row.c[5].v : '';
    const valP = row.c[6] ? row.c[6].v : '';
    const valT = row.c[7] ? row.c[7].v : '';
    return normalizar(valN) === duiBuscado || normalizar(valP) === duiBuscado || normalizar(valT) === duiBuscado;
  });

  if (filasCoincidentes.length === 0) {
    box.innerHTML = '<div style="color:#991b1b; text-align:center; padding: 20px; background:#fee2e2; border-radius:14px; font-weight:600;">No se encontraron registros para el DUI ingresado.</div>';
    return;
  }

  let html = '';
  filasCoincidentes.forEach(row => {
    const c = row.c;
    const getV = (i) => c[i] ? (c[i].f || c[i].v) : '---';
    console.log('Fila completa (raw):', JSON.stringify(row));
    console.log('Celda Y (Area Terreno) indice 11:', c[11]);
    console.log('Celda Z (Area Intervenir) indice 12:', c[12]);
    
    const nExpediente = getV(0);
    const ubicacion = getV(1);
    const tipoProceso = getV(2);
    const fechaIngreso = getV(3);
    const propietario = getV(4);
    const responsable = getV(8);
    const direccion = getV(9);
    const nProyecto = getV(10);
    const areaTerreno = getV(11);
    const areaIntervenir = getV(12);
    const estadoOriginal = getV(13);
    // Quitar tildes/acentos para que la comparacion no falle (ej: "INSPECCIÓN" -> "INSPECCION")
    const estado = estadoOriginal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let stStyle = "background:#e2e8f0; color:#475569;"; // Gris (default / REGISTRADO)
    if(estado.includes("INSPECCIONADO") && estado.includes("MANDAMIENTO")) stStyle = "background:#dbeafe; color:#1e40af;"; // Azul (INSPECCIONADO Y CON MANDAMIENTO)
    else if(estado.includes("MANDAMIENTO")) stStyle = "background:#dcfce7; color:#166534;"; // Verde (MANDAMIENTO GENERADO / MANDAMIENTO DE PAGO GENERADO)
    else if(estado.includes("FINALIZADO")) stStyle = "background:#064e3b; color:#ffffff;"; // Verde fuerte
    else if(estado.includes("PENDIENTE") && estado.includes("INSPECCION")) stStyle = "background:#ffedd5; color:#9a3412;"; // Naranja
    else if(estado.includes("PERMISO PROVISIONAL")) stStyle = "background:#cffafe; color:#155e75;"; // Celeste
    else if(estado.includes("OBSERVADO")) stStyle = "background:#fee2e2; color:#991b1b;"; // Rojo
    else if(estado.includes("INSPECCIONADO")) stStyle = "background:#dbeafe; color:#1e40af;"; // Azul
    else if(estado.includes("REGISTRADO")) stStyle = "background:#e2e8f0; color:#475569;"; // Gris

    html += `
      <div class="result-item">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
          <span style="font-weight:800; color:var(--accent); font-size: 1.1rem;">EXP: ${nExpediente}</span>
          <span class="status-badge" style="${stStyle}">${estadoOriginal.toUpperCase()}</span>
        </div>
        
        <div style="font-size: 0.9rem; color: #1e293b; margin-bottom: 5px;">
          <h4 style="color: #0a2a66; margin-bottom: 8px; text-transform: uppercase;">${nProyecto}</h4>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.85rem;">
          <div><strong>Propietario:</strong><br>${propietario}</div>
          <div><strong>Responsable:</strong><br>${responsable}</div>
          <div><strong>Tipo Proceso:</strong><br>${tipoProceso}</div>
          <div><strong>Fecha Ingreso:</strong><br>${fechaIngreso}</div>
          <div><strong>Área Terreno:</strong><br>${areaTerreno} m²</div>
          <div><strong>Área Intervenir:</strong><br>${areaIntervenir} m²</div>
          <div style="grid-column: span 2;"><strong>Ubicación:</strong><br>${ubicacion}</div>
          <div style="grid-column: span 2; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #edf2f7; transition: 0.3s ease;"><strong>Dirección Notificación:</strong><br>${direccion}</div>
        </div>
      </div>`;
  });
  box.innerHTML = html;
};