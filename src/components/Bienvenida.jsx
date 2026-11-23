import React, { useState } from 'react';
import logoZimapan from '../assets/LogoZIMAPAN.jpeg'; 

export function Bienvenida({ onIngresar }) {
  const [esRegistro, setEsRegistro] = useState(false);

 
  const [formLogin, setFormLogin] = useState({
    usuario: '',
    password: ''
  });

 
  const [formRegistro, setFormRegistro] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    tipoUsuario: 'Tutor',
    usuario: '',
    password: ''
  });

  const handleLogin = (e) => {
    e.preventDefault();
    const usuariosGuardados = JSON.parse(localStorage.getItem('usuarios_kinder')) || [];

    const usuarioEncontrado = usuariosGuardados.find(
      u => u.usuario === formLogin.usuario && u.password === formLogin.password
    );

    if (usuarioEncontrado) {
      onIngresar(usuarioEncontrado);
    } else {
      alert('Usuario o contraseña incorrectos.');
    }
  };

  const handleRegistro = (e) => {
    e.preventDefault();
    const usuariosGuardados = JSON.parse(localStorage.getItem('usuarios_kinder')) || [];

    const existe = usuariosGuardados.find(u => u.usuario === formRegistro.usuario);
    if (existe) {
      alert('El nombre de usuario ya existe. Por favor elige otro.');
      return;
    }

    usuariosGuardados.push(formRegistro);
    localStorage.setItem('usuarios_kinder', JSON.stringify(usuariosGuardados));

    alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
    setEsRegistro(false);
  };

  return (
    <div className="bienvenida-container">
      <div className="login-card">
        {/* Encabezado con la imagen del Logo */}
        <div className="encabezado-logo">
          <img src={logoZimapan} alt="Logo Kínder Zimapán" className="img-logo" />
          <h1>Kínder "Zimapán"</h1>
        </div>
        <p className="subtitulo">Sistema Integral de Administración Escolar</p>

        {!esRegistro ? (
          
          <div>
            <h3>Iniciar Sesión</h3>
            <form onSubmit={handleLogin} className="form-vertical">
              <input 
                type="text" 
                placeholder="Usuario" 
                value={formLogin.usuario} 
                onChange={(e) => setFormLogin({ ...formLogin, usuario: e.target.value })} 
                required 
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={formLogin.password} 
                onChange={(e) => setFormLogin({ ...formLogin, password: e.target.value })} 
                required 
              />
              <button type="submit" className="btn-ingresar">Iniciar Sesión</button>
            </form>

            <p className="texto-toggle">
              ¿No tienes cuenta?{' '}
              <button 
                type="button" 
                className="btn-enlace" 
                onClick={() => setEsRegistro(true)}
              >
                Registrarse aquí
              </button>
            </p>
          </div>
        ) : (
          
          <div>
            <button 
              type="button" 
              className="btn-regresar" 
              onClick={() => setEsRegistro(false)}
            >
              ← Volver al Inicio de Sesión
            </button>

            <h3>Crear Nueva Cuenta</h3>

            <form onSubmit={handleRegistro} className="form-vertical">
              <input 
                type="text" 
                placeholder="Nombre(s)" 
                value={formRegistro.nombre} 
                onChange={(e) => setFormRegistro({ ...formRegistro, nombre: e.target.value })} 
                required 
              />
              <input 
                type="text" 
                placeholder="Apellidos" 
                value={formRegistro.apellidos} 
                onChange={(e) => setFormRegistro({ ...formRegistro, apellidos: e.target.value })} 
                required 
              />
              <input 
                type="email" 
                placeholder="Correo Electrónico" 
                value={formRegistro.correo} 
                onChange={(e) => setFormRegistro({ ...formRegistro, correo: e.target.value })} 
                required 
              />
              
              <select 
                value={formRegistro.tipoUsuario} 
                onChange={(e) => setFormRegistro({ ...formRegistro, tipoUsuario: e.target.value })}
              >
                <option value="Tutor">Tutor / Padre de Familia</option>
                <option value="Maestro">Maestro</option>
                <option value="Dirección">Dirección / Administración</option>
                <option value="Otro">Otro</option>
              </select>

              <input 
                type="text" 
                placeholder="Crea un usuario" 
                value={formRegistro.usuario} 
                onChange={(e) => setFormRegistro({ ...formRegistro, usuario: e.target.value })} 
                required 
              />
              <input 
                type="password" 
                placeholder="Crea una contraseña" 
                value={formRegistro.password} 
                onChange={(e) => setFormRegistro({ ...formRegistro, password: e.target.value })} 
                required 
              />

              <button type="submit" className="btn-ingresar">Registrarse</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}