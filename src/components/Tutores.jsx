import React, { useState, useEffect } from 'react';
import logoZimapanImg from '../assets/LogoZIMAPAN.png';

export function Tutores({ usuarioLogueado }) {
  const esTutor = (usuarioLogueado?.rol || '').toUpperCase() === 'TUTOR';

  const [tutores, setTutores] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [notificacion, setNotificacion] = useState('');

  // Búsqueda y filtro rápido
  const [busqueda, setBusqueda] = useState('');
  const [soloSinIne, setSoloSinIne] = useState(false);

  // Hover y modales
  const [cardHovered, setCardHovered] = useState(null);
  const [tutorAEliminar, setTutorAEliminar] = useState(null);
  const [tutorAEditar, setTutorAEditar] = useState(null);

  const [formEdicion, setFormEdicion] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    telefono: '',
    telefono_secundario: '',
    correo: '',
    parentesco: '',
    calle: '',
    colonia: '',
    municipio: 'Zimapán',
    cp: ''
  });

  const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
  const [documentoIneFile, setDocumentoIneFile] = useState(null);

  const [nuevoTutor, setNuevoTutor] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    telefono_principal: '',
    telefono_secundario: '',
    correo: '',
    parentesco: 'Padre/Tutor Legal',
    calle: '',
    colonia: '',
    municipio: 'Zimapán',
    cp: ''
  });

  const mostrarNotificacion = (msg) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(''), 3000);
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const resT = await fetch('/api/tutores');
      if (resT.ok) {
        const dataT = await resT.json();
        setTutores(Array.isArray(dataT) ? dataT : []);
      }

      const resA = await fetch('/api/alumnos');
      if (resA.ok) {
        const dataA = await resA.json();
        setAlumnos(Array.isArray(dataA) ? dataA : []);
      }
    } catch (err) {
      console.error('Error al cargar tutores/alumnos:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAbrirEditar = (tut) => {
    setTutorAEditar(tut.id_tutor);
    setFormEdicion({
      nombre: tut.nombre || '',
      apellido_paterno: tut.apellido_paterno || '',
      apellido_materno: tut.apellido_materno || '',
      curp: tut.curp || '',
      telefono: tut.telefono || tut.telefono_principal || '',
      telefono_secundario: tut.telefono_secundario || '',
      correo: tut.correo || '',
      parentesco: tut.parentesco || 'Padre/Tutor Legal',
      calle: tut.calle || '',
      colonia: tut.colonia || '',
      municipio: tut.municipio || 'Zimapán',
      cp: tut.cp || ''
    });
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tutores/${tutorAEditar}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEdicion)
      });

      if (res.ok) {
        mostrarNotificacion('¡TUTOR ACTUALIZADO CORRECTAMENTE!');
        setTutorAEditar(null);
        await cargarDatos();
      } else {
        mostrarNotificacion('Error al actualizar el tutor');
      }
    } catch (error) {
      console.error('Error al guardar edición del tutor:', error);
      mostrarNotificacion('Error de conexión');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(nuevoTutor).forEach((key) => {
      formData.append(key, nuevoTutor[key]);
    });

    if (fotoPerfilFile) formData.append('foto_perfil', fotoPerfilFile);
    if (documentoIneFile) formData.append('documento_ine', documentoIneFile);

    try {
      const res = await fetch('/api/tutores', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        mostrarNotificacion('¡TUTOR REGISTRADO EXITOSAMENTE!');
        setNuevoTutor({
          nombre: '',
          apellido_paterno: '',
          apellido_materno: '',
          curp: '',
          telefono_principal: '',
          telefono_secundario: '',
          correo: '',
          parentesco: 'Padre/Tutor Legal',
          calle: '',
          colonia: '',
          municipio: 'Zimapán',
          cp: ''
        });
        setFotoPerfilFile(null);
        setDocumentoIneFile(null);
        setMostrarForm(false);
        cargarDatos();
      } else {
        mostrarNotificacion('Error al registrar el tutor');
      }
    } catch (error) {
      console.error('Error en submit de tutor:', error);
      mostrarNotificacion('Error de conexión');
    }
  };

  const confirmarEliminacion = async () => {
    if (!tutorAEliminar) return;

    try {
      const res = await fetch(`/api/tutores/${tutorAEliminar.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        mostrarNotificacion('TUTOR ELIMINADO CORRECTAMENTE');
        setTutores((prev) => prev.filter((t) => t.id_tutor !== tutorAEliminar.id));
      } else {
        const data = await res.json();
        mostrarNotificacion(`Error: ${data.error || 'No se pudo eliminar el tutor'}`);
      }
    } catch (error) {
      console.error('Error al eliminar tutor:', error);
      mostrarNotificacion('Error de conexión al eliminar');
    } finally {
      setTutorAEliminar(null);
    }
  };

  const obtenerHijosDeTutor = (nombreCompletoTutor) => {
    if (!nombreCompletoTutor) return [];
    return alumnos.filter(
      (a) => a.tutor && a.tutor.toLowerCase().includes(nombreCompletoTutor.toLowerCase())
    );
  };

  // =========================================================================
  // GENERADOR DE CREDENCIAL OFICIAL DE SALIDA (PDF CON MARCA DE AGUA)
  // =========================================================================
  const generarCredencialTutorPDF = (tut, hijos) => {
    const nombreCompleto = `${tut.nombre} ${tut.apellido_paterno} ${tut.apellido_materno || ''}`.trim();
    const fechaEmision = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const ventanaPDF = window.open('', '_blank', 'width=850,height=700');
    if (!ventanaPDF) {
      alert('Por favor permite las ventanas emergentes para generar la credencial PDF.');
      return;
    }

    const fotoTutorHtml = tut.foto_perfil
      ? `<img src="${tut.foto_perfil}" alt="Foto Tutor" style="width:125px;height:145px;object-fit:cover;border-radius:10px;border:2.5px solid #0f514c;" />`
      : `<div style="width:125px;height:145px;border-radius:10px;border:2px dashed #1b8a82;background:#f0fdfa;display:flex;align-items:center;justify-content:center;color:#0f514c;font-weight:bold;font-size:12px;text-align:center;padding:8px;">Sin fotografía</div>`;

    const listaHijosHtml =
      hijos.length > 0
        ? hijos
            .map(
              (h) =>
                `<li style="margin:4px 0;font-weight:700;color:#0f514c;">${h.nombre} ${h.apellido_paterno} ${h.apellido_materno || ''} <span style="font-weight:400;color:#475569;">(${h.grado || 'Preescolar'})</span></li>`
            )
            .join('')
        : `<li style="color:#64748b;">Sin alumnos asignados actualmente</li>`;

    ventanaPDF.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Credencial de Tutor Autorizado - ${nombreCompleto}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1e293b; background: #fff; }
          .hoja {
            position: relative;
            overflow: hidden;
            max-width: 720px;
            margin: 0 auto;
            border: 2.5px solid #0f514c;
            border-radius: 16px;
            padding: 24px 28px;
          }
          .marca-agua {
            position: absolute;
            top: 52%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 390px;
            height: 390px;
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
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .caja-datos {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            background: rgba(248, 250, 252, 0.88);
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .caja-hijos {
            background: rgba(240, 253, 250, 0.88);
            border: 1.5px solid #5eead4;
            border-left: 6px solid #0f514c;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 18px;
          }
          .firmas {
            margin-top: 40px;
            display: flex;
            justify-content: space-around;
            text-align: center;
            font-size: 12px;
            color: #475569;
          }
          .linea { width: 210px; border-top: 1.5px solid #334155; padding-top: 6px; margin-top: 34px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="hoja">
          <img src="${logoZimapanImg}" alt="" class="marca-agua" />
          <div class="contenido">
            <div class="header">
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${logoZimapanImg}" alt="Logo Zimapán" style="width:64px;height:64px;object-fit:contain;" />
                <div>
                  <div style="font-size:11px;font-weight:800;color:#1b8a82;text-transform:uppercase;">Control Escolar y Seguridad de Entrega</div>
                  <h1 style="margin:2px 0;font-size:19px;color:#0f514c;">CREDENCIAL DE TUTOR AUTORIZADO</h1>
                  <div style="font-size:12px;color:#64748b;">Jardín de Niños "Zimapán" • Emisión: ${fechaEmision}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;font-weight:700;color:#64748b;">FOLIO</div>
                <div style="font-size:16px;font-weight:900;color:#0f514c;">T-${String(tut.id_tutor).padStart(4, '0')}</div>
              </div>
            </div>

            <div class="caja-datos">
              <div style="flex:1;font-size:14px;line-height:1.55;">
                <div style="font-size:11px;font-weight:800;color:#1b8a82;text-transform:uppercase;">Datos del Tutor Legal</div>
                <h2 style="margin:3px 0 8px 0;font-size:20px;color:#0f172a;">${nombreCompleto}</h2>
                <div><strong>Parentesco:</strong> ${tut.parentesco || 'Padre/Tutor Legal'}</div>
                <div><strong>CURP:</strong> ${tut.curp || 'No registrada'}</div>
                <div><strong>Teléfono Principal:</strong> ${tut.telefono_principal || tut.telefono || 'Sin registrar'}</div>
                ${tut.telefono_secundario ? `<div><strong>Teléfono Alterno:</strong> ${tut.telefono_secundario}</div>` : ''}
                <div><strong>Domicilio:</strong> ${tut.calle || ''} ${tut.colonia || ''}, ${tut.municipio || 'Zimapán'}</div>
                <div style="margin-top:6px;">
                  <strong>Identificación Oficial (INE):</strong>
                  <span style="color:${tut.documento_ine ? '#15803d' : '#b45309'};font-weight:800;">
                    ${tut.documento_ine ? 'Verificada en archivo' : 'Pendiente de entrega'}
                  </span>
                </div>
              </div>
              <div>${fotoTutorHtml}</div>
            </div>

            <div class="caja-hijos">
              <div style="font-size:12px;font-weight:800;color:#0f514c;text-transform:uppercase;margin-bottom:6px;">
                Alumno(s) Autorizado(s) para Entrega en Puerta
              </div>
              <ul style="margin:0;padding-left:20px;font-size:14px;">
                ${listaHijosHtml}
              </ul>
            </div>

            <p style="font-size:12px;color:#475569;margin:0;">
              Presente esta credencial al personal docente o de guardia al momento de recoger al menor.
            </p>

            <div class="firmas">
              <div class="linea">Firma del Tutor Autorizado</div>
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

  // Filtrado por rol, búsqueda y estado de INE
  const tutoresFiltrados = tutores.filter((tut) => {
    const nombreCompleto = `${tut.nombre} ${tut.apellido_paterno} ${tut.apellido_materno || ''}`.trim();

    if (esTutor && usuarioLogueado?.nombre) {
      if (!nombreCompleto.toLowerCase().includes(usuarioLogueado.nombre.toLowerCase())) {
        return false;
      }
    }

    if (soloSinIne && tut.documento_ine) {
      return false;
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const hijos = obtenerHijosDeTutor(nombreCompleto);
      const coincideHijo = hijos.some((h) =>
        `${h.nombre} ${h.apellido_paterno}`.toLowerCase().includes(q)
      );
      const coincideTutor =
        nombreCompleto.toLowerCase().includes(q) ||
        (tut.telefono_principal || tut.telefono || '').toLowerCase().includes(q) ||
        (tut.curp || '').toLowerCase().includes(q);

      return coincideTutor || coincideHijo;
    }

    return true;
  });

  return (
    <div style={{ padding: '10px 0', fontFamily: 'sans-serif', backgroundColor: 'transparent', minHeight: '75vh', position: 'relative' }}>
      {notificacion && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981',
          color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', zIndex: 99999
        }}>
          ✓ {notificacion}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {tutorAEliminar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999999
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            textAlign: 'center', border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ color: '#0f514c', marginTop: 0, fontSize: '1.2rem' }}>¿Eliminar Registro?</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', margin: '15px 0 25px 0' }}>
              ¿Estás seguro de que deseas eliminar al tutor <br />
              <strong style={{ color: '#1b8a82' }}>"{tutorAEliminar.nombre}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={confirmarEliminacion}
                style={{
                  backgroundColor: '#ef4444', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setTutorAEliminar(null)}
                style={{
                  backgroundColor: '#cbd5e1', color: '#334155', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE EDICIÓN DE TUTOR */}
      {tutorAEditar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '25px', maxWidth: '600px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1b8a82', borderBottom: '2px solid #1b8a82', paddingBottom: '8px' }}>
              Editar Información del Tutor
            </h3>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Nombre(s):</label>
                <input type="text" value={formEdicion.nombre} onChange={(e) => setFormEdicion({ ...formEdicion, nombre: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Apellido Paterno:</label>
                <input type="text" value={formEdicion.apellido_paterno} onChange={(e) => setFormEdicion({ ...formEdicion, apellido_paterno: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Apellido Materno:</label>
                <input type="text" value={formEdicion.apellido_materno} onChange={(e) => setFormEdicion({ ...formEdicion, apellido_materno: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>CURP:</label>
                <input type="text" value={formEdicion.curp} onChange={(e) => setFormEdicion({ ...formEdicion, curp: e.target.value })} maxLength="18" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Teléfono Principal:</label>
                <input type="tel" value={formEdicion.telefono} onChange={(e) => setFormEdicion({ ...formEdicion, telefono: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Teléfono Secundario:</label>
                <input type="tel" value={formEdicion.telefono_secundario} onChange={(e) => setFormEdicion({ ...formEdicion, telefono_secundario: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Correo Electrónico:</label>
                <input type="email" value={formEdicion.correo} onChange={(e) => setFormEdicion({ ...formEdicion, correo: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Calle y Número:</label>
                <input type="text" value={formEdicion.calle} onChange={(e) => setFormEdicion({ ...formEdicion, calle: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Colonia / Barrio:</label>
                <input type="text" value={formEdicion.colonia} onChange={(e) => setFormEdicion({ ...formEdicion, colonia: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Guardar Cambios
                </button>
                <button type="button" onClick={() => setTutorAEditar(null)} style={{ backgroundColor: '#cbd5e1', color: '#333', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL DE TUTORES */}
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.94)', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ color: '#1b8a82', margin: 0 }}>
              {esTutor ? 'Mi Perfil de Tutor' : 'Gestión de Tutores Legales'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Control de padres de familia, identificación oficial (INE) y credenciales autorizadas para entrega de alumnos.
            </p>
          </div>

          {!esTutor && !mostrarForm && (
            <button
              onClick={() => setMostrarForm(true)}
              style={{ backgroundColor: '#1b8a82', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Registrar Nuevo Tutor
            </button>
          )}
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTRO DE DOCUMENTACIÓN */}
        {!esTutor && !mostrarForm && (
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
              placeholder="Buscar por tutor, hijo, teléfono o CURP..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: '1 1 260px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={soloSinIne}
                onChange={(e) => setSoloSinIne(e.target.checked)}
              />
              Mostrar solo pendientes de INE
            </label>

            <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f514c', backgroundColor: '#e6f4f2', padding: '6px 12px', borderRadius: '8px' }}>
              Total: {tutoresFiltrados.length}
            </span>
          </div>
        )}

        {/* FORMULARIO DE REGISTRO DE NUEVO TUTOR */}
        {!esTutor && mostrarForm && (
          <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #1b8a82', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <h3 style={{ gridColumn: '1 / -1', color: '#1b8a82', margin: 0 }}>Datos del Tutor</h3>

            <input type="text" placeholder="Nombre(s)" value={nuevoTutor.nombre} onChange={(e) => setNuevoTutor({ ...nuevoTutor, nombre: e.target.value })} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Apellido Paterno" value={nuevoTutor.apellido_paterno} onChange={(e) => setNuevoTutor({ ...nuevoTutor, apellido_paterno: e.target.value })} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Apellido Materno" value={nuevoTutor.apellido_materno} onChange={(e) => setNuevoTutor({ ...nuevoTutor, apellido_materno: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="CURP" maxLength="18" value={nuevoTutor.curp} onChange={(e) => setNuevoTutor({ ...nuevoTutor, curp: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />

            <input type="tel" placeholder="Teléfono Principal" value={nuevoTutor.telefono_principal} onChange={(e) => setNuevoTutor({ ...nuevoTutor, telefono_principal: e.target.value })} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="tel" placeholder="Teléfono Secundario" value={nuevoTutor.telefono_secundario} onChange={(e) => setNuevoTutor({ ...nuevoTutor, telefono_secundario: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="email" placeholder="Correo Electrónico" value={nuevoTutor.correo} onChange={(e) => setNuevoTutor({ ...nuevoTutor, correo: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Parentesco (Ej. Madre, Padre, Abuelo)" value={nuevoTutor.parentesco} onChange={(e) => setNuevoTutor({ ...nuevoTutor, parentesco: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />

            <h4 style={{ gridColumn: '1 / -1', color: '#1b8a82', margin: '10px 0 0 0' }}>Dirección de Residencia</h4>
            <input type="text" placeholder="Calle y Número" value={nuevoTutor.calle} onChange={(e) => setNuevoTutor({ ...nuevoTutor, calle: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Colonia / Barrio" value={nuevoTutor.colonia} onChange={(e) => setNuevoTutor({ ...nuevoTutor, colonia: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Municipio" value={nuevoTutor.municipio} onChange={(e) => setNuevoTutor({ ...nuevoTutor, municipio: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Código Postal" value={nuevoTutor.cp} onChange={(e) => setNuevoTutor({ ...nuevoTutor, cp: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />

            <h4 style={{ gridColumn: '1 / -1', color: '#1b8a82', margin: '10px 0 0 0' }}>Documentación Oficial</h4>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Foto de Perfil del Tutor:</label>
              <input type="file" accept="image/*" onChange={(e) => setFotoPerfilFile(e.target.files[0])} style={{ width: '100%', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Identificación Oficial INE (PDF o Imagen):</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumentoIneFile(e.target.files[0])} style={{ width: '100%', marginTop: '4px' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Guardar Tutor
              </button>
              <button type="button" onClick={() => setMostrarForm(false)} style={{ backgroundColor: '#cbd5e1', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* LISTADO DE TARJETAS DE TUTORES */}
        {cargando ? (
          <p>Cargando información...</p>
        ) : tutoresFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            No se encontraron tutores con los criterios actuales.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
            {tutoresFiltrados.map((tut) => {
              const nombreCompleto = `${tut.nombre} ${tut.apellido_paterno} ${tut.apellido_materno || ''}`.trim();
              const hijos = obtenerHijosDeTutor(nombreCompleto);
              const isHovered = cardHovered === tut.id_tutor;
              const tieneIne = Boolean(tut.documento_ine);

              return (
                <div
                  key={tut.id_tutor}
                  onMouseEnter={() => setCardHovered(tut.id_tutor)}
                  onMouseLeave={() => setCardHovered(null)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderTop: `4px solid ${tieneIne ? '#1b8a82' : '#f59e0b'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '280px',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', border: '2px solid #1b8a82', flexShrink: 0 }}>
                        {tut.foto_perfil ? (
                          <img src={tut.foto_perfil} alt={nombreCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.78rem', fontWeight: 'bold' }}>
                            Sin Foto
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#0f514c', fontSize: '1.05rem' }}>{nombreCompleto}</h4>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.76rem', backgroundColor: '#e6f4f2', color: '#1b8a82', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                            {tut.parentesco}
                          </span>
                          <span style={{
                            fontSize: '0.74rem',
                            backgroundColor: tieneIne ? '#dcfce7' : '#fef3c7',
                            color: tieneIne ? '#15803d' : '#b45309',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 'bold'
                          }}>
                            {tieneIne ? 'INE Verificada' : 'INE Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#475569' }}>
                      <strong>Teléfono:</strong> {tut.telefono_principal || tut.telefono}
                      {tut.telefono_secundario ? ` / ${tut.telefono_secundario}` : ''}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#475569' }}>
                      <strong>Correo:</strong> {tut.correo || 'No registrado'}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#475569' }}>
                      <strong>Dirección:</strong> {`${tut.calle || ''}, ${tut.colonia || ''}, ${tut.municipio || 'Zimapán'}`}
                    </p>

                    {/* VINCULACIÓN CON SUS HIJOS */}
                    <div style={{ marginTop: '12px', backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#166534' }}>Tutelado(s) a su cargo:</strong>
                      {hijos.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Sin alumnos asignados</span>
                      ) : (
                        hijos.map((h) => (
                          <span key={h.id_alumno} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f514c' }}>
                            • {`${h.nombre} ${h.apellido_paterno}`}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div style={{
                    marginTop: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => generarCredencialTutorPDF(tut, hijos)}
                      style={{
                        backgroundColor: '#0f514c',
                        color: 'white',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Credencial PDF
                    </button>

                    <button
                      onClick={() => handleAbrirEditar(tut)}
                      style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Editar
                    </button>

                    {tieneIne ? (
                      <a
                        href={tut.documento_ine}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.78rem',
                          textAlign: 'center',
                          flex: 1
                        }}
                      >
                        Ver INE
                      </a>
                    ) : (
                      <button
                        disabled
                        style={{
                          backgroundColor: '#94a3b8',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          flex: 1,
                          cursor: 'not-allowed'
                        }}
                      >
                        Sin INE
                      </button>
                    )}

                    {!esTutor && (
                      <button
                        onClick={() => setTutorAEliminar({ id: tut.id_tutor, nombre: nombreCompleto })}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.78rem',
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