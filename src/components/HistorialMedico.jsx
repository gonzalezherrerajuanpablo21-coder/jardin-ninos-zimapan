import React, { useState, useEffect } from 'react';
import logoZimapanImg from '../assets/LogoZIMAPAN.png';

const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const LogoZimapan = ({ size = 56 }) => (
  <img
    src={logoZimapanImg}
    alt="Escudo Jardín de Niños Zimapán"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      borderRadius: '12px',
      flexShrink: 0
    }}
  />
);

export function HistorialMedico({ usuarioAutenticado }) {
  const usuarioActual =
    usuarioAutenticado ||
    JSON.parse(localStorage.getItem('usuarioAutenticado') || '{}');

  const rolActual = (usuarioActual?.rol || '').toUpperCase();
  const esTutor = rolActual === 'TUTOR';

  const [expedientes, setExpedientes] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [notificacion, setNotificacion] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modal de Credencial / Expediente Formal al dar clic en un alumno
  const [alumnoModal, setAlumnoModal] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const estadoInicialForm = {
    id_alumno: '',
    tipo_sangre: 'O+',
    alergias: '',
    padecimientos: '',
    medicamentos_prohibidos: '',
    seguro_medico: 'IMSS',
    nss_poliza: '',
    hospital_traslado: '',
    contacto_emergencia: '',
    telefono_emergencia: '',
    vacunas_completas: 'Sí',
    autoriza_primeros_auxilios: 'Sí',
    observaciones: ''
  };

  const [form, setForm] = useState(estadoInicialForm);

  const mostrarNotificacion = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => setNotificacion(''), 3500);
  };

  // Cargar todos los alumnos actuales (filtrados si es Tutor)
  const cargarAlumnos = async () => {
    try {
      const params = new URLSearchParams();
      if (esTutor) {
        params.append('rol', 'Tutor');
        if (usuarioActual?.nombre) params.append('nombreTutor', usuarioActual.nombre);
        if (usuarioActual?.id_usuario) params.append('tutorId', usuarioActual.id_usuario);
      }
      const res = await fetch(`/api/alumnos?${params.toString()}`);
      const data = await res.json();
      setAlumnos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
    }
  };

  // Cargar expedientes médicos desde MySQL
  const cargarExpedientes = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (esTutor) {
        params.append('rol', 'Tutor');
        if (usuarioActual?.nombre) params.append('nombreTutor', usuarioActual.nombre);
      }
      const res = await fetch(`/api/historial-medico?${params.toString()}`);
      const data = await res.json();
      setExpedientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar expedientes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlumnos();
    cargarExpedientes();
  }, [rolActual]);

  // Combinar cada alumno actual con su expediente médico (si ya lo tiene)
  const listaUnificada = alumnos.map((al) => {
    const exp = expedientes.find((e) => String(e.id_alumno) === String(al.id_alumno));
    const nombreCompleto = `${al.nombre} ${al.apellido_paterno} ${al.apellido_materno || ''}`.trim();
    return {
      ...al,
      nombreCompleto,
      fotoFinal: exp?.fotoUrl || al.fotoUrl || null,
      expediente: exp || null
    };
  });

  // Abrir formulario precargado para crear o editar el expediente de un alumno
  const abrirFormularioAlumno = (alumnoItem) => {
    const exp = alumnoItem.expediente;
    if (exp) {
      setForm({
        id_alumno: String(alumnoItem.id_alumno),
        tipo_sangre: exp.tipo_sangre || 'O+',
        alergias: exp.alergias || '',
        padecimientos: exp.padecimientos || '',
        medicamentos_prohibidos: exp.medicamentos_prohibidos || '',
        seguro_medico: exp.seguro_medico || 'IMSS',
        nss_poliza: exp.nss_poliza || '',
        hospital_traslado: exp.hospital_traslado || '',
        contacto_emergencia: exp.contacto_emergencia || '',
        telefono_emergencia: exp.telefono_emergencia || '',
        vacunas_completas: exp.vacunas_completas || 'Sí',
        autoriza_primeros_auxilios: exp.autoriza_primeros_auxilios || 'Sí',
        observaciones: exp.observaciones || ''
      });
    } else {
      setForm({
        ...estadoInicialForm,
        id_alumno: String(alumnoItem.id_alumno),
        contacto_emergencia: alumnoItem.tutor || '',
        telefono_emergencia: alumnoItem.telefono_contacto || ''
      });
    }
    setAlumnoModal(null);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_alumno) return;

    const firmaUsuario = usuarioActual?.nombre
      ? `${usuarioActual.nombre} (${usuarioActual.rol || 'Usuario'})`
      : 'Dirección / Tutor';

    try {
      setGuardando(true);
      const res = await fetch('/api/historial-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          actualizado_por: firmaUsuario
        })
      });

      if (res.ok) {
        mostrarNotificacion('Expediente médico guardado correctamente');
        setMostrarFormulario(false);
        await cargarExpedientes();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`No se pudo guardar: ${err.error || 'Error del servidor'}`);
      }
    } catch (error) {
      console.error('Error al guardar expediente médico:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Generar documento PDF formal listo para descargar/imprimir
  const generarPDFExpediente = (item) => {
    const exp = item.expediente || {};
    const fechaEmision = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const ventanaPDF = window.open('', '_blank', 'width=900,height=750');
    if (!ventanaPDF) {
      alert('Por favor permite las ventanas emergentes para generar el PDF.');
      return;
    }

    const fotoHtml = item.fotoFinal
      ? `<img src="${item.fotoFinal}" alt="Foto Alumno" style="width:135px;height:160px;object-fit:cover;border-radius:10px;border:2.5px solid #1e3a8a;" />`
      : `<div style="width:135px;height:160px;border-radius:10px;border:2px dashed #93c5fd;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#1e3a8a;font-weight:bold;font-size:13px;text-align:center;padding:8px;">Sin fotografía registrada</div>`;

    ventanaPDF.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Expediente Médico - ${item.nombreCompleto}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 28px;
            color: #1e293b;
            background: #ffffff;
          }
          .hoja {
            max-width: 780px;
            margin: 0 auto;
            border: 2px solid #1e3a8a;
            border-radius: 14px;
            padding: 24px 28px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #dc2626;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .perfil {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 18px;
          }
          .sangre-badge {
            display: inline-block;
            background: #fef2f2;
            border: 2px solid #dc2626;
            color: #dc2626;
            font-weight: 900;
            font-size: 18px;
            padding: 4px 14px;
            border-radius: 8px;
            margin-top: 6px;
          }
          .seccion-roja {
            background: #fef2f2;
            border: 1.5px solid #fca5a5;
            border-left: 6px solid #dc2626;
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 16px;
          }
          .seccion-azul {
            background: #eff6ff;
            border: 1.5px solid #93c5fd;
            border-left: 6px solid #1d4ed8;
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 16px;
          }
          .titulo-sec {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .fila {
            margin: 6px 0;
            font-size: 14px;
            line-height: 1.45;
          }
          .firmas {
            margin-top: 36px;
            display: flex;
            justify-content: space-around;
            text-align: center;
            font-size: 12px;
            color: #475569;
          }
          .linea-firma {
            width: 220px;
            border-top: 1.5px solid #334155;
            padding-top: 6px;
            margin-top: 36px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="hoja">
          <div class="header">
            <div class="logo-box">
              <img src="${logoZimapanImg}" alt="Escudo Jardín de Niños Zimapán" style="width:68px;height:68px;object-fit:contain;border-radius:10px;" />
              <div>
                <div style="font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;">
                  Unidad de Salud y Primeros Auxilios
                </div>
                <h1 style="margin:2px 0;font-size:20px;color:#1e3a8a;">
                  EXPEDIENTE CLÍNICO ESCOLAR
                </h1>
                <div style="font-size:12px;color:#64748b;">
                  Jardín de Niños Zimapán • Fecha de emisión: ${fechaEmision}
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;font-weight:700;color:#64748b;">FOLIO</div>
              <div style="font-size:16px;font-weight:900;color:#1e3a8a;">
                #${String(item.id_alumno).padStart(4, '0')}
              </div>
            </div>
          </div>

          <div class="perfil">
            <div style="flex:1;">
              <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;">
                Datos de Identificación del Alumno
              </div>
              <h2 style="margin:4px 0 8px 0;font-size:21px;color:#0f172a;">
                ${item.nombreCompleto}
              </h2>
              <div class="fila"><strong>CURP:</strong> ${item.CURP || 'No registrada'}</div>
              <div class="fila"><strong>Tutor Responsable:</strong> ${item.tutor || 'No asignado'}</div>
              <div class="fila"><strong>Servicio Médico:</strong> ${exp.seguro_medico || 'Sin especificar'} ${exp.nss_poliza ? `(NSS/Póliza: ${exp.nss_poliza})` : ''}</div>
              <div class="sangre-badge">Grupo Sanguíneo: ${exp.tipo_sangre || 'No registrado'}</div>
            </div>
            <div>${fotoHtml}</div>
          </div>

          <div class="seccion-roja">
            <div class="titulo-sec" style="color:#b91c1c;">Alertas Médicas Críticas</div>
            <div class="fila"><strong>Alergias conocidas:</strong> ${exp.alergias || 'Ninguna conocida'}</div>
            <div class="fila"><strong>Padecimientos / Condiciones:</strong> ${exp.padecimientos || 'Ninguno'}</div>
            <div class="fila"><strong>Medicamentos prohibidos o de uso frecuente:</strong> ${exp.medicamentos_prohibidos || 'Ninguno'}</div>
          </div>

          <div class="seccion-azul">
            <div class="titulo-sec" style="color:#1e40af;">Protocolo de Emergencia y Traslado</div>
            <div class="fila"><strong>Contacto de Emergencia:</strong> ${exp.contacto_emergencia || 'Sin registrar'}</div>
            <div class="fila"><strong>Teléfono Directo:</strong> <span style="color:#dc2626;font-weight:800;">${exp.telefono_emergencia || 'Sin teléfono'}</span></div>
            <div class="fila"><strong>Hospital / Clínica Autorizada:</strong> ${exp.hospital_traslado || 'Clínica de salud más cercana'}</div>
            <div class="fila">
              <strong>Cartilla de Vacunación Completa:</strong> ${exp.vacunas_completas || 'Sí'} &nbsp;|&nbsp;
              <strong>Autoriza Primeros Auxilios:</strong> ${exp.autoriza_primeros_auxilios || 'Sí'}
            </div>
          </div>

          <div style="border:1px solid #cbd5e1;border-radius:10px;padding:12px 16px;font-size:13.5px;">
            <strong>Observaciones e Indicaciones Pediátricas:</strong>
            <p style="margin:6px 0 0 0;color:#334155;">${exp.observaciones || 'Sin observaciones adicionales.'}</p>
          </div>

          <div style="margin-top:12px;font-size:11.5px;color:#64748b;">
            Información declarada y actualizada por: <strong>${exp.actualizado_por || 'Tutor / Dirección'}</strong>
          </div>

          <div class="firmas">
            <div class="linea-firma">Firma del Padre, Madre o Tutor</div>
            <div class="linea-firma">Sello y Firma Dirección del Plantel</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        </script>
      </body>
      </html>
    `);
    ventanaPDF.document.close();
  };

  const obtenerIniciales = (nombreCompleto = '') => {
    const partes = nombreCompleto.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return 'AL';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  };

  const FotoAlumnoCard = ({ fotoUrl, nombre, width = 64, height = 64, redondo = true }) => {
    const [errorImg, setErrorImg] = useState(false);

    if (fotoUrl && !errorImg) {
      return (
        <img
          src={fotoUrl}
          alt={nombre}
          onError={() => setErrorImg(true)}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            borderRadius: redondo ? '50%' : '14px',
            objectFit: 'cover',
            border: '2.5px solid #1d4ed8',
            flexShrink: 0,
            backgroundColor: '#eff6ff'
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: redondo ? '50%' : '14px',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          border: '2px solid #93c5fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: `${Math.round(width * 0.32)}px`,
          flexShrink: 0
        }}
      >
        {obtenerIniciales(nombre)}
      </div>
    );
  };

  const alumnosFiltrados = listaUnificada.filter((item) =>
    item.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 13px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.92rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px', fontFamily: "'Nunito', sans-serif" }}>
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#1d4ed8',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(29, 78, 216, 0.3)',
          fontWeight: '700',
          zIndex: 1100
        }}>
          {notificacion}
        </div>
      )}

      {/* ENCABEZADO INSTITUCIONAL */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #dbeafe',
        borderLeft: '6px solid #dc2626',
        boxShadow: '0 4px 16px rgba(30, 58, 138, 0.06)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LogoZimapan size={56} />
          <div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              color: '#dc2626'
            }}>
              Unidad de Salud Escolar • Jardín de Niños Zimapán
            </span>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: '#1e3a8a', margin: '2px 0', fontSize: '1.75rem' }}>
              {esTutor ? 'Expediente Médico de Mis Hijos' : 'Expedientes Clínicos por Alumno'}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Haz clic sobre cualquier alumno para abrir su credencial médica formal, editar sus datos o generar su PDF.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(estadoInicialForm);
            setMostrarFormulario(!mostrarFormulario);
          }}
          style={{
            backgroundColor: mostrarFormulario ? '#f1f5f9' : '#1d4ed8',
            color: mostrarFormulario ? '#334155' : '#ffffff',
            border: 'none',
            padding: '11px 18px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: mostrarFormulario ? 'none' : '0 4px 12px rgba(29, 78, 216, 0.25)'
          }}
        >
          {mostrarFormulario ? 'Cerrar Formulario' : '+ Registrar / Actualizar Ficha'}
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE PARA CREAR / EDITAR EXPEDIENTE */}
      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1.5px solid #93c5fd',
            boxShadow: '0 8px 24px rgba(30, 58, 138, 0.08)',
            marginBottom: '28px'
          }}
        >
          <h3 style={{ margin: '0 0 18px 0', color: '#1d4ed8', fontSize: '1.15rem', fontWeight: '800' }}>
            Formulario de Expediente Clínico Escolar
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '18px'
          }}>
            <div>
              <label style={labelStyle}>Alumno *</label>
              <select
                value={form.id_alumno}
                onChange={(e) => {
                  const elegido = listaUnificada.find((x) => String(x.id_alumno) === e.target.value);
                  if (elegido) {
                    abrirFormularioAlumno(elegido);
                  } else {
                    setForm({ ...estadoInicialForm, id_alumno: '' });
                  }
                }}
                required
                style={inputStyle}
              >
                <option value="">Selecciona un alumno...</option>
                {listaUnificada.map((al) => (
                  <option key={al.id_alumno} value={al.id_alumno}>
                    {al.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, color: '#dc2626' }}>Grupo Sanguíneo *</label>
              <select
                value={form.tipo_sangre}
                onChange={(e) => setForm({ ...form, tipo_sangre: e.target.value })}
                style={{
                  ...inputStyle,
                  border: '1.5px solid #fca5a5',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: '800'
                }}
              >
                {TIPOS_SANGRE.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Esquema de Vacunación</label>
              <select
                value={form.vacunas_completas}
                onChange={(e) => setForm({ ...form, vacunas_completas: e.target.value })}
                style={inputStyle}
              >
                <option value="Sí">Cartilla completa (Al corriente)</option>
                <option value="En proceso">En proceso</option>
                <option value="No">Incompleta</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Autoriza Primeros Auxilios</label>
              <select
                value={form.autoriza_primeros_auxilios}
                onChange={(e) => setForm({ ...form, autoriza_primeros_auxilios: e.target.value })}
                style={inputStyle}
              >
                <option value="Sí">Sí, autorizo atención básica</option>
                <option value="No">No, contactar antes</option>
              </select>
            </div>
          </div>

          {/* ALERTAS MÉDICAS */}
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: '800',
              color: '#b91c1c',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Alertas Médicas Críticas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ ...labelStyle, color: '#991b1b' }}>Alergias</label>
                <input
                  type="text"
                  placeholder="Ej. Polen, nueces, penicilina o Ninguna"
                  value={form.alergias}
                  onChange={(e) => setForm({ ...form, alergias: e.target.value })}
                  style={{ ...inputStyle, borderColor: '#fca5a5' }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, color: '#991b1b' }}>Padecimientos / Condiciones</label>
                <input
                  type="text"
                  placeholder="Ej. Asma leve, usa lentes o Ninguno"
                  value={form.padecimientos}
                  onChange={(e) => setForm({ ...form, padecimientos: e.target.value })}
                  style={{ ...inputStyle, borderColor: '#fca5a5' }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, color: '#991b1b' }}>Medicamentos Prohibidos / Uso Frecuente</label>
                <input
                  type="text"
                  placeholder="Ej. No administrar ibuprofeno"
                  value={form.medicamentos_prohibidos}
                  onChange={(e) => setForm({ ...form, medicamentos_prohibidos: e.target.value })}
                  style={{ ...inputStyle, borderColor: '#fca5a5' }}
                />
              </div>
            </div>
          </div>

          {/* SEGURO Y EMERGENCIA */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: '800',
              color: '#1e40af',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Seguro Médico y Contacto de Emergencia
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Servicio Médico</label>
                <select
                  value={form.seguro_medico}
                  onChange={(e) => setForm({ ...form, seguro_medico: e.target.value })}
                  style={inputStyle}
                >
                  <option value="IMSS">IMSS</option>
                  <option value="ISSSTE">ISSSTE</option>
                  <option value="IMSS-Bienestar / SSA">IMSS-Bienestar / SSA</option>
                  <option value="Seguro Privado">Seguro Privado</option>
                  <option value="Ninguno">Sin afiliación</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>NSS / Póliza</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={form.nss_poliza}
                  onChange={(e) => setForm({ ...form, nss_poliza: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hospital de Traslado</label>
                <input
                  type="text"
                  placeholder="Ej. Hospital General de Zimapán"
                  value={form.hospital_traslado}
                  onChange={(e) => setForm({ ...form, hospital_traslado: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Contacto de Emergencia *</label>
                <input
                  type="text"
                  placeholder="Nombre y parentesco"
                  value={form.contacto_emergencia}
                  onChange={(e) => setForm({ ...form, contacto_emergencia: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Teléfono de Emergencia *</label>
                <input
                  type="tel"
                  placeholder="772 123 4567"
                  value={form.telefono_emergencia}
                  onChange={(e) => setForm({ ...form, telefono_emergencia: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Observaciones Médicas</label>
            <textarea
              rows={2}
              placeholder="Indicaciones especiales para docentes..."
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                padding: '11px 22px',
                borderRadius: '10px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar Expediente'}
            </button>
          </div>
        </form>
      )}

      {/* BARRA DE BÚSQUEDA DE ALUMNOS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.2rem', fontFamily: "'Fredoka', sans-serif" }}>
          {esTutor ? 'Alumnos a tu cargo' : `Alumnos Inscritos (${alumnosFiltrados.length})`}
        </h3>

        {!esTutor && (
          <input
            type="text"
            placeholder="Buscar alumno por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #bfdbfe',
              width: '280px',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        )}
      </div>

      {/* CUADRÍCULA DE ALUMNOS ACTUALES (AL DAR CLIC SE ABRE LA CREDENCIAL MÉDICA) */}
      {cargando ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Cargando alumnos...</p>
      ) : alumnosFiltrados.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '30px',
          textAlign: 'center',
          color: '#64748b',
          border: '1px solid #dbeafe'
        }}>
          No se encontraron alumnos registrados.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '16px'
        }}>
          {alumnosFiltrados.map((item) => {
            const tieneExp = Boolean(item.expediente);

            return (
              <div
                key={item.id_alumno}
                onClick={() => setAlumnoModal(item)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '18px',
                  border: tieneExp ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                  borderLeft: `6px solid ${tieneExp ? '#1d4ed8' : '#94a3b8'}`,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 22px rgba(29, 78, 216, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.04)';
                }}
              >
                <FotoAlumnoCard
                  fotoUrl={item.fotoFinal}
                  nombre={item.nombreCompleto}
                  width={62}
                  height={62}
                  redondo={true}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    color: '#1e3a8a',
                    fontSize: '1rem',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.nombreCompleto}
                  </h4>

                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                    Tutor: {item.tutor || 'Sin asignar'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {tieneExp ? (
                      <>
                        <span style={{
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '2px 9px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: '800'
                        }}>
                          Sangre: {item.expediente.tipo_sangre}
                        </span>
                        <span style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 9px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          Ver expediente →
                        </span>
                      </>
                    ) : (
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        padding: '2px 9px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        Sin ficha médica (Clic para crear)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODAL DE TARJETA / CREDENCIAL CLÍNICA FORMAL (LOGO ESQUINA + INFO + FOTO DERECHA)
         ===================================================================== */}
      {alumnoModal && (
        <div
          onClick={() => setAlumnoModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1050
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '2px solid #93c5fd',
              borderTop: '8px solid #dc2626',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.28)',
              padding: '24px 28px'
            }}
          >
            {/* ENCABEZADO CON LOGO DE ZIMAPÁN EN LA ESQUINA */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #eff6ff',
              paddingBottom: '14px',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <LogoZimapan size={54} />
                <div>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    color: '#dc2626',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px'
                  }}>
                    Jardín de Niños Zimapán • Credencial Clínica Oficial
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', color: '#1e3a8a', fontSize: '1.45rem', fontFamily: "'Fredoka', sans-serif" }}>
                    {alumnoModal.nombreCompleto}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAlumnoModal(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* CUERPO TIPO CREDENCIAL: INFORMACIÓN AL LADO IZQUIERDO Y FOTO GRANDE A LA DERECHA */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '22px',
              flexWrap: 'wrap',
              marginBottom: '18px'
            }}>
              {/* COLUMNA IZQUIERDA: TODA LA INFORMACIÓN CLÍNICA */}
              <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.88rem', color: '#334155' }}>
                  <strong>CURP:</strong> {alumnoModal.CURP || 'No registrada'} &nbsp;•&nbsp;{' '}
                  <strong>Seguro:</strong> {alumnoModal.expediente?.seguro_medico || 'Sin registrar'}{' '}
                  {alumnoModal.expediente?.nss_poliza ? `(${alumnoModal.expediente.nss_poliza})` : ''}
                </div>

                {/* Bloque Rojo de Alergias y Padecimientos */}
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderLeft: '5px solid #dc2626',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div>
                    <strong style={{ color: '#b91c1c' }}>Alergias:</strong>{' '}
                    <span style={{ color: '#1e293b' }}>
                      {alumnoModal.expediente?.alergias || 'Sin registrar'}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: '#b91c1c' }}>Padecimientos:</strong>{' '}
                    <span style={{ color: '#1e293b' }}>
                      {alumnoModal.expediente?.padecimientos || 'Ninguno'}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: '#b91c1c' }}>Medicamentos:</strong>{' '}
                    <span style={{ color: '#1e293b' }}>
                      {alumnoModal.expediente?.medicamentos_prohibidos || 'Ninguno'}
                    </span>
                  </div>
                </div>

                {/* Bloque Azul de Emergencia */}
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderLeft: '5px solid #1d4ed8',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '0.88rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <div>
                    <strong>Emergencia:</strong>{' '}
                    {alumnoModal.expediente?.contacto_emergencia || alumnoModal.tutor || 'Sin registrar'} —{' '}
                    <strong style={{ color: '#dc2626' }}>
                      {alumnoModal.expediente?.telefono_emergencia || alumnoModal.telefono_contacto || 'Sin teléfono'}
                    </strong>
                  </div>
                  <div>
                    <strong>Traslado autorizado:</strong>{' '}
                    {alumnoModal.expediente?.hospital_traslado || 'Clínica más cercana'}
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    <strong>Vacunas completas:</strong> {alumnoModal.expediente?.vacunas_completas || 'Sí'} &nbsp;|&nbsp;{' '}
                    <strong>Primeros auxilios:</strong> {alumnoModal.expediente?.autoriza_primeros_auxilios || 'Sí'}
                  </div>
                </div>

                {alumnoModal.expediente?.observaciones && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                    “{alumnoModal.expediente.observaciones}”
                  </p>
                )}
              </div>

              {/* COLUMNA DERECHA: FOTOGRAFÍA GRANDE DEL ALUMNO + GRUPO SANGUÍNEO */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #dbeafe',
                borderRadius: '16px',
                padding: '16px',
                minWidth: '175px'
              }}>
                <FotoAlumnoCard
                  fotoUrl={alumnoModal.fotoFinal}
                  nombre={alumnoModal.nombreCompleto}
                  width={145}
                  height={165}
                  redondo={false}
                />

                <div style={{
                  width: '100%',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #dc2626',
                  color: '#dc2626',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  textAlign: 'center'
                }}>
                  <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    Grupo Sanguíneo
                  </span>
                  <strong style={{ fontSize: '1.25rem' }}>
                    {alumnoModal.expediente?.tipo_sangre || 'N/R'}
                  </strong>
                </div>
              </div>
            </div>

            {/* PIE DEL MODAL: ACTUALIZADO POR + BOTONES DE PDF Y EDITAR */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Actualizado por: <strong>{alumnoModal.expediente?.actualizado_por || 'Pendiente de captura'}</strong>
              </span>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => abrirFormularioAlumno(alumnoModal)}
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #93c5fd',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {alumnoModal.expediente ? 'Editar ficha médica' : 'Completar ficha médica'}
                </button>

                <button
                  type="button"
                  onClick={() => generarPDFExpediente(alumnoModal)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  Generar Documento PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}