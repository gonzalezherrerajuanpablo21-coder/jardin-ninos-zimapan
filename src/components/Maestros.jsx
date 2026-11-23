import React, { useState, useEffect } from 'react';
import logoZimapanImg from '../assets/LogoZIMAPAN.png';

const GRUPOS_DISPONIBLES = [
  '1° A',
  '1° B',
  '2° A',
  '2° B',
  '3° A',
  '3° B',
  'Educación Física / Apoyo',
  'Música / Artes',
  'Sin grupo asignado'
];

const PUESTOS_DOCENTES = [
  'Docente Frente a Grupo',
  'Docente de Educación Física',
  'Docente de Música y Artes',
  'Docente de Inglés',
  'Auxiliar Educativo',
  'Apoyo Psicopedagógico (USAER)'
];

export function Maestros({ usuarioLogueado }) {
  const esDirectorOAdmin = ['DIRECTOR', 'ADMINISTRADOR'].includes(
    (usuarioLogueado?.rol || '').toUpperCase()
  );

  const [maestros, setMaestros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [notificacion, setNotificacion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS');

  const [maestroAEditar, setMaestroAEditar] = useState(null);
  const [maestroAEliminar, setMaestroAEliminar] = useState(null);

  // Estados para fotografía del docente
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState('');

  const estadoInicial = {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    rfc: '',
    nss: '',
    cedula_profesional: '',
    grado_estudios: 'Licenciatura en Educación Preescolar',
    puesto: 'Docente Frente a Grupo',
    grupo_asignado: '1° A',
    tipo_plaza: 'Base',
    fecha_ingreso: '',
    telefono: '',
    correo: '',
    contacto_emergencia: '',
    estatus: 'Activo',
    fotoUrl: ''
  };

  const [form, setForm] = useState(estadoInicial);

  const mostrarNotificacion = (msg) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(''), 3200);
  };

  const cargarMaestros = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/maestros');
      if (res.ok) {
        const data = await res.json();
        setMaestros(Array.isArray(data) ? data : []);
      } else {
        const guardados = JSON.parse(localStorage.getItem('plantilla_maestros_zimapan') || '[]');
        setMaestros(guardados);
      }
    } catch {
      const guardados = JSON.parse(localStorage.getItem('plantilla_maestros_zimapan') || '[]');
      setMaestros(guardados);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMaestros();
  }, []);

  const guardarEnRespaldoLocal = (lista) => {
    setMaestros(lista);
    localStorage.setItem('plantilla_maestros_zimapan', JSON.stringify(lista));
  };

  const handleSeleccionarFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoFoto(file);
    setVistaPreviaFoto(URL.createObjectURL(file));
  };

  const subirFotoAlServidor = async (idDocente, file) => {
    const formData = new FormData();
    formData.append('foto', file);

    const res = await fetch(`/api/maestros/${idDocente}/foto`, {
      method: 'POST',
      body: formData
    });
    return res.ok;
  };

  const handleCambioRapidoFoto = async (idDocente, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ok = await subirFotoAlServidor(idDocente, file);
      if (ok) {
        mostrarNotificacion('FOTOGRAFÍA DEL DOCENTE ACTUALIZADA');
        await cargarMaestros();
        return;
      }
    } catch {
      // Respaldo local en base64 si no hay conexión
    }

    const reader = new FileReader();
    reader.onload = () => {
      const actualizados = maestros.map((m) =>
        (m.id_maestro || m.id) === idDocente ? { ...m, fotoUrl: reader.result } : m
      );
      guardarEnRespaldoLocal(actualizados);
      mostrarNotificacion('FOTOGRAFÍA ACTUALIZADA');
    };
    reader.readAsDataURL(file);
  };

  const handleAbrirNuevo = () => {
    setMaestroAEditar(null);
    setForm(estadoInicial);
    setArchivoFoto(null);
    setVistaPreviaFoto('');
    setMostrarForm(true);
  };

  const handleAbrirEditar = (docente) => {
    setMaestroAEditar(docente.id_maestro || docente.id);
    setForm({
      nombre: docente.nombre || '',
      apellido_paterno: docente.apellido_paterno || '',
      apellido_materno: docente.apellido_materno || '',
      curp: docente.CURP || docente.curp || '',
      rfc: docente.rfc || '',
      nss: docente.nss || '',
      cedula_profesional: docente.cedula_profesional || '',
      grado_estudios: docente.grado_estudios || 'Licenciatura en Educación Preescolar',
      puesto: docente.puesto || 'Docente Frente a Grupo',
      grupo_asignado: docente.grupo_asignado || '1° A',
      tipo_plaza: docente.tipo_plaza || 'Base',
      fecha_ingreso: docente.fecha_ingreso ? docente.fecha_ingreso.slice(0, 10) : '',
      telefono: docente.telefono || '',
      correo: docente.correo || '',
      contacto_emergencia: docente.contacto_emergencia || '',
      estatus: docente.estatus || 'Activo',
      fotoUrl: docente.fotoUrl || ''
    });
    setArchivoFoto(null);
    setVistaPreviaFoto(docente.fotoUrl || '');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const datosLimpios = {
      ...form,
      curp: form.curp.toUpperCase().trim(),
      rfc: form.rfc.toUpperCase().trim(),
      cedula_profesional: form.cedula_profesional.trim()
    };

    try {
      const url = maestroAEditar
        ? `/api/maestros/${maestroAEditar}`
        : '/api/maestros';

      const res = await fetch(url, {
        method: maestroAEditar ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosLimpios)
      });

      if (res.ok) {
        const respuesta = await res.json().catch(() => ({}));
        const idFinal = maestroAEditar || respuesta.id_maestro;

        if (archivoFoto && idFinal) {
          await subirFotoAlServidor(idFinal, archivoFoto);
        }

        mostrarNotificacion(
          maestroAEditar
            ? 'EXPEDIENTE DOCENTE ACTUALIZADO'
            : 'DOCENTE REGISTRADO EN PLANTILLA'
        );
        setMostrarForm(false);
        setMaestroAEditar(null);
        setArchivoFoto(null);
        setVistaPreviaFoto('');
        setForm(estadoInicial);
        await cargarMaestros();
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          alert(`⚠️ ${errData.error}`);
          return;
        }
      }
    } catch {
      // Respaldo local
    }

    const fotoLocal = vistaPreviaFoto || form.fotoUrl || '';
    if (maestroAEditar) {
      const actualizados = maestros.map((m) =>
        (m.id_maestro || m.id) === maestroAEditar
          ? { ...m, ...datosLimpios, CURP: datosLimpios.curp, fotoUrl: fotoLocal }
          : m
      );
      guardarEnRespaldoLocal(actualizados);
      mostrarNotificacion('EXPEDIENTE DOCENTE ACTUALIZADO');
    } else {
      const nuevo = {
        id_maestro: Date.now(),
        ...datosLimpios,
        CURP: datosLimpios.curp,
        fotoUrl: fotoLocal
      };
      guardarEnRespaldoLocal([...maestros, nuevo]);
      mostrarNotificacion('DOCENTE REGISTRADO EN PLANTILLA');
    }

    setMostrarForm(false);
    setMaestroAEditar(null);
    setArchivoFoto(null);
    setVistaPreviaFoto('');
    setForm(estadoInicial);
  };

  const confirmarEliminacion = async () => {
    if (!maestroAEliminar) return;
    const idTarget = maestroAEliminar.id;

    try {
      const res = await fetch(`/api/maestros/${idTarget}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        mostrarNotificacion('DOCENTE ELIMINADO DE LA PLANTILLA');
        setMaestros((prev) => prev.filter((m) => (m.id_maestro || m.id) !== idTarget));
        setMaestroAEliminar(null);
        return;
      }
    } catch {
      // Respaldo local
    }

    const filtrados = maestros.filter((m) => (m.id_maestro || m.id) !== idTarget);
    guardarEnRespaldoLocal(filtrados);
    mostrarNotificacion('DOCENTE ELIMINADO DE LA PLANTILLA');
    setMaestroAEliminar(null);
  };

  // =========================================================================
  // GENERADOR DE FICHA OFICIAL DOCENTE (PDF CON FOTO Y MARCA DE AGUA)
  // =========================================================================
  const generarFichaDocentePDF = (docente) => {
    const nombreCompleto = `${docente.nombre} ${docente.apellido_paterno} ${docente.apellido_materno || ''}`.trim();
    const curpDocente = docente.CURP || docente.curp || 'No registrada';
    const fechaEmision = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const ventanaPDF = window.open('', '_blank', 'width=880,height=740');
    if (!ventanaPDF) {
      alert('Permite las ventanas emergentes para generar la ficha docente en PDF.');
      return;
    }

    ventanaPDF.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Ficha Docente SEP - ${nombreCompleto}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1e293b; background: #fff; }
          .hoja {
            position: relative;
            overflow: hidden;
            max-width: 760px;
            margin: 0 auto;
            border: 2.5px solid #0f514c;
            border-radius: 14px;
            padding: 26px 30px;
          }
          .marca-agua {
            position: absolute;
            top: 52%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 420px;
            height: 420px;
            object-fit: contain;
            opacity: 0.08;
            z-index: 0;
            pointer-events: none;
          }
          .contenido { position: relative; z-index: 1; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1b8a82;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .bloque {
            background: rgba(248, 250, 252, 0.88);
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 14px;
          }
          .bloque-verde {
            background: rgba(240, 253, 250, 0.88);
            border: 1px solid #99f6e4;
            border-left: 6px solid #0f514c;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 14px;
          }
          .titulo-sec {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f514c;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; font-size: 13.5px; }
          .firmas {
            margin-top: 44px;
            display: flex;
            justify-content: space-around;
            text-align: center;
            font-size: 12px;
            color: #475569;
          }
          .linea { width: 220px; border-top: 1.5px solid #334155; padding-top: 6px; margin-top: 36px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="hoja">
          <img src="${logoZimapanImg}" alt="" class="marca-agua" />
          <div class="contenido">
            <div class="header">
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${logoZimapanImg}" alt="Logo Zimapán" style="width:66px;height:66px;object-fit:contain;" />
                <div>
                  <div style="font-size:11px;font-weight:800;color:#1b8a82;text-transform:uppercase;">Plantilla de Personal Docente • CCT 15PJN2565F</div>
                  <h1 style="margin:2px 0;font-size:19px;color:#0f514c;">EXPEDIENTE LABORAL Y PROFESIONAL DOCENTE</h1>
                  <div style="font-size:12px;color:#64748b;">Jardín de Niños "Zimapán" • Emisión: ${fechaEmision}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;font-weight:700;color:#64748b;">GRUPO</div>
                <div style="font-size:16px;font-weight:900;color:#0f514c;">${docente.grupo_asignado || 'N/A'}</div>
              </div>
            </div>

            <div class="bloque">
              <div class="titulo-sec">1. Datos de Identificación Oficial y Fiscal</div>
              <div style="display:flex;align-items:center;gap:16px;">
                ${
                  docente.fotoUrl
                    ? `<img src="${docente.fotoUrl}" alt="${nombreCompleto}" style="width:76px;height:76px;border-radius:12px;object-fit:cover;border:2px solid #0f514c;" />`
                    : ''
                }
                <div style="flex:1;">
                  <h2 style="margin:0 0 10px 0;font-size:20px;color:#0f172a;">${nombreCompleto}</h2>
                  <div class="grid">
                    <div><strong>CURP:</strong> ${curpDocente}</div>
                    <div><strong>RFC (con homoclave):</strong> ${docente.rfc || 'No registrado'}</div>
                    <div><strong>NSS (Seguridad Social):</strong> ${docente.nss || 'No registrado'}</div>
                    <div><strong>Estatus Laboral:</strong> ${docente.estatus || 'Activo'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bloque-verde">
              <div class="titulo-sec">2. Perfil Académico y Registro Profesional (SEP)</div>
              <div class="grid">
                <div><strong>Cédula Profesional:</strong> ${docente.cedula_profesional || 'En trámite / No registrada'}</div>
                <div><strong>Grado de Estudios:</strong> ${docente.grado_estudios || 'Licenciatura'}</div>
                <div><strong>Puesto / Función:</strong> ${docente.puesto || 'Docente Frente a Grupo'}</div>
                <div><strong>Grupo Asignado:</strong> ${docente.grupo_asignado || 'Sin asignar'}</div>
                <div><strong>Tipo de Plaza / Contrato:</strong> ${docente.tipo_plaza || 'Base'}</div>
                <div><strong>Fecha de Ingreso:</strong> ${docente.fecha_ingreso ? docente.fecha_ingreso.slice(0, 10) : 'No especificada'}</div>
              </div>
            </div>

            <div class="bloque">
              <div class="titulo-sec">3. Datos de Contacto y Emergencia</div>
              <div class="grid">
                <div><strong>Teléfono Celular:</strong> ${docente.telefono || 'No registrado'}</div>
                <div><strong>Correo Institucional:</strong> ${docente.correo || 'No registrado'}</div>
                <div style="grid-column:1 / -1;"><strong>Contacto de Emergencia:</strong> ${docente.contacto_emergencia || 'No registrado'}</div>
              </div>
            </div>

            <div class="firmas">
              <div class="linea">Firma del Docente</div>
              <div class="linea">Sello y Firma Dirección del Plantel</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 350); };
        </script>
      </body>
      </html>
    `);
    ventanaPDF.document.close();
  };

  const maestrosFiltrados = maestros.filter((m) => {
    const nombreCompleto = `${m.nombre} ${m.apellido_paterno || ''} ${m.apellido_materno || ''}`.toLowerCase();
    const curpDocente = (m.CURP || m.curp || '').toLowerCase();
    const coincideTexto =
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      (m.cedula_profesional || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      curpDocente.includes(busqueda.toLowerCase()) ||
      (m.rfc || '').toLowerCase().includes(busqueda.toLowerCase());

    const coincideGrupo =
      filtroGrupo === 'TODOS' || (m.grupo_asignado || '') === filtroGrupo;

    return coincideTexto && coincideGrupo;
  });

  const obtenerIniciales = (m) => {
    const n = (m.nombre || 'M')[0];
    const a = (m.apellido_paterno || 'D')[0];
    return `${n}${a}`.toUpperCase();
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#0f514c',
    marginBottom: '4px',
    textTransform: 'uppercase'
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    backgroundColor: '#ffffff'
  };

  return (
    <div style={{ padding: '10px 0', fontFamily: 'sans-serif', backgroundColor: 'transparent', minHeight: '75vh' }}>
      {notificacion && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981',
          color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', zIndex: 99999
        }}>
          ✓ {notificacion}
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {maestroAEliminar && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
            maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.18)'
          }}>
            <h3 style={{ color: '#0f514c', marginTop: 0 }}>¿Dar de baja de plantilla?</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', margin: '14px 0 22px 0' }}>
              ¿Confirmas eliminar el expediente docente de <br />
              <strong style={{ color: '#1b8a82' }}>"{maestroAEliminar.nombre}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={confirmarEliminacion}
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setMaestroAEliminar(null)}
                style={{ backgroundColor: '#cbd5e1', color: '#334155', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.94)', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ color: '#1b8a82', margin: 0 }}>Plantilla Escolar y Expediente Docente</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Registro oficial de docentes: fotografía, CURP, RFC, NSS, Cédula Profesional SEP y asignación de grupos.
            </p>
          </div>

          {!mostrarForm && (
            <button
              onClick={handleAbrirNuevo}
              style={{ backgroundColor: '#1b8a82', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Registrar Docente
            </button>
          )}
        </div>

        {/* FORMULARIO DE ALTA / EDICIÓN CON FOTO Y DATOS DE LEY */}
        {mostrarForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#f8fafc',
              padding: '22px',
              borderRadius: '14px',
              border: '1.5px solid #1b8a82',
              marginBottom: '24px'
            }}
          >
            <h3 style={{ color: '#0f514c', margin: '0 0 16px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>
              {maestroAEditar ? 'Actualizar Expediente Docente' : 'Registro Oficial de Nuevo Docente'}
            </h3>

            {/* SECCIÓN FOTOGRAFÍA DEL DOCENTE */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              flexWrap: 'wrap',
              backgroundColor: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              marginBottom: '18px'
            }}>
              {vistaPreviaFoto ? (
                <img
                  src={vistaPreviaFoto}
                  alt="Vista previa docente"
                  style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1b8a82' }}
                />
              ) : (
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '2px dashed #7dd3fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.78rem',
                  textAlign: 'center',
                  padding: '4px'
                }}>
                  Sin foto
                </div>
              )}

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fotografía Oficial del Docente (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSeleccionarFoto}
                  style={{ fontSize: '0.88rem', color: '#334155' }}
                />
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                  Formatos recomendados: JPG o PNG. Se mostrará en la credencial del módulo y en la Ficha PDF.
                </div>
              </div>
            </div>

            {/* BLOQUE 1: DATOS PERSONALES Y FISCALES DE LEY */}
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1b8a82', marginBottom: '10px', textTransform: 'uppercase' }}>
              1. Identificación Oficial y Datos Fiscales de Ley
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Nombre(s) *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Apellido Paterno *</label>
                <input type="text" value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Apellido Materno</label>
                <input type="text" value={form.apellido_materno} onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CURP (18 caracteres) *</label>
                <input type="text" maxLength="18" placeholder="ABCD900101HDF..." value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>RFC con Homoclave *</label>
                <input type="text" maxLength="13" placeholder="ABCD900101XYZ" value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>NSS (IMSS / ISSSTE)</label>
                <input type="text" maxLength="15" placeholder="11 dígitos" value={form.nss} onChange={(e) => setForm({ ...form, nss: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* BLOQUE 2: DATOS PROFESIONALES SEP Y GRUPO ASIGNADO */}
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1b8a82', marginBottom: '10px', textTransform: 'uppercase' }}>
              2. Cédula Profesional SEP y Asignación de Grupo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Cédula Profesional *</label>
                <input type="text" placeholder="Ej. 12345678" value={form.cedula_profesional} onChange={(e) => setForm({ ...form, cedula_profesional: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Grado Máximo de Estudios *</label>
                <input type="text" placeholder="Lic. en Educación Preescolar" value={form.grado_estudios} onChange={(e) => setForm({ ...form, grado_estudios: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Puesto / Función</label>
                <select value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} style={inputStyle}>
                  {PUESTOS_DOCENTES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, color: '#0284c7' }}>Grupo Asignado *</label>
                <select
                  value={form.grupo_asignado}
                  onChange={(e) => setForm({ ...form, grupo_asignado: e.target.value })}
                  style={{ ...inputStyle, borderColor: '#7dd3fc', backgroundColor: '#f0f9ff', fontWeight: 'bold', color: '#0369a1' }}
                >
                  {GRUPOS_DISPONIBLES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Plaza / Contratación</label>
                <select value={form.tipo_plaza} onChange={(e) => setForm({ ...form, tipo_plaza: e.target.value })} style={inputStyle}>
                  <option value="Base">Base / Definitiva</option>
                  <option value="Interinato">Interinato</option>
                  <option value="Contrato / Honorarios">Contrato / Honorarios</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de Ingreso al Plantel</label>
                <input type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* BLOQUE 3: CONTACTO Y EMERGENCIA */}
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1b8a82', marginBottom: '10px', textTransform: 'uppercase' }}>
              3. Contacto y Emergencia
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Teléfono Celular *</label>
                <input type="tel" placeholder="772 123 4567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo Electrónico</label>
                <input type="email" placeholder="docente@kinderzimapan.edu.mx" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contacto de Emergencia</label>
                <input type="text" placeholder="Nombre y teléfono" value={form.contacto_emergencia} onChange={(e) => setForm({ ...form, contacto_emergencia: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estatus</label>
                <select value={form.estatus} onChange={(e) => setForm({ ...form, estatus: e.target.value })} style={inputStyle}>
                  <option value="Activo">Activo</option>
                  <option value="Licencia / Incapacidad">Licencia / Incapacidad</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setMostrarForm(false);
                  setMaestroAEditar(null);
                  setArchivoFoto(null);
                  setVistaPreviaFoto('');
                }}
                style={{ backgroundColor: '#cbd5e1', color: '#334155', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {maestroAEditar ? 'Guardar Cambios' : 'Guardar Expediente Docente'}
              </button>
            </div>
          </form>
        )}

        {/* BARRA DE BÚSQUEDA Y FILTRO POR GRUPO */}
        {!mostrarForm && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px'
          }}>
            <input
              type="text"
              placeholder="Buscar docente por nombre, cédula, CURP o RFC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: '1 1 260px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />

            <select
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600' }}
            >
              <option value="TODOS">Todos los grupos</option>
              {GRUPOS_DISPONIBLES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f514c', backgroundColor: '#e6f4f2', padding: '6px 12px', borderRadius: '8px' }}>
              Docentes: {maestrosFiltrados.length}
            </span>
          </div>
        )}

        {/* TARJETAS DE LA PLANTILLA DOCENTE */}
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando plantilla docente...</p>
        ) : maestrosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            No hay docentes registrados todavía. Haz clic en <strong>"+ Registrar Docente"</strong> para dar de alta la plantilla.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {maestrosFiltrados.map((m) => {
              const idDocente = m.id_maestro || m.id;
              const nombreCompleto = `${m.nombre} ${m.apellido_paterno || ''} ${m.apellido_materno || ''}`.trim();
              const curpDocente = m.CURP || m.curp || 'N/R';

              return (
                <div
                  key={idDocente}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderTop: '5px solid #0284c7',
                    borderRadius: '14px',
                    padding: '18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    {/* CABECERA DE TARJETA: FOTO O AVATAR + NOMBRE + GRUPO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {m.fotoUrl ? (
                          <img
                            src={m.fotoUrl}
                            alt={nombreCompleto}
                            style={{
                              width: '62px',
                              height: '62px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2.5px solid #0284c7'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '62px',
                            height: '62px',
                            borderRadius: '50%',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '2px solid #7dd3fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '1.15rem'
                          }}>
                            {obtenerIniciales(m)}
                          </div>
                        )}

                        <label
                          title="Cambiar foto del docente"
                          style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-4px',
                            backgroundColor: '#0f514c',
                            color: '#ffffff',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            border: '2px solid #ffffff'
                          }}
                        >
                          📷
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCambioRapidoFoto(idDocente, e)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.05rem' }}>
                          {nombreCompleto}
                        </h4>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.76rem',
                            fontWeight: '800',
                            padding: '2px 9px',
                            borderRadius: '6px'
                          }}>
                            Grupo: {m.grupo_asignado || 'Sin asignar'}
                          </span>
                          <span style={{
                            backgroundColor: m.estatus === 'Activo' ? '#dcfce7' : '#fef3c7',
                            color: m.estatus === 'Activo' ? '#15803d' : '#b45309',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            {m.estatus || 'Activo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DATOS PROFESIONALES Y FISCALES */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.83rem',
                      color: '#334155',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '10px'
                    }}>
                      <div><strong>Cédula Prof.:</strong> <span style={{ color: '#0f514c', fontWeight: '800' }}>{m.cedula_profesional || 'No registrada'}</span></div>
                      <div><strong>Perfil:</strong> {m.grado_estudios || 'Licenciatura'}</div>
                      <div><strong>Puesto:</strong> {m.puesto || 'Docente Frente a Grupo'} ({m.tipo_plaza || 'Base'})</div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div><strong>CURP:</strong> {curpDocente} &nbsp;|&nbsp; <strong>RFC:</strong> {m.rfc || 'N/R'}</div>
                      {m.nss && <div><strong>NSS:</strong> {m.nss}</div>}
                      <div><strong>Teléfono:</strong> {m.telefono || 'Sin teléfono'}</div>
                      {m.correo && <div><strong>Correo:</strong> {m.correo}</div>}
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => generarFichaDocentePDF(m)}
                      style={{
                        flex: 1,
                        backgroundColor: '#0f514c',
                        color: 'white',
                        border: 'none',
                        padding: '7px 10px',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Ficha PDF
                    </button>

                    <button
                      onClick={() => handleAbrirEditar(m)}
                      style={{
                        flex: 1,
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '7px 10px',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Editar
                    </button>

                    {esDirectorOAdmin && (
                      <button
                        onClick={() => setMaestroAEliminar({ id: idDocente, nombre: nombreCompleto })}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '7px 10px',
                          borderRadius: '7px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}