// -----------------------------------------------------------------------------
//  IMPORTACIONES Y CONFIGURACIÓN INICIAL
// -----------------------------------------------------------------------------

// Importamos el framework 'express', que simplifica la creación de servidores HTTP
// y el manejo de rutas, middleware y peticiones.
const express = require("express");

// Creamos una instancia de la aplicación Express.
const app = express();

// Importamos el módulo nativo 'path' para gestionar rutas de archivos en el sistema.
// Es muy útil para construir rutas absolutas sin depender del sistema operativo.
const path = require("path");

// Definimos el puerto en el que escuchará el servidor.
const PORT = 3000;

// Librería para manejar fechas de forma cómoda y legible.
// dayjs es similar a moment.js, pero más liviana.
const dayjs = require("dayjs");
require("dayjs/locale/es"); // Cargamos el idioma español
dayjs.locale("es");         // Establecemos el idioma por defecto

// Librerías para cookies y sesiones.
// cookie-parser analiza las cookies recibidas en la cabecera HTTP.
// express-session permite mantener datos persistentes entre peticiones (sesiones).
const cookieParser = require("cookie-parser");
const session = require("express-session");

// -----------------------------------------------------------------------------
//  MIDDLEWARES GLOBALES
// -----------------------------------------------------------------------------

// Middleware: funciones que interceptan las peticiones antes de llegar a las rutas.
// Son el corazón de Express: transforman, validan o añaden información al 'req' o 'res'.

// 2.1 Servir archivos estáticos
// Esto hace que Express sirva automáticamente archivos desde la carpeta "public".
// Por ejemplo, al acceder a http://localhost:3000/style.css, buscará "public/style.css".
app.use(express.static(path.join(__dirname, "public")));

// 2.2 Motor de plantillas EJS
// EJS permite usar plantillas HTML dinámicas con variables (<%= %>).
// Aquí indicamos que las vistas se encuentran en la carpeta /views y usan extensión .ejs.
app.set("view engine", "ejs");

// 2.3 Procesar datos enviados por formularios (body-parser integrado)
// Permite acceder a los datos enviados por POST en req.body.
// extended:true → permite analizar estructuras anidadas (objeto dentro de objeto).
app.use(express.urlencoded({ extended: true }));

// 2.4 Middleware de cookies
app.use(cookieParser());

// 2.5 Middleware de sesión
// - secret: clave usada para firmar las cookies (proteger integridad de sesión).
// - resave: false → no guarda la sesión en cada petición si no ha cambiado.
// - saveUninitialized: false → no guarda sesiones vacías.
// - cookie: configuración del comportamiento de la cookie de sesión.
app.use(session({
    secret: "clave para sesiones",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,            // no accesible desde JS del cliente (seguridad)
        maxAge: 1000 * 60 * 30     // caduca a los 30 minutos de inactividad
    }
}));

// -----------------------------------------------------------------------------
//  MIDDLEWARE PERSONALIZADO DE CONTROL DE TIEMPO DE RESPUESTA
// -----------------------------------------------------------------------------

// Este middleware supervisa que ninguna petición quede colgada más de X milisegundos.
// Si pasa ese tiempo sin que el servidor haya respondido, se envía un error 408.
app.use((req, res, next) => {

    const ms = 10000; // Tiempo máximo permitido (10 segundos)

    // Iniciamos un temporizador
    const timer = setTimeout(() => {
        // Si no se ha enviado una respuesta en ese tiempo, devolvemos un error.
        if (!res.headersSent){
            console.warn("Tiempo de espera agotado");
            res.status(408).send("Tiempo de espera agotado");
        }
    }, ms);

    // Cuando la respuesta termina o la conexión se cierra, limpiamos el temporizador.
    res.once("finish", () => clearTimeout(timer));
    res.once("close", () => clearTimeout(timer));

    next(); // Continuar con el siguiente middleware o ruta.
});

// -----------------------------------------------------------------------------
//  MIDDLEWARE DE AUTENTICACIÓN
// -----------------------------------------------------------------------------

// Esta función se usará en rutas protegidas (como /perfil).
// Verifica si hay un usuario guardado en la sesión.
// Si no existe, redirige al login.
function requiereAuth(req, res, next) {
    if (req.session.user) return next();
    res.redirect("/login");
}

// -----------------------------------------------------------------------------
//  RUTAS DE LOGIN, PERFIL Y LOGOUT
// -----------------------------------------------------------------------------

// GET /login → muestra el formulario de inicio de sesión
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// POST /login → procesa el formulario
app.post("/login", (req, res) => {
    const { usuario, password } = req.body;

    // Simulamos la verificación del usuario (en un caso real, se consultaría una BD).
    if (usuario && password === "1234") {
        // Guardamos al usuario autenticado en la sesión.
        req.session.user = { nombre: usuario };
        // Redirigimos al perfil.
        return res.redirect("/perfil");
    }

    // Si las credenciales son incorrectas, devolvemos error 401.
    res.status(401).render("login", { error: "Usuario o contraseña incorrectos" });
});

// GET /perfil → solo accesible si está autenticado
app.get("/perfil", requiereAuth, (req, res) => {
    const user = req.session.user;
    res.render("perfil", { user });
});

// Ruta GET que recibe un parámetro dinámico en la URL: /tema/claro , /tema/oscuro , etc.
app.get("/tema/:modo", (req, res) => {

    // Extraemos el valor del parámetro "modo" desde la URL.
    // Ejemplo: si la URL es /tema/oscuro → modo = "oscuro".
    const modo = req.params.modo;

    // Guardamos el valor del modo en una cookie llamada "tema".
    // Opciones de la cookie:
    // - httpOnly:true → no accesible desde JavaScript del cliente (más seguro).
    // - maxAge → duración de la cookie (aquí, 7 días).
    res.cookie("tema", modo, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });
    
    // Redirige a la ruta "/temas" después de guardar la cookie.
    res.redirect("/temas");
});


// Ruta para borrar el tema guardado en la cookie.
app.get("/borrar-tema", (req, res) => {

    // Elimina la cookie llamada "tema".
    res.clearCookie("tema");

    // Redirige a la página donde se visualiza el tema.
    res.redirect("/temas");
});


// Ruta que muestra la página con el modo de tema aplicado.
app.get("/temas", (req, res) => {

    // Recuperamos la cookie "tema".
    // Si no existe, usamos "claro" como tema por defecto.
    const tema = req.cookies.tema || "claro";

    // Renderizamos la plantilla "temas.ejs", pasándole el tema actual.
    res.render("temas", { tema });
});


// Ruta POST para cerrar sesión del usuario.
// Elimina la sesión del servidor y redirige al inicio.
app.post("/logout", (req, res) => {

    // destroy elimina los datos de sesión almacenados en el servidor.
    req.session.destroy(() => {

        // Una vez destruida la sesión, se redirige a la página principal.
        res.redirect("/");
    });
});


// -----------------------------------------------------------------------------
//  RUTAS DE FORMULARIO CON VALIDACIÓN DE DATOS
// -----------------------------------------------------------------------------

// GET /form → muestra el formulario vacío
app.get("/form", (req, res) => {
    // Renderiza "form.ejs" con valores iniciales vacíos.
    res.render("form", {
        nombre: "",
        edad: "",
        ciudad: "",
        intereses: [],
        errores: [] // agregado para evitar undefined en la vista
    });
});

// POST /form → procesa el envío del formulario
app.post("/form", (req, res) => {
    // Extraemos los valores enviados desde el formulario HTML
    const { nombre, edad, ciudad } = req.body;
    let intereses = req.body.intereses || [];

    // Si el usuario seleccionó solo un interés, llega como string y no como array.
    // Lo convertimos en array para manejarlo uniformemente.
    if (!Array.isArray(intereses)) {
        intereses = [intereses];
    }

    // Array de errores para validaciones fallidas.
    let errores = [];

    // VALIDACIÓN 1: Nombre obligatorio y con al menos 2 caracteres.
    if (!nombre || nombre.trim().length < 2) {
        errores.push("El nombre tiene que tener mínimo 2 caracteres.");
    }

    // VALIDACIÓN 2: Ciudad obligatoria.
    if (!ciudad) {
        errores.push("La ciudad no puede quedar vacía.");
    }

    // Si hay errores, devolvemos el formulario con los mensajes y los valores ya introducidos.
    if (errores.length) {
        return res
            .status(400)
            .render("form", { nombre, edad, ciudad, intereses, errores });
    }

    // Si todo es correcto, renderizamos la vista "resultado.ejs"
    // mostrando los datos enviados.
    res.render("resultado", {
        nombre,
        edad: edad || null,
        ciudad,
        intereses
    });
});

// -----------------------------------------------------------------------------
//  ARRANQUE DEL SERVIDOR
// -----------------------------------------------------------------------------

// Iniciamos el servidor HTTP en el puerto especificado.
// Cuando esté listo, se muestra un mensaje en consola.
app.listen(PORT, () => {
    console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});
