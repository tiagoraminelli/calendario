// ═══════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════
let fechaActual = new Date();
let franjas = [];
let profesionales = [];
let asignacionesMes = {};
let diasDeshabilitados = {};
let patronPorSemana = {};
let semanaActiva = 1;
let colorSeleccionado = null;
let tipoHoraSeleccionado = 'activa';
let editandoProfId = null;
let diaEditandoISO = null;

const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const FERIADOS_FIJOS = ['01-01','03-24','04-02','05-01','05-25','06-20','07-09','12-08','12-25'];

const PALETA_PROF = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

const PALETA_COLORES = [
  { nombre: 'Amarillo', valor: '#fbbf24' }, { nombre: 'Naranja', valor: '#fb923c' },
  { nombre: 'Azul',     valor: '#3b82f6' }, { nombre: 'Índigo',  valor: '#6366f1' },
  { nombre: 'Verde',    valor: '#22c55e' }, { nombre: 'Teal',    valor: '#14b8a6' },
  { nombre: 'Rosa',     valor: '#ec4899' }, { nombre: 'Rojo',    valor: '#ef4444' },
  { nombre: 'Violeta',  valor: '#a855f7' }, { nombre: 'Slate',   valor: '#64748b' }
];

const SABADO_KEY = 'sabado';
const DOMINGO_KEY = 'domingo';

const FRANJAS_DEFAULT = [
  { id: 'activa1', nombre: 'Activa Mañana',   desde: '08:00', hasta: '12:00', color: '#3b82f6', etiqueta: 'ACTIVA', tipo: 'activa', dias: [1,2,3,4,5] },
  { id: 'activa2', nombre: 'Activa Mediodía', desde: '12:00', hasta: '16:00', color: '#0ea5e9', etiqueta: 'ACTIVA', tipo: 'activa', dias: [1,2,3,4,5] },
  { id: 'tomo',    nombre: 'Tomografía',      desde: '08:00', hasta: '12:00', color: '#f59e0b', etiqueta: 'TOMO',   tipo: 'activa', dias: [2,4]       },
  { id: 'pasiva1', nombre: 'Pasiva Tarde',    desde: '16:00', hasta: '20:00', color: '#f97316', etiqueta: 'PASIVA', tipo: 'pasiva', dias: [1,2,3,4,5] },
  { id: 'pasiva2', nombre: 'Pasiva Noche',    desde: '20:00', hasta: '08:00', color: '#7c3aed', etiqueta: 'PASIVA', tipo: 'pasiva', dias: [1,2,3,4,5] }
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const esFeriado = (d) => FERIADOS_FIJOS.includes(`${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
const esFinde = (d) => { const x = d.getDay(); return x === 0 || x === 6; };
const esSabado = (d) => d.getDay() === 6;
const esDomingo = (d) => d.getDay() === 0;
const esc = (s) => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const getProf = (id) => profesionales.find(p => p.id === id);

const diaIdxLunes0 = (date) => {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
};

const diaNumFranja = (date) => {
  const d = date.getDay();
  if (d === 0) return 7;
  return d;
};

const lunesDeSemana = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - diaIdxLunes0(d));
  d.setHours(0,0,0,0);
  return d;
};

function numeroSemanaDelMes(fecha, año, mes) {
  const primerDiaMes = new Date(año, mes, 1);
  const lunesPrimera = lunesDeSemana(primerDiaMes);
  const lunesEsta = lunesDeSemana(fecha);
  const diff = Math.round((lunesEsta - lunesPrimera) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
}

function cantidadSemanasDelMes(año, mes) {
  const ultimoDia = new Date(año, mes + 1, 0);
  return numeroSemanaDelMes(ultimoDia, año, mes);
}

function rangoSemana(año, mes, numSemana) {
  const primerDiaMes = new Date(año, mes, 1);
  const lunesPrimera = lunesDeSemana(primerDiaMes);
  const lunes = new Date(lunesPrimera);
  lunes.setDate(lunes.getDate() + (numSemana - 1) * 7);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  return { lunes, domingo };
}

function formatCorto(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
}

function franjaAplicaDia(franja, diaNum) {
  if (!franja.dias || !Array.isArray(franja.dias)) return true;
  return franja.dias.includes(diaNum);
}

function textoDiasFranja(franja) {
  if (!franja.dias || franja.dias.length === 0 || franja.dias.length === 5) return 'Lun a Vie';
  const map = {1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie'};
  return franja.dias.map(d => map[d] || '').filter(Boolean).join(' ');
}

function calcularHorasFranja(franja) {
  const [h1, m1] = franja.desde.split(':').map(Number);
  const [h2, m2] = franja.hasta.split(':').map(Number);
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minutos <= 0) minutos += 24 * 60;
  return minutos / 60;
}

function abrevFranja(nombre, etiqueta) {
  if (!nombre) return '';
  const n = nombre.toLowerCase();
  if ((etiqueta || '').toUpperCase() === 'PASIVA' || n.includes('pasiva')) {
    if (n.includes('tarde')) return 'T. Pas.';
    if (n.includes('noche')) return 'N. Pas.';
    return 'Pas.';
  }
  if (n.includes('tomo')) return 'Tomo';
  if (n.includes('mañana')) return 'Mañana';
  if (n.includes('tarde')) return 'Tarde';
  if (n.includes('mediodía') || n.includes('mediodia')) return 'Mediodía';
  return nombre.length > 10 ? nombre.substring(0, 9) + '.' : nombre;
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCIA
// ═══════════════════════════════════════════════════════════
const LS = {
  franjas: 'cronograma_franjas',
  profesionales: 'cronograma_profesionales',
  asignaciones: 'cronograma_asignaciones',
  deshabilitados: 'cronograma_dias_deshabilitados',
  patron: 'cronograma_patron_semana'
};

function cargarDatos() {
  try { franjas = JSON.parse(localStorage.getItem(LS.franjas)) || [...FRANJAS_DEFAULT]; } catch(e) { franjas = [...FRANJAS_DEFAULT]; }
  if (!Array.isArray(franjas) || franjas.length === 0) franjas = [...FRANJAS_DEFAULT];

  franjas.forEach(f => {
    if (!Array.isArray(f.dias)) f.dias = [1,2,3,4,5];
    if (!f.tipo) f.tipo = (f.etiqueta === 'PASIVA' || f.id?.includes('Pas') || f.id?.includes('pasiva')) ? 'pasiva' : 'activa';
  });

  try { profesionales = JSON.parse(localStorage.getItem(LS.profesionales)) || []; } catch(e) { profesionales = []; }
  if (!Array.isArray(profesionales)) profesionales = [];

  try { asignacionesMes = JSON.parse(localStorage.getItem(LS.asignaciones)) || {}; } catch(e) { asignacionesMes = {}; }

  try { diasDeshabilitados = JSON.parse(localStorage.getItem(LS.deshabilitados)) || {}; } catch(e) { diasDeshabilitados = {}; }
  if (typeof diasDeshabilitados !== 'object' || Array.isArray(diasDeshabilitados)) diasDeshabilitados = {};

  try { patronPorSemana = JSON.parse(localStorage.getItem(LS.patron)) || {}; } catch(e) { patronPorSemana = {}; }
  if (typeof patronPorSemana !== 'object' || Array.isArray(patronPorSemana)) patronPorSemana = {};
}

const guardar = {
  franjas: () => localStorage.setItem(LS.franjas, JSON.stringify(franjas)),
  profes: () => localStorage.setItem(LS.profesionales, JSON.stringify(profesionales)),
  asig: () => localStorage.setItem(LS.asignaciones, JSON.stringify(asignacionesMes)),
  deshabilitados: () => localStorage.setItem(LS.deshabilitados, JSON.stringify(diasDeshabilitados)),
  patron: () => localStorage.setItem(LS.patron, JSON.stringify(patronPorSemana))
};

// ═══════════════════════════════════════════════════════════
// DÍAS DESHABILITADOS
// ═══════════════════════════════════════════════════════════
function toggleDiaDeshabilitado(iso) {
  if (diasDeshabilitados[iso]) delete diasDeshabilitados[iso];
  else diasDeshabilitados[iso] = true;
  guardar.deshabilitados();
  renderCalendario();
  actualizarBotonToggleDia();
}

function actualizarBotonToggleDia() {
  if (!diaEditandoISO) return;
  const $btn = $('#btn-deshabilitar-dia');
  const $txt = $('#txt-toggle-dia');
  if (diasDeshabilitados[diaEditandoISO]) {
    $btn.addClass('reactivar');
    $txt.text('Reactivar día');
  } else {
    $btn.removeClass('reactivar');
    $txt.text('Deshabilitar día');
  }
}

// ═══════════════════════════════════════════════════════════
// CALENDARIO (pantalla)
// ═══════════════════════════════════════════════════════════
function renderCalendario() {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  $('#titulo-mes').text(`${MESES[mes]} ${año}`);

  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const offset = diaIdxLunes0(primerDia);

  const $cont = $('#grilla-calendario').empty();
  const hoyISO = toISO(new Date());

  const mesAntUltimo = new Date(año, mes, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    $cont.append(crearCelda(new Date(año, mes - 1, mesAntUltimo - i), true, hoyISO));
  }
  const totalDias = ultimoDia.getDate();
  for (let d = 1; d <= totalDias; d++) {
    $cont.append(crearCelda(new Date(año, mes, d), false, hoyISO));
  }
  const restantes = (7 - ($cont.children().length % 7)) % 7;
  for (let i = 1; i <= restantes; i++) {
    $cont.append(crearCelda(new Date(año, mes + 1, i), true, hoyISO));
  }

  renderTablaHoras();
}

function crearCelda(fecha, fueraMes, hoyISO) {
  const iso = toISO(fecha);
  const $celda = $('<div>').addClass('dia-celda').attr('data-fecha', iso);

  if (fueraMes) $celda.addClass('fuera-mes');
  if (esFinde(fecha) && !fueraMes) $celda.addClass('fin-semana');
  if (esFeriado(fecha) && !fueraMes) $celda.addClass('feriado');
  if (iso === hoyISO) $celda.addClass('hoy');
  if (!fueraMes && diasDeshabilitados[iso]) $celda.addClass('deshabilitado');

  const $num = $('<div>').addClass('dia-numero').append($('<span>').text(fecha.getDate()));
  if (!fueraMes && esFeriado(fecha)) {
    $num.append($('<span>').addClass('dia-badge').text('FER'));
  }
  $celda.append($num);

  const $asigs = $('<div>').addClass('dia-asignaciones');

  if (!fueraMes && diasDeshabilitados[iso]) {
    const $tag = $('<div>').addClass('dia-deshabilitado-tag')
      .html('<i class="fa-solid fa-ban text-[7px]"></i> DESHABILITADO');
    $asigs.append($tag);
  } else if (!fueraMes) {
    const asigs = asignacionesMes[iso] || {};

    if (esFinde(fecha)) {
      const key = esSabado(fecha) ? SABADO_KEY : DOMINGO_KEY;
      const colorFinde = esSabado(fecha) ? '#a16207' : '#b91c1c';
      const profId = asigs[key];
      if (profId) {
        const p = getProf(profId);
        if (p) {
          const $chip = $('<div>').addClass('asig-chip finde-chip').css('background', colorFinde);
          $chip.html(`<span><i class="fa-solid fa-clock text-[8px] mr-1"></i>${esc(p.nombre)}</span><span class="franja-mini">24h</span>`);
          $asigs.append($chip);
        }
      }
    } else {
      franjas.forEach(f => {
        const profId = asigs[f.id];
        if (!profId) return;
        const p = getProf(profId);
        if (!p) return;
        const $chip = $('<div>').addClass('asig-chip').css('background', f.color);
        $chip.html(`<span>${esc(p.nombre)}</span><span class="franja-mini">${f.desde}</span>`);
        $asigs.append($chip);
      });
    }
  }

  $celda.append($asigs);

  if (!fueraMes) {
    $celda.on('click', () => abrirModalDia(iso));
  }

  return $celda;
}

function cambiarMes(delta) {
  fechaActual.setMonth(fechaActual.getMonth() + delta);
  renderCalendario();
}

// ═══════════════════════════════════════════════════════════
// PROFESIONALES
// ═══════════════════════════════════════════════════════════
function renderProfesionales() {
  const $cont = $('#lista-profesionales').empty();
  const term = ($('#inp-buscar-prof').val() || '').toLowerCase().trim();
  $('#contador-prof').text(profesionales.length);

  if (profesionales.length === 0) {
    $cont.html(`<div class="text-center py-6 text-slate-400 text-xs">
      <i class="fa-solid fa-user-doctor text-2xl mb-2 block opacity-40"></i>
      No hay profesionales.<br><span class="text-[10px]">Cargá uno con "Nuevo".</span>
    </div>`);
    return;
  }

  const filtrados = profesionales.filter(p =>
    (p.nombre || '').toLowerCase().includes(term) ||
    (p.telefono || '').toLowerCase().includes(term) ||
    (p.observaciones || '').toLowerCase().includes(term)
  );

  if (filtrados.length === 0) {
    $cont.html(`<div class="text-center py-4 text-slate-400 text-xs">Sin resultados</div>`);
    return;
  }

  filtrados.forEach(p => {
    const $card = $(`
      <div class="prof-card">
        <div class="prof-color-bar" style="background:${p.color}"></div>
        <div class="prof-body" data-detalle="${p.id}" style="cursor:pointer" title="Click para ver el detalle">
          <div class="prof-nombre">${esc(p.nombre)}</div>
          ${p.telefono ? `<div class="prof-telefono"><i class="fa-solid fa-phone text-[9px]"></i> ${esc(p.telefono)}</div>` : ''}
          ${p.observaciones ? `<div class="prof-observaciones">${esc(p.observaciones)}</div>` : ''}
        </div>
        <div class="prof-acciones">
          <button class="prof-btn" data-edit="${p.id}" title="Editar"><i class="fa-solid fa-pen text-[10px]"></i></button>
          <button class="prof-btn delete" data-delete="${p.id}" title="Eliminar"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
        </div>
      </div>
    `);
    $cont.append($card);
  });
}

function abrirModalProfesional(id = null) {
  editandoProfId = id;
  if (id) {
    const p = getProf(id);
    if (!p) return;
    $('#titulo-modal-prof').text('Editar Profesional');
    $('#prof-nombre').val(p.nombre || '');
    $('#prof-telefono').val(p.telefono || '');
    $('#prof-observaciones').val(p.observaciones || '');
  } else {
    $('#titulo-modal-prof').text('Nuevo Profesional');
    $('#prof-nombre').val('');
    $('#prof-telefono').val('');
    $('#prof-observaciones').val('');
  }
  $('#modal-profesional').removeClass('hidden');
  setTimeout(() => $('#prof-nombre').focus(), 100);
}

function guardarProfesional() {
  const nombre = $('#prof-nombre').val().trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }

  const datos = {
    nombre: nombre.toUpperCase(),
    telefono: $('#prof-telefono').val().trim(),
    observaciones: $('#prof-observaciones').val().trim()
  };

  if (editandoProfId) {
    const idx = profesionales.findIndex(p => p.id === editandoProfId);
    if (idx >= 0) profesionales[idx] = { ...profesionales[idx], ...datos };
  } else {
    const nuevoId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    profesionales.push({
      id: nuevoId,
      ...datos,
      color: PALETA_PROF[profesionales.length % PALETA_PROF.length]
    });
  }

  guardar.profes();
  renderProfesionales();
  renderCalendario();
  $('#modal-profesional').addClass('hidden');
  editandoProfId = null;
}

function eliminarProfesional(id) {
  const p = getProf(id);
  if (!p) return;
  if (!confirm(`¿Eliminar a "${p.nombre}"?`)) return;
  profesionales = profesionales.filter(x => x.id !== id);
  Object.keys(asignacionesMes).forEach(iso => {
    Object.keys(asignacionesMes[iso]).forEach(fid => {
      if (asignacionesMes[iso][fid] === id) delete asignacionesMes[iso][fid];
    });
    if (Object.keys(asignacionesMes[iso]).length === 0) delete asignacionesMes[iso];
  });
  Object.keys(patronPorSemana).forEach(sem => {
    Object.keys(patronPorSemana[sem]).forEach(fid => {
      if (patronPorSemana[sem][fid] === id) delete patronPorSemana[sem][fid];
    });
  });
  guardar.profes();
  guardar.asig();
  guardar.patron();
  renderProfesionales();
  renderCalendario();
}

// ═══════════════════════════════════════════════════════════
// DETALLE DEL PROFESIONAL
// ═══════════════════════════════════════════════════════════
function abrirDetalleProfesional(id) {
  const p = getProf(id);
  if (!p) return;

  const detalle = calcularDetalleProfesional(id);
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();

  $('#detalle-titulo').text(`${p.nombre} · ${MESES[mes]} ${año}`);

  const $cont = $('#detalle-contenido').empty();

  const $ficha = $(`
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
      <div style="width:8px;height:40px;border-radius:4px;background:${p.color};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.03em;">${esc(p.nombre)}</div>
        ${p.telefono ? `<div style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;margin-top:2px;"><i class="fa-solid fa-phone" style="font-size:9px;opacity:0.6;"></i> ${esc(p.telefono)}</div>` : ''}
        ${p.observaciones ? `<div style="font-size:11px;color:#475569;font-style:italic;margin-top:5px;padding-top:5px;border-top:1px dashed #cbd5e1;">${esc(p.observaciones)}</div>` : ''}
      </div>
    </div>
  `);
  $cont.append($ficha);

  const $cards = $(`
    <div class="detalle-cards">
      <div class="detalle-card activas">
        <div class="label">Horas Activas</div>
        <div class="valor">${detalle.totalActivas}<span class="unidad"> h</span></div>
      </div>
      <div class="detalle-card pasivas">
        <div class="label">Horas Pasivas</div>
        <div class="valor">${detalle.totalPasivas}<span class="unidad"> h</span></div>
      </div>
      <div class="detalle-card total">
        <div class="label">Total</div>
        <div class="valor">${detalle.totalGeneral}<span class="unidad"> h</span></div>
      </div>
    </div>
  `);
  $cont.append($cards);

  const $secSem = $('<div>').append(
    $('<div class="detalle-seccion-titulo">').html('<i class="fa-solid fa-calendar-week"></i> Por Semana')
  );

  let filasSem = '';
  detalle.porSemana.forEach(s => {
    const vacio = s.activas === 0 && s.pasivas === 0;
    filasSem += `<tr>
      <td class="label-col">Semana ${s.numero} <span style="color:#94a3b8;font-size:10px">(${s.rango})</span></td>
      <td class="act ${vacio ? 'vacio' : ''}">${vacio ? '—' : s.activas + ' h'}</td>
      <td class="pas ${vacio ? 'vacio' : ''}">${vacio ? '—' : s.pasivas + ' h'}</td>
      <td class="tot ${vacio ? 'vacio' : ''}">${vacio ? '—' : s.total + ' h'}</td>
    </tr>`;
  });

  $secSem.append(`
    <table class="detalle-tabla">
      <thead>
        <tr>
          <th>Semana</th>
          <th style="text-align:right">Activas</th>
          <th style="text-align:right">Pasivas</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${filasSem}</tbody>
    </table>
  `);
  $cont.append($secSem);

  const $secFranja = $('<div>').append(
    $('<div class="detalle-seccion-titulo">').html('<i class="fa-solid fa-clock"></i> Por Franja')
  );

  let filasFranja = '';
  detalle.porFranja.forEach(f => {
    if (f.cantidad === 0) return;
    filasFranja += `<tr>
      <td class="label-col">${esc(f.nombre)}${f.etiqueta ? ` <span style="font-size:9px;color:#94a3b8">(${esc(f.etiqueta)})</span>` : ''}</td>
      <td style="text-align:right">${f.cantidad}×</td>
      <td class="${f.tipo === 'pasiva' ? 'pas' : 'act'}" style="text-align:right">${f.horas} h</td>
    </tr>`;
  });

  if (!filasFranja) {
    filasFranja = `<tr><td colspan="3" class="text-center text-slate-400 py-4" style="font-family:Inter">Sin asignaciones este mes.</td></tr>`;
  }

  $secFranja.append(`
    <table class="detalle-tabla">
      <thead>
        <tr>
          <th>Franja</th>
          <th style="text-align:right">Veces</th>
          <th style="text-align:right">Horas</th>
        </tr>
      </thead>
      <tbody>${filasFranja}</tbody>
    </table>
  `);
  $cont.append($secFranja);

  $('#modal-detalle-prof').removeClass('hidden');
}

function calcularDetalleProfesional(profId) {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();
  const totalSemanas = cantidadSemanasDelMes(año, mes);

  let totalActivas = 0;
  let totalPasivas = 0;

  const porSemana = [];
  for (let s = 1; s <= totalSemanas; s++) {
    const { lunes, domingo } = rangoSemana(año, mes, s);
    porSemana.push({
      numero: s,
      rango: `${formatCorto(lunes)} - ${formatCorto(domingo)}`,
      activas: 0,
      pasivas: 0,
      total: 0
    });
  }

  const porFranja = {};
  franjas.forEach(f => {
    porFranja[f.id] = {
      nombre: f.nombre,
      etiqueta: f.etiqueta,
      tipo: f.tipo,
      cantidad: 0,
      horas: 0
    };
  });
  porFranja[SABADO_KEY] = { nombre: 'Sábado 24h', etiqueta: 'PASIVA', tipo: 'pasiva', cantidad: 0, horas: 0 };
  porFranja[DOMINGO_KEY] = { nombre: 'Domingo 24h', etiqueta: 'PASIVA', tipo: 'pasiva', cantidad: 0, horas: 0 };

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(año, mes, d);
    const iso = toISO(fecha);
    if (diasDeshabilitados[iso]) continue;

    const asigs = asignacionesMes[iso] || {};
    const numSemana = numeroSemanaDelMes(fecha, año, mes);
    const semIdx = numSemana - 1;

    if (esFinde(fecha)) {
      const key = esSabado(fecha) ? SABADO_KEY : DOMINGO_KEY;
      if (asigs[key] === profId) {
        porSemana[semIdx].pasivas += 24;
        porSemana[semIdx].total += 24;
        totalPasivas += 24;
        porFranja[key].cantidad++;
        porFranja[key].horas += 24;
      }
    } else {
      franjas.forEach(f => {
        if (asigs[f.id] !== profId) return;
        const horas = calcularHorasFranja(f);
        if (f.tipo === 'pasiva') {
          porSemana[semIdx].pasivas += horas;
          totalPasivas += horas;
        } else {
          porSemana[semIdx].activas += horas;
          totalActivas += horas;
        }
        porSemana[semIdx].total += horas;
        porFranja[f.id].cantidad++;
        porFranja[f.id].horas += horas;
      });
    }
  }

  return {
    totalActivas,
    totalPasivas,
    totalGeneral: totalActivas + totalPasivas,
    porSemana,
    porFranja: Object.values(porFranja)
  };
}

// ═══════════════════════════════════════════════════════════
// FRANJAS
// ═══════════════════════════════════════════════════════════
function renderFranjas() {
  const $cont = $('#lista-franjas').empty();
  $('#contador-franjas').text(franjas.length);

  if (franjas.length === 0) {
    $cont.html(`<div class="text-center py-4 text-slate-400 text-xs">Sin franjas</div>`);
    return;
  }

  franjas.forEach(f => {
    const horas = calcularHorasFranja(f);
    const $card = $(`
      <div class="franja-card">
        <div class="franja-color-dot" style="background:${f.color}"></div>
        <div class="franja-info">
          <div class="franja-nombre">
            ${esc(f.nombre)}
            <span class="franja-tipo-badge ${f.tipo}">${f.tipo === 'activa' ? 'ACTIVA' : 'PASIVA'}</span>
          </div>
          <div class="franja-horario">${f.desde} - ${f.hasta} · ${horas}h · ${textoDiasFranja(f)}</div>
        </div>
        <button class="prof-btn delete" data-del-franja="${f.id}" title="Eliminar">
          <i class="fa-solid fa-trash-can text-[10px]"></i>
        </button>
      </div>
    `);
    $cont.append($card);
  });
}

function abrirModalFranja() {
  $('#titulo-modal-franja').text('Nueva Franja');
  $('#franja-nombre').val('');
  $('#franja-etiqueta').val('');
  $('#franja-desde').val('08:00');
  $('#franja-hasta').val('12:00');
  colorSeleccionado = PALETA_COLORES[0].valor;
  tipoHoraSeleccionado = 'activa';

  $('.tipo-check-btn').removeClass('activo');
  $('.tipo-check-btn[data-tipo="activa"]').addClass('activo');
  $('input[name="franja-tipo"][value="activa"]').prop('checked', true);

  $('#franja-dias-container .dia-check-btn').each(function() {
    const dia = Number($(this).data('dia'));
    const activo = dia >= 1 && dia <= 5;
    $(this).toggleClass('activo', activo);
    $(this).find('input').prop('checked', activo);
  });

  renderPaletaColores();
  $('#modal-franja').removeClass('hidden');
}

function renderPaletaColores() {
  const $cont = $('#franja-colores').empty();
  PALETA_COLORES.forEach(c => {
    const $div = $('<div>')
      .addClass('color-opcion' + (colorSeleccionado === c.valor ? ' seleccionado' : ''))
      .css('background', c.valor)
      .attr('title', c.nombre)
      .on('click', () => { colorSeleccionado = c.valor; renderPaletaColores(); });
    $cont.append($div);
  });
}

function guardarFranja() {
  const nombre = $('#franja-nombre').val().trim();
  const desde = $('#franja-desde').val();
  const hasta = $('#franja-hasta').val();
  if (!nombre || !desde || !hasta) { alert('Completá todos los campos.'); return; }

  const diasSel = [];
  $('#franja-dias-container .dia-check-btn').each(function() {
    if ($(this).hasClass('activo')) {
      diasSel.push(Number($(this).data('dia')));
    }
  });

  if (diasSel.length === 0) {
    alert('Seleccioná al menos un día para esta franja.');
    return;
  }

  franjas.push({
    id: 'f_' + Date.now(),
    nombre,
    etiqueta: $('#franja-etiqueta').val().trim(),
    desde, hasta,
    color: colorSeleccionado || '#64748b',
    tipo: tipoHoraSeleccionado,
    dias: diasSel
  });

  guardar.franjas();
  renderFranjas();
  renderCalendario();
  $('#modal-franja').addClass('hidden');
}

function eliminarFranja(id) {
  if (!confirm('¿Eliminar esta franja?')) return;
  franjas = franjas.filter(f => f.id !== id);
  guardar.franjas();
  renderFranjas();
  renderCalendario();
}

// ═══════════════════════════════════════════════════════════
// PATRÓN POR SEMANAS
// ═══════════════════════════════════════════════════════════
function abrirModalPatron() {
  if (profesionales.length === 0) { alert('Cargá al menos un profesional.'); return; }
  semanaActiva = 1;
  renderModalPatron();
  $('#modal-patron').removeClass('hidden');
}

function renderModalPatron() {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const totalSemanas = cantidadSemanasDelMes(año, mes);

  const $sel = $('#selector-semanas').empty();
  for (let s = 1; s <= totalSemanas; s++) {
    const tieneDatos = patronPorSemana[s] && Object.keys(patronPorSemana[s]).length > 0;
    const $btn = $('<button>')
      .addClass('semana-btn' + (s === semanaActiva ? ' activa' : '') + (tieneDatos ? ' tiene-datos' : ''))
      .text('Semana ' + s)
      .on('click', () => { semanaActiva = s; renderModalPatron(); });
    $sel.append($btn);
  }

  const { lunes, domingo } = rangoSemana(año, mes, semanaActiva);
  $('#info-semana').html(`
    <i class="fa-solid fa-calendar-week text-slate-400 mr-1"></i>
    <strong>Semana ${semanaActiva}:</strong>
    del ${formatCorto(lunes)} al ${formatCorto(domingo)}
  `);

  const $cont = $('#contenido-patron').empty();
  const datos = patronPorSemana[semanaActiva] || {};

  const optsProf = (selectedId) => {
    let html = `<option value="">— Sin asignar —</option>`;
    profesionales.forEach(p => {
      html += `<option value="${p.id}" ${selectedId === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`;
    });
    return html;
  };

  let $sec = $(`
    <div class="patron-section">
      <div class="patron-section-title">
        <i class="fa-solid fa-briefcase"></i> Lunes a Viernes
      </div>
    </div>
  `);

  franjas.forEach(f => {
    const selected = datos[f.id] || '';
    const horas = calcularHorasFranja(f);
    const $row = $(`
      <div class="patron-row">
        <div class="patron-franja">
          <div class="patron-color" style="background:${f.color}"></div>
          <div>
            ${esc(f.nombre)}
            <span class="franja-tipo-badge ${f.tipo}">${f.tipo === 'activa' ? 'ACT' : 'PAS'}</span>
            <span class="patron-horario">${f.desde} - ${f.hasta} · ${horas}h · ${textoDiasFranja(f)}</span>
          </div>
        </div>
        <select data-franja="${f.id}">${optsProf(selected)}</select>
      </div>
    `);
    $sec.append($row);
  });
  $cont.append($sec);

  const $sab = $(`
    <div class="patron-section">
      <div class="patron-section-title weekend">
        <i class="fa-solid fa-calendar-day"></i> Sábado (24hs · PASIVA)
      </div>
      <div class="patron-row">
        <div class="patron-franja">
          <div class="patron-color" style="background:#a16207"></div>
          <div>
            SÁBADO
            <span class="patron-horario">00:00 - 24:00 · 24h</span>
          </div>
        </div>
        <select data-franja="${SABADO_KEY}">${optsProf(datos[SABADO_KEY] || '')}</select>
      </div>
    </div>
  `);
  $cont.append($sab);

  const $dom = $(`
    <div class="patron-section">
      <div class="patron-section-title weekend">
        <i class="fa-solid fa-calendar-day"></i> Domingo (24hs · PASIVA)
      </div>
      <div class="patron-row">
        <div class="patron-franja">
          <div class="patron-color" style="background:#b91c1c"></div>
          <div>
            DOMINGO
            <span class="patron-horario">00:00 - 24:00 · 24h</span>
          </div>
        </div>
        <select data-franja="${DOMINGO_KEY}">${optsProf(datos[DOMINGO_KEY] || '')}</select>
      </div>
    </div>
  `);
  $cont.append($dom);

  $cont.find('select').on('change', function() {
    const fid = $(this).data('franja');
    const val = $(this).val();
    if (!patronPorSemana[semanaActiva]) patronPorSemana[semanaActiva] = {};
    if (val) patronPorSemana[semanaActiva][fid] = val;
    else delete patronPorSemana[semanaActiva][fid];
    guardar.patron();
    const tieneDatos = Object.keys(patronPorSemana[semanaActiva]).length > 0;
    $('#selector-semanas .semana-btn').eq(semanaActiva - 1).toggleClass('tiene-datos', tieneDatos);
  });
}

function aplicarPatronAlMes() {
  if (Object.keys(patronPorSemana).length === 0) {
    alert('No hay patrón definido. Cargá al menos una semana.');
    return;
  }

  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(año, mes, d);
    const iso = toISO(fecha);

    if (diasDeshabilitados[iso]) {
      delete asignacionesMes[iso];
      continue;
    }

    const numSemana = numeroSemanaDelMes(fecha, año, mes);
    const patronSem = patronPorSemana[numSemana];
    if (!patronSem) {
      delete asignacionesMes[iso];
      continue;
    }

    asignacionesMes[iso] = {};

    if (esSabado(fecha)) {
      if (patronSem[SABADO_KEY]) asignacionesMes[iso][SABADO_KEY] = patronSem[SABADO_KEY];
    } else if (esDomingo(fecha)) {
      if (patronSem[DOMINGO_KEY]) asignacionesMes[iso][DOMINGO_KEY] = patronSem[DOMINGO_KEY];
    } else {
      const diaNum = diaNumFranja(fecha);
      franjas.forEach(f => {
        if (!franjaAplicaDia(f, diaNum)) return;
        if (patronSem[f.id]) asignacionesMes[iso][f.id] = patronSem[f.id];
      });
    }

    if (Object.keys(asignacionesMes[iso]).length === 0) delete asignacionesMes[iso];
  }

  guardar.asig();
  renderCalendario();
  $('#modal-patron').addClass('hidden');
  alert('✅ Patrón aplicado al mes.');
}

// ═══════════════════════════════════════════════════════════
// EDITAR DÍA
// ═══════════════════════════════════════════════════════════
function abrirModalDia(iso) {
  diaEditandoISO = iso;
  const fecha = new Date(iso + 'T00:00:00');
  const idxDia = diaIdxLunes0(fecha);
  const diaNum = diaNumFranja(fecha);

  $('#titulo-modal-dia').text(`Editar: ${DIAS_SEMANA[idxDia]} ${fecha.getDate()}/${fecha.getMonth()+1}/${fecha.getFullYear()}`);

  const $cont = $('#modal-dia-contenido').empty();
  const asigs = asignacionesMes[iso] || {};

  const optsProf = (selectedId) => {
    let html = `<option value="">— Sin asignar —</option>`;
    profesionales.forEach(p => {
      html += `<option value="${p.id}" ${selectedId === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`;
    });
    return html;
  };

  if (esSabado(fecha)) {
    const $row = $(`
      <div class="dia-franja-row">
        <span class="franja-pill" style="background:#a16207">
          <i class="fa-solid fa-clock text-[9px] mr-1"></i>SÁBADO 24H
        </span>
        <span class="franja-hora-mini">00:00 - 24:00</span>
        <select data-franja="${SABADO_KEY}">${optsProf(asigs[SABADO_KEY] || '')}</select>
      </div>
    `);
    $cont.append($row);
  } else if (esDomingo(fecha)) {
    const $row = $(`
      <div class="dia-franja-row">
        <span class="franja-pill" style="background:#b91c1c">
          <i class="fa-solid fa-clock text-[9px] mr-1"></i>DOMINGO 24H
        </span>
        <span class="franja-hora-mini">00:00 - 24:00</span>
        <select data-franja="${DOMINGO_KEY}">${optsProf(asigs[DOMINGO_KEY] || '')}</select>
      </div>
    `);
    $cont.append($row);
  } else {
    franjas.forEach(f => {
      if (!franjaAplicaDia(f, diaNum)) return;
      const $row = $(`
        <div class="dia-franja-row">
          <span class="franja-pill" style="background:${f.color}">
            ${esc(f.nombre)}
          </span>
          <span class="franja-hora-mini">${f.desde}-${f.hasta}</span>
          <select data-franja="${f.id}">${optsProf(asigs[f.id] || '')}</select>
        </div>
      `);
      $cont.append($row);
    });
  }

  $('#modal-dia').removeClass('hidden');
  actualizarBotonToggleDia();
}

function guardarDiaManual() {
  if (!diaEditandoISO) return;
  const nuevas = {};
  $('#modal-dia-contenido').find('select[data-franja]').each(function() {
    const fid = $(this).data('franja');
    const val = $(this).val();
    if (val) nuevas[fid] = val;
  });

  if (Object.keys(nuevas).length === 0) delete asignacionesMes[diaEditandoISO];
  else asignacionesMes[diaEditandoISO] = nuevas;

  guardar.asig();
  renderCalendario();
  $('#modal-dia').addClass('hidden');
  diaEditandoISO = null;
}

// ═══════════════════════════════════════════════════════════
// CÁLCULO DE HORAS
// ═══════════════════════════════════════════════════════════
function calcularHoras() {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();

  const acum = {};
  profesionales.forEach(p => {
    acum[p.id] = {
      nombre: p.nombre,
      color: p.color,
      guardias: 0,
      horasActivas: 0,
      horasPasivas: 0,
      total: 0
    };
  });

  let totalHoras = 0;

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(año, mes, d);
    const iso = toISO(fecha);
    if (diasDeshabilitados[iso]) continue;

    const asigs = asignacionesMes[iso] || {};

    if (esFinde(fecha)) {
      const key = esSabado(fecha) ? SABADO_KEY : DOMINGO_KEY;
      const profId = asigs[key];
      if (profId && acum[profId]) {
        acum[profId].guardias++;
        acum[profId].horasPasivas += 24;
        acum[profId].total += 24;
        totalHoras += 24;
      }
    } else {
      franjas.forEach(f => {
        const profId = asigs[f.id];
        if (!profId || !acum[profId]) return;
        const horas = calcularHorasFranja(f);
        acum[profId].guardias++;
        if (f.tipo === 'pasiva') {
          acum[profId].horasPasivas += horas;
        } else {
          acum[profId].horasActivas += horas;
        }
        acum[profId].total += horas;
        totalHoras += horas;
      });
    }
  }

  return { acum, totalHoras };
}

// ═══════════════════════════════════════════════════════════
// TABLA HORAS
// ═══════════════════════════════════════════════════════════
function renderTablaHoras() {
  const { acum, totalHoras } = calcularHoras();

  const $tbody = $('#tabla-horas').empty();
  let hayDatos = false;

  Object.keys(acum).forEach(pid => {
    const a = acum[pid];
    if (a.total === 0) return;
    hayDatos = true;

    const $tr = $(`
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <span style="width:10px;height:10px;border-radius:50%;background:${a.color};display:inline-block"></span>
            <span class="font-semibold text-slate-700">${esc(a.nombre)}</span>
          </div>
        </td>
        <td class="text-center font-mono">${a.guardias}</td>
        <td class="text-center font-mono horas-activas">${a.horasActivas} h</td>
        <td class="text-center font-mono horas-pasivas">${a.horasPasivas} h</td>
        <td class="text-center font-mono horas-total">${a.total} h</td>
      </tr>
    `);
    $tbody.append($tr);
  });

  if (!hayDatos) {
    $tbody.html(`<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">Sin guardias asignadas. Definí el patrón semanal.</td></tr>`);
  }

  $('#total-horas').text(totalHoras + ' h');
}

// ═══════════════════════════════════════════════════════════
// EXPORT / IMPORT / LIMPIAR
// ═══════════════════════════════════════════════════════════
function exportarJSON() {
  const data = { franjas, profesionales, asignacionesMes, diasDeshabilitados, patronPorSemana };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const $a = $('<a>').attr({ href: url, download: `cronograma_${toISO(new Date())}.json` });
  $('body').append($a);
  $a[0].click();
  $a.remove();
  URL.revokeObjectURL(url);
}

function importarJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.franjas) franjas = data.franjas;
      if (data.profesionales) profesionales = data.profesionales;
      if (data.asignacionesMes) asignacionesMes = data.asignacionesMes;
      if (data.diasDeshabilitados) diasDeshabilitados = data.diasDeshabilitados;
      if (data.patronPorSemana) patronPorSemana = data.patronPorSemana;

      franjas.forEach(f => {
        if (!Array.isArray(f.dias)) f.dias = [1,2,3,4,5];
        if (!f.tipo) f.tipo = 'activa';
      });

      guardar.franjas(); guardar.profes(); guardar.asig();
      guardar.deshabilitados(); guardar.patron();

      renderFranjas();
      renderProfesionales();
      renderCalendario();
      alert('Datos importados correctamente.');
    } catch(err) {
      alert('Error al leer el archivo.');
    }
  };
  reader.readAsText(file);
}

function limpiarMesActual() {
  if (!confirm('¿Borrar todas las asignaciones del mes actual?')) return;
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();
  for (let d = 1; d <= ultimoDia; d++) {
    delete asignacionesMes[toISO(new Date(año, mes, d))];
  }
  guardar.asig();
  renderCalendario();
}

// ═══════════════════════════════════════════════════════════
// IMPRESIÓN
// ═══════════════════════════════════════════════════════════
function imprimirContenido(html) {
  $('#print-container').html(html);
  document.body.classList.add('printing');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing');
      $('#print-container').empty();
    }, 300);
  }, 100);
}

function headerImpresion(titulo) {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  return `
    <div class="print-header">
      <img src="hospital.png" alt="Hospital">
      <div class="print-header-center">
        <h1>${esc(titulo)}</h1>
        <h2>Hospital San Cristóbal "Julio C. Villanueva"</h2>
        <span class="print-periodo">${MESES[mes]} ${año}</span>
      </div>
      <img src="santa fe.webp" alt="Santa Fe">
    </div>
  `;
}

// ─── PLANILLA ───
function imprimirPlanilla() {
  $('#print-menu').addClass('hidden');
  if (profesionales.length === 0) { alert('Cargá al menos un profesional.'); return; }

  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();

  let filas = '';
  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(año, mes, d);
    const iso = toISO(fecha);
    const diaSem = fecha.getDay();
    if (diaSem === 0 || diaSem === 6) continue;

    const deshab = diasDeshabilitados[iso];
    const asigs = asignacionesMes[iso] || {};
    const fer = esFeriado(fecha);
    const clasesDia = ['dia'];
    if (fer) clasesDia.push('dia-fer');

    filas += `<tr class="${deshab ? 'deshabilitado' : ''}">`;
    filas += `<td class="${clasesDia.join(' ')}">${d}</td>`;
    if (deshab) {
      filas += `<td colspan="${franjas.length}" class="vacio">DÍA DESHABILITADO</td>`;
    } else {
      franjas.forEach(f => {
        const profId = asigs[f.id];
        const prof = profId ? getProf(profId) : null;
        const aplica = franjaAplicaDia(f, diaNumFranja(fecha));
        if (!aplica) filas += `<td class="vacio">—</td>`;
        else if (prof) filas += `<td class="nombre">${esc(prof.nombre)}</td>`;
        else filas += `<td class="vacio">s/a</td>`;
      });
    }
    filas += `</tr>`;
  }

  let headers = '';
  franjas.forEach(f => {
    const h = calcularHorasFranja(f);
    headers += `<th>${esc(f.nombre)}<span class="th-sub">${f.desde}-${f.hasta} · ${h}h</span></th>`;
  });

  let sabItems = '', domItems = '';
  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(año, mes, d);
    const iso = toISO(fecha);
    const deshab = diasDeshabilitados[iso];
    const asigs = asignacionesMes[iso] || {};

    if (esSabado(fecha)) {
      const p = asigs[SABADO_KEY] ? getProf(asigs[SABADO_KEY]) : null;
      const nombre = deshab ? 'DESHAB' : (p ? p.nombre : 's/a');
      sabItems += `<div class="print-finde-item ${!p && !deshab ? 'vacio' : ''}">
        <span class="dia-num">${d}</span>
        <span class="dia-nombre">${esc(nombre)}</span>
      </div>`;
    } else if (esDomingo(fecha)) {
      const p = asigs[DOMINGO_KEY] ? getProf(asigs[DOMINGO_KEY]) : null;
      const nombre = deshab ? 'DESHAB' : (p ? p.nombre : 's/a');
      domItems += `<div class="print-finde-item ${!p && !deshab ? 'vacio' : ''}">
        <span class="dia-num">${d}</span>
        <span class="dia-nombre">${esc(nombre)}</span>
      </div>`;
    }
  }

  const { acum, totalHoras } = calcularHoras();
  let filasResumen = '';
  Object.keys(acum).forEach(pid => {
    const a = acum[pid];
    if (a.total === 0) return;
    const prof = getProf(pid);
    const tel = prof?.telefono ? `<span class="print-resumen-tel">${esc(prof.telefono)}</span>` : '';
    filasResumen += `<tr>
      <td class="nombre-col">${esc(a.nombre)}${tel}</td>
      <td class="num">${a.guardias}</td>
      <td class="num act">${a.horasActivas} h</td>
      <td class="num pas">${a.horasPasivas} h</td>
      <td class="num tot">${a.total} h</td>
    </tr>`;
  });

  const html = `
    <div class="print-page">
      ${headerImpresion('Cronograma de Rayos')}

      <div class="print-section-title">Planilla del Mes — Lunes a Viernes</div>
      <table class="print-tabla">
        <thead>
          <tr>
            <th style="width:26px">Día</th>
            ${headers}
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div class="print-section-title">Sábados y Domingos (24hs Pasivas)</div>
      <div class="print-finde-grid">
        <div class="print-finde-card">
          <div class="print-finde-card-title">Sábados</div>
          <div class="print-finde-list">${sabItems}</div>
        </div>
        <div class="print-finde-card">
          <div class="print-finde-card-title">Domingos</div>
          <div class="print-finde-list">${domItems}</div>
        </div>
      </div>

      <div class="print-resumen">
        <div class="print-section-title">Resumen de Horas por Profesional</div>
        <table>
          <thead>
            <tr>
              <th>Profesional</th>
              <th class="num">Guardias</th>
              <th class="num">Activas</th>
              <th class="num">Pasivas</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasResumen}
            <tr class="total-general">
              <td colspan="4" style="text-align:right">Total Mes</td>
              <td class="num">${totalHoras} h</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="print-footer">
        <span>Documento generado automáticamente</span>
        <span>${new Date().toLocaleDateString('es-AR')}</span>
      </div>
    </div>
  `;

  imprimirContenido(html);
}

// ─── CALENDARIO VISUAL ───
function imprimirCalendario() {
  $('#print-menu').addClass('hidden');
  if (profesionales.length === 0) { alert('Cargá al menos un profesional.'); return; }

  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const offset = diaIdxLunes0(primerDia);

  const celdas = [];
  const mesAntUltimo = new Date(año, mes, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    celdas.push({ fecha: new Date(año, mes - 1, mesAntUltimo - i), fuera: true });
  }
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    celdas.push({ fecha: new Date(año, mes, d), fuera: false });
  }
  const totalCeldas = offset + ultimoDia.getDate();
  const restantes = (7 - (totalCeldas % 7)) % 7;
  for (let i = 1; i <= restantes; i++) {
    celdas.push({ fecha: new Date(año, mes + 1, i), fuera: true });
  }

  let gridHTML = '';
  ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'].forEach(d => {
    gridHTML += `<div class="print-cal2-header">${d}</div>`;
  });

  celdas.forEach(c => {
    const iso = toISO(c.fecha);
    const diaSem = c.fecha.getDay();
    const esFindeDia = diaSem === 0 || diaSem === 6;
    const esFer = esFeriado(c.fecha);
    const deshab = diasDeshabilitados[iso];

    const clases = ['print-cal2-celda'];
    if (c.fuera) clases.push('fuera');
    if (esFindeDia && !c.fuera) clases.push('finde');
    if (esFer && !c.fuera) clases.push('feriado');
    if (deshab) clases.push('deshab');

    let contenido = `<div class="print-cal2-num">${c.fecha.getDate()}</div>`;

    if (!c.fuera && !deshab) {
      const asigs = asignacionesMes[iso] || {};

      if (esFindeDia) {
        const key = esSabado(c.fecha) ? SABADO_KEY : DOMINGO_KEY;
        const colorFinde = esSabado(c.fecha) ? '#a16207' : '#b91c1c';
        const profId = asigs[key];
        if (profId) {
          const p = getProf(profId);
          if (p) {
            const etiqFinde = esSabado(c.fecha) ? 'Sábado' : 'Domingo';
            contenido += `
              <div class="print-cal2-bloque">
                <div class="print-cal2-head">
                  <span class="print-cal2-bullet" style="background:${colorFinde};"></span>
                  <span class="print-cal2-etiqueta">${etiqFinde}</span>
                </div>
                <div class="print-cal2-nombre">${esc(p.nombre)}</div>
              </div>`;
          }
        }
      } else {
        franjas.forEach(f => {
          if (!franjaAplicaDia(f, diaNumFranja(c.fecha))) return;
          const profId = asigs[f.id];
          if (!profId) return;
          const p = getProf(profId);
          if (!p) return;
          const abrev = abrevFranja(f.nombre, f.etiqueta);
          contenido += `
            <div class="print-cal2-bloque">
              <div class="print-cal2-head">
                <span class="print-cal2-bullet" style="background:${f.color};"></span>
                <span class="print-cal2-etiqueta">${esc(abrev)}</span>
                <span class="print-cal2-horario">(${f.desde}-${f.hasta})</span>
              </div>
              <div class="print-cal2-nombre">${esc(p.nombre)}</div>
            </div>`;
        });
      }
    } else if (!c.fuera && deshab) {
      contenido += `<div class="print-cal2-deshab">DESHAB.</div>`;
    }

    gridHTML += `<div class="${clases.join(' ')}">${contenido}</div>`;
  });

  const htmlFinal = `
    <div class="print-page print-page-calendario">
      ${headerImpresion('Calendario de Rayos')}
      <div class="print-cal2-grid">
        ${gridHTML}
      </div>
      <div class="print-footer">
        <span>Documento generado automáticamente</span>
        <span>${new Date().toLocaleDateString('es-AR')}</span>
      </div>
    </div>
  `;

  imprimirContenido(htmlFinal);
}

// ─── PROFESIONALES ───
function imprimirProfesionales() {
  $('#print-menu').addClass('hidden');
  if (profesionales.length === 0) { alert('Cargá al menos un profesional.'); return; }

  const { acum } = calcularHoras();

  let tarjetas = '';
  profesionales.forEach(p => {
    const a = acum[p.id] || { guardias: 0, horasActivas: 0, horasPasivas: 0, total: 0 };
    const obs = p.observaciones ? `<div class="print-prof-obs">${esc(p.observaciones)}</div>` : '';
    tarjetas += `
      <div class="print-prof-card">
        <div class="print-prof-color" style="background:${p.color}"></div>
        <div class="print-prof-info">
          <div class="print-prof-nombre">${esc(p.nombre)}</div>
          ${p.telefono ? `<div class="print-prof-tel"><i class="fa-solid fa-phone"></i> ${esc(p.telefono)}</div>` : ''}
          ${obs}
        </div>
        <div class="print-prof-horas">
          <div><span class="act">${a.horasActivas}h act</span></div>
          <div><span class="pas">${a.horasPasivas}h pas</span></div>
          <div class="print-prof-total">${a.total}h</div>
        </div>
      </div>
    `;
  });

  const html = `
    <div class="print-page">
      ${headerImpresion('Profesionales del Servicio')}
      <div class="print-section-title">Listado, Datos y Horas del Mes</div>
      <div class="print-prof-grid">
        ${tarjetas}
      </div>
      <div class="print-footer">
        <span>Documento generado automáticamente</span>
        <span>${new Date().toLocaleDateString('es-AR')}</span>
      </div>
    </div>
  `;

  imprimirContenido(html);
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
$(document).ready(function() {

  cargarDatos();
  renderFranjas();
  renderProfesionales();
  renderCalendario();

  $('#btn-mes-ant').on('click', () => cambiarMes(-1));
  $('#btn-mes-sig').on('click', () => cambiarMes(1));
  $('#btn-hoy').on('click', () => { fechaActual = new Date(); renderCalendario(); });

  $('#btn-nuevo-prof').on('click', () => abrirModalProfesional());
  $('#btn-guardar-prof').on('click', guardarProfesional);
  $('#inp-buscar-prof').on('input', renderProfesionales);

  $(document).on('click', '[data-detalle]', function() {
    abrirDetalleProfesional($(this).data('detalle'));
  });
  $(document).on('click', '[data-edit]', function() { abrirModalProfesional($(this).data('edit')); });
  $(document).on('click', '[data-delete]', function() { eliminarProfesional($(this).data('delete')); });

  $('#btn-nueva-franja').on('click', abrirModalFranja);
  $('#btn-guardar-franja').on('click', guardarFranja);
  $(document).on('click', '[data-del-franja]', function() { eliminarFranja($(this).data('del-franja')); });

  $(document).on('click', '.dia-check-btn', function(e) {
    e.preventDefault();
    const $inp = $(this).find('input');
    const nuevoEstado = !$(this).hasClass('activo');
    $(this).toggleClass('activo', nuevoEstado);
    $inp.prop('checked', nuevoEstado);
  });

  $(document).on('click', '.tipo-check-btn', function(e) {
    e.preventDefault();
    $('.tipo-check-btn').removeClass('activo');
    $(this).addClass('activo');
    $(this).find('input').prop('checked', true);
    tipoHoraSeleccionado = $(this).data('tipo');
  });

  $('#btn-patron').on('click', abrirModalPatron);
  $('#btn-aplicar-semana').on('click', aplicarPatronAlMes);

  $('#btn-guardar-dia').on('click', guardarDiaManual);
  $('#btn-restaurar-dia').on('click', () => {
    if (!diaEditandoISO) return;
    if (!confirm('¿Restaurar este día? Se borrará la edición manual.')) return;
    delete asignacionesMes[diaEditandoISO];
    guardar.asig();
    renderCalendario();
    $('#modal-dia').addClass('hidden');
    diaEditandoISO = null;
  });
  $('#btn-deshabilitar-dia').on('click', () => {
    if (!diaEditandoISO) return;
    toggleDiaDeshabilitado(diaEditandoISO);
  });

  $('[data-close]').on('click', function() {
    $('#' + $(this).data('close')).addClass('hidden');
  });
  $('.modal-overlay').on('click', function(e) {
    if (e.target === this) $(this).addClass('hidden');
  });

  $('#btn-menu-pdf').on('click', function(e) {
    e.stopPropagation();
    $('#print-menu').toggleClass('hidden');
  });
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#print-menu-wrapper').length) {
      $('#print-menu').addClass('hidden');
    }
  });

  $('[data-action="print-planilla"]').on('click', () => imprimirPlanilla());
  $('[data-action="print-calendario"]').on('click', () => imprimirCalendario());
  $('[data-action="print-profesionales"]').on('click', () => imprimirProfesionales());
  $('[data-action="exportar-json"]').on('click', () => { exportarJSON(); $('#print-menu').addClass('hidden'); });
  $('[data-action="importar-json"]').on('click', () => { $('#file-import').click(); $('#print-menu').addClass('hidden'); });
  $('[data-action="limpiar-mes"]').on('click', () => { limpiarMesActual(); $('#print-menu').addClass('hidden'); });

  $('#file-import').on('change', function(e) {
    if (e.target.files[0]) importarJSON(e.target.files[0]);
    $(this).val('');
  });

  console.log('✅ Cronograma Rayos listo');
});
