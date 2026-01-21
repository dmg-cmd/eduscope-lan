# EduScope LAN - Sistema de Gestión Académica

EduScope LAN es una plataforma de gestión académica similar a Gradescope, diseñada específicamente para funcionar en redes locales sin necesidad de conexión a internet. Permite a los profesores crear, aplicar y calificar exámenes, mientras los estudiantes pueden realizarlos y revisar su progreso.

## Características Principales

- **Gestión de Cursos**: Creación y administración de cursos con facilidad
- **Sistema de Exámenes**: Creación de exámenes con múltiples tipos de preguntas:
  - Opción múltiple
  - Verdadero/Falso
  - Numéricas
  - Respuesta abierta
- **Calificación Automática**: Respuestas de opción múltiple, verdadero/falso y numéricas se califican automáticamente
- **Calificación Manual**: Profesores pueden calificar preguntas abiertas con retroalimentación
- **Panel de Estadísticas**:
  - Promedio general del curso
  - Rendimiento por examen
  - Distribución de calificaciones
  - Análisis por tema/tema
  - Identificación de áreas de mejora
- **Historial Completo**: Registro de todas las entregas y calificaciones
- **Acceso desde Red Local**: Estudiantes acceden mediante la IP del servidor

## Requisitos

- Node.js 14.x o superior
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## Instalación

1. **Clona o descarga el proyecto**

2. **Instala las dependencias**
   ```bash
   cd eduscope-lan
   npm install
   ```

3. **Inicia el servidor**
   ```bash
   npm start
   ```

4. **Accede a la aplicación**
   - Desde el servidor: `http://localhost:3000`
   - Desde otros dispositivos: `http://IP-DEL-SERVIDOR:3000`

### Configuración de IP (Opcional)

Por defecto, el sistema detecta automáticamente la IP de tu red local. Si necesitas especificar una IP diferente (por ejemplo, cuando tienes múltiples interfaces de red), puedes usar una variable de entorno:

**Linux/Mac:**
```bash
EDUSCOPE_IP=192.168.1.100 npm start
```

**Windows (CMD):**
```cmd
set EDUSCOPE_IP=192.168.1.100 && npm start
```

**Windows (PowerShell):**
```powershell
$env:EDUSCOPE_IP="192.168.1.100"; npm start
```

También puedes usar la variable `HOST_IP` como alternativa:
```bash
HOST_IP=192.168.1.100 npm start
```

El servidor mostrará en la consola qué IP está utilizando y si fue especificada manualmente o detectada automáticamente.

## Credenciales de Demostración

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Profesor | profesor@demo.com | password123 |
| Estudiante | estudiante@demo.com | password123 |

## Uso

### Para Profesores

1. **Crear un Curso**
   - Inicia sesión como profesor
   - Haz clic en "Nuevo Curso"
   - Ingresa el código, nombre y descripción

2. **Inscribir Estudiantes**
   - Ve al curso creado
   - Haz clic en "Inscribir Estudiante"
   - Ingresa el correo del estudiante (debe estar registrado)

3. **Crear un Examen**
   - Ve al curso
   - Haz clic en "Crear Examen"
   - Agrega preguntas del tipo deseado
   - Define la respuesta correcta y el puntaje máximo
   - Asigna tags/temas para estadísticas

4. **Calificar Exámenes**
   - Ve al examen
   - Haz clic en "Calificar"
   - Revisa las respuestas de cada estudiante
   - Asigna puntajes a preguntas abiertas

5. **Ver Estadísticas**
   - Accede al panel de estadísticas del curso
   - Analiza el rendimiento por tema
   - Identifica áreas de mejora

### Para Estudiantes

1. **Inicia Sesión** con tus credenciales

2. **Ve al Curso** donde estás inscrito

3. **Realiza Exámenes** activos

4. **Revisa tus Resultados** en "Mi Progreso"

## Estructura del Proyecto

```
eduscope-lan/
├── app.js                 # Servidor principal
├── package.json           # Dependencias del proyecto
├── eduscope.sqlite        # Base de datos (se crea automáticamente)
├── public/                # Archivos estáticos
│   ├── index.html         # Página de inicio
│   ├── login.html         # Página de inicio de sesión
│   ├── dashboard.html     # Panel principal
│   ├── course.html        # Vista del curso
│   ├── exam-take.html     # Interface para realizar exámenes
│   ├── exam-grade.html    # Interface para calificar
│   ├── stats-course.html  # Estadísticas del curso
│   └── stats-student.html # Progreso del estudiante
└── scripts/               # Scripts adicionales
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Cursos
- `GET /api/courses` - Listar cursos
- `POST /api/courses` - Crear curso (profesor)
- `POST /api/courses/:id/enroll` - Inscribir estudiante

### Exámenes
- `GET /api/courses/:courseId/exams` - Listar exámenes
- `POST /api/courses/:courseId/exams` - Crear examen
- `GET /api/exams/:examId` - Obtener examen
- `POST /api/exams/:examId/submit` - Entregar examen

### Calificación
- `GET /api/exams/:examId/submissions` - Ver entregas
- `PUT /api/answers/:answerId/grade` - Calificar respuesta

### Estadísticas
- `GET /api/stats/course/:courseId` - Estadísticas del curso
- `GET /api/stats/student/:studentId` - Progreso del estudiante

## Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite (better-sqlite3)
- **Autenticación**: JWT + bcrypt
- **Frontend**: HTML5 + Bootstrap 5 + Vanilla JS
- **Gráficos**: Chart.js

## Licencia

MIT License

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerir mejoras.
