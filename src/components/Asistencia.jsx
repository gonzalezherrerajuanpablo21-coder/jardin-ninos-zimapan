import React, { useState, useEffect } from 'react';

export function Asistencia({ usuarioAutenticado }) {
  const usuarioActual =
    usuarioAutenticado ||
    JSON.parse(localStorage.getItem('usuarioAutenticado') || '{}');

  const rolActual = (usuarioActual?.rol || '').toUpperCase();
  const esTutor = rolActual === 'TUTOR';

  const [asistencias, setAsistencias] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    id_alumno: '',
    fecha: new Date().toISOString().split('T')[0],
    estatus: 'Presente'
  });

  // Estados para el Modal de Justificante (Exclusivo Tutores)
  const [registroAJustificar, setRegistroAJustificar] = useState(null);
  const [razonJustificante, setRazonJustificante] = useState('');
  const [archivoJustificante, setArchivoJustificante] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [notificacion, setNotificacion] = useState('');

  // Estados para "No estoy de acuerdo" (Aclaración del Tutor)
  const [desacuerdoId, setDesacuerdoId] = useState(null);
  const [textoDesacuerdo, setTextoDesacuerdo] = useState('');

  const mostrarNotificacion = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => setNotificacion(''), 3500);
  };

  // Cargar asistencias desde MySQL
  const cargarAsistencias = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (esTutor) {
        params.append('rol', 'Tutor');
        if (usuarioActual?.nombre) params.append('nombreTutor', usuarioActual.nombre);
      }

      const res = await fetch(`/api/asistencias?${params.toString()}`);
      const data = await res.json();
      setAsistencias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
    } finally {
      setCargando(false);
    }
  };

  // Cargar lista de alumnos para el selector del Docente/Director
  const cargarAlumnos = async () => {
    if (esTutor) return;
    try {
      const res = await fetch('/api/alumnos');
      const data = await res.json();
      setAlumnos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
    }
  };

  useEffect(() => {
    cargarAsistencias();
    cargarAlumnos();
  }, [rolActual]);

  // Guardar pase de asistencia en MySQL (Docente / Director)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_alumno) return;

    try {
      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setForm({
          id_alumno: '',
          fecha: new Date().toISOString().split('T')[0],
          estatus: 'Presente'
        });
        mostrarNotificacion('Asistencia registrada en la base de datos');
        cargarAsistencias();
      }
    } catch (error) {
      console.error('Error al guardar asistencia:', error);
    }
  };

  // Respuesta rápida del Tutor ("Estoy de acuerdo / Enterada" o "No estoy de acuerdo")
  const handleRespuestaTutor = async (idAsistencia, textoRespuesta) => {
    try {
      setEnviando(true);
      const res = await fetch(`/api/asistencias/${idAsistencia}/responder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuesta: textoRespuesta })
      });

      if (res.ok) {
        setDesacuerdoId(null);
        setTextoDesacuerdo('');
        mostrarNotificacion('Tu respuesta ha sido enviada al plantel');
        cargarAsistencias();
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
    } finally {
      setEnviando(false);
    }
  };

  // Abrir modal para justificar falta (Tutor)
  const abrirModalJustificante = (registro) => {
    setRegistroAJustificar(registro);
    setRazonJustificante(
      registro.razon && !registro.razon.startsWith('Tutor:') ? registro.razon : ''
    );
    setArchivoJustificante(null);
  };

  // Enviar archivo al servidor con FormData (Tutor)
  const handleGuardarJustificante = async (e) => {
    e.preventDefault();
    if (!archivoJustificante || !registroAJustificar) return;

    const formData = new FormData();
    formData.append('justificante', archivoJustificante);
    formData.append('razon', razonJustificante || 'Justificante adjunto por tutor');

    try {
      setEnviando(true);
      const res = await fetch(
        `/api/asistencias/${registroAJustificar.id_asistencias}/justificar`,
        {
          method: 'PUT',
          body: formData
        }
      );

      if (res.ok) {
        setRegistroAJustificar(null);
        setRazonJustificante('');
        setArchivoJustificante(null);
        mostrarNotificacion('Justificante guardado y falta actualizada');
        cargarAsistencias();
      }
    } catch (error) {
      console.error('Error al subir justificante:', error);
    } finally {
      setEnviando(false);
    }
  };

  const obtenerEstiloEstatus = (estatus) => {
    if (estatus === 'Presente') {
      return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    }
    if (estatus === 'Ausente') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
    }
    return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  };

  const obtenerIniciales = (nombreCompleto = '') => {
    const partes = nombreCompleto.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return 'AL';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  };

  const AvatarAlumno = ({ fotoUrl, nombre, size = 44 }) => {
    const [errorImg, setErrorImg] = useState(false);

    if (fotoUrl && !errorImg) {
      return (
        <img
          src={fotoUrl}
          alt={nombre}
          onError={() => setErrorImg(true)}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #1b8a82',
            flexShrink: 0
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: '#e6f4f2',
          color: '#0f514c',
          border: '2px solid #99f6e4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: `${Math.round(size * 0.36)}px`,
          flexShrink: 0
        }}
      >
        {obtenerIniciales(nombre)}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px', fontFamily: "'Nunito', sans-serif" }}>
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0f514c',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
          fontWeight: '700',
          zIndex: 1000
        }}>
          {notificacion}
        </div>
      )}

      {/* ENCABEZADO */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: '#0f514c', margin: 0, fontSize: '1.8rem' }}>
          {esTutor ? 'Avisos de Asistencia y Justificantes' : 'Pase de Asistencia'}
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
          {esTutor
            ? 'Revisa las notificaciones de asistencia del alumno a tu cargo, confirma de enterado o adjunta tu justificante.'
            : 'Registra la asistencia diaria del grupo y consulta las respuestas o justificantes enviados por los tutores.'}
        </p>
      </div>

      {/* FORMULARIO DE REGISTRO (EXCLUSIVO DOCENTE / DIRECTOR) */}
      {!esTutor && (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '22px 24px',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '28px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1b8a82', fontSize: '1.1rem', fontWeight: '800' }}>
            Registrar Asistencia
          </h3>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.2fr auto',
              gap: '14px',
              alignItems: 'center'
            }}
          >
            <select
              value={form.id_alumno}
              onChange={(e) => setForm({ ...form, id_alumno: e.target.value })}
              required
              style={{
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                outline: 'none'
              }}
            >
              <option value="">Selecciona un alumno...</option>
              {alumnos.map((al) => (
                <option key={al.id_alumno} value={al.id_alumno}>
                  {`${al.nombre} ${al.apellido_paterno} ${al.apellido_materno || ''}`.trim()}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
              style={{
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                color: '#334155',
                outline: 'none'
              }}
            />

            <select
              value={form.estatus}
              onChange={(e) => setForm({ ...form, estatus: e.target.value })}
              style={{
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                outline: 'none'
              }}
            >
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
              <option value="Justificado">Justificado</option>
            </select>

            <button
              type="submit"
              style={{
                backgroundColor: '#1b8a82',
                color: '#ffffff',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(27, 138, 130, 0.28)',
                whiteSpace: 'nowrap'
              }}
            >
              + Guardar Registro
            </button>
          </form>
        </div>
      )}

      {/* CONTENIDO SEGÚN ROL: TARJETAS DE AVISO PARA TUTOR / TABLA PARA DOCENTE */}
      {cargando ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Cargando asistencias...</p>
      ) : asistencias.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '28px',
          borderRadius: '14px',
          textAlign: 'center',
          color: '#64748b',
          border: '1px solid #e2e8f0'
        }}>
          No hay registros de asistencia disponibles todavía.
        </div>
      ) : esTutor ? (
        /* =========================================================
           VISTA EXCLUSIVA PARA TUTOR (TARJETAS DE NOTIFICACIÓN)
           ========================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {asistencias.map((a) => {
            const fechaFormateada = a.fecha ? String(a.fecha).split('T')[0] : '';
            const esFalta = a.estatus === 'Ausente';
            const esPresente = a.estatus === 'Presente';
            const yaRespondio = Boolean(a.razon);

            return (
              <div
                key={a.id_asistencias}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: esFalta ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  borderLeft: `6px solid ${esFalta ? '#dc2626' : esPresente ? '#16a34a' : '#d97706'}`,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Fila superior: Foto + Mensaje personalizado + Estatus */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '260px' }}>
                    <AvatarAlumno
                      fotoUrl={a.fotoUrl}
                      nombre={a.alumno_nombre}
                      size={62}
                    />

                    <div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: esFalta ? '#b91c1c' : '#0f766e',
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        {esFalta
                          ? 'Notificación de Inasistencia'
                          : esPresente
                          ? 'Registro de Asistencia'
                          : 'Inasistencia Justificada'}
                      </span>

                      <p style={{ margin: 0, fontSize: '1.02rem', color: '#1e293b', lineHeight: '1.45' }}>
                        {esFalta ? (
                          <>
                            El alumno a su cargo de nombre{' '}
                            <strong style={{ color: '#0f514c' }}>
                              {a.alumno_nombre || `Alumno #${a.id_alumno}`}
                            </strong>{' '}
                            se registró con una <strong>falta</strong> el día{' '}
                            <strong>{fechaFormateada}</strong>.
                          </>
                        ) : esPresente ? (
                          <>
                            El alumno a su cargo de nombre{' '}
                            <strong style={{ color: '#0f514c' }}>
                              {a.alumno_nombre || `Alumno #${a.id_alumno}`}
                            </strong>{' '}
                            registró <strong>asistencia puntual</strong> el día{' '}
                            <strong>{fechaFormateada}</strong>.
                          </>
                        ) : (
                          <>
                            La falta del alumno{' '}
                            <strong style={{ color: '#0f514c' }}>
                              {a.alumno_nombre || `Alumno #${a.id_alumno}`}
                            </strong>{' '}
                            correspondiente al día <strong>{fechaFormateada}</strong> ya se encuentra{' '}
                            <strong>justificada</strong>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span style={{
                    ...obtenerEstiloEstatus(a.estatus),
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '800'
                  }}>
                    {a.estatus}
                  </span>
                </div>

                {/* Si ya hay respuesta o archivo guardado, mostrar confirmación */}
                {(yaRespondio || a.justificante) && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '0.88rem', color: '#334155' }}>
                      <strong>Respuesta registrada:</strong> {a.razon || 'Justificante adjunto'}
                    </span>

                    {a.justificante && (
                      <a
                        href={a.justificante}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          textDecoration: 'none'
                        }}
                      >
                        Ver documento ({a.archivoNombre || 'Justificante'})
                      </a>
                    )}
                  </div>
                )}

                {/* Botones de acción para el Tutor cuando es Falta (Ausente) */}
                {esFalta && (
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() =>
                          handleRespuestaTutor(
                            a.id_asistencias,
                            'Tutor: Estoy de acuerdo / Enterada de la falta'
                          )
                        }
                        style={{
                          backgroundColor: '#e6f4f2',
                          color: '#0f514c',
                          border: '1px solid #99f6e4',
                          padding: '8px 16px',
                          borderRadius: '9px',
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Estoy de acuerdo / Enterada
                      </button>

                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => {
                          setDesacuerdoId(desacuerdoId === a.id_asistencias ? null : a.id_asistencias);
                          setTextoDesacuerdo('');
                        }}
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          padding: '8px 16px',
                          borderRadius: '9px',
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        No estoy de acuerdo
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirModalJustificante(a)}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '9px',
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.28)'
                        }}
                      >
                        Justificar falta (Subir PDF/Archivo)
                      </button>
                    </div>

                    {/* Caja rápida si el tutor presiona "No estoy de acuerdo" */}
                    {desacuerdoId === a.id_asistencias && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginTop: '4px',
                        backgroundColor: '#fff5f5',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid #fecaca'
                      }}>
                        <input
                          type="text"
                          placeholder="Escribe tu aclaración (ej. Mi hijo sí asistió hoy, favor de verificar)..."
                          value={textoDesacuerdo}
                          onChange={(e) => setTextoDesacuerdo(e.target.value)}
                          style={{
                            flex: 1,
                            minWidth: '240px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fca5a5',
                            fontSize: '0.88rem'
                          }}
                        />
                        <button
                          type="button"
                          disabled={enviando || !textoDesacuerdo.trim()}
                          onClick={() =>
                            handleRespuestaTutor(
                              a.id_asistencias,
                              `Tutor (No está de acuerdo): ${textoDesacuerdo.trim()}`
                            )
                          }
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Enviar aclaración
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================
           VISTA PARA DOCENTE / DIRECTOR (TABLA CON FOTO DEL ALUMNO)
           ========================================================= */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1b8a82', color: '#ffffff' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>ID</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Alumno</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Estatus</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>
                  Respuesta / Justificante
                </th>
              </tr>
            </thead>

            <tbody>
              {asistencias.map((a) => {
                const fechaFormateada = a.fecha ? String(a.fecha).split('T')[0] : '';

                return (
                  <tr
                    key={a.id_asistencias}
                    style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}
                  >
                    <td style={{
                      padding: '12px 15px',
                      borderTop: '1px solid #edf2f7',
                      borderBottom: '1px solid #edf2f7',
                      borderLeft: '1px solid #edf2f7',
                      borderTopLeftRadius: '8px',
                      borderBottomLeftRadius: '8px'
                    }}>
                      <span style={{
                        backgroundColor: '#e6f4f2',
                        color: '#1b8a82',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        {a.id_asistencias}
                      </span>
                    </td>

                    <td style={{
                      padding: '12px 15px',
                      borderTop: '1px solid #edf2f7',
                      borderBottom: '1px solid #edf2f7',
                      fontWeight: 'bold',
                      color: '#1b8a82'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AvatarAlumno fotoUrl={a.fotoUrl} nombre={a.alumno_nombre} size={38} />
                        <span>{a.alumno_nombre || `Alumno #${a.id_alumno}`}</span>
                      </div>
                    </td>

                    <td style={{
                      padding: '12px 15px',
                      borderTop: '1px solid #edf2f7',
                      borderBottom: '1px solid #edf2f7',
                      color: '#4a5568'
                    }}>
                      {fechaFormateada}
                    </td>

                    <td style={{
                      padding: '12px 15px',
                      borderTop: '1px solid #edf2f7',
                      borderBottom: '1px solid #edf2f7'
                    }}>
                      <span style={{
                        ...obtenerEstiloEstatus(a.estatus),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: '800',
                        display: 'inline-block'
                      }}>
                        {a.estatus}
                      </span>
                    </td>

                    <td style={{
                      padding: '12px 15px',
                      borderTop: '1px solid #edf2f7',
                      borderBottom: '1px solid #edf2f7',
                      borderRight: '1px solid #edf2f7',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px'
                    }}>
                      {a.justificante ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <a
                            href={a.justificante}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              textDecoration: 'none'
                            }}
                          >
                            Ver archivo ({a.archivoNombre || 'Justificante'})
                          </a>
                          {a.razon && (
                            <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                              — {a.razon}
                            </span>
                          )}
                        </div>
                      ) : a.razon ? (
                        <span style={{
                          fontSize: '0.84rem',
                          fontWeight: '700',
                          color: a.razon.includes('No está de acuerdo') ? '#b91c1c' : '#0f514c'
                        }}>
                          {a.razon}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          {a.estatus === 'Presente' ? 'No requiere' : 'Sin respuesta del tutor aún'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PARA SUBIR JUSTIFICANTE (EXCLUSIVO TUTOR) */}
      {esTutor && registroAJustificar && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 35px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f514c', fontFamily: "'Fredoka', sans-serif", fontSize: '1.35rem' }}>
              Justificar Inasistencia
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '0.9rem' }}>
              Alumno: <strong>{registroAJustificar.alumno_nombre}</strong> · Fecha:{' '}
              <strong>{String(registroAJustificar.fecha).split('T')[0]}</strong>
            </p>

            <form onSubmit={handleGuardarJustificante} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Razón o motivo de la falta
                </label>
                <input
                  type="text"
                  placeholder="Ej. Consulta médica, enfermedad, trámite familiar..."
                  value={razonJustificante}
                  onChange={(e) => setRazonJustificante(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Subir justificante (PDF, imagen, Word o cualquier archivo)
                </label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center'
                }}>
                  <input
                    type="file"
                    accept="*/*"
                    onChange={(e) => setArchivoJustificante(e.target.files[0] || null)}
                    required
                    style={{ fontSize: '0.88rem', color: '#334155', maxWidth: '100%' }}
                  />
                  {archivoJustificante && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#1b8a82', fontWeight: '700' }}>
                      Archivo listo: {archivoJustificante.name}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRegistroAJustificar(null)}
                  disabled={enviando}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    backgroundColor: '#1b8a82',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {enviando ? 'Subiendo...' : 'Enviar Justificante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}