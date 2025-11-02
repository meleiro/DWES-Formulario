// ---------------------------------------------------------
//   CONFIGURACIÓN INICIAL
// ---------------------------------------------------------

// Importamos el módulo 'express', que permite crear un servidor web fácilmente.
const express = require("express");

// Creamos una instancia de la aplicación Express.
const app = express();

// Importamos 'path' (módulo nativo de Node.js) para trabajar con rutas de archivos del sistema.
const path = require("path");

// Definimos el puerto en el que escuchará el servidor.
const PORT = 3000;

// Importamos 'dayjs', una librería para manejar fechas y horas.
// También se configura en idioma español.
const dayjs = require("dayjs");
require("dayjs/locale/es");
dayjs.locale("es");

// Librería para trabajar con cookies (leer, crear, eliminar).
const cookieParser = require("cookie-parser");

// Librería para manejar sesiones de usuario (mantiene datos entre peticiones).
const session = require("express-session");

// ---------------------------------------------------------
//   MIDDLEWARES (se ejecutan antes de las rutas)
// ---------------------------------------------------------

// Middleware 1: Servir archivos estáticos (HTML, CSS, JS, imágenes, etc.).
// Esto permite acceder a cualquier archivo dentro de la carpeta "public".
// Ejemplo: http://localhost:3000/style.css buscará el archivo en /public/style.css
app.use(express.static(path.join(__dirname, "public")));

// Middleware 2: Configurar el motor de plantillas EJS.
// Esto indica a Express que los archivos de vistas (en la carpeta "views")
// tendrán extensión .ejs en lugar de .html.
app.set("view engine", "ejs");

// Middleware 3: Procesar datos de formularios (POST).
// Sin esto, `req.body` vendría vacío.
// - extended: true → permite analizar objetos anidados en los formularios.
app.use(express.urlencoded({ extended: true }));

// Middleware 4: Habilitar el uso de cookies.
app.use(cookieParser());

// Middleware 5: Configurar el sistema de sesiones.
app.use(session({
    secret: "clave para sesiones",   // Clave secreta para firmar la sesión (debe ser privada).
    resave: false,                   // No guarda la sesión si no ha cambiado.
    saveUninitialized: false,        // No crea sesión hasta que se guarde algo en ella.
    cookie: {
        httpOnly: true,              // La cookie no es accesible desde JavaScript (más seguro).
        maxAge: 1000 * 60 * 30       // Duración: 30 minutos.
    }
}));

// Middleware 6: Control de tiempo máximo por petición (timeout de 10 segundos).
// Evita que una petición quede colgada si el servidor tarda demasiado.
app.use((req, res, next) => {

    const ms = 10000; // 10 segundos

    const timer = setTimeout(() => {
        if (!res.headersSent) {
            console.warn("Tiempo de espera agotado");
            res.status(408).send("Tiempo de espera agotado");
        }
    }, ms);

    // Si la respuesta termina correctamente o se cierra la conexión,
    // cancelamos el temporizador.
    res.once("finish", () => clearTimeout(timer));
    res.once("close", () => clearTimeout(timer));

    next(); // Pasa al siguiente middleware o ruta.
});

// ---------------------------------------------------------
//   RUTA GET → Muestra el formulario vacío al usuario
// ---------------------------------------------------------
app.get("/form", (req, res) => {

    // Renderiza la vista "form.ejs" (carpeta /views).
    // Se pasan variables iniciales vacías para que los campos no den error.
    res.render("form", {
        nombre: "",      // campo de texto vacío
        edad: "",        // campo numérico vacío
        ciudad: "",      // selección vacía
        intereses: []    // sin checkboxes seleccionados
    });
});

// ---------------------------------------------------------
//   RUTA POST → Procesa los datos enviados desde el formulario
// ---------------------------------------------------------
app.post("/form", (req, res) => {

    // Extraemos los valores enviados desde el formulario (req.body).
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const ciudad = req.body.ciudad;

    // Intereses puede llegar como string o como array dependiendo del número de checkboxes seleccionados.
    let intereses = req.body.intereses || [];

    // Si solo se seleccionó un interés (string), lo convertimos a array.
    if (!Array.isArray(intereses)) { 
        intereses = [intereses]; 
    }

    // Creamos un array de errores para guardar mensajes de validación.
    let errores = [];

    // VALIDACIÓN 1: El nombre es obligatorio y debe tener mínimo 2 caracteres.
    if (!nombre || nombre.trim().length < 2) {
        errores.push("El nombre tiene que tener mínimo 2 caracteres.");
    }

    // VALIDACIÓN 2: La ciudad no puede quedar vacía.
    if (!ciudad) {
        errores.push("La ciudad no puede quedar vacía.");
    }

    // Si hay errores, devolvemos estado 400 (Bad Request)
    // y volvemos a mostrar el formulario con los errores visibles.
    if (errores.length) {
        return res
            .status(400)
            .render("form", { nombre, edad, ciudad, intereses, errores });
    }

    // Si todo está correcto, renderizamos la vista "resultado.ejs" 
    // mostrando los datos enviados por el usuario.
    res.render("resultado", {
        nombre,
        edad: edad || null, // si el campo edad está vacío, se envía como null
        ciudad,
        intereses
    });
});

// ---------------------------------------------------------
//   INICIO DEL SERVIDOR
// ---------------------------------------------------------
app.listen(PORT, () => {
    // Muestra mensaje en consola cuando el servidor está en marcha.
    console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});
