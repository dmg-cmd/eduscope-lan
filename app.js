// EduScope LAN - Servidor Principal
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const ip = require('ip');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'eduscope-lan-secret-key-2024';

// Base de datos
const db = new Database('eduscope.sqlite');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }
    
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido.' });
    }
};

const requireTeacher = (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de profesor.' });
    }
    next();
};

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Todos los campos son requeridos.' });
        }
        
        if (!['teacher', 'student'].includes(role)) {
            return res.status(400).json({ error: 'Rol inválido.' });
        }
        
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashedPassword, role);
        
        const token = jwt.sign({ id: result.lastInsertRowid, name, email, role }, SECRET_KEY, { expiresIn: '24h' });
        
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.json({ success: true, user: { id: result.lastInsertRowid, name, email, role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas.' });
        }
        
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas.' });
        }
        
        const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// ============================================
// RUTAS DE CURSOS
// ============================================
app.get('/api/courses', authenticateToken, (req, res) => {
    try {
        let courses;
        if (req.user.role === 'teacher') {
            courses = db.prepare('SELECT * FROM courses WHERE teacher_id = ?').all(req.user.id);
        } else {
            courses = db.prepare(`
                SELECT c.*, u.name as teacher_name 
                FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                JOIN users u ON c.teacher_id = u.id
                WHERE e.user_id = ?
            `).all(req.user.id);
        }
        res.json({ courses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/courses', authenticateToken, requireTeacher, (req, res) => {
    try {
        const { code, name, description } = req.body;
        
        if (!code || !name) {
            return res.status(400).json({ error: 'Código y nombre son requeridos.' });
        }
        
        const result = db.prepare('INSERT INTO courses (code, name, description, teacher_id) VALUES (?, ?, ?, ?)').run(code, name, description || '', req.user.id);
        res.json({ success: true, course: { id: result.lastInsertRowid, code, name, description } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/courses/:id/enroll', authenticateToken, requireTeacher, (req, res) => {
    try {
        const { studentEmail } = req.body;
        const courseId = req.params.id;
        
        const student = db.prepare('SELECT id FROM users WHERE email = ? AND role = "student"').get(studentEmail);
        if (!student) {
            return res.status(404).json({ error: 'Estudiante no encontrado.' });
        }
        
        const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(student.id, courseId);
        if (existing) {
            return res.status(400).json({ error: 'El estudiante ya está inscrito.' });
        }
        
        db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(student.id, courseId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/courses/:id/students', authenticateToken, requireTeacher, (req, res) => {
    try {
        const students = db.prepare(`
            SELECT u.id, u.name, u.email 
            FROM users u
            JOIN enrollments e ON u.id = e.user_id
            WHERE e.course_id = ? AND u.role = 'student'
        `).all(req.params.id);
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RUTAS DE EXÁMENES
// ============================================
app.get('/api/courses/:courseId/exams', authenticateToken, (req, res) => {
    try {
        let exams;
        if (req.user.role === 'teacher') {
            exams = db.prepare('SELECT * FROM exams WHERE course_id = ? ORDER BY created_at DESC').all(req.params.courseId);
        } else {
            exams = db.prepare(`
                SELECT e.*, s.submitted_at, s.total_score as score
                FROM exams e
                LEFT JOIN submissions s ON e.id = s.exam_id AND s.user_id = ?
                WHERE e.course_id = ?
                ORDER BY e.created_at DESC
            `).all(req.user.id, req.params.courseId);
        }
        res.json({ exams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/courses/:courseId/exams', authenticateToken, requireTeacher, (req, res) => {
    try {
        const { title, description, start_time, duration_minutes, questions } = req.body;
        
        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ error: 'Título y al menos una pregunta son requeridos.' });
        }
        
        const courseId = req.params.courseId;
        const startDate = start_time || new Date().toISOString();
        
        const examResult = db.prepare('INSERT INTO exams (course_id, title, description, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?)').run(courseId, title, description || '', startDate, duration_minutes || 60);
        
        const examId = examResult.lastInsertRowid;
        
        for (const q of questions) {
            db.prepare('INSERT INTO questions (exam_id, type, content, options, correct_answer, max_score, tags) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                examId, q.type, q.content, q.options ? JSON.stringify(q.options) : null, q.correct_answer || null, q.max_score || 1, q.tags || ''
            );
        }
        
        res.json({ success: true, exam: { id: examId, title, description, start_time: startDate, duration_minutes } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/exams/:examId', authenticateToken, (req, res) => {
    try {
        const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.examId);
        if (!exam) {
            return res.status(404).json({ error: 'Examen no encontrado.' });
        }
        
        const questions = db.prepare('SELECT id, type, content, options, max_score, tags FROM questions WHERE exam_id = ?').all(req.params.examId);
        
        questions.forEach(q => {
            if (q.options) {
                q.options = JSON.parse(q.options);
            }
            if (req.user.role === 'student') {
                delete q.correct_answer;
            }
        });
        
        res.json({ exam, questions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RUTAS DE ENTREGAS Y RESPUESTAS
// ============================================
app.post('/api/exams/:examId/submit', authenticateToken, (req, res) => {
    try {
        const { answers } = req.body;
        const examId = req.params.examId;
        
        const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
        if (!exam) {
            return res.status(404).json({ error: 'Examen no encontrado.' });
        }
        
        const existingSubmission = db.prepare('SELECT * FROM submissions WHERE exam_id = ? AND user_id = ?').get(examId, req.user.id);
        if (existingSubmission) {
            return res.status(400).json({ error: 'Ya has entregado este examen.' });
        }
        
        const questions = db.prepare('SELECT * FROM questions WHERE exam_id = ?').all(examId);
        
        let totalScore = 0;
        const submissionResult = db.prepare('INSERT INTO submissions (user_id, exam_id, submitted_at) VALUES (?, ?, ?)').run(req.user.id, examId, new Date().toISOString());
        const submissionId = submissionResult.lastInsertRowid;
        
        for (const q of questions) {
            const answer = answers.find(a => a.question_id === q.id);
            let score = 0;
            
            if (answer) {
                if (q.type === 'mcq' && q.correct_answer) {
                    const studentAnswer = answer.content.trim().toUpperCase();
                    const correctAnswer = q.correct_answer.trim().toUpperCase();
                    if (studentAnswer === correctAnswer) {
                        score = q.max_score;
                    }
                } else if (q.type === 'boolean') {
                    const studentAnswer = answer.content.trim().toLowerCase();
                    const correctAnswer = q.correct_answer.trim().toLowerCase();
                    if (studentAnswer === correctAnswer) {
                        score = q.max_score;
                    }
                } else if (q.type === 'number') {
                    if (parseFloat(answer.content) === parseFloat(q.correct_answer)) {
                        score = q.max_score;
                    }
                }
                // Para preguntas de texto, el score se deja en 0 para calificación manual
            }
            
            totalScore += score;
            
            db.prepare('INSERT INTO answers (submission_id, question_id, content, score) VALUES (?, ?, ?, ?)').run(
                submissionId, q.id, answer ? answer.content : '', score
            );
        }
        
        db.prepare('UPDATE submissions SET total_score = ? WHERE id = ?').run(totalScore, submissionId);
        
        res.json({ success: true, submission_id: submissionId, score: totalScore });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/exams/:examId/submissions', authenticateToken, requireTeacher, (req, res) => {
    try {
        const submissions = db.prepare(`
            SELECT s.*, u.name as student_name, u.email as student_email
            FROM submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.exam_id = ?
            ORDER BY s.submitted_at DESC
        `).all(req.params.examId);
        
        for (const sub of submissions) {
            const answers = db.prepare(`
                SELECT a.*, q.content as question_content, q.type, q.max_score, q.tags
                FROM answers a
                JOIN questions q ON a.question_id = q.id
                WHERE a.submission_id = ?
            `).all(sub.id);
            sub.answers = answers;
        }
        
        res.json({ submissions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/answers/:answerId/grade', authenticateToken, requireTeacher, (req, res) => {
    try {
        const { score, feedback } = req.body;
        
        const answer = db.prepare('SELECT * FROM answers WHERE id = ?').get(req.params.answerId);
        if (!answer) {
            return res.status(404).json({ error: 'Respuesta no encontrada.' });
        }
        
        db.prepare('UPDATE answers SET score = ?, feedback = ? WHERE id = ?').run(score, feedback || '', req.params.answerId);
        
        // Recalcular puntuación total
        const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(answer.submission_id);
        const totalScore = db.prepare('SELECT SUM(score) as total FROM answers WHERE submission_id = ?').get(answer.submission_id);
        
        db.prepare('UPDATE submissions SET total_score = ? WHERE id = ?').run(totalScore.total, answer.submission_id);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RUTAS DE ESTADÍSTICAS
// ============================================
app.get('/api/stats/course/:courseId', authenticateToken, requireTeacher, (req, res) => {
    try {
        const courseId = req.params.courseId;
        
        // Total de estudiantes inscritos
        const totalStudents = db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?').get(courseId);
        
        // Total de exámenes
        const totalExams = db.prepare('SELECT COUNT(*) as count FROM exams WHERE course_id = ?').get(courseId);
        
        // Promedio general del curso
        const avgScore = db.prepare(`
            SELECT AVG(s.total_score / (
                SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id
            ) * 100) as average
            FROM submissions s
            JOIN exams e ON s.exam_id = e.id
            WHERE e.course_id = ?
        `).get(courseId);
        
        // Rendimiento por examen
        const examStats = db.prepare(`
            SELECT e.id, e.title, 
                COUNT(s.id) as submissions,
                AVG(CASE WHEN s.id IS NOT NULL THEN 
                    s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = e.id)
                END) as average_score
            FROM exams e
            LEFT JOIN submissions s ON e.id = s.exam_id
            WHERE e.course_id = ?
            GROUP BY e.id
        `).all(courseId);
        
        // Temas con mayor dificultad (basado en tags)
        const topicStats = db.prepare(`
            SELECT q.tags as topic,
                AVG(a.score * 100.0 / q.max_score) as avg_score,
                COUNT(a.id) as attempts
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN submissions s ON a.submission_id = s.id
            JOIN exams e ON s.exam_id = e.id
            WHERE e.course_id = ? AND q.tags != ''
            GROUP BY q.tags
            ORDER BY avg_score ASC
        `).all(courseId);
        
        // Distribución de calificaciones
        const gradeDistribution = db.prepare(`
            SELECT 
                CASE 
                    WHEN (s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)) >= 90 THEN 'A (90-100)'
                    WHEN (s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)) >= 80 THEN 'B (80-89)'
                    WHEN (s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)) >= 70 THEN 'C (70-79)'
                    WHEN (s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)) >= 60 THEN 'D (60-69)'
                    ELSE 'F (0-59)'
                END as grade,
                COUNT(s.id) as count
            FROM submissions s
            JOIN exams e ON s.exam_id = e.id
            WHERE e.course_id = ?
            GROUP BY grade
        `).all(courseId);
        
        res.json({
            total_students: totalStudents.count,
            total_exams: totalExams.count,
            course_average: avgScore.average || 0,
            exam_stats: examStats,
            topic_stats: topicStats,
            grade_distribution: gradeDistribution
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats/student/:studentId', authenticateToken, (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        if (req.user.role !== 'teacher' && req.user.id != studentId) {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        
        // Progreso general
        const overallProgress = db.prepare(`
            SELECT 
                COUNT(DISTINCT e.id) as total_exams,
                COUNT(s.id) as completed_exams,
                AVG(CASE WHEN s.id IS NOT NULL THEN 
                    s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)
                END) as average_score
            FROM exams e
            LEFT JOIN submissions s ON e.id = s.exam_id AND s.user_id = ?
            JOIN enrollments en ON e.course_id = en.course_id
            WHERE en.user_id = ?
        `).get(studentId, studentId);
        
        // Rendimiento por curso
        const coursePerformance = db.prepare(`
            SELECT c.id, c.name, c.code,
                COUNT(s.id) as completed,
                AVG(CASE WHEN s.id IS NOT NULL THEN 
                    s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id)
                END) as average
            FROM courses c
            JOIN enrollments e ON c.id = e.course_id
            LEFT JOIN submissions s ON c.id IN (
                SELECT ex.course_id FROM exams ex WHERE ex.id = s.exam_id
            ) AND s.user_id = ?
            WHERE e.user_id = ?
            GROUP BY c.id
        `).all(studentId, studentId);
        
        // Tendencia de progreso (últimas 10 entregas)
        const progressTrend = db.prepare(`
            SELECT s.submitted_at, 
                s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id) as percentage
            FROM submissions s
            WHERE s.user_id = ?
            ORDER BY s.submitted_at DESC
            LIMIT 10
        `).all(studentId);
        
        // Fortalezas y debilidades por tema
        const topicPerformance = db.prepare(`
            SELECT q.tags as topic,
                AVG(a.score * 100.0 / q.max_score) as avg_score,
                COUNT(a.id) as attempts
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN submissions s ON a.submission_id = s.id
            WHERE s.user_id = ? AND q.tags != ''
            GROUP BY q.tags
            ORDER BY avg_score DESC
        `).all(studentId);
        
        // Historial detallado
        const submissionHistory = db.prepare(`
            SELECT s.*, e.title as exam_title, c.name as course_name,
                s.total_score * 100.0 / (SELECT SUM(q.max_score) FROM questions q WHERE q.exam_id = s.exam_id) as percentage
            FROM submissions s
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON e.course_id = c.id
            WHERE s.user_id = ?
            ORDER BY s.submitted_at DESC
        `).all(studentId);
        
        res.json({
            overall: overallProgress,
            courses: coursePerformance,
            trend: progressTrend.reverse(),
            topics: topicPerformance,
            history: submissionHistory
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RUTAS DE VISTAS (HTML)
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para generar código QR
app.get('/api/qrcode', async (req, res) => {
    try {
        const localIP = getLocalIP();
        const qrUrl = `http://${localIP}:${PORT}`;
        
        // Generar QR code como imagen base64
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#0f4c81',
                light: '#ffffff'
            }
        });
        
        res.json({ 
            url: qrUrl,
            qrcode: qrDataUrl 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qrcode.html'));
});
app.get('/qrcode.png', async (req, res) => {
    try {
        const localIP = getLocalIP();
        const qrUrl = `http://${localIP}:${PORT}`;
        
        const buffer = await QRCode.toBuffer(qrUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#0f4c81',
                light: '#ffffff'
            }
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/course/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'course.html'));
});

app.get('/exam/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam-take.html'));
});

app.get('/exam/:id/grading', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam-grade.html'));
});

app.get('/stats/course/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stats-course.html'));
});

app.get('/stats/student/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stats-student.html'));
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================
function getLocalIP() {
    try {
        return ip.address();
    } catch (e) {
        return 'localhost';
    }
}

function initDatabase() {
    // Crear tablas si no existen
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            teacher_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS enrollments (
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
        
        CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_time DATETIME,
            duration_minutes INTEGER DEFAULT 60,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
        
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('mcq', 'text', 'boolean', 'number')),
            content TEXT NOT NULL,
            options TEXT,
            correct_answer TEXT,
            max_score REAL DEFAULT 1,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            exam_id INTEGER NOT NULL,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_score REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (exam_id) REFERENCES exams(id),
            UNIQUE(user_id, exam_id)
        );
        
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            content TEXT,
            score REAL DEFAULT 0,
            feedback TEXT,
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES questions(id)
        );
    `);
    
    // Verificar si hay usuarios, si no, crear usuarios de prueba
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount.count === 0) {
        console.log('🔧 Creando usuarios de demostración...');
        
        const hashedPassword = bcrypt.hashSync('password123', 10);
        
        db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
            'Profesor Demo', 'profesor@demo.com', hashedPassword, 'teacher'
        );
        
        db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
            'Estudiante Demo', 'estudiante@demo.com', hashedPassword, 'student'
        );
        
        db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
            'Ana García', 'ana@demo.com', hashedPassword, 'student'
        );
        
        db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
            'Carlos López', 'carlos@demo.com', hashedPassword, 'student'
        );
        
        console.log('✅ Usuarios de demostración creados.');
    }
}

initDatabase();

app.listen(PORT, '0.0.0.0', async () => {
    const localIP = getLocalIP();
    const qrUrl = `http://${localIP}:${PORT}`;
    
    // Generar y guardar código QR
    let qrInfo = '';
    try {
        const qrPath = path.join(__dirname, 'public', 'qrcode.png');
        await QRCode.toFile(qrPath, qrUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#0f4c81',
                light: '#ffffff'
            }
        });
        qrInfo = `   📱 Código QR: ${qrUrl}`;
    } catch (error) {
        qrInfo = `   ⚠️  Error al generar QR: ${error.message}`;
    }
    
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏫 EduScope LAN - Servidor iniciado                      ║
║                                                            ║
║   📡 Acceso local:    http://localhost:${PORT}                ║
║   📡 Acceso en red:   http://${localIP}:${PORT}                  ║
║                                                            ║
${qrInfo}
║                                                            ║
║   👤 Credenciales de demostración:                         ║
║      Profesor:  profesor@demo.com / password123            ║
║      Estudiante: estudiante@demo.com / password123         ║
║                                                            ║
║   📄 Para ver el código QR en navegador:                   ║
║      http://localhost:${PORT}/qrcode.png                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});
