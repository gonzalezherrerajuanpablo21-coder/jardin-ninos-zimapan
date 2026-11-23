import React, { useState, useEffect } from 'react';
import logoZimapanImg from '../assets/LogoZIMAPAN.png';

const TIPOS_ACTIVIDAD_DIRECCION = [
  'Convivio / Festival Escolar',
  'Suspensión de Labores',
  'Aviso Administrativo',
  'Reunión con Padres de Familia',
  'Entrega de Evaluaciones / Boletas',
  'Ceremonia Cívica / Clausura'
];

export function Direccion({ usuarioLogueado, setModuloActivo }) {
  const rolActual = (usuarioLogueado?.rol || '').toUpperCase();
  const tienePermisoDireccion = ['DIRECTOR', 'ADMINISTRADOR'].includes(rolActual);

  // Datos generales de todos los módulos
  const [alumnos, setAlumnos] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [eventos, setEventos] = useState([]);

  // Selector para constancia / comprobante PDF
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CONCLUSION'); // 'CONCLUSION' o 'ESTUDIOS'
  const [cicloEscolar, setCicloEscolar] = useState('2025 - 2026');
  const [nombreDirectora, setNombreDirectora] = useState(
    usuarioLogueado?.nombre || 'Profra. Patricia Rivera Paredes'
  );

  // Formulario de avisos y agenda de dirección
  const [notificacion, setNotificacion] = useState('');
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    tipo: 'Convivio / Festival Escolar',
    fecha_evento: '',
    descripcion: '',
    prioridad: 'Normal'
  });

  const mostrarNotificacion = (msg) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(''), 3200);
  };

  const cargarDatosPlantel = async () => {
    try {
      const [resAlu, resMae, resTut, resEve] = await Promise.all([
        fetch('/api/alumnos').catch(() => null),
        fetch('/api/maestros').catch(() => null),
        fetch('/api/tutores').catch(() => null),
        fetch('/api/direccion/eventos').catch(() => null)
      ]);

      if (resAlu?.ok) {
        const dataAlu = await resAlu.json();
        setAlumnos(Array.isArray(dataAlu) ? dataAlu : []);
      }
      if (resMae?.ok) {
        const dataMae = await resMae.json();
        setMaestros(Array.isArray(dataMae) ? dataMae : []);
      }
      if (resTut?.ok) {
        const dataTut = await resTut.json();
        setTutores(Array.isArray(dataTut) ? dataTut : []);
      }
      if (resEve?.ok) {
        const dataEve = await resEve.json();
        setEventos(Array.isArray(dataEve) ? dataEve : []);
      } else {
        const guardados = JSON.parse(localStorage.getItem('eventos_direccion_zimapan') || '[]');
        setEventos(guardados);
      }
    } catch {
      const guardados = JSON.parse(localStorage.getItem('eventos_direccion_zimapan') || '[]');
      setEventos(guardados);
    }
  };

  useEffect(() => {
    if (tienePermisoDireccion) {
      cargarDatosPlantel();
    }
  }, [tienePermisoDireccion]);

  // Seguridad extra: si un docente o tutor llegara aquí, bloquear vista
  if (!tienePermisoDireccion) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '14px', textAlign: 'center', color: '#dc2626' }}>
        <h3>Acceso Restringido</h3>
        <p>Este módulo es exclusivo para la Dirección y Administración del plantel.</p>
      </div>
    );
  }

  const handleAgregarEvento = async (e) => {
    e.preventDefault();
    if (!nuevoEvento.titulo || !nuevoEvento.fecha_evento) return;

    try {
      const res = await fetch('/api/direccion/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEvento)
      });
      if (res.ok) {
        mostrarNotificacion('AVISO / ACTIVIDAD PUBLICADA EN DIRECCIÓN');
        setNuevoEvento({
          titulo: '',
          tipo: 'Convivio / Festival Escolar',
          fecha_evento: '',
          descripcion: '',
          prioridad: 'Normal'
        });
        cargarDatosPlantel();
        return;
      }
    } catch {
      // Respaldo local
    }

    const nuevoLocal = { id_evento: Date.now(), ...nuevoEvento };
    const listaActualizada = [...eventos, nuevoLocal];
    setEventos(listaActualizada);
    localStorage.setItem('eventos_direccion_zimapan', JSON.stringify(listaActualizada));
    mostrarNotificacion('AVISO / ACTIVIDAD PUBLICADA EN DIRECCIÓN');
    setNuevoEvento({
      titulo: '',
      tipo: 'Convivio / Festival Escolar',
      fecha_evento: '',
      descripcion: '',
      prioridad: 'Normal'
    });
  };

  const handleEliminarEvento = async (idEvento) => {
    try {
      const res = await fetch(`/api/direccion/eventos/${idEvento}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEventos((prev) => prev.filter((ev) => ev.id_evento !== idEvento));
        mostrarNotificacion('AVISO ELIMINADO');
        return;
      }
    } catch {
      // Respaldo local
    }

    const filtrados = eventos.filter((ev) => ev.id_evento !== idEvento);
    setEventos(filtrados);
    localStorage.setItem('eventos_direccion_zimapan', JSON.stringify(filtrados));
    mostrarNotificacion('AVISO ELIMINADO');
  };

  // =========================================================================
  // GENERADOR PDF: COMPROBANTE / CONSTANCIA OFICIAL DE PREESCOLAR
  // =========================================================================
  const generarComprobantePreescolarPDF = () => {
    if (!alumnoSeleccionadoId) {
      alert('Selecciona primero a un alumno de la lista.');
      return;
    }

    const alumno = alumnos.find(
      (a) => String(a.id_alumno || a.id) === String(alumnoSeleccionadoId)
    );
    if (!alumno) return;

    const nombreAlumno = `${alumno.nombre || ''} ${alumno.apellido_paterno || ''} ${alumno.apellido_materno || ''}`.trim().toUpperCase();
    const curpAlumno = (alumno.CURP || alumno.curp || 'NO REGISTRADA').toUpperCase();
    const gradoGrupo = `${alumno.grado || ''} ${alumno.grupo || ''}`.trim() || '3° A';

    const hoy = new Date();
    const dia = hoy.getDate();
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesTexto = meses[hoy.getMonth()];
    const anio = hoy.getFullYear();

    const folioUnico = `ZIM-${anio}-${String(alumno.id_alumno || alumno.id).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const tituloDocumento =
      tipoDocumento === 'CONCLUSION'
        ? 'CONSTANCIA DE CONCLUSIÓN DE EDUCACIÓN PREESCOLAR'
        : 'CONSTANCIA OFICIAL DE ESTUDIOS DE PREESCOLAR';

    const cuerpoRedaccion =
      tipoDocumento === 'CONCLUSION'
        ? `concluyó satisfactoriamente su <strong>Educación Preescolar</strong> de acuerdo con el Plan y Programas de Estudio vigentes de la Secretaría de Educación Pública, correspondiente al ciclo escolar <strong>${cicloEscolar}</strong>, en el <strong>Jardín de Niños "Zimapán"</strong>, con Clave de Centro de Trabajo <strong>15PJN2565F</strong>, según constancias que obran en el archivo de Control Escolar de este plantel.`
        : `se encuentra legalmente inscrito(a) y cursando actualmente el <strong>${gradoGrupo}</strong> de <strong>Educación Preescolar</strong> durante el ciclo escolar <strong>${cicloEscolar}</strong>, en el <strong>Jardín de Niños "Zimapán"</strong>, con Clave de Centro de Trabajo <strong>15PJN2565F</strong>, asistiendo con regularidad según registros del archivo de Control Escolar.`;

    const ventanaPDF = window.open('', '_blank', 'width=900,height=780');
    if (!ventanaPDF) {
      alert('Permite las ventanas emergentes en tu navegador para generar el comprobante PDF.');
      return;
    }

    ventanaPDF.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${tituloDocumento} - ${nombreAlumno}</title>
        <style>
          @page { size: letter; margin: 14mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 16px;
          }
          .marco-exterior {
            position: relative;
            border: 4px solid #0f514c;
            border-radius: 18px;
            padding: 6px;
            max-width: 780px;
            margin: 0 auto;
            background: #ffffff;
          }
          .marco-interior {
            position: relative;
            border: 2px dashed #eab308;
            border-radius: 13px;
            padding: 28px 36px;
            overflow: hidden;
          }
          .marca-agua {
            position: absolute;
            top: 53%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 430px;
            height: 430px;
            object-fit: contain;
            opacity: 0.08;
            z-index: 0;
            pointer-events: none;
          }
          .contenido { position: relative; z-index: 1; }
          .encabezado {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #1b8a82;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .banda-kinder {
            background: linear-gradient(90deg, #0f514c 0%, #1b8a82 50%, #0f514c 100%);
            color: #ffffff;
            text-align: center;
            padding: 10px 14px;
            border-radius: 10px;
            margin-bottom: 22px;
            border-bottom: 3px solid #f59e0b;
          }
          .cuerpo-texto {
            font-size: 14.5px;
            line-height: 1.85;
            text-align: justify;
            color: #1e293b;
            margin: 18px 0;
          }
          .caja-alumno {
            background: rgba(240, 253, 250, 0.92);
            border: 1.5px solid #5eead4;
            border-left: 6px solid #f59e0b;
            border-radius: 12px;
            padding: 14px 20px;
            margin: 18px 0;
            text-align: center;
          }
          .firma-area {
            margin-top: 42px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 20px;
          }
          .sello-box {
            width: 155px;
            height: 95px;
            border: 1.5px dashed #94a3b8;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #64748b;
            text-align: center;
            padding: 6px;
          }
          .firma-directora {
            text-align: center;
            flex: 1;
          }
          .linea-firma {
            width: 270px;
            margin: 0 auto 6px auto;
            border-top: 1.8px solid #0f514c;
          }
          .pie-validacion {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            font-size: 10.5px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="marco-exterior">
          <div class="marco-interior">
            <img src="${logoZimapanImg}" alt="" class="marca-agua" />

            <div class="contenido">
              <div class="encabezado">
                <div style="display:flex;align-items:center;gap:14px;">
                  <img src="${logoZimapanImg}" alt="Escudo Zimapán" style="width:74px;height:74px;object-fit:contain;" />
                  <div>
                    <div style="font-size:11px;font-weight:800;color:#d97706;letter-spacing:0.8px;text-transform:uppercase;">
                      Sistema Educativo Nacional • Estado de México
                    </div>
                    <div style="font-size:18px;font-weight:900;color:#0f514c;margin:2px 0;">
                      JARDÍN DE NIÑOS "ZIMAPÁN"
                    </div>
                    <div style="font-size:12px;color:#475569;font-weight:600;">
                      CCT: 15PJN2565F • Teoloyucan, Estado de México
                    </div>
                  </div>
                </div>

                <div style="text-align:right;background:#fef3c7;border:1px solid #fcd34d;padding:8px 12px;border-radius:10px;">
                  <div style="font-size:10px;font-weight:800;color:#92400e;">FOLIO CONTROL ESCOLAR</div>
                  <div style="font-size:12px;font-weight:900;color:#0f514c;">${folioUnico}</div>
                </div>
              </div>

              <div class="banda-kinder">
                <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#fde68a;font-weight:700;">
                  Dirección y Control Escolar
                </div>
                <div style="font-size:16px;font-weight:900;letter-spacing:0.5px;margin-top:2px;">
                  ${tituloDocumento}
                </div>
              </div>

              <p style="font-size:13.5px;font-weight:800;color:#0f514c;margin-bottom:6px;">
                A QUIEN CORRESPONDA:
              </p>

              <p class="cuerpo-texto">
                La Dirección del <strong>Jardín de Niños "Zimapán"</strong>, con Clave de Centro de Trabajo <strong>15PJN2565F</strong>,
                hace constar y <strong>CERTIFICA</strong> que el(la) alumno(a):
              </p>

              <div class="caja-alumno">
                <div style="font-size:21px;font-weight:900;color:#0f514c;letter-spacing:0.4px;">
                  ${nombreAlumno}
                </div>
                <div style="font-size:13px;color:#334155;margin-top:6px;">
                  <strong>CURP:</strong> ${curpAlumno} &nbsp;&nbsp;•&nbsp;&nbsp; <strong>Grado y Grupo:</strong> ${gradoGrupo}
                </div>
              </div>

              <p class="cuerpo-texto">
                ${cuerpoRedaccion}
              </p>

              <p class="cuerpo-texto">
                A petición de la parte interesada y para los usos legales y administrativos que convengan,
                se expide el presente documento en <strong>Zimapán, Teoloyucan, Estado de México</strong>,
                a los <strong>${dia}</strong> días del mes de <strong>${mesTexto}</strong> de <strong>${anio}</strong>.
              </p>

              <div class="firma-area">
                <div class="sello-box">
                  SELLO OFICIAL DE LA<br/>DIRECCIÓN DEL PLANTEL<br/>CCT 15PJN2565F
                </div>

                <div class="firma-directora">
                  <div style="font-size:12px;font-weight:700;color:#0f514c;margin-bottom:44px;">
                    ATENTAMENTE
                  </div>
                  <div class="linea-firma"></div>
                  <div style="font-size:13.5px;font-weight:900;color:#0f172a;">
                    ${nombreDirectora}
                  </div>
                  <div style="font-size:11.5px;font-weight:700;color:#1b8a82;">
                    DIRECTORA DEL JARDÍN DE NIÑOS "ZIMAPÁN"
                  </div>
                </div>
              </div>

              <div class="pie-validacion">
                <span>Cda. de Morelia Mz. 010, Zimapán, 54786 Teoloyucan, Méx. • Tel. 55 8327 6779</span>
                <span><strong>Ciclo Escolar:</strong> ${cicloEscolar}</span>
              </div>
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

  const badgeTipoColor = (tipo) => {
    if (tipo.includes('Suspensión')) return { bg: '#fee2e2', text: '#dc2626' };
    if (tipo.includes('Convivio')) return { bg: '#fef3c7', text: '#d97706' };
    if (tipo.includes('Boletas')) return { bg: '#e0f2fe', text: '#0284c7' };
    return { bg: '#dcfce7', text: '#15803d' };
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

      {/* ENCABEZADO Y TABLERO DE CONTROL TOTAL DEL PLANTEL */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        marginBottom: '22px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ color: '#0f514c', margin: 0 }}>Dirección General y Control Escolar</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Panel exclusivo de Dirección: supervisión de módulos, emisión de comprobantes oficiales y agenda administrativa del plantel.
            </p>
          </div>
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '800'
          }}>
            CCT 15PJN2565F • Acceso Directivo
          </span>
        </div>

        {/* TARJETAS RESUMEN CON ACCESO DIRECTO A TODOS LOS MÓDULOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '14px' }}>
          <div
            onClick={() => setModuloActivo && setModuloActivo('alumnos')}
            style={{
              backgroundColor: '#f3e8ff',
              border: '1px solid #d8b4fe',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#6b21a8', textTransform: 'uppercase' }}>Alumnos Inscritos</div>
            <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#581c87', margin: '4px 0' }}>{alumnos.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#7e22ce', fontWeight: '700' }}>Ir a Alumnos →</div>
          </div>

          <div
            onClick={() => setModuloActivo && setModuloActivo('maestros')}
            style={{
              backgroundColor: '#e0f2fe',
              border: '1px solid #7dd3fc',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#075985', textTransform: 'uppercase' }}>Plantilla Docente</div>
            <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#0c4a6e', margin: '4px 0' }}>{maestros.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: '700' }}>Ir a Maestros →</div>
          </div>

          <div
            onClick={() => setModuloActivo && setModuloActivo('tutores')}
            style={{
              backgroundColor: '#ffedd5',
              border: '1px solid #fdba74',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#9a3412', textTransform: 'uppercase' }}>Tutores Registrados</div>
            <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#7c2d12', margin: '4px 0' }}>{tutores.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#ea580c', fontWeight: '700' }}>Ir a Tutores →</div>
          </div>

          <div
            onClick={() => setModuloActivo && setModuloActivo('asistencias')}
            style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Control Diario</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#14532d', margin: '10px 0' }}>Asistencias y Salud</div>
            <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>Supervisar →</div>
          </div>

          <div
            onClick={() => setModuloActivo && setModuloActivo('actividades')}
            style={{
              backgroundColor: '#ccfbf1',
              border: '1px solid #5eead4',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#115e59', textTransform: 'uppercase' }}>Planeación</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#134e4a', margin: '10px 0' }}>Actividades Semanales</div>
            <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: '700' }}>Ver calendario →</div>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL: EMISOR DE COMPROBANTES PDF + AGENDA DE DIRECCIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
        {/* BLOQUE IZQUIERDO: EMISIÓN DE COMPROBANTE / CERTIFICADO PREESCOLAR */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '24px',
          borderRadius: '16px',
          borderTop: '5px solid #f59e0b',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ color: '#0f514c', margin: '0 0 6px 0' }}>
            Emisión de Comprobante Oficial de Preescolar
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 18px 0' }}>
            Selecciona al alumno para generar su constancia oficial con sello institucional, folio y colores del plantel listos para imprimir en PDF.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#0f514c', marginBottom: '5px', textTransform: 'uppercase' }}>
                1. Seleccionar Alumno *
              </label>
              <select
                value={alumnoSeleccionadoId}
                onChange={(e) => setAlumnoSeleccionadoId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
              >
                <option value="">-- Elige un alumno del plantel --</option>
                {alumnos.map((a) => {
                  const idA = a.id_alumno || a.id;
                  const nombreA = `${a.nombre || ''} ${a.apellido_paterno || ''} ${a.apellido_materno || ''}`.trim();
                  return (
                    <option key={idA} value={idA}>
                      {nombreA} ({a.grado || ''} {a.grupo || ''})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#0f514c', marginBottom: '5px', textTransform: 'uppercase' }}>
                2. Tipo de Documento Oficial
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
              >
                <option value="CONCLUSION">Constancia de Conclusión de Educación Preescolar (Egreso)</option>
                <option value="ESTUDIOS">Constancia de Estudios / Inscripción Vigente</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#0f514c', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Ciclo Escolar
                </label>
                <input
                  type="text"
                  value={cicloEscolar}
                  onChange={(e) => setCicloEscolar(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#0f514c', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Firma Directora
                </label>
                <input
                  type="text"
                  value={nombreDirectora}
                  onChange={(e) => setNombreDirectora(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={generarComprobantePreescolarPDF}
              style={{
                marginTop: '6px',
                backgroundColor: '#0f514c',
                color: '#ffffff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.96rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 81, 76, 0.25)'
              }}
            >
              Imprimir Comprobante Oficial (PDF)
            </button>
          </div>
        </div>

        {/* BLOQUE DERECHO: AGENDA ADMINISTRATIVA Y AVISOS DE DIRECCIÓN */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '24px',
          borderRadius: '16px',
          borderTop: '5px solid #1b8a82',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ color: '#0f514c', margin: '0 0 6px 0' }}>
            Agenda del Plantel y Avisos de Dirección
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0' }}>
            Programa convivios, suspensiones de labores, ceremonias o comunicados administrativos internos.
          </p>

          <form onSubmit={handleAgregarEvento} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <input
              type="text"
              placeholder="Título (ej. Convivio Día del Niño / Suspensión oficial)"
              value={nuevoEvento.titulo}
              onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
              required
              style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <select
                value={nuevoEvento.tipo}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo: e.target.value })}
                style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              >
                {TIPOS_ACTIVIDAD_DIRECCION.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <input
                type="date"
                value={nuevoEvento.fecha_evento}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha_evento: e.target.value })}
                required
                style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
            </div>

            <textarea
              rows="2"
              placeholder="Indicaciones o detalles administrativos..."
              value={nuevoEvento.descripcion}
              onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
              style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', resize: 'vertical' }}
            />

            <button
              type="submit"
              style={{
                backgroundColor: '#1b8a82',
                color: '#ffffff',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              + Registrar en Agenda de Dirección
            </button>
          </form>

          {/* LISTA DE EVENTOS Y AVISOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '290px', overflowY: 'auto' }}>
            {eventos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px', color: '#64748b', fontSize: '0.88rem', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                No hay convivios, suspensiones ni avisos registrados todavía.
              </div>
            ) : (
              eventos.map((ev) => {
                const colores = badgeTipoColor(ev.tipo || '');
                return (
                  <div
                    key={ev.id_evento}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{
                          backgroundColor: colores.bg,
                          color: colores.text,
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {ev.tipo}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                          Fecha: {ev.fecha_evento ? String(ev.fecha_evento).slice(0, 10) : ''}
                        </span>
                      </div>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>{ev.titulo}</div>
                      {ev.descripcion && (
                        <div style={{ fontSize: '0.83rem', color: '#475569', marginTop: '3px' }}>{ev.descripcion}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleEliminarEvento(ev.id_evento)}
                      title="Eliminar aviso"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}