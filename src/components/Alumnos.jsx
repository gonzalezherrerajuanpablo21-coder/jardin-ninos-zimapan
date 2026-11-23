import React, { useState, useEffect } from 'react';

export function Alumnos({ setModuloActivo, usuarioLogueado }) {
  // Identifica si el usuario actual tiene rol de Tutor
  const esTutor = usuarioLogueado?.rol === 'Tutor';

  // ==========================================
  // --- ESTADOS PRINCIPALES DE LA APLICACIÓN ---
  // ==========================================
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditar, setIdEditar] = useState(null);

  // Estado para controlar la confirmación de eliminación de alumno
  const [alumnoAEliminar, setAlumnoAEliminar] = useState(null);
  // Estado para controlar la confirmación de eliminación de persona autorizada
  const [autorizadoAEliminar, setAutorizadoAEliminar] = useState(null);

  // ==========================================
  // --- ESTADOS PARA GESTIÓN DE FOTOGRAFÍAS ---
  // ==========================================
  const [hoverFoto, setHoverFoto] = useState(false);
  const [mostrarModalConfirm, setMostrarModalConfirm] = useState(false);

  // ==========================================
  // --- ESTADOS PARA PERSONAS AUTORIZADAS ---
  // ==========================================
  const [mostrarModalAutorizados, setMostrarModalAutorizados] = useState(false);
  const [autorizados, setAutorizados] = useState([]);
  const [mostrarFormAutorizado, setMostrarFormAutorizado] = useState(false);
  const [fotoAutorizadoArchivo, setFotoAutorizadoArchivo] = useState(null);
  const [nuevoAutorizado, setNuevoAutorizado] = useState({
    nombre: '',
    parentesco: '',
    telefono: ''
  });

  // ==========================================
  // --- ESTADO PARA NOTIFICACIONES TOAST ---
  // ==========================================
  const [notificacion, setNotificacion] = useState('');

  // ==========================================
  // --- ESTADO PARA REGISTRO Y EDICIÓN ---
  // ==========================================
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_Nacimiento: '',
    CURP: '',
    tutor: '',
    telefono_contacto: ''
  });

  // ==========================================
  // --- FUNCIÓN DE NOTIFICACIÓN FLOTANTE ---
  // ==========================================
  const mostrarNotificacion = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => {
      setNotificacion('');
    }, 3000);
  };

  // ==========================================
  // --- CARGAR ALUMNOS DESDE EL BACKEND ---
  // ==========================================
  const cargarAlumnos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        rol: usuarioLogueado?.rol || '',
        tutorId: usuarioLogueado?.id_usuario || '',
        nombreTutor: usuarioLogueado?.nombre || ''
      });

      const res = await fetch(`/api/alumnos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlumnos(data);

        // Si hay un alumno seleccionado, mantenemos sus datos sincronizados con la BD
        if (alumnoSeleccionado) {
          const alumnoActualizado = data.find(a => a.id_alumno === alumnoSeleccionado.id_alumno);
          if (alumnoActualizado) {
            setAlumnoSeleccionado(prev => ({
              ...alumnoActualizado,
              foto_tutor: prev?.foto_tutor || alumnoActualizado.foto_tutor
            }));
          }
        }
      } else {
        console.error("Error al obtener los datos del servidor. Status:", res.status);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlumnos();
  }, [usuarioLogueado]);

  // ==========================================
  // --- CARGAR PERSONAS AUTORIZADAS ---
  // ==========================================
  const cargarAutorizados = async (idAlumno) => {
    try {
      const res = await fetch(`/api/alumnos/${idAlumno}/autorizados`);
      if (res.ok) {
        const data = await res.json();
        setAutorizados(data);
      } else {
        console.error("Error al obtener autorizados desde la API");
      }
    } catch (error) {
      console.error("Error al cargar personas autorizadas:", error);
    }
  };

  useEffect(() => {
    if (alumnoSeleccionado) {
      cargarAutorizados(alumnoSeleccionado.id_alumno);
    }
  }, [alumnoSeleccionado?.id_alumno]);

  // ==========================================
  // --- REINICIAR FORMULARIO DE ALUMNO ---
  // ==========================================
  const resetFormulario = () => {
    setNuevoAlumno({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_Nacimiento: '',
      CURP: '',
      tutor: '',
      telefono_contacto: ''
    });
    setModoEdicion(false);
    setIdEditar(null);
    setMostrarForm(false);
  };

  // ==========================================
  // --- CREAR O EDITAR ALUMNO EN MYSQL ---
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = modoEdicion 
      ? `/api/alumnos/${idEditar}`
      : '/api/alumnos';
    
    const method = modoEdicion ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoAlumno)
      });

      if (res.ok) {
        mostrarNotificacion(
          modoEdicion ? '¡ALUMNO ACTUALIZADO CORRECTAMENTE!' : '¡ALUMNO REGISTRADO EXITOSAMENTE!'
        );
        resetFormulario();
        setAlumnoSeleccionado(null);
        await cargarAlumnos();
      } else {
        mostrarNotificacion('Error al intentar guardar los datos del alumno.');
      }
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      mostrarNotificacion('Error de conexión con el servidor.');
    }
  };

  // ==========================================
  // --- PREPARAR FORMULARIO PARA EDICIÓN ---
  // ==========================================
  const handleEditar = (alumno) => {
    setModoEdicion(true);
    setIdEditar(alumno.id_alumno);
    setNuevoAlumno({
      nombre: alumno.nombre || '',
      apellido_paterno: alumno.apellido_paterno || '',
      apellido_materno: alumno.apellido_materno || '',
      fecha_Nacimiento: alumno.fecha_Nacimiento ? alumno.fecha_Nacimiento.split('T')[0] : '',
      CURP: alumno.CURP || '',
      tutor: alumno.tutor || '',
      telefono_contacto: alumno.telefono_contacto || ''
    });
    setAlumnoSeleccionado(null);
    setMostrarForm(true);
  };
  
  // Al hacer clic en el botón "Eliminar", guardamos el ID para el Modal Personalizado
  const pedirConfirmacionEliminar = (idAlumno, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setAlumnoAEliminar(idAlumno);
  };

  // Función que confirma la eliminación del alumno en el backend
  const confirmarEliminacion = async () => {
    if (!alumnoAEliminar) return;

    try {
      const res = await fetch(`/api/alumnos/${alumnoAEliminar}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        mostrarNotificacion('¡ALUMNO ELIMINADO CORRECTAMENTE!');
        setAlumnoSeleccionado(null);
        await cargarAlumnos();
      } else {
        mostrarNotificacion('Error al intentar eliminar el alumno.');
      }
    } catch (err) {
      console.error('Error al eliminar alumno:', err);
      mostrarNotificacion('Error de conexión al eliminar.');
    } finally {
      setAlumnoAEliminar(null);
    }
  };

  // ==========================================
  // --- MANEJO DE FOTO DEL ALUMNO ---
  // ==========================================
  const handleSubirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const res = await fetch(`/api/alumnos/${alumnoSeleccionado.id_alumno}/foto`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAlumnoSeleccionado(prev => ({ ...prev, fotoUrl: data.fotoUrl }));
        mostrarNotificacion('¡FOTO DEL ALUMNO ACTUALIZADA CORRECTAMENTE!');
        cargarAlumnos();
      } else {
        mostrarNotificacion('Error al subir la imagen al servidor.');
      }
    } catch (error) {
      console.error("Error al subir la foto:", error);
      mostrarNotificacion('Error de conexión al subir la imagen.');
    }
  };

  // ==========================================
  // --- MANEJO DE FOTO DEL TUTOR PRINCIPAL ---
  // ==========================================
  const handleSubirFotoTutor = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const res = await fetch(`/api/alumnos/${alumnoSeleccionado.id_alumno}/foto-tutor`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const urlFinal = `${data.foto_tutor}?t=${Date.now()}`;

        setAlumnoSeleccionado(prev => ({ 
          ...prev, 
          foto_tutor: urlFinal 
        }));

        setAlumnos(prev => 
          prev.map(a => a.id_alumno === alumnoSeleccionado.id_alumno ? { ...a, foto_tutor: urlFinal } : a)
        );

        mostrarNotificacion('¡FOTO DEL TUTOR PRINCIPAL ACTUALIZADA!');
      } else {
        mostrarNotificacion('Error al subir la foto del tutor.');
      }
    } catch (error) {
      console.error("Error al subir foto del tutor:", error);
      mostrarNotificacion('Error de conexión al subir foto.');
    }
  };

  // ==========================================
  // --- CONFIRMAR Y ELIMINAR FOTO ALUMNO ---
  // ==========================================
  const confirmarEliminarFoto = async () => {
    setMostrarModalConfirm(false);
    try {
      const res = await fetch(`/api/alumnos/${alumnoSeleccionado.id_alumno}/foto`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setAlumnoSeleccionado(prev => ({ ...prev, fotoUrl: null }));
        mostrarNotificacion('¡FOTO ELIMINADA CORRECTAMENTE!');
        cargarAlumnos();
      } else {
        mostrarNotificacion('Error al eliminar la foto.');
      }
    } catch (error) {
      console.error("Error al eliminar foto:", error);
      mostrarNotificacion('Error de conexión al eliminar la imagen.');
    }
  };

  // ==========================================
  // --- REGISTRAR PERSONA AUTORIZADA ---
  // ==========================================
  const handleAgregarAutorizado = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('nombre', nuevoAutorizado.nombre);
      formData.append('parentesco', nuevoAutorizado.parentesco);
      formData.append('telefono', nuevoAutorizado.telefono);

      if (fotoAutorizadoArchivo) {
        formData.append('foto', fotoAutorizadoArchivo);
      }

      const res = await fetch(`/api/alumnos/${alumnoSeleccionado.id_alumno}/autorizados`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        mostrarNotificacion('¡PERSONA AUTORIZADA REGISTRADA!');
        setNuevoAutorizado({ nombre: '', parentesco: '', telefono: '' });
        setFotoAutorizadoArchivo(null);
        setMostrarFormAutorizado(false);
        cargarAutorizados(alumnoSeleccionado.id_alumno);
      } else {
        const errorData = await res.json();
        mostrarNotificacion(`Error: ${errorData.error || 'No se pudo guardar'}`);
      }
    } catch (error) {
      console.error("Error al registrar autorizado:", error);
      mostrarNotificacion('Error de conexión con el servidor.');
    }
  };

  // ==========================================
  // --- ELIMINAR PERSONA AUTORIZADA (MODAL) ---
  // ==========================================
  const pedirConfirmacionEliminarAutorizado = (idAutorizado) => {
    setAutorizadoAEliminar(idAutorizado);
  };

  const confirmarEliminarAutorizado = async () => {
    if (!autorizadoAEliminar) return;

    try {
      const res = await fetch(`/api/autorizados/${autorizadoAEliminar}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        mostrarNotificacion('¡REGISTRO ELIMINADO!');
        cargarAutorizados(alumnoSeleccionado.id_alumno);
      } else {
        mostrarNotificacion('Error al eliminar el registro.');
      }
    } catch (error) {
      console.error("Error al eliminar autorizado:", error);
      mostrarNotificacion('Error de conexión al eliminar.');
    } finally {
      setAutorizadoAEliminar(null);
    }
  };

  // =========================================================================
  // --- VISTA 2: PANTALLA COMPLETA Y DETALLADA DEL PERFIL DEL ALUMNO ---
  // =========================================================================
  if (alumnoSeleccionado) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f8f6', minHeight: '100vh' }}>
        
        {/* NOTIFICACIÓN TOAST */}
        {notificacion && (
          <div className="toast-exito-animado">
            <span className="toast-icono">✓</span>
            {notificacion}
          </div>
        )}

        {/* MODAL VENTANA FLOTANTE DE PERSONAS AUTORIZADAS Y ENTREGAS */}
        {mostrarModalAutorizados && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '25px',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              {/* ENCABEZADO DEL MODAL */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '2px solid #1b8a82',
                paddingBottom: '10px'
              }}>
                <h2 style={{ margin: 0, color: '#1b8a82', fontSize: '1.3rem' }}>
                  Control de Entregas y Autorizados
                </h2>
                <button 
                  onClick={() => {
                    setMostrarModalAutorizados(false);
                    setMostrarFormAutorizado(false);
                  }}
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#333',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>

              {/* SECCIÓN 1: TUTOR PRINCIPAL RESPONSABLE CON FOTO */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '25px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px'
                  }}>
                    TUTOR PRINCIPAL RESPONSABLE
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  
                  {/* FOTO DEL TUTOR PRINCIPAL */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '95px',
                      height: '95px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      overflow: 'hidden',
                      border: '3px solid #10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {alumnoSeleccionado.foto_tutor ? (
                        <img 
                          src={alumnoSeleccionado.foto_tutor} 
                          alt="Foto del Tutor Principal" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>Sin Foto</span>
                      )}
                    </div>

                    <label style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                      {alumnoSeleccionado.foto_tutor ? 'Cambiar Foto' : '+ Subir Foto'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          handleSubirFotoTutor(e);
                          e.target.value = null;
                        }}
                      />
                    </label>
                  </div>

                  {/* DATOS DEL TUTOR PRINCIPAL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{ margin: 0, color: '#0f514c', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {alumnoSeleccionado.tutor || 'No asignado'}
                    </h3>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                      <strong>Relación:</strong> Padre / Tutor Legal
                    </p>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                      <strong>Teléfono Principal:</strong> {alumnoSeleccionado.telefono_contacto || 'Sin número registrado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: PERSONAS SECUNDARIAS AUTORIZADAS */}
              <h3 style={{ color: '#1b8a82', margin: '0 0 12px 0', fontSize: '1.05rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Personas Secundarias Autorizadas para Retirar
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {autorizados.length === 0 ? (
                  <p style={{ color: '#888', fontStyle: 'italic', gridColumn: '1 / -1', textAlign: 'center', padding: '15px 0' }}>
                    No hay familiares o personas secundarias registradas aún.
                  </p>
                ) : (
                  autorizados.map((person) => (
                    <div 
                      key={person.id_autorizado} 
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        backgroundColor: '#f1f5f9',
                        overflow: 'hidden',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #94a3b8'
                      }}>
                        {person.fotoUrl ? (
                          <img 
                            src={person.fotoUrl} 
                            alt={person.nombre} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sin Foto</span>
                        )}
                      </div>

                      <h4 style={{ margin: '4px 0', color: '#1e293b', textAlign: 'center', fontSize: '0.95rem' }}>
                        {person.nombre}
                      </h4>

                      <p style={{ margin: '2px 0', color: '#64748b', fontSize: '0.85rem' }}>
                        <strong>Parentesco:</strong> {person.parentesco}
                      </p>

                      <p style={{ margin: '2px 0', color: '#64748b', fontSize: '0.85rem' }}>
                        <strong>Teléfono:</strong> {person.telefono || 'Sin registro'}
                      </p>

                      <button 
                        onClick={() => pedirConfirmacionEliminarAutorizado(person.id_autorizado)}
                        style={{
                          marginTop: '10px',
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* FORMULARIO PARA REGISTRAR PERSONAS SECUNDARIAS */}
              {!mostrarFormAutorizado ? (
                <button 
                  onClick={() => setMostrarFormAutorizado(true)}
                  style={{
                    backgroundColor: '#1b8a82',
                    color: 'white',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.95rem'
                  }}
                >
                  + Agregar Persona Autorizada Secundaria (Abuela, Tío, Chofer)
                </button>
              ) : (
                <form 
                  onSubmit={handleAgregarAutorizado} 
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '18px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <h4 style={{ margin: 0, color: '#1b8a82' }}>Registrar Persona Autorizada Secundaria</h4>

                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    value={nuevoAutorizado.nombre} 
                    onChange={(e) => setNuevoAutorizado({ ...nuevoAutorizado, nombre: e.target.value })} 
                    required 
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
                  />

                  <input 
                    type="text" 
                    placeholder="Parentesco (Ej. Abuela, Tío, Chofer)" 
                    value={nuevoAutorizado.parentesco} 
                    onChange={(e) => setNuevoAutorizado({ ...nuevoAutorizado, parentesco: e.target.value })} 
                    required 
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
                  />

                  <input 
                    type="tel" 
                    placeholder="Teléfono de contacto" 
                    value={nuevoAutorizado.telefono} 
                    onChange={(e) => setNuevoAutorizado({ ...nuevoAutorizado, telefono: e.target.value })} 
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                      Fotografía de la persona autorizada (Opcional):
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setFotoAutorizadoArchivo(e.target.files[0])}
                      style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button 
                      type="submit" 
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Guardar Registro
                    </button>

                    <button 
                      type="button" 
                      onClick={() => {
                        setMostrarFormAutorizado(false);
                        setFotoAutorizadoArchivo(null);
                      }} 
                      style={{
                        backgroundColor: '#cbd5e1',
                        color: '#333',
                        border: 'none',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL CONFIRMAR ELIMINAR FOTO DE ALUMNO */}
        {mostrarModalConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '25px 30px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1b8a82' }}>¿Eliminar fotografía?</h3>
              <p style={{ margin: '0 0 20px 0', color: '#4a5568', fontSize: '0.95rem' }}>
                ¿Deseas eliminar la foto de este alumno?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setMostrarModalConfirm(false)} 
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#333',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarEliminarFoto} 
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TARJETA PRINCIPAL EXPANSIÓN HORIZONTAL HASTA 1200px */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          maxWidth: '1200px',
          width: '98%',
          margin: '0 auto'
        }}>
          {/* BOTÓN REGRESAR */}
          <button 
            onClick={() => setAlumnoSeleccionado(null)} 
            style={{
              backgroundColor: '#e2e8f0',
              color: '#333',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ← Volver a la lista de alumnos
          </button>

          <h2 style={{ color: '#1b8a82', marginTop: 0, borderBottom: '2px solid #1b8a82', paddingBottom: '10px' }}>
            Información Completa del Alumno
          </h2>

          {/* ESTRUCTURA GENERAL EN 2 COLUMNAS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '30px',
            marginTop: '25px',
            alignItems: 'start'
          }}>
            {/* COLUMNA IZQUIERDA: DATOS PERSONALES Y DIRECCIÓN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '1rem',
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #edf2f7'
              }}>
                
                {/* BANNER CON NOMBRE RESALTADO */}
                <div style={{
                  backgroundColor: '#e6f4f2',
                  borderLeft: '5px solid #1b8a82',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    color: '#1b8a82',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px'
                  }}>
                    Alumno Seleccionado
                  </span>
                  <h2 style={{ margin: '4px 0 0 0', color: '#0f514c', fontSize: '1.4rem', fontWeight: 'bold' }}>
                    {`${alumnoSeleccionado.nombre} ${alumnoSeleccionado.apellido_paterno} ${alumnoSeleccionado.apellido_materno || ''}`}
                  </h2>
                </div>

                <h3 style={{ margin: '0 0 10px 0', color: '#1b8a82', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  Datos Personales
                </h3>
                <p style={{ margin: 0 }}><strong>ID Alumno:</strong> {alumnoSeleccionado.id_alumno}</p>
                <p style={{ margin: 0 }}><strong>Nombre(s):</strong> {alumnoSeleccionado.nombre}</p>
                <p style={{ margin: 0 }}><strong>Apellido Paterno:</strong> {alumnoSeleccionado.apellido_paterno}</p>
                <p style={{ margin: 0 }}><strong>Apellido Materno:</strong> {alumnoSeleccionado.apellido_materno || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>CURP:</strong> {alumnoSeleccionado.CURP}</p>
                <p style={{ margin: 0 }}>
                  <strong>Fecha de Nacimiento:</strong> {alumnoSeleccionado.fecha_Nacimiento ? alumnoSeleccionado.fecha_Nacimiento.split('T')[0] : ''}
                </p>
              </div>

              {/* DIRECCIÓN DEL ALUMNO */}
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1b8a82', fontSize: '1.05rem' }}>Dirección de Residencia</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.95rem' }}>
                  <p style={{ margin: 0 }}><strong>Calle y Número:</strong> {alumnoSeleccionado.calle || 'Sin registrar'}</p>
                  <p style={{ margin: 0 }}><strong>Colonia / Barrio:</strong> {alumnoSeleccionado.colonia || 'Sin registrar'}</p>
                  <p style={{ margin: 0 }}><strong>Municipio / Localidad:</strong> {alumnoSeleccionado.municipio || 'Zimapán'}</p>
                  <p style={{ margin: 0 }}><strong>Código Postal:</strong> {alumnoSeleccionado.cp || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: TUTOR ARRIBA Y FOTO DE ALUMNO ABAJO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ÁREA TUTOR Y PERSONAS AUTORIZADAS */}
              <div style={{
                backgroundColor: '#f0fdf4',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#1b8a82', fontSize: '1.05rem', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px' }}>
                  Tutor / Contacto
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  <strong>Tutor / Responsable:</strong> {alumnoSeleccionado.tutor || 'No asignado'}
                </p>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  <strong>Teléfono Contacto:</strong> {alumnoSeleccionado.telefono_contacto || 'No registrado'}
                </p>

                {/* BOTÓN PARA PERSONAS AUTORIZADAS */}
                <button 
                  onClick={() => setMostrarModalAutorizados(true)}
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#1b8a82',
                    color: 'white',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(27, 138, 130, 0.2)'
                  }}
                >
                  Ver Personas Autorizadas ({autorizados.length})
                </button>
              </div>

              {/* ÁREA FOTO DEL ALUMNO (280px) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#1b8a82', fontSize: '1rem' }}>Fotografía del Alumno</h3>
                <div 
                  onMouseEnter={() => setHoverFoto(true)}
                  onMouseLeave={() => setHoverFoto(false)}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    height: '280px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
                  }}
                >
                  {alumnoSeleccionado.fotoUrl ? (
                    <>
                      <img 
                        src={alumnoSeleccionado.fotoUrl} 
                        alt={`Foto de ${alumnoSeleccionado.nombre}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      {!esTutor && hoverFoto && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '10px'
                        }}>
                          <label style={{
                            backgroundColor: '#1b8a82',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}>
                            Cambiar Foto
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} />
                          </label>
                          <button 
                            onClick={() => setMostrarModalConfirm(true)} 
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Eliminar Foto
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span>Sin Foto</span>
                  )}
                </div>

                {!esTutor && !alumnoSeleccionado.fotoUrl && (
                  <label style={{
                    marginTop: '15px',
                    backgroundColor: '#1b8a82',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}>
                    + Agregar Foto del Alumno
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} />
                  </label>
                )}
              </div>

            </div>
          </div>

        {/* BOTONES DE ACCIÓN EN EL PIE DE PÁGINA */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '35px', flexWrap: 'wrap' }}>
            {!esTutor && (
              <>
                <button 
                  onClick={() => handleEditar(alumnoSeleccionado)} 
                  style={{
                    backgroundColor: '#eab308',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Editar Alumno
                </button>

                {/* BOTÓN ELIMINAR ALUMNO */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setAlumnoAEliminar(alumnoSeleccionado.id_alumno);
                  }}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Eliminar Alumno
                </button>
              </>
            )}

            {/* BOTÓN CONSULTAR HISTORIAL MÉDICO */}
            <button
              onClick={() => { if (setModuloActivo) setModuloActivo('medico'); else alert('Abriendo Historial Médico...'); }}
              style={{
                backgroundColor: '#1b8a82',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Consultar Historial Médico
            </button>
          </div>
        </div>

        {/* MODAL PERSONALIZADO DE CONFIRMACIÓN PARA ELIMINAR ALUMNO (Renderizado directo en el Perfil) */}
        {alumnoAEliminar && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999
          }}>
            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '420px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                ⚠️
              </div>

              <h3 style={{ margin: '0 0 8px 0', color: '#0f766e', fontSize: '1.25rem' }}>
                ¿Eliminar alumno?
              </h3>
              
              <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.4' }}>
                ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setAlumnoAEliminar(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarEliminacion}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // =========================================================================
  // --- VISTA 1: TABLA GENERAL DE ALUMNOS REGISTRADOS ---
  // =========================================================================
  return (
    <div style={{
      backgroundColor: '#f4f8f6',
      padding: '20px',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      position: 'relative'
    }}>
      
      {/* ESTILOS CSS INLINE PARA ANIMACIÓN POPUP */}
      <style>{`
        .toast-exito-animado {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: #10b981;
          color: #ffffff;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: bold;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: popupFade 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .toast-icono {
          background-color: #ffffff;
          color: #10b981;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
        }

        @keyframes popupFade {
          0% {
            opacity: 0;
            transform: translate(-50%, -40%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>

      {notificacion && (
        <div className="toast-exito-animado">
          <span className="toast-icono">✓</span>
          {notificacion}
        </div>
      )}

      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN PARA ELIMINAR ALUMNO */}
      {alumnoAEliminar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999
        }}>
          <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              ⚠️
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: '#0f766e', fontSize: '1.25rem' }}>
              ¿Eliminar alumno?
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.4' }}>
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setAlumnoAEliminar(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminacion}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN PARA ELIMINAR PERSONA AUTORIZADA */}
      {autorizadoAEliminar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999
        }}>
          <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              ⚠️
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: '#0f766e', fontSize: '1.25rem' }}>
              ¿Eliminar persona autorizada?
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.95rem' }}>
              ¿Estás seguro de que deseas eliminar a esta persona secundaria para retirar?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setAutorizadoAEliminar(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminarAutorizado}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}>
        
        <div style={{ marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#1b8a82' }}>
            {esTutor ? 'Mis Hijos / Tutelados' : 'Alumnos Registrados'}
          </h2>
        </div>

        {/* FORMULARIO AGREGAR / EDITAR ALUMNO */}
        {mostrarForm && !esTutor && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #1b8a82',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: '#1b8a82', margin: 0 }}>
                {modoEdicion ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}
              </h3>
              <button 
                onClick={resetFormulario} 
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#333',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✕ Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
              <input 
                type="text" 
                placeholder="Nombre(s)" 
                value={nuevoAlumno.nombre} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })} 
                required 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <input 
                type="text" 
                placeholder="Apellido Paterno" 
                value={nuevoAlumno.apellido_paterno} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apellido_paterno: e.target.value })} 
                required 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <input 
                type="text" 
                placeholder="Apellido Materno" 
                value={nuevoAlumno.apellido_materno} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apellido_materno: e.target.value })} 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <label style={{ fontSize: '0.85rem', color: '#555', marginTop: '5px' }}>Fecha de Nacimiento:</label>
              <input 
                type="date" 
                value={nuevoAlumno.fecha_Nacimiento} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, fecha_Nacimiento: e.target.value })} 
                required 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <input 
                type="text" 
                placeholder="CURP (18 caracteres)" 
                maxLength="18" 
                value={nuevoAlumno.CURP} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, CURP: e.target.value })} 
                required 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <input 
                type="text" 
                placeholder="Nombre del Tutor / Responsable" 
                value={nuevoAlumno.tutor} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, tutor: e.target.value })} 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <input 
                type="tel" 
                placeholder="Teléfono de Contacto" 
                value={nuevoAlumno.telefono_contacto} 
                onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, telefono_contacto: e.target.value })} 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }} 
              />

              <button 
                type="submit" 
                style={{
                  backgroundColor: '#1b8a82',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                {modoEdicion ? 'Guardar Cambios' : 'Guardar en Base de Datos'}
              </button>
            </form>
          </div>
        )}

        {/* TABLA PRINCIPAL DE REGISTROS */}
        {cargando ? (
          <p style={{ color: '#666' }}>Cargando registros desde MySQL...</p>
        ) : alumnos.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>No hay registros de alumnos cargados.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1b8a82', color: 'white' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>ID</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Nombre Completo</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>CURP</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>Fecha de Nacimiento</th>
              </tr>
            </thead>
           <tbody>
              {alumnos.map((item, index) => (
                <tr 
                  key={item.id_alumno || index} 
                  onClick={() => setAlumnoSeleccionado(item)}
                  style={{ backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f5f3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
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
                      {item.id_alumno}
                    </span>
                  </td>

                  <td style={{
                    padding: '10px 15px',
                    borderTop: '1px solid #edf2f7',
                    borderBottom: '1px solid #edf2f7',
                    fontWeight: 'bold',
                    color: '#1b8a82'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nombre}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #cbd5e1',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#e6f4f2',
                          color: '#1b8a82',
                          border: '1px solid #b2dfdb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          flexShrink: 0
                        }}>
                          {`${(item.nombre || 'A')[0]}${(item.apellido_paterno || '')[0] || ''}`.toUpperCase()}
                        </div>
                      )}
                      <span>
                        {`${item.nombre || ''} ${item.apellido_paterno || ''} ${item.apellido_materno || ''}`}
                      </span>
                    </div>
                  </td>

                  <td style={{
                    padding: '12px 15px',
                    borderTop: '1px solid #edf2f7',
                    borderBottom: '1px solid #edf2f7',
                    color: '#4a5568'
                  }}>
                    {item.CURP}
                  </td>

                  <td style={{
                    padding: '12px 15px',
                    borderTop: '1px solid #edf2f7',
                    borderBottom: '1px solid #edf2f7',
                    borderRight: '1px solid #edf2f7',
                    borderTopRightRadius: '8px',
                    borderBottomRightRadius: '8px',
                    color: '#4a5568'
                  }}>
                    {item.fecha_Nacimiento ? item.fecha_Nacimiento.split('T')[0] : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
          {!mostrarForm && !esTutor && (
            <button 
              onClick={() => { resetFormulario(); setMostrarForm(true); }}
              style={{
                backgroundColor: '#1b8a82',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(27, 138, 130, 0.25)'
              }}
            >
              + Agregar Alumno
            </button>
          )}
        </div>

      </div>
    </div>
  );
}