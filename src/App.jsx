import React, { useState } from 'react';
import './App.css';
import { Maestros } from './components/Maestros';
import { Direccion } from './components/Direccion';
import logoEscudo from './assets/LogoZIMAPAN.png';
import {
  BookOpen,
  Clock,
  MapPin,
  ShieldCheck,
  LogOut,
  LogIn,
  Home,
  Phone,
  Mail,
  ExternalLink,
  Users,
  ClipboardCheck,
  HeartPulse,
  UserCheck,
  GraduationCap,
  Building2,
  Calendar,
  Camera
} from 'lucide-react';

import { Alumnos } from './components/Alumnos';
import { Asistencia } from './components/Asistencia';
import { HistorialMedico } from './components/HistorialMedico';
import { Tutores } from './components/Tutores';
import ActividadesKinder from './components/ActividadesKinder';

export default function App() {
  const [pantallaInicial, setPantallaInicial] = useState('landing');

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null);
  const [moduloActivo, setModuloActivo] = useState('inicio');
  const [vista, setVista] = useState('login');

  const [errorLogin, setErrorLogin] = useState('');
  const [errorRegistro, setErrorRegistro] = useState('');
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');

  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const [formRegistro, setFormRegistro] = useState({
    nombre: '',
    apellidos: '',
    tipoUsuario: 'Docente',
    correo: '',
    telefono: '',
    usuario: '',
    password: ''
  });

  const resetFormRegistro = () => {
    setFormRegistro({
      nombre: '',
      apellidos: '',
      tipoUsuario: 'Docente',
      correo: '',
      telefono: '',
      usuario: '',
      password: ''
    });
    setFotoArchivo(null);
    setFotoPreview(null);
  };

  const handleSeleccionarFoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoArchivo(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  // MATRIZ DE PERMISOS SEGÚN EL ROL DEL USUARIO
  const tieneAcceso = (modulo) => {
    const rol = usuarioAutenticado?.rol;

    if (rol === 'Administrador' || rol === 'Director') {
      return true;
    }

    if (rol === 'Docente') {
      return ['inicio', 'alumnos', 'actividades', 'asistencias', 'medico'].includes(modulo);
    }

    if (rol === 'Tutor') {
      return ['inicio', 'actividades', 'asistencias', 'medico'].includes(modulo);
    }

    return false;
  };

  // 1. INICIAR SESIÓN
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const data = await res.json();

      if (res.ok) {
        const nombreMostrar = data.usuario.nombre || usuario;
        setMensajeBienvenida(`Hola ${nombreMostrar}, has ingresado a ZIMAPAN`);
        setUsuarioAutenticado({
          id_usuario: data.usuario.id_usuario,
          nombre: nombreMostrar,
          rol: data.usuario.rol || 'Docente',
          foto: data.usuario.foto || null
        });
      } else {
        setErrorLogin(data.message || 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setErrorLogin('No se pudo conectar con el servidor backend (puerto 3001)');
    }
  };

  // 2. REGISTRO DE NUEVO USUARIO CON FOTO DE PERFIL
  const handleRegistro = async (e) => {
    e.preventDefault();
    setErrorRegistro('');

    try {
      const formData = new FormData();
      formData.append('nombre', formRegistro.nombre);
      formData.append('apellidos', formRegistro.apellidos);
      formData.append('tipoUsuario', formRegistro.tipoUsuario);
      formData.append('correo', formRegistro.correo);
      formData.append('telefono', formRegistro.telefono || '');
      formData.append('usuario', formRegistro.usuario);
      formData.append('password', formRegistro.password);
      if (fotoArchivo) {
        formData.append('foto', fotoArchivo);
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        const nombreCompleto = `${formRegistro.nombre} ${formRegistro.apellidos}`.trim();
        setMensajeBienvenida(`Hola ${nombreCompleto}, ¡Registro Exitoso!`);
        setUsuarioAutenticado({
          id_usuario: data.id,
          nombre: nombreCompleto,
          rol: formRegistro.tipoUsuario,
          foto: data.foto || fotoPreview || null
        });
        resetFormRegistro();
      } else {
        setErrorRegistro(data.error || data.message || 'Error al registrar usuario');
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      setErrorRegistro('No se pudo conectar con el servidor backend.');
    }
  };

  const handleLogout = () => {
    setUsuarioAutenticado(null);
    setModuloActivo('inicio');
    setUsuario('');
    setPassword('');
    setErrorLogin('');
    setErrorRegistro('');
    setMensajeBienvenida('');
    resetFormRegistro();
    setPantallaInicial('landing');
  };

  // =========================================================================
  // --- VISTA 0: PÁGINA INICIAL PÚBLICA (SIN MARCA DE AGUA) ---
  // =========================================================================
  if (pantallaInicial === 'landing' && !usuarioAutenticado) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f4f8f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <section style={{
          backgroundImage: `linear-gradient(rgba(15, 81, 76, 0.58), rgba(27, 138, 130, 0.52)), url('/galeria_kinder/portada_zimapan.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff',
          padding: '70px 30px',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            maxWidth: '1350px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '90px'
          }}>
            <div style={{
              flex: '0 0 auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: '20px'
            }}>
              <img
                src={logoEscudo}
                alt="Escudo Kínder Zimapán"
                style={{
                  height: '250px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(255, 255, 255, 0.35))'
                }}
              />
            </div>

            <div style={{ flex: '1 1 550px', textAlign: 'left' }}>
              <span style={{
                display: 'inline-block',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '14px',
                backdropFilter: 'blur(4px)'
              }}>
                Clave del Plantel: 13EJN0021Z
              </span>

              <h2 style={{
                color: '#ffffff',
                fontSize: '2.6rem',
                margin: '0 0 16px 0',
                fontWeight: '800',
                lineHeight: '1.2',
                textShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                Bienvenidos al Jardín de Niños "Zimapán"
              </h2>

              <p style={{
                color: '#f1f5f9',
                fontSize: '1.15rem',
                lineHeight: '1.6',
                margin: '0 0 28px 0',
                maxWidth: '640px',
                textShadow: '0 1px 3px rgba(0,0,0,0.25)'
              }}>
                Formando niños felices, creativos y seguros de sí mismos en una etapa fundamental para su desarrollo integral.
              </p>

              <div>
                <button
                  onClick={() => setPantallaInicial('sistema')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#00a971',
                    color: 'white',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <LogIn size={20} />
                  Iniciar Sesión en la Plataforma
                </button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: '1150px', margin: '45px auto', padding: '0 20px', flex: 1 }}>
          <h3 style={{ textAlign: 'center', color: '#0f514c', fontSize: '1.75rem', fontWeight: '700', marginBottom: '35px' }}>
            Información Institucional
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px',
            alignItems: 'start'
          }}>
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #7e22ce', textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                backgroundColor: '#f3e8ff',
                color: '#7e22ce',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px auto'
              }}>
                <BookOpen size={38} strokeWidth={2.2} />
              </div>
              <h4 style={{ color: '#1e293b', margin: '0 0 12px 0', fontSize: '1.2rem' }}>Modelo Educativo</h4>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                Fomentamos el aprendizaje a través del juego, estimulando las áreas socioemocionales, motrices y cognitivas de cada pequeño.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #16a34a', textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px auto'
              }}>
                <Clock size={38} strokeWidth={2.2} />
              </div>
              <h4 style={{ color: '#1e293b', margin: '0 0 14px 0', fontSize: '1.2rem' }}>Horarios Escolares</h4>
              <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.8', textAlign: 'left', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                <p style={{ margin: '2px 0' }}><strong>Entrada:</strong> 8:30 AM</p>
                <p style={{ margin: '2px 0' }}><strong>Salida:</strong> 12:30 PM</p>
                <p style={{ margin: '2px 0' }}><strong>Atención a Padres:</strong> Lunes a Viernes</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #ea580c' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{
                  width: '62px',
                  height: '62px',
                  backgroundColor: '#ffedd5',
                  color: '#ea580c',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MapPin size={32} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ color: '#1e293b', margin: 0, fontSize: '1.2rem' }}>Ubicación y Contacto</h4>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>CCT 15PJN2565F</span>
                </div>
              </div>

              <div style={{ color: '#475569', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 6px 0' }}>
                  Cda. de Morelia Manzana 010, Zimapán, 54786 Teoloyucan, Méx.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Phone size={15} color="#ea580c" />
                  <span><strong>Teléfono:</strong> 55 8327 6779</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} color="#ea580c" />
                  <span>contacto@kinderzimapan.edu.mx</span>
                </div>
              </div>

              <div style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                height: '165px'
              }}>
                <iframe
                  title="Ubicación Jardín de Niños Zimapán"
                  src="https://maps.google.com/maps?q=19.7633792,-99.1952794&z=17&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>

                <a
                  href="https://www.google.com.mx/maps/place/Jard%C3%ADn+de+Ni%C3%B1os+ZIMAPAN/@19.7633792,-99.1978543,17z/data=!3m1!4b1!4m6!3m5!1s0x85d221004f5dea4f:0x4997350fbee7044d!8m2!3d19.7633792!4d-99.1952794!16s%2Fg%2F11w2mly68j?entry=ttu&g_ep=EgoyMDI2MTExNS4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  Abrir en Maps <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #0284c7', textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px auto'
              }}>
                <ShieldCheck size={38} strokeWidth={2.2} />
              </div>
              <h4 style={{ color: '#1e293b', margin: '0 0 12px 0', fontSize: '1.2rem' }}>Instalaciones y Seguridad</h4>
              <div style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'left' }}>
                <p style={{ margin: '4px 0' }}><strong>Acceso:</strong> Control de entregas de alumnos</p>
                <p style={{ margin: '4px 0' }}><strong>Espacios:</strong> Áreas de juegos seguras y aulas climatizadas</p>
                <p style={{ margin: '4px 0' }}><strong>Servicios:</strong> Área médica y enfermería</p>
              </div>
            </div>
          </div>
        </section>

        <footer style={{
          backgroundColor: '#0f514c',
          color: 'white',
          textAlign: 'center',
          padding: '20px',
          fontSize: '0.9rem'
        }}>
          Jardín de Niños "Zimapán" © {new Date().getFullYear()} — Sistema Integral de Administración Escolar
        </footer>
      </div>
    );
  }

  // =========================================================================
  // --- VISTA FORMULARIOS LOGIN / REGISTRO ---
  // (Login SIN marca de agua / Registro 1.ª vez CON marca de agua institucional)
  // =========================================================================
  if (!usuarioAutenticado) {
    return (
      <div
        className="login-wrapper"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 81, 76, 0.65), rgba(27, 138, 130, 0.58)), url('/galeria_kinder/salon_zimapan.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div
          className="login-box"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {/* Marca de agua tenue SOLO en el formulario de Registro de 1ra vez */}
          {vista === 'registro' && (
            <img
              src={logoEscudo}
              alt=""
              style={{
                position: 'absolute',
                top: '56%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '310px',
                height: '310px',
                objectFit: 'contain',
                opacity: 0.06,
                pointerEvents: 'none',
                zIndex: 0
              }}
            />
          )}

          <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => setPantallaInicial('landing')}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#1b8a82',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              ← Volver al Inicio
            </button>

            <img src={logoEscudo} alt="Escudo Kínder Zimapán" className="logo-escudo-login" />
            <h1>Kínder "Zimapán"</h1>
            <p className="subtitulo">Sistema Integral de Administración Escolar</p>

            {vista === 'login' ? (
              <>
                <h3>Iniciar Sesión</h3>

                {errorLogin && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    marginBottom: '12px',
                    textAlign: 'center',
                    width: '100%',
                    border: '1px solid #fca5a5'
                  }}>
                    {errorLogin}
                  </div>
                )}

                <form onSubmit={handleLogin} autoComplete="off">
                  <input
                    type="text"
                    placeholder="Usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button type="submit" className="btn-ingresar">
                    Iniciar Sesión
                  </button>
                </form>

                <div className="registro-seccion">
                  <span>¿No tienes cuenta?</span>
                  <button
                    type="button"
                    className="btn-link-registro"
                    onClick={() => {
                      setErrorLogin('');
                      setErrorRegistro('');
                      resetFormRegistro();
                      setVista('registro');
                    }}
                  >
                    Registrarse aquí
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Crear Cuenta</h3>

                {errorRegistro && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    marginBottom: '12px',
                    textAlign: 'center',
                    width: '100%',
                    border: '1px solid #fca5a5'
                  }}>
                    {errorRegistro}
                  </div>
                )}

                {/* SELECTOR CIRCULAR DE FOTO DE PERFIL CON VISTA PREVIA */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px' }}>
                  <label
                    htmlFor="input-foto-perfil"
                    title="Seleccionar foto de perfil"
                    style={{
                      width: '92px',
                      height: '92px',
                      borderRadius: '50%',
                      border: '3px solid #1b8a82',
                      padding: '3px',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 12px rgba(15, 81, 76, 0.18)',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible'
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: '#e6f4f1',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0f514c'
                    }}>
                      {fotoPreview ? (
                        <img
                          src={fotoPreview}
                          alt="Vista previa perfil"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Camera size={32} strokeWidth={2} />
                      )}
                    </div>

                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}>
                      <Camera size={14} />
                    </span>
                  </label>

                  <input
                    id="input-foto-perfil"
                    type="file"
                    accept="image/*"
                    onChange={handleSeleccionarFoto}
                    style={{ display: 'none' }}
                  />

                  <span style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px', fontWeight: '600' }}>
                    {fotoArchivo ? 'Foto seleccionada ✓' : 'Toca el círculo para subir tu foto'}
                  </span>
                </div>

                <form onSubmit={handleRegistro} autoComplete="off">
                  <input
                    type="text"
                    name="nuevo_nombre"
                    placeholder="Nombre(s)"
                    value={formRegistro.nombre}
                    onChange={(e) => setFormRegistro({ ...formRegistro, nombre: e.target.value })}
                    autoComplete="off"
                    required
                  />
                  <input
                    type="text"
                    name="nuevo_apellido"
                    placeholder="Apellidos"
                    value={formRegistro.apellidos}
                    onChange={(e) => setFormRegistro({ ...formRegistro, apellidos: e.target.value })}
                    autoComplete="off"
                    required
                  />

                  <select
                    value={formRegistro.tipoUsuario}
                    onChange={(e) => setFormRegistro({ ...formRegistro, tipoUsuario: e.target.value })}
                    required
                  >
                    <option value="Docente">Docente / Maestro</option>
                    <option value="Director">Administrador / Director</option>
                    <option value="Tutor">Tutor / Padre de familia</option>
                  </select>

                  <input
                    type="email"
                    name="nuevo_correo"
                    placeholder="Correo Electrónico"
                    value={formRegistro.correo}
                    onChange={(e) => setFormRegistro({ ...formRegistro, correo: e.target.value })}
                    autoComplete="new-password"
                    required
                  />
                  <input
                    type="tel"
                    name="nuevo_telefono"
                    placeholder="Teléfono"
                    value={formRegistro.telefono || ''}
                    onChange={(e) => setFormRegistro({ ...formRegistro, telefono: e.target.value })}
                    autoComplete="off"
                    required
                  />
                  <input
                    type="text"
                    name="nuevo_usuario"
                    placeholder="Crea un Usuario"
                    value={formRegistro.usuario}
                    onChange={(e) => setFormRegistro({ ...formRegistro, usuario: e.target.value })}
                    autoComplete="off"
                    required
                  />
                  <input
                    type="password"
                    name="nueva_password"
                    placeholder="Crea una Contraseña"
                    value={formRegistro.password}
                    onChange={(e) => setFormRegistro({ ...formRegistro, password: e.target.value })}
                    autoComplete="new-password"
                    required
                  />
                  <button type="submit" className="btn-ingresar">
                    Registrarse
                  </button>
                </form>

                <div className="registro-seccion">
                  <span>¿Ya tienes cuenta?</span>
                  <button
                    type="button"
                    className="btn-link-registro"
                    onClick={() => {
                      setErrorRegistro('');
                      setErrorLogin('');
                      resetFormRegistro();
                      setVista('login');
                    }}
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // --- VISTA SISTEMA AUTENTICADO (CON MARCA DE AGUA INSTITUCIONAL GLOBAL) ---
  // =========================================================================
  return (
    <div className="main-layout">
      {/* CABECERA */}
      <header className="header-principal" style={{ fontFamily: "'Fredoka', sans-serif" }}>
        <div className="header-left">
          <img
            src={logoEscudo}
            alt="Escudo Kínder Zimapán"
            className="logo-header-top"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.75)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25))'
            }}
          />
        </div>
        <div className="header-center">
          <h1>Jardín de Niños Zimapán</h1>
          <p>Sistema de administración escolar</p>
        </div>
        <div className="header-right">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(6px)',
            padding: '7px 10px 7px 10px',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}>
            {/* AVATAR EN CABECERA: FOTO REAL O INICIALES */}
            {usuarioAutenticado.foto ? (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                padding: '2px',
                backgroundColor: '#0f514c',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
              }}>
                <img
                  src={usuarioAutenticado.foto}
                  alt={usuarioAutenticado.nombre}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            ) : (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '0.95rem',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                flexShrink: 0
              }}>
                {usuarioAutenticado.nombre
                  ? usuarioAutenticado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                  : 'US'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.2' }}>
              <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#ffffff' }}>
                {usuarioAutenticado.nombre}
              </span>
              <span style={{
                display: 'inline-block',
                marginTop: '3px',
                backgroundColor: 'rgba(15, 81, 76, 0.75)',
                color: '#a7f3d0',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                width: 'fit-content',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {usuarioAutenticado.rol}
              </span>
            </div>

            {/* BOTÓN SALIR INTEGRADO EN EL PERFIL */}
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(239, 68, 68, 0.88)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '8px 13px',
                borderRadius: '30px',
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                marginLeft: '4px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.88)')}
            >
              <LogOut size={15} strokeWidth={2.5} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* NAVEGACIÓN RESTRICTORA SEGÚN ROL */}
      <nav
        className="navbar-principal"
        style={{
          background: 'linear-gradient(90deg, #0c423e 0%, #135e58 50%, #0c423e 100%)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          borderBottom: '3px solid #f59e0b',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.14)'
        }}
      >
        <div
          className="nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            flexWrap: 'wrap'
          }}
        >
          {[
            { id: 'inicio', label: 'Inicio', icon: Home, visible: true },
            { id: 'alumnos', label: 'Alumnos', icon: Users, visible: tieneAcceso('alumnos') },
            { id: 'actividades', label: 'Actividades', icon: Calendar, visible: tieneAcceso('actividades') },
            { id: 'asistencias', label: 'Asistencias', icon: ClipboardCheck, visible: tieneAcceso('asistencias') },
            { id: 'medico', label: 'Historial Médico', icon: HeartPulse, visible: tieneAcceso('medico') },
            { id: 'tutores', label: 'Tutores', icon: UserCheck, visible: tieneAcceso('tutores') },
            { id: 'maestros', label: 'Maestros', icon: GraduationCap, visible: tieneAcceso('maestros') },
            { id: 'direccion', label: 'Dirección', icon: Building2, visible: tieneAcceso('direccion') }
          ]
            .filter((item) => item.visible)
            .map((item) => {
              const Icono = item.icon;
              const activo = moduloActivo === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setModuloActivo(item.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 15px',
                    borderRadius: '10px',
                    border: activo ? '1px solid rgba(253, 224, 71, 0.45)' : '1px solid transparent',
                    backgroundColor: activo ? '#f59e0b' : 'transparent',
                    color: activo ? '#0f172a' : '#f1f5f9',
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: activo ? '700' : '600',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: activo ? '0 3px 10px rgba(245, 158, 11, 0.35)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!activo) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseOut={(e) => {
                    if (!activo) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icono size={17} strokeWidth={2.3} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL CON ESCUDO DE ZIMAPÁN DE FONDO TENUE */}
      <main className="container-content con-marca-agua">
        <img
          src={logoEscudo}
          alt=""
          className="marca-agua-global"
        />

        {moduloActivo === 'inicio' && (
          <div className="dashboard-view" style={{ maxWidth: '1220px', margin: '0 auto' }}>
            {mensajeBienvenida && (
              <div style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '12px 20px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '18px',
                textAlign: 'center',
                border: '1px solid #86efac'
              }}>
                ✓ {mensajeBienvenida}
              </div>
            )}

            {/* BANNER DE BIENVENIDA CON AVATAR DE DOBLE ARO */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              borderRadius: '16px',
              padding: '20px 26px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              borderLeft: '6px solid #1b8a82',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                {/* AVATAR CIRCULAR CON DOBLE ARO VERDE INSTITUCIONAL */}
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: '3px solid #0f514c',
                  padding: '3px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(15, 81, 76, 0.16)',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid #1b8a82',
                    overflow: 'hidden',
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1.35rem'
                  }}>
                    {usuarioAutenticado.foto ? (
                      <img
                        src={usuarioAutenticado.foto}
                        alt={usuarioAutenticado.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      usuarioAutenticado.nombre
                        ? usuarioAutenticado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                        : 'US'
                    )}
                  </div>
                </div>

                <div>
                  <h2 style={{ margin: '0 0 4px 0', color: '#0f514c', fontSize: '1.5rem' }}>
                    Bienvenido, {usuarioAutenticado.nombre}
                  </h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.94rem' }}>
                    Rol: <strong>{usuarioAutenticado.rol}</strong> — Selecciona el módulo que deseas gestionar hoy.
                  </p>
                </div>
              </div>

              <div style={{
                backgroundColor: '#f0fdfa',
                border: '1px solid #99f6e4',
                color: '#0f514c',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'capitalize'
              }}>
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            {/* CUADRÍCULA DE TARJETAS HORIZONTALES MODERNAS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
              gap: '18px'
            }}>
              {[
                {
                  id: 'alumnos',
                  titulo: 'Alumnos',
                  desc: 'Expedientes, fotografías, grados y grupos.',
                  btn: 'Abrir Alumnos',
                  icon: Users,
                  bg: '#f3e8ff',
                  color: '#7e22ce',
                  visible: tieneAcceso('alumnos')
                },
                {
                  id: 'actividades',
                  titulo: 'Actividades Semanales',
                  desc: 'Calendario semanal, materiales y galería del plantel.',
                  btn: 'Ver Calendario',
                  icon: Calendar,
                  bg: '#ccfbf1',
                  color: '#0f766e',
                  visible: tieneAcceso('actividades')
                },
                {
                  id: 'asistencias',
                  titulo: 'Asistencias',
                  desc: 'Pase de lista diario, faltas y justificantes.',
                  btn: 'Pasar Lista',
                  icon: ClipboardCheck,
                  bg: '#dcfce7',
                  color: '#16a34a',
                  visible: tieneAcceso('asistencias')
                },
                {
                  id: 'medico',
                  titulo: 'Historial Médico',
                  desc: 'Alergias, tipo de sangre y contactos de emergencia.',
                  btn: 'Ver Salud',
                  icon: HeartPulse,
                  bg: '#ffe4e6',
                  color: '#e11d48',
                  visible: tieneAcceso('medico')
                },
                {
                  id: 'tutores',
                  titulo: 'Tutores',
                  desc: 'Padres de familia, INE y personas autorizadas.',
                  btn: 'Gestionar Tutores',
                  icon: UserCheck,
                  bg: '#ffedd5',
                  color: '#ea580c',
                  visible: tieneAcceso('tutores')
                },
                {
                  id: 'maestros',
                  titulo: 'Maestros',
                  desc: 'Plantilla docente, cédulas SEP y fichas oficiales.',
                  btn: 'Ver Plantilla',
                  icon: GraduationCap,
                  bg: '#e0f2fe',
                  color: '#0284c7',
                  visible: tieneAcceso('maestros')
                },
                {
                  id: 'direccion',
                  titulo: 'Dirección',
                  desc: 'Control general, comprobantes PDF y avisos.',
                  btn: 'Entrar a Dirección',
                  icon: Building2,
                  bg: '#fef3c7',
                  color: '#d97706',
                  visible: tieneAcceso('direccion')
                }
              ]
                .filter((card) => card.visible)
                .map((card) => {
                  const Icono = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setModuloActivo(card.id)}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid #e2e8f0',
                        borderLeft: `6px solid ${card.color}`,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 22px rgba(15, 81, 76, 0.12)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      <div style={{
                        width: '62px',
                        height: '62px',
                        borderRadius: '16px',
                        backgroundColor: card.bg,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icono size={30} strokeWidth={2.2} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <h3 style={{
                          margin: '0 0 4px 0',
                          color: '#0f172a',
                          fontSize: '1.12rem',
                          fontWeight: '800'
                        }}>
                          {card.titulo}
                        </h3>
                        <p style={{
                          margin: '0 0 10px 0',
                          color: '#64748b',
                          fontSize: '0.86rem',
                          lineHeight: '1.4'
                        }}>
                          {card.desc}
                        </p>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          color: card.color
                        }}>
                          {card.btn} →
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {moduloActivo === 'alumnos' && tieneAcceso('alumnos') && (
          <Alumnos
            setModuloActivo={setModuloActivo}
            usuarioLogueado={usuarioAutenticado}
          />
        )}

        {moduloActivo === 'actividades' && tieneAcceso('actividades') && (
          <ActividadesKinder usuario={usuarioAutenticado} />
        )}

        {moduloActivo === 'asistencias' && tieneAcceso('asistencias') && (
          <Asistencia usuarioAutenticado={usuarioAutenticado} />
        )}

        {moduloActivo === 'medico' && tieneAcceso('medico') && (
          <HistorialMedico usuarioAutenticado={usuarioAutenticado} />
        )}

        {moduloActivo === 'tutores' && tieneAcceso('tutores') && (
          <Tutores usuarioLogueado={usuarioAutenticado} />
        )}

        {moduloActivo === 'maestros' && tieneAcceso('maestros') && (
          <Maestros usuarioLogueado={usuarioAutenticado} />
        )}

        {moduloActivo === 'direccion' && tieneAcceso('direccion') && (
          <Direccion
            usuarioLogueado={usuarioAutenticado}
            setModuloActivo={setModuloActivo}
          />
        )}
      </main>

      <footer className="footer-principal">
        Jardín de Niños Zimapán
      </footer>
    </div>
  );
}