import React, { useState, useEffect } from 'react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const COLORES_DISPONIBLES = [
  { nombre: 'Turquesa', valor: '#0891b2' },
  { nombre: 'Morado', valor: '#7c3aed' },
  { nombre: 'Rosa', valor: '#db2777' },
  { nombre: 'Verde', valor: '#059669' },
  { nombre: 'Naranja', valor: '#d97706' },
  { nombre: 'Azul', valor: '#2563eb' },
];

// =========================================================================
// CALENDARIO ESCOLAR OFICIAL SEP (CICLO 2026-2027) - DÍAS INHÁBILES Y VACACIONES
// =========================================================================
const DIAS_INHÁBILES_SEP = {
  '2026-09-16': 'Suspensión de labores docentes (Día de la Independencia)',
  '2026-09-25': 'Consejo Técnico Escolar (Sin clases)',
  '2026-10-30': 'Consejo Técnico Escolar (Sin clases)',
  '2026-11-02': 'Suspensión de labores docentes (Día de Muertos)',
  '2026-11-16': 'Suspensión de labores docentes (Conmemoración Revolución Mexicana)',
  '2026-11-27': 'Consejo Técnico Escolar (Sin clases)',
  '2027-01-29': 'Consejo Técnico Escolar (Sin clases)',
  '2027-02-01': 'Suspensión de labores docentes (Día de la Constitución)',
  '2027-02-26': 'Consejo Técnico Escolar (Sin clases)',
  '2027-03-15': 'Suspensión de labores docentes (Natalicio de Benito Juárez)',
  '2027-05-05': 'Suspensión de labores docentes (Batalla de Puebla)',
  '2027-05-28': 'Consejo Técnico Escolar (Sin clases)',
};

const PERIODOS_VACACIONALES_SEP = [
  {
    nombre: 'Periodo Vacacional de Invierno (Calendario SEP)',
    inicio: '2026-12-21',
    fin: '2027-01-05',
  },
  {
    nombre: 'Periodo Vacacional de Semana Santa (Calendario SEP)',
    inicio: '2027-03-22',
    fin: '2027-04-02',
  },
  {
    nombre: 'Receso de Fin de Ciclo Escolar (Calendario SEP)',
    inicio: '2027-07-16',
    fin: '2027-08-23',
  },
];

const formatearFechaISO = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const verificarEstatusSEP = (fechaISO) => {
  // 1. Revisar si cae dentro de un periodo vacacional SEP
  const vacacion = PERIODOS_VACACIONALES_SEP.find(
    (v) => fechaISO >= v.inicio && fechaISO <= v.fin
  );
  if (vacacion) {
    return {
      bloqueado: true,
      tipo: 'VACACIONES',
      motivo: vacacion.nombre,
    };
  }

  // 2. Revisar si es día festivo oficial o Consejo Técnico Escolar (CTE)
  if (DIAS_INHÁBILES_SEP[fechaISO]) {
    return {
      bloqueado: true,
      tipo: 'SUSPENSION',
      motivo: DIAS_INHÁBILES_SEP[fechaISO],
    };
  }

  return { bloqueado: false, tipo: 'CLASES', motivo: '' };
};

const obtenerInfoSemana = (desplazamientoSemanas = 0) => {
  const hoy = new Date();
  hoy.setDate(hoy.getDate() + desplazamientoSemanas * 7);

  const diaSemana = hoy.getDay();
  const diferenciaALunes = diaSemana === 0 ? -6 : 1 - diaSemana;

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diferenciaALunes);

  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  const diaInicio = lunes.getDate();
  const diaFin = viernes.getDate();
  const mesInicio = meses[lunes.getMonth()];
  const mesFin = meses[viernes.getMonth()];
  const anio = viernes.getFullYear();

  const tituloSemana =
    mesInicio === mesFin
      ? `Semana del ${diaInicio} al ${diaFin} de ${mesFin} de ${anio}`
      : `Semana del ${diaInicio} de ${mesInicio} al ${diaFin} de ${mesFin} de ${anio}`;

  const diasConFecha = DIAS.map((nombre, index) => {
    const fechaDia = new Date(lunes);
    fechaDia.setDate(lunes.getDate() + index);
    const fechaISO = formatearFechaISO(fechaDia);
    const estatusSEP = verificarEstatusSEP(fechaISO);

    return {
      nombre,
      numeroDia: fechaDia.getDate(),
      fechaISO,
      esHoy: fechaDia.toDateString() === new Date().toDateString(),
      estatusSEP,
    };
  });

  // Detectar si toda la semana (o gran parte) es periodo vacacional
  const diaVacacional = diasConFecha.find((d) => d.estatusSEP.tipo === 'VACACIONES');
  const vacacionSemana = diaVacacional ? diaVacacional.estatusSEP.motivo : null;

  return { tituloSemana, diasConFecha, vacacionSemana };
};

export default function ActividadesKinder({ usuario }) {
  const [actividades, setActividades] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [desplazamientoSemana, setDesplazamientoSemana] = useState(0);

  const [form, setForm] = useState({
    dia_semana: 'Martes',
    horario: '09:30 - 10:30',
    categoria: '',
    titulo: '',
    descripcion: '',
    material_requerido: '',
    color_etiqueta: '#0891b2',
  });

  const [formReporte, setFormReporte] = useState({
    titulo: '',
    descripcion: '',
  });
  const [fotoReporte, setFotoReporte] = useState(null);

  const rolUsuario = (usuario?.rol || '').toUpperCase();
  const puedeEditar = ['DIRECTOR', 'SUBDIRECTOR', 'MAESTRO', 'DOCENTE', 'ADMIN'].some((r) =>
    rolUsuario.includes(r)
  );

  const { tituloSemana, diasConFecha, vacacionSemana } = obtenerInfoSemana(desplazamientoSemana);

 
  const cargarDatos = async () => {
    try {
      const resAct = await fetch('/api/actividades');
      if (resAct.ok) {
        const dataAct = await resAct.json();
        setActividades(Array.isArray(dataAct) ? dataAct : []);
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    }

    try {
      const resRep = await fetch('/api/reportes-semanales');
      if (resRep.ok) {
        const dataRep = await resRep.json();
        setReportes(Array.isArray(dataRep) ? dataRep : []);
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalCrear = (diaPreseleccionado = 'Martes') => {
    setEditandoId(null);
    setForm({
      dia_semana: diaPreseleccionado,
      horario: '09:30 - 10:30',
      categoria: '',
      titulo: '',
      descripcion: '',
      material_requerido: '',
      color_etiqueta: '#0891b2',
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (act) => {
    setEditandoId(act.id_actividad);
    setForm({
      dia_semana: act.dia_semana,
      horario: act.horario,
      categoria: act.categoria,
      titulo: act.titulo,
      descripcion: act.descripcion || '',
      material_requerido: act.material_requerido || '',
      color_etiqueta: act.color_etiqueta || '#0891b2',
    });
    setModalAbierto(true);
  };

  const handleGuardarActividad = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      creado_por: usuario?.nombre ? `${usuario.nombre} (${usuario.rol})` : 'Dirección / Docentes',
    };

    const url = editandoId
      ? `/api/actividades/${editandoId}`
      : '/api/actividades';
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalAbierto(false);
        cargarDatos();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Error al guardar la actividad: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminarActividad = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta actividad del horario?')) return;
    try {
      await fetch(`/api/actividades/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGuardarReporte = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('semana_titulo', tituloSemana);
    formData.append('titulo', formReporte.titulo);
    formData.append('descripcion', formReporte.descripcion);
    formData.append(
      'creado_por',
      usuario?.nombre ? `${usuario.nombre} (${usuario.rol})` : 'Dirección / Docentes'
    );
    if (fotoReporte) {
      formData.append('foto', fotoReporte);
    }

    try {
      const res = await fetch('/api/reportes-semanales', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setModalReporteAbierto(false);
        setFormReporte({ titulo: '', descripcion: '' });
        setFotoReporte(null);
        cargarDatos();
      } else {
        alert('Error al publicar el reporte semanal');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminarReporte = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta publicación del reporte semanal?')) return;
    try {
      await fetch(`/api/reportes-semanales/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  const horariosUnicos =
    actividades.length > 0
      ? Array.from(new Set(actividades.map((a) => a.horario || '09:30 - 10:30'))).sort()
      : ['09:30 - 10:30'];

  const reportesSemanaActual = reportes.filter((r) => r.semana_titulo === tituloSemana);

  // Días habilitados para el selector del modal (excluye días inhábiles SEP de esta semana)
  const diasHabilitadosSemana = diasConFecha.filter((d) => !d.estatusSEP.bloqueado);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Barra superior con rango real de la semana */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '16px 20px',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              color: '#0f766e',
              letterSpacing: '0.5px',
            }}
          >
            Calendario Escolar Oficial SEP • Ciclo 2026-2027
          </span>
          <h2 style={{ color: '#0f172a', margin: '2px 0 4px 0', fontSize: '22px' }}>
            {tituloSemana}
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>
            {puedeEditar
              ? 'Los días inhábiles y periodos vacacionales oficiales de la SEP se bloquean automáticamente.'
              : 'Consulta el horario semanal, suspensiones oficiales SEP y el reporte fotográfico.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setDesplazamientoSemana((prev) => prev - 1)}
              style={{
                padding: '8px 12px',
                border: 'none',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setDesplazamientoSemana(0)}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                borderRight: '1px solid #cbd5e1',
                backgroundColor: desplazamientoSemana === 0 ? '#e6fffa' : 'white',
                color: '#0f766e',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Semana Actual
            </button>
            <button
              type="button"
              onClick={() => setDesplazamientoSemana((prev) => prev + 1)}
              style={{
                padding: '8px 12px',
                border: 'none',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              Siguiente
            </button>
          </div>

          {puedeEditar && diasHabilitadosSemana.length > 0 && (
            <button
              onClick={() => abrirModalCrear(diasHabilitadosSemana[0].nombre)}
              style={{
                backgroundColor: '#0f766e',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              + Nueva Actividad
            </button>
          )}
        </div>
      </div>

      {/* BANNER AUTOMÁTICO DE PERIODO VACACIONAL SEP */}
      {vacacionSemana && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '2px solid #3b82f6',
            color: '#1e40af',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <strong style={{ fontSize: '15px', display: 'block' }}>
              {vacacionSemana}
            </strong>
            <span style={{ fontSize: '13px' }}>
              No hay actividades escolares programadas durante este receso oficial establecido por la SEP.
            </span>
          </div>
          <span
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Receso Oficial SEP
          </span>
        </div>
      )}

      {/* TABLA DE HORARIO SEMANAL */}
      {cargando ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
          Cargando calendario semanal...
        </p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            marginBottom: '28px',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '1000px',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0f766e', color: 'white' }}>
                <th
                  style={{
                    width: '115px',
                    padding: '12px 8px',
                    borderRight: '1px solid #115e59',
                    fontSize: '13px',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  Horario
                </th>
                {diasConFecha.map((dia) => {
                  const esInhabil = dia.estatusSEP.bloqueado;
                  return (
                    <th
                      key={dia.nombre}
                      style={{
                        padding: '10px 8px',
                        borderRight: '1px solid #115e59',
                        textAlign: 'center',
                        backgroundColor: esInhabil
                          ? '#475569'
                          : dia.esHoy
                          ? '#0d9488'
                          : '#0f766e',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {dia.nombre}
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: esInhabil
                            ? '#fee2e2'
                            : dia.esHoy
                            ? '#fef08a'
                            : 'rgba(255,255,255,0.18)',
                          color: esInhabil ? '#991b1b' : dia.esHoy ? '#0f172a' : 'white',
                        }}
                      >
                        Día {dia.numeroDia} {esInhabil ? '• Sin clases' : dia.esHoy ? '(Hoy)' : ''}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {horariosUnicos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}
                  >
                    No hay actividades programadas para esta semana.
                  </td>
                </tr>
              ) : (
                horariosUnicos.map((bloqueHorario, rowIndex) => (
                  <tr key={bloqueHorario} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td
                      style={{
                        padding: '12px 8px',
                        backgroundColor: '#f1f5f9',
                        borderRight: '1px solid #cbd5e1',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#334155',
                        fontSize: '13px',
                        verticalAlign: 'middle',
                      }}
                    >
                      {bloqueHorario}
                    </td>

                    {diasConFecha.map((dia) => {
                      // Si el día está deshabilitado por calendario SEP, fusionamos verticalmente toda la columna del día
                      if (dia.estatusSEP.bloqueado) {
                        if (rowIndex > 0) return null;
                        const esVacacion = dia.estatusSEP.tipo === 'VACACIONES';
                        return (
                          <td
                            key={dia.nombre}
                            rowSpan={horariosUnicos.length}
                            style={{
                              padding: '16px',
                              borderRight: '1px solid #cbd5e1',
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              backgroundColor: esVacacion ? '#eff6ff' : '#f1f5f9',
                              color: esVacacion ? '#1e40af' : '#475569',
                            }}
                          >
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                marginBottom: '8px',
                                backgroundColor: esVacacion ? '#dbeafe' : '#fee2e2',
                                color: esVacacion ? '#1d4ed8' : '#b91c1c',
                              }}
                            >
                              {esVacacion ? 'Vacaciones SEP' : 'Día Inhábil SEP'}
                            </div>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', lineHeight: '1.4' }}>
                              {dia.estatusSEP.motivo}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                              Módulo deshabilitado por calendario oficial
                            </div>
                          </td>
                        );
                      }

                      const actividadesCelda = actividades.filter(
                        (a) =>
                          a.dia_semana === dia.nombre &&
                          (a.horario || '09:30 - 10:30') === bloqueHorario
                      );
                      const primeraActividad = actividadesCelda[0];
                      const colorCelda = primeraActividad?.color_etiqueta || '#0891b2';

                      return (
                        <td
                          key={dia.nombre}
                          style={{
                            padding: 0,
                            borderRight: '1px solid #cbd5e1',
                            verticalAlign: 'top',
                            backgroundColor:
                              actividadesCelda.length === 1
                                ? `${colorCelda}12`
                                : dia.esHoy
                                ? '#f0fdfa'
                                : 'white',
                          }}
                        >
                          {actividadesCelda.length === 0 ? (
                            <div
                              style={{
                                minHeight: '85px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#cbd5e1',
                                fontSize: '12px',
                                padding: '10px',
                              }}
                            >
                              <span>—</span>
                              {puedeEditar && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalCrear(dia.nombre)}
                                  style={{
                                    marginTop: '6px',
                                    background: 'none',
                                    border: '1px dashed #94a3b8',
                                    color: '#64748b',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  + Agregar
                                </button>
                              )}
                            </div>
                          ) : (
                            <div>
                              {actividadesCelda.map((act, index) => {
                                const colorAct = act.color_etiqueta || '#0891b2';
                                return (
                                  <div
                                    key={act.id_actividad}
                                    style={{
                                      padding: '10px 12px',
                                      borderLeft: `5px solid ${colorAct}`,
                                      backgroundColor:
                                        actividadesCelda.length > 1 ? `${colorAct}12` : 'transparent',
                                      borderBottom:
                                        index < actividadesCelda.length - 1
                                          ? '1px solid #cbd5e1'
                                          : 'none',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: colorAct,
                                        textTransform: 'uppercase',
                                        marginBottom: '2px',
                                      }}
                                    >
                                      {act.categoria}
                                    </div>

                                    <div
                                      style={{
                                        fontWeight: 'bold',
                                        color: '#0f172a',
                                        fontSize: '13.5px',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      {act.titulo}
                                    </div>

                                    {act.descripcion && (
                                      <p
                                        style={{
                                          margin: '0 0 6px 0',
                                          fontSize: '12px',
                                          color: '#334155',
                                          lineHeight: '1.35',
                                        }}
                                      >
                                        {act.descripcion}
                                      </p>
                                    )}

                                    {act.material_requerido && (
                                      <div
                                        style={{
                                          fontSize: '11.5px',
                                          color: '#92400e',
                                          backgroundColor: '#fef3c7',
                                          padding: '3px 6px',
                                          borderRadius: '3px',
                                          marginBottom: '6px',
                                        }}
                                      >
                                        <strong>Material:</strong> {act.material_requerido}
                                      </div>
                                    )}

                                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                                      Por: {act.creado_por}
                                    </div>

                                    {puedeEditar && (
                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '10px',
                                          marginTop: '6px',
                                          paddingTop: '4px',
                                          borderTop: '1px dashed #cbd5e1',
                                        }}
                                      >
                                        <button
                                          onClick={() => abrirModalEditar(act)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: '#0369a1',
                                            fontSize: '11.5px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleEliminarActividad(act.id_actividad)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: '#b91c1c',
                                            fontSize: '11.5px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}

              {/* Fila fija de Recreo */}
              <tr style={{ backgroundColor: '#fef3c7', borderTop: '2px solid #f59e0b' }}>
                <td
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#92400e',
                    fontSize: '12px',
                    borderRight: '1px solid #fcd34d',
                  }}
                >
                  10:30 - 11:00
                </td>
                <td
                  colSpan={5}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#92400e',
                    fontSize: '13px',
                    letterSpacing: '0.5px',
                  }}
                >
                  RECREO, REFRIGERIO Y LAVADO DE MANOS DIARIO (DÍAS HÁBILES)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* APARTADO DE REPORTE SEMANAL Y EVIDENCIAS FOTOGRÁFICAS */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '18px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#0f766e', fontSize: '19px' }}>
              Reporte Semanal y Evidencias Fotográficas
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Resumen de aprendizajes, logros del grupo y fotografías de lo trabajado durante la{' '}
              <strong>{tituloSemana.toLowerCase()}</strong>.
            </p>
          </div>

          {puedeEditar && (
            <button
              type="button"
              onClick={() => setModalReporteAbierto(true)}
              style={{
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              + Subir Reporte / Foto de la Semana
            </button>
          )}
        </div>

        {reportesSemanaActual.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
              fontSize: '13.5px',
            }}
          >
            Aún no se han subido reportes ni fotografías para la <strong>{tituloSemana}</strong>.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {reportesSemanaActual.map((rep) => (
              <div
                key={rep.id_reporte}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {rep.foto_url && (
                  <img
                    src={`${rep.foto_url}`}
                    alt={rep.titulo}
                    onClick={() => setImagenAmpliada(`${rep.foto_url}`)}
                    style={{
                      width: '100%',
                      height: '190px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      borderBottom: '1px solid #cbd5e1',
                    }}
                    title="Clic para ver fotografía completa"
                  />
                )}

                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '15px' }}>
                    {rep.titulo}
                  </h4>
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      color: '#334155',
                      fontSize: '13px',
                      lineHeight: '1.45',
                      flex: 1,
                    }}
                  >
                    {rep.descripcion}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '8px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '11.5px',
                      color: '#64748b',
                    }}
                  >
                    <span>Publicado por: {rep.creado_por}</span>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => handleEliminarReporte(rep.id_reporte)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#b91c1c',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontSize: '11.5px',
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar Actividad en Tabla */}
      {modalAbierto && puedeEditar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f766e' }}>
              {editandoId ? 'Editar Actividad del Horario' : 'Nueva Actividad Semanal'}
            </h3>
            <form onSubmit={handleGuardarActividad} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Día hábil:</label>
                  <select
                    value={form.dia_semana}
                    onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {diasConFecha.map((d) => (
                      <option key={d.nombre} value={d.nombre} disabled={d.estatusSEP.bloqueado}>
                        {d.nombre} {d.estatusSEP.bloqueado ? '(Inhábil SEP)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Horario:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 09:30 - 10:30"
                    value={form.horario}
                    onChange={(e) => setForm({ ...form, horario: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tipo de Actividad:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller de Arte, Motricidad Fina, Juegos..."
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Título de la Actividad:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pintura con esponjas"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Descripción:</label>
                <textarea
                  rows="2"
                  placeholder="Breve explicación de lo que harán los niños..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Material requerido de casa:</label>
                <input
                  type="text"
                  placeholder="Ej. Bata vieja, 1 bote de plastilina, Ninguno..."
                  value={form.material_requerido}
                  onChange={(e) => setForm({ ...form, material_requerido: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Color de celda:</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {COLORES_DISPONIBLES.map((c) => (
                    <button
                      type="button"
                      key={c.valor}
                      onClick={() => setForm({ ...form, color_etiqueta: c.valor })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c.valor,
                        border: form.color_etiqueta === c.valor ? '3px solid #0f172a' : '2px solid white',
                        cursor: 'pointer',
                      }}
                      title={c.nombre}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f766e',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Subir Reporte Semanal y Foto */}
      {modalReporteAbierto && puedeEditar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0284c7' }}>
              Publicar en Reporte Semanal
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '-6px' }}>
              Se publicará en: <strong>{tituloSemana}</strong>
            </p>

            <form onSubmit={handleGuardarReporte} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Título del reporte o actividad realizada:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Resultados del Taller de Acuarelas"
                  value={formReporte.titulo}
                  onChange={(e) => setFormReporte({ ...formReporte, titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Resumen / Observaciones para los tutores:</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe lo que lograron los niños durante la semana..."
                  value={formReporte.descripcion}
                  onChange={(e) => setFormReporte({ ...formReporte, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Fotografía de evidencia:</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFotoReporte(e.target.files[0])}
                  style={{ width: '100%', marginTop: '4px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalReporteAbierto(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284c7',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Publicar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver foto ampliada */}
      {imagenAmpliada && (
        <div
          onClick={() => setImagenAmpliada(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <img
            src={imagenAmpliada}
            alt="Evidencia ampliada"
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}