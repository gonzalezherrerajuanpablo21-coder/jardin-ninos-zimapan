import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json());

// Asegurar que la carpeta 'uploads' exista tanto en local como en producción
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Servir estáticamente la carpeta 'uploads' para visualizar fotos e INE desde React
app.use('/uploads', express.static('uploads'));

// Configuración de almacenamiento con Multer para subir imágenes y PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Helper para generar la URL pública dinámica (funciona en localhost y en la nube)
const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// Conexión a la base de datos en la nube (TiDB Cloud)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'test',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar a TiDB Cloud:', err.message);
    return;
  }
  console.log('✅ Conexión exitosa a la base de datos en la nube (TiDB Cloud)');
  connection.release();
});

// Capturador de errores globales del proceso para evitar que Node.js se cierre solo
process.on('uncaughtException', (err) => {
  console.error('⚠️ Excepción no capturada interceptada para prevenir caída del servidor:', err.message);
});

// ==========================================
// --- RUTAS API PARA USUARIOS Y LOGIN ---
// ==========================================

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const sqlUsuario = 'SELECT * FROM usuarios WHERE usuario = ?';

  db.query(sqlUsuario, [usuario], (err, result) => {
    if (res.headersSent) return;

    if (err) {
      console.error('Error en LOGIN:', err);
      return res.status(500).json({ error: err.message });
    }

    if (!result || result.length === 0 || result[0].password !== password) {
      return res.status(401).json({ message: 'Usuario o contraseña inválidos' });
    }

    return res.json({
      message: 'Bienvenido',
      usuario: {
        id_usuario: result[0].id_usuario,
        nombre: `${result[0].nombre} ${result[0].apellidos || ''}`.trim(),
        rol: result[0].rol || 'Docente',
        foto: result[0].foto || null
      }
    });
  });
});

app.post('/api/usuarios', upload.single('foto'), (req, res) => {
  const { nombre, apellidos, tipoUsuario, correo, telefono, usuario, password } = req.body;
  const fotoUrl = req.file ? `${getBaseUrl(req)}/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO usuarios (nombre, apellidos, rol, correo, telefono, usuario, password, foto) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [nombre, apellidos, tipoUsuario || 'Docente', correo, telefono || null, usuario, password, fotoUrl],
    (err, result) => {
      if (res.headersSent) return;

      if (err) {
        console.error('Error al registrar usuario:', err);
        return res.status(500).json({ error: err.message });
      }
      return res.json({
        id: result.insertId,
        foto: fotoUrl,
        message: 'Usuario registrado con éxito'
      });
    }
  );
});

// ==========================================
// --- RUTAS API PARA ALUMNOS ---
// ==========================================

app.get('/api/alumnos', (req, res) => {
  const { rol, tutorId, nombreTutor } = req.query;

  if (rol && rol.toUpperCase() === 'TUTOR') {
    const busquedas = [];
    const params = [];

    if (nombreTutor && nombreTutor.trim() !== '') {
      busquedas.push('tutor = ? OR tutor LIKE ?');
      params.push(nombreTutor.trim(), `%${nombreTutor.trim()}%`);
    }

    if (tutorId && String(tutorId).trim() !== '') {
      busquedas.push('tutor = ? OR tutor LIKE ?');
      params.push(String(tutorId).trim(), `%${String(tutorId).trim()}%`);
    }

    if (tutorId && !isNaN(tutorId)) {
      const sqlPorUsuario = `
        SELECT a.* FROM alumnos a
        WHERE a.tutor IN (
          SELECT TRIM(CONCAT(nombre, ' ', IFNULL(apellidos, ''))) FROM usuarios WHERE id_usuario = ?
        )
        OR a.tutor LIKE CONCAT('%', (SELECT nombre FROM usuarios WHERE id_usuario = ? LIMIT 1), '%')
      `;
      return db.query(sqlPorUsuario, [tutorId, tutorId], (err, result) => {
        if (res.headersSent) return;
        if (err) {
          console.error('❌ Error SQL alumnos tutor:', err.message);
          return res.status(500).json({ error: err.message });
        }
        return res.json(result || []);
      });
    }

    if (busquedas.length > 0) {
      const sqlTutor = `SELECT * FROM alumnos WHERE ${busquedas.join(' OR ')}`;
      return db.query(sqlTutor, params, (err, result) => {
        if (res.headersSent) return;
        if (err) {
          console.error('❌ Error SQL alumnos tutor:', err.message);
          return res.status(500).json({ error: err.message });
        }
        return res.json(result || []);
      });
    }
  }

  const sqlGeneral = 'SELECT * FROM alumnos';
  db.query(sqlGeneral, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al consultar lista general de alumnos:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json(result || []);
  });
});

app.post('/api/alumnos', (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, fecha_Nacimiento, CURP, tutor, telefono_contacto } = req.body;
  const sql = `
    INSERT INTO alumnos (nombre, apellido_paterno, apellido_materno, fecha_Nacimiento, CURP, tutor, telefono_contacto, estatus) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')
  `;

  db.query(
    sql,
    [nombre, apellido_paterno, apellido_materno, fecha_Nacimiento, CURP, tutor || null, telefono_contacto || null],
    (err, result) => {
      if (res.headersSent) return;
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ id: result.insertId, message: 'Alumno registrado con éxito' });
    }
  );
});

app.put('/api/alumnos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, apellido_paterno, apellido_materno, fecha_Nacimiento, CURP, tutor, telefono_contacto } = req.body;
  const sql = `
    UPDATE alumnos 
    SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, fecha_Nacimiento = ?, CURP = ?, tutor = ?, telefono_contacto = ? 
    WHERE id_alumno = ?
  `;

  db.query(
    sql,
    [nombre, apellido_paterno, apellido_materno, fecha_Nacimiento, CURP, tutor || null, telefono_contacto || null, id],
    (err) => {
      if (res.headersSent) return;
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'Alumno actualizado con éxito' });
    }
  );
});

// Ruta exclusiva para mover alumnos entre Activo y Antiguo (Directivos)
app.put('/api/alumnos/:id/estatus', (req, res) => {
  const { id } = req.params;
  const { estatus } = req.body;
  const sql = 'UPDATE alumnos SET estatus = ? WHERE id_alumno = ?';

  db.query(sql, [estatus || 'Activo', id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al cambiar estatus del alumno:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Estatus del alumno actualizado con éxito' });
  });
});

app.post('/api/alumnos/:id/foto', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se seleccionó ninguna imagen' });

  const fotoUrl = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
  const sql = 'UPDATE alumnos SET fotoUrl = ? WHERE id_alumno = ?';

  db.query(sql, [fotoUrl, id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Foto de alumno actualizada', fotoUrl });
  });
});

app.post('/api/alumnos/:id/foto-tutor', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se seleccionó ninguna imagen para el tutor' });

  const foto_tutor = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
  const sql = 'UPDATE alumnos SET foto_tutor = ? WHERE id_alumno = ?';

  db.query(sql, [foto_tutor, id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Foto del tutor actualizada', foto_tutor });
  });
});

app.delete('/api/alumnos/:id/foto', (req, res) => {
  const { id } = req.params;
  const sql = 'UPDATE alumnos SET fotoUrl = NULL WHERE id_alumno = ?';
  db.query(sql, [id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Foto eliminada con éxito' });
  });
});

app.delete('/api/alumnos/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM alumnos WHERE id_alumno = ?';
  db.query(sql, [id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Alumno eliminado correctamente' });
  });
});

// ==========================================
// --- RUTAS API PARA ENTIDAD TUTOR ---
// ==========================================

app.get('/api/tutores', (req, res) => {
  const sql = 'SELECT * FROM tutor ORDER BY id_tutor DESC';
  db.query(sql, (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json(result || []);
  });
});

app.get('/api/tutores/curp/:curp', (req, res) => {
  const { curp } = req.params;
  const sql = 'SELECT * FROM tutor WHERE curp = ?';
  db.query(sql, [curp], (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Tutor no encontrado' });
    }
    return res.json(result[0]);
  });
});

app.get('/api/tutores/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM tutor WHERE id_tutor = ?';
  db.query(sql, [id], (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json((result && result[0]) || {});
  });
});

app.post('/api/tutores', upload.fields([{ name: 'foto_perfil', maxCount: 1 }, { name: 'documento_ine', maxCount: 1 }]), (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    telefono_principal,
    telefono_secundario,
    correo,
    parentesco,
    calle,
    colonia,
    municipio,
    cp,
    id_usuario
  } = req.body;

  const foto_perfil = req.files?.['foto_perfil'] ? `${getBaseUrl(req)}/uploads/${req.files['foto_perfil'][0].filename}` : null;
  const documento_ine = req.files?.['documento_ine'] ? `${getBaseUrl(req)}/uploads/${req.files['documento_ine'][0].filename}` : null;

  const sql = `
    INSERT INTO tutor (
      nombre, apellido_paterno, apellido_materno, curp, 
      telefono, telefono_secundario, correo, parentesco, 
      calle, colonia, municipio, cp, foto_perfil, documento_ine, id_usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    telefono_principal,
    telefono_secundario || null,
    correo || null,
    parentesco || 'Padre/Tutor Legal',
    calle || null,
    colonia || null,
    municipio || 'Zimapán',
    cp || null,
    foto_perfil,
    documento_ine,
    id_usuario || null
  ];

  db.query(sql, params, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('Error SQL al registrar tutor:', err);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ id_tutor: result.insertId, message: 'Tutor registrado correctamente' });
  });
});

app.put('/api/tutores/:id', (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    telefono,
    telefono_secundario,
    correo,
    parentesco,
    calle,
    colonia,
    municipio,
    cp
  } = req.body;

  const sql = `
    UPDATE tutor SET
      nombre = ?, apellido_paterno = ?, apellido_materno = ?, curp = ?,
      telefono = ?, telefono_secundario = ?, correo = ?, parentesco = ?,
      calle = ?, colonia = ?, municipio = ?, cp = ?
    WHERE id_tutor = ?
  `;

  db.query(
    sql,
    [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      curp || null,
      telefono || null,
      telefono_secundario || null,
      correo || null,
      parentesco || 'Padre/Tutor Legal',
      calle || null,
      colonia || null,
      municipio || 'Zimapán',
      cp || null,
      id
    ],
    (err) => {
      if (res.headersSent) return;
      if (err) {
        console.error('❌ Error SQL al editar tutor:', err.message);
        return res.status(500).json({ error: err.message });
      }
      return res.json({ message: 'Tutor actualizado correctamente' });
    }
  );
});

app.delete('/api/tutores/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM tutor WHERE id_tutor = ?';

  db.query(sql, [id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al eliminar tutor:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Tutor eliminado correctamente' });
  });
});

// ==========================================
// --- RUTAS API PARA PERSONAS AUTORIZADAS ---
// ==========================================

app.get('/api/alumnos/:id/autorizados', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM personas_autorizadas WHERE id_alumno = ? ORDER BY id_autorizado ASC';
  db.query(sql, [id], (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json(result || []);
  });
});

app.post('/api/alumnos/:id/autorizados', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  const { nombre, parentesco, telefono } = req.body;

  if (!nombre || !parentesco) {
    return res.status(400).json({ error: 'El nombre y el parentesco son requeridos.' });
  }

  const fotoUrl = req.file ? `${getBaseUrl(req)}/uploads/${req.file.filename}` : null;
  const sql = `
    INSERT INTO personas_autorizadas (id_alumno, nombre, parentesco, telefono, fotoUrl) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [id, nombre, parentesco, telefono || null, fotoUrl], (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ id_autorizado: result.insertId, fotoUrl, message: 'Persona autorizada registrada' });
  });
});

app.delete('/api/autorizados/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM personas_autorizadas WHERE id_autorizado = ?';
  db.query(sql, [id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Persona autorizada eliminada' });
  });
});

// ==========================================
// --- RUTAS API PARA ASISTENCIAS ---
// ==========================================

app.get('/api/asistencias', (req, res) => {
  const { rol, nombreTutor } = req.query;

  let sql = `
    SELECT 
      a.id_asistencias,
      a.id_alumno,
      a.razon,
      a.fecha,
      a.estatus,
      a.justificante,
      a.archivoNombre,
      CONCAT(al.nombre, ' ', al.apellido_paterno, ' ', IFNULL(al.apellido_materno, '')) AS alumno_nombre,
      al.fotoUrl,
      al.tutor
    FROM asistencias a
    INNER JOIN alumnos al ON a.id_alumno = al.id_alumno
  `;
  const params = [];

  if (rol && rol.toUpperCase() === 'TUTOR' && nombreTutor) {
    sql += ' WHERE al.tutor = ? OR al.tutor LIKE ?';
    params.push(nombreTutor.trim(), `%${nombreTutor.trim()}%`);
  }

  sql += ' ORDER BY a.fecha DESC, a.id_asistencias DESC';

  db.query(sql, params, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al consultar asistencias:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

app.post('/api/asistencias', (req, res) => {
  const { id_alumno, fecha, estatus, razon } = req.body;
  const sql = 'INSERT INTO asistencias (id_alumno, fecha, estatus, razon) VALUES (?, ?, ?, ?)';
  db.query(sql, [id_alumno, fecha, estatus, razon || null], (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al registrar asistencia:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: result.insertId, message: 'Asistencia registrada correctamente' });
  });
});

app.put('/api/asistencias/:id/responder', (req, res) => {
  const { id } = req.params;
  const { respuesta } = req.body;

  if (!respuesta) {
    return res.status(400).json({ error: 'Se requiere una respuesta del tutor' });
  }

  const sql = 'UPDATE asistencias SET razon = ? WHERE id_asistencias = ?';
  db.query(sql, [respuesta, id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al guardar respuesta del tutor:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Respuesta registrada correctamente' });
  });
});

app.put('/api/asistencias/:id/justificar', upload.single('justificante'), (req, res) => {
  const { id } = req.params;
  const { razon } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Debes adjuntar un archivo como justificante' });
  }

  const justificanteUrl = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
  const archivoNombre = req.file.originalname;

  const sql = `
    UPDATE asistencias 
    SET estatus = 'Justificado', razon = ?, justificante = ?, archivoNombre = ? 
    WHERE id_asistencias = ?
  `;

  db.query(sql, [razon || 'Justificante adjunto por tutor', justificanteUrl, archivoNombre, id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al guardar justificante:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Justificante subido y asistencia actualizada',
      justificante: justificanteUrl,
      archivoNombre
    });
  });
});

// ==========================================
// --- RUTAS API PARA HISTORIAL MÉDICO ---
// ==========================================

app.get('/api/historial-medico', (req, res) => {
  const { rol, nombreTutor } = req.query;

  let sql = `
    SELECT 
      hm.*,
      CONCAT(al.nombre, ' ', al.apellido_paterno, ' ', IFNULL(al.apellido_materno, '')) AS alumno_nombre,
      COALESCE(hm.foto_alumno, al.fotoUrl) AS fotoUrl,
      al.CURP,
      al.tutor
    FROM historial_medico hm
    INNER JOIN alumnos al ON hm.id_alumno = al.id_alumno
  `;
  const params = [];

  if (rol && rol.toUpperCase() === 'TUTOR' && nombreTutor) {
    sql += ' WHERE al.tutor = ? OR al.tutor LIKE ?';
    params.push(nombreTutor.trim(), `%${nombreTutor.trim()}%`);
  }

  sql += ' ORDER BY hm.fecha_actualizacion DESC';

  db.query(sql, params, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al consultar historial médico:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

app.post('/api/historial-medico', upload.single('foto'), (req, res) => {
  const {
    id_alumno,
    foto_alumno,
    tipo_sangre,
    alergias,
    padecimientos,
    medicamentos_prohibidos,
    seguro_medico,
    nss_poliza,
    hospital_traslado,
    contacto_emergencia,
    telefono_emergencia,
    vacunas_completas,
    autoriza_primeros_auxilios,
    observaciones,
    actualizado_por
  } = req.body || {};

  if (!id_alumno) {
    return res.status(400).json({ error: 'Debes seleccionar un alumno' });
  }

  const fotoFinal = req.file
    ? `${getBaseUrl(req)}/uploads/${req.file.filename}`
    : (foto_alumno || null);

  const sql = `
    INSERT INTO historial_medico (
      id_alumno, foto_alumno, tipo_sangre, alergias, padecimientos, medicamentos_prohibidos,
      seguro_medico, nss_poliza, hospital_traslado, contacto_emergencia, telefono_emergencia,
      vacunas_completas, autoriza_primeros_auxilios, observaciones, actualizado_por
    ) VALUES (?, COALESCE(?, (SELECT fotoUrl FROM alumnos WHERE id_alumno = ?)), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      foto_alumno = COALESCE(VALUES(foto_alumno), foto_alumno),
      tipo_sangre = VALUES(tipo_sangre),
      alergias = VALUES(alergias),
      padecimientos = VALUES(padecimientos),
      medicamentos_prohibidos = VALUES(medicamentos_prohibidos),
      seguro_medico = VALUES(seguro_medico),
      nss_poliza = VALUES(nss_poliza),
      hospital_traslado = VALUES(hospital_traslado),
      contacto_emergencia = VALUES(contacto_emergencia),
      telefono_emergencia = VALUES(telefono_emergencia),
      vacunas_completas = VALUES(vacunas_completas),
      autoriza_primeros_auxilios = VALUES(autoriza_primeros_auxilios),
      observaciones = VALUES(observaciones),
      actualizado_por = VALUES(actualizado_por)
  `;

  const values = [
    id_alumno,
    fotoFinal,
    id_alumno,
    tipo_sangre || 'O+',
    alergias || 'Ninguna conocida',
    padecimientos || 'Ninguno',
    medicamentos_prohibidos || 'Ninguno',
    seguro_medico || 'Sin especificar',
    nss_poliza || '',
    hospital_traslado || '',
    contacto_emergencia || '',
    telefono_emergencia || '',
    vacunas_completas || 'Sí',
    autoriza_primeros_auxilios || 'Sí',
    observaciones || '',
    actualizado_por || 'Dirección / Tutor'
  ];

  db.query(sql, values, (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al guardar historial médico:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Expediente médico guardado correctamente' });
  });
});

// ==========================================
// --- RUTAS DE PLANTILLA DOCENTE (MAESTROS) ---
// ==========================================

app.get('/api/maestros', (req, res) => {
  const sql = 'SELECT * FROM maestros ORDER BY id_maestro DESC';
  db.query(sql, (err, results) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al consultar maestros:', err);
      return res.status(500).json({ error: 'Error al obtener la plantilla docente' });
    }
    return res.json(results || []);
  });
});

app.post('/api/maestros', (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    rfc,
    nss,
    cedula_profesional,
    grado_estudios,
    puesto,
    grupo_asignado,
    tipo_plaza,
    fecha_ingreso,
    telefono,
    correo,
    contacto_emergencia,
    estatus
  } = req.body;

  const sql = `
    INSERT INTO maestros (
      CURP, rfc, nss, nombre, apellido_paterno, apellido_materno,
      cedula_profesional, grado_estudios, puesto, grupo_asignado,
      tipo_plaza, fecha_ingreso, telefono, correo, contacto_emergencia, estatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    curp || null,
    rfc || null,
    nss || null,
    nombre,
    apellido_paterno,
    apellido_materno || null,
    cedula_profesional || null,
    grado_estudios || 'Licenciatura en Educación Preescolar',
    puesto || 'Docente Frente a Grupo',
    grupo_asignado || '1° A',
    tipo_plaza || 'Base',
    fecha_ingreso || null,
    telefono || null,
    correo || null,
    contacto_emergencia || null,
    estatus || 'Activo'
  ];

  db.query(sql, values, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al registrar maestro:', err);
      return res.status(500).json({ error: 'No se pudo registrar el maestro (verifica si la CURP ya existe)' });
    }
    return res.status(201).json({
      message: 'Maestro registrado correctamente',
      id_maestro: result.insertId
    });
  });
});

app.put('/api/maestros/:id', (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    rfc,
    nss,
    cedula_profesional,
    grado_estudios,
    puesto,
    grupo_asignado,
    tipo_plaza,
    fecha_ingreso,
    telefono,
    correo,
    contacto_emergencia,
    estatus
  } = req.body;

  const sql = `
    UPDATE maestros SET
      CURP = ?, rfc = ?, nss = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?,
      cedula_profesional = ?, grado_estudios = ?, puesto = ?, grupo_asignado = ?,
      tipo_plaza = ?, fecha_ingreso = ?, telefono = ?, correo = ?,
      contacto_emergencia = ?, estatus = ?
    WHERE id_maestro = ?
  `;

  const values = [
    curp || null,
    rfc || null,
    nss || null,
    nombre,
    apellido_paterno,
    apellido_materno || null,
    cedula_profesional || null,
    grado_estudios || 'Licenciatura en Educación Preescolar',
    puesto || 'Docente Frente a Grupo',
    grupo_asignado || '1° A',
    tipo_plaza || 'Base',
    fecha_ingreso || null,
    telefono || null,
    correo || null,
    contacto_emergencia || null,
    estatus || 'Activo',
    id
  ];

  db.query(sql, values, (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al actualizar maestro:', err);
      return res.status(500).json({ error: 'Error al actualizar expediente docente' });
    }
    return res.json({ message: 'Maestro actualizado correctamente' });
  });
});

app.delete('/api/maestros/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM maestros WHERE id_maestro = ?', [id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al eliminar maestro:', err);
      return res.status(500).json({ error: 'Error al eliminar el registro docente' });
    }
    return res.json({ message: 'Maestro eliminado correctamente' });
  });
});

// ==========================================
// --- RUTAS API PARA DIRECCIÓN ---
// ==========================================

app.get('/api/direccion', (req, res) => {
  const sql = 'SELECT * FROM direccion';
  db.query(sql, (err, result) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json(result || []);
  });
});

// ==========================================
// RUTAS DE ACTIVIDADES SEMANALES (KÍNDER)
// ==========================================

app.get('/api/actividades', (req, res) => {
  const sql = `
    SELECT * FROM actividades_kinder
    ORDER BY FIELD(dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'), horario ASC
  `;
  db.query(sql, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al obtener actividades:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json(result || []);
  });
});

app.post('/api/actividades', (req, res) => {
  const { dia_semana, horario, categoria, titulo, descripcion, material_requerido, color_etiqueta, creado_por } = req.body || {};

  const sql = `
    INSERT INTO actividades_kinder 
    (dia_semana, horario, categoria, titulo, descripcion, material_requerido, color_etiqueta, creado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    dia_semana,
    horario,
    categoria,
    titulo,
    descripcion || '',
    material_requerido || 'Ninguno',
    color_etiqueta || '#0891b2',
    creado_por || 'Dirección / Docentes'
  ];

  db.query(sql, values, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al crear actividad:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Actividad creada correctamente', id: result.insertId });
  });
});

app.put('/api/actividades/:id', upload.single('evidencia'), (req, res) => {
  const { id } = req.params;
  const { dia_semana, horario, categoria, titulo, descripcion, material_requerido, color_etiqueta, creado_por } = req.body || {};

  if (req.file) {
    const evidencia_url = `/uploads/${req.file.filename}`;
    const archivo_nombre = req.file.originalname;
    const sql = `
      UPDATE actividades_kinder 
      SET dia_semana = ?, horario = ?, categoria = ?, titulo = ?, descripcion = ?, 
          material_requerido = ?, color_etiqueta = ?, evidencia_url = ?, archivo_nombre = ?, creado_por = ?
      WHERE id_actividad = ?
    `;
    const values = [
      dia_semana,
      horario,
      categoria,
      titulo,
      descripcion || '',
      material_requerido || 'Ninguno',
      color_etiqueta || '#0891b2',
      evidencia_url,
      archivo_nombre,
      creado_por || 'Dirección / Docentes',
      id
    ];
    return db.query(sql, values, (err) => {
      if (res.headersSent) return;
      if (err) {
        console.error('❌ Error SQL al editar actividad:', err.message);
        return res.status(500).json({ error: err.message });
      }
      return res.json({ message: 'Actividad y evidencia actualizadas' });
    });
  } else {
    const sql = `
      UPDATE actividades_kinder 
      SET dia_semana = ?, horario = ?, categoria = ?, titulo = ?, descripcion = ?, 
          material_requerido = ?, color_etiqueta = ?, creado_por = ?
      WHERE id_actividad = ?
    `;
    const values = [
      dia_semana,
      horario,
      categoria,
      titulo,
      descripcion || '',
      material_requerido || 'Ninguno',
      color_etiqueta || '#0891b2',
      creado_por || 'Dirección / Docentes',
      id
    ];
    return db.query(sql, values, (err) => {
      if (res.headersSent) return;
      if (err) {
        console.error('❌ Error SQL al editar actividad:', err.message);
        return res.status(500).json({ error: err.message });
      }
      return res.json({ message: 'Actividad actualizada correctamente' });
    });
  }
});

app.delete('/api/actividades/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM actividades_kinder WHERE id_actividad = ?', [id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL al eliminar actividad:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Actividad eliminada' });
  });
});

// ==========================================
// --- RUTAS API PARA REPORTE SEMANAL ---
// ==========================================

app.get('/api/reportes-semanales', (req, res) => {
  const sql = 'SELECT * FROM reportes_semanales ORDER BY fecha_creacion DESC';
  db.query(sql, (err, result) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error SQL reportes semanales:', err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json(result || []);
  });
});

app.post('/api/reportes-semanales', upload.single('foto'), (req, res) => {
  const { semana_titulo, titulo, descripcion, creado_por } = req.body || {};
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO reportes_semanales (semana_titulo, titulo, descripcion, foto_url, creado_por)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [semana_titulo, titulo, descripcion, foto_url, creado_por || 'Dirección / Docentes'],
    (err, result) => {
      if (res.headersSent) return;
      if (err) {
        console.error('❌ Error SQL al crear reporte:', err.message);
        return res.status(500).json({ error: err.message });
      }
      return res.json({ id: result.insertId, message: 'Reporte semanal publicado' });
    }
  );
});

app.delete('/api/reportes-semanales/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM reportes_semanales WHERE id_reporte = ?', [id], (err) => {
    if (res.headersSent) return;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Reporte eliminado' });
  });
});

// 5. Subir / actualizar fotografía del docente
app.post('/api/maestros/:id/foto', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'No se seleccionó ninguna imagen' });
  }

  const fotoUrl = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
  const sql = 'UPDATE maestros SET fotoUrl = ? WHERE id_maestro = ?';

  db.query(sql, [fotoUrl, id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al guardar foto del docente:', err);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Fotografía del docente actualizada', fotoUrl });
  });
});

// =========================================================================
// --- RUTAS DEL MÓDULO DE DIRECCIÓN (EVENTOS, AVISOS Y CONTROL) ---
// =========================================================================

// 1. Obtener agenda y avisos de Dirección
app.get('/api/direccion/eventos', (req, res) => {
  const sql = 'SELECT * FROM eventos_direccion ORDER BY fecha_evento ASC, id_evento DESC';
  db.query(sql, (err, results) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al obtener eventos de dirección:', err);
      return res.status(500).json({ error: err.message });
    }
    return res.json(results);
  });
});

// 2. Crear nuevo evento o aviso de Dirección
app.post('/api/direccion/eventos', (req, res) => {
  const { titulo, tipo, fecha_evento, descripcion, prioridad } = req.body;
  if (!titulo || !fecha_evento) {
    return res.status(400).json({ error: 'Título y fecha son obligatorios' });
  }

  const sql = `
    INSERT INTO eventos_direccion (titulo, tipo, fecha_evento, descripcion, prioridad)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [titulo.trim(), tipo || 'Aviso Administrativo', fecha_evento, descripcion || '', prioridad || 'Normal'],
    (err, result) => {
      if (res.headersSent) return;
      if (err) {
        console.error('❌ Error al guardar evento de dirección:', err);
        return res.status(500).json({ error: err.message });
      }
      return res.status(201).json({
        message: 'Evento registrado en Dirección',
        id_evento: result.insertId
      });
    }
  );
});

// 3. Eliminar evento o aviso de Dirección
app.delete('/api/direccion/eventos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM eventos_direccion WHERE id_evento = ?', [id], (err) => {
    if (res.headersSent) return;
    if (err) {
      console.error('❌ Error al eliminar evento:', err);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Evento eliminado' });
  });
});

// ==========================================
// INICIO DEL SERVIDOR (SIEMPRE AL FINAL)
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Backend activo en http://localhost:${PORT}`);
});