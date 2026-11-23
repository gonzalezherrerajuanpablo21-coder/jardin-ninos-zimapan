import React from 'react';

export function Menu({ moduloActivo, setModuloActivo, usuario, onCerrarSesion }) {
  // Definición de todos los módulos con sus roles permitidos
  const todosLosModulos = [
    { id: 'inicio', nombre: 'Inicio', roles: ['Dirección', 'Maestro', 'Tutor', 'Otro'] },
    { id: 'alumnos', nombre: 'Alumnos', roles: ['Dirección', 'Maestro'] },
    { id: 'asistencia', nombre: 'Asistencias', roles: ['Dirección', 'Maestro', 'Tutor'] },
    { id: 'maestros', nombre: 'Maestros', roles: ['Dirección'] },
    { id: 'tutores', nombre: 'Tutores', roles: ['Dirección'] },
    { id: 'medico', nombre: 'Historial Médico', roles: ['Dirección', 'Maestro'] },
    { id: 'direccion', nombre: 'Dirección', roles: ['Dirección'] }
  ];

  // Identificar el rol del usuario (por defecto 'Tutor' si no está definido)
  const rolUsuario = usuario?.tipoUsuario || 'Tutor';

  // Filtrar módulos visibles según el rol
  const modulosPermitidos = todosLosModulos.filter(mod => mod.roles.includes(rolUsuario));

  return (
    <header className="header-principal">
      <div className="header-encabezado">
        <h1>Jardín de Niños Zimapán</h1>
        <p>Sistema de administración escolar | Vista: <strong>{rolUsuario}</strong></p>
      </div>
      <nav className="navbar-menu">
        {modulosPermitidos.map((mod) => (
          <button
            key={mod.id}
            className={`nav-link ${moduloActivo === mod.id ? 'active' : ''}`}
            onClick={() => setModuloActivo(mod.id)}
          >
            {mod.nombre}
          </button>
        ))}
        <button className="nav-link btn-cerrar" onClick={onCerrarSesion}>
          Cerrar Sesión
        </button>
      </nav>
    </header>
  );
}