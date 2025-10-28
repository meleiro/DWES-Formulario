// Importamos el módulo 'express', que permite crear un servidor web fácilmente.
const express = require("express");

// Creamos una instancia de la aplicación Express.
const app = express();

// Importamos 'path' (módulo nativo de Node.js) para trabajar con rutas de archivos del sistema.
const path = require("path");

// Definimos el puerto en el que escuchará el servidor.
const PORT = 3000;


// ---------------------------------------------------------
//  MIDDLEWARES (funciones que se ejecutan antes de las rutas)
// ---------------------------------------------------------

//    Servir archivos estáticos (HTML, CSS, JS, imágenes, etc.)
//    Esto permite que el navegador pueda acceder a archivos dentro de la carpeta "public".
//    Por ejemplo: http://localhost:3000/style.css  buscará en public/style.css
app.use(express.static(path.join(__dirname, "public")));


//    Configuramos el motor de plantillas EJS.
//    Esto le indica a Express que los archivos de vista (en la carpeta "views")
//    usarán la sintaxis de EJS (.ejs) en lugar de HTML puro.
app.set("view engine", "ejs");


//    Middleware para procesar datos enviados desde formularios HTML (method="POST").
//    - 'extended: true' permite analizar estructuras anidadas (ej. objetos dentro de objetos).
//    - Sin esto, `req.body` vendría vacío.
app.use(express.urlencoded({ extended: true }));



app.use((req, res, next) => {

    const ms = 10000; //10s

    const timer = setTimeout(() => {
        if (!res.headersSent){
            console.warn("Tiempo de espera agotado");
            res.status(408).send("Tiempo de espera agotado");
        }
    }, ms);

    res.once("finish", () => clearTimeout(timer));
    res.once("close", () => clearTimeout(timer));

    next();
});


// ---------------------------------------------------------
//   RUTA GET → Muestra el formulario vacío al usuario
// ---------------------------------------------------------
app.get("/form", (req, res) => {

    // Renderiza la plantilla "form.ejs" ubicada en /views.
    // Se le pasan valores iniciales vacíos para evitar errores de variables no definidas.
    res.render("form", {
        nombre: "",     // Campo de texto vacío
        edad: "",       // Campo numérico vacío
        ciudad: "",     // Selección de ciudad vacía
        intereses: []   // Array vacío (sin checkboxes marcados)
    });
});


// ---------------------------------------------------------
//   RUTA POST → Procesa los datos enviados desde el formulario
// ---------------------------------------------------------
app.post("/form", (req, res) => {

    // Extraemos los valores enviados desde el formulario.
    // req.body contiene todos los campos del formulario (gracias a express.urlencoded()).
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const ciudad = req.body.ciudad;

    // Si el usuario seleccionó varios intereses, llegarán como array.
    // Si solo eligió uno, llega como string , lo convertimos en array para unificar.
    let intereses = req.body.intereses || [];
    if (!Array.isArray(intereses)) { 
        intereses = [intereses]; 
    }

    // Creamos un array donde guardaremos los mensajes de error de validación.
    let errores = [];

    //  VALIDACIÓN 1: Nombre obligatorio y mínimo 2 caracteres.
    if (!nombre || nombre.trim().length < 2) {
        errores.push("El nombre tiene que tener mínimo 2 caracteres.");
    }

    //  VALIDACIÓN 2: Ciudad obligatoria (no puede quedar vacía).
    if (!ciudad) {
        errores.push("La ciudad no puede quedar vacía.");
    }

    //ha habido errores 400 Bad Request
    if (errores.length) {
        return res
        .status(400)
        .render("form", { nombre, edad, ciudad, intereses, errores });
    }

    res.render("resultado", {
        nombre,
        edad: edad || null,
        ciudad,
        intereses
    });

    
});


// ---------------------------------------------------------
// INICIO DEL SERVIDOR
// ---------------------------------------------------------
app.listen(PORT, () => {
    // Mensaje de confirmación en consola cuando el servidor está activo.
    console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});
