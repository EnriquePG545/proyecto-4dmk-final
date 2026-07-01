const formLogin = document.getElementById("formLogin");
const inputUsuario = document.getElementById("usuario");
const inputPassword = document.getElementById("password");
const btnVerPassword = document.getElementById("btnVerPassword");

/* NOTIFICACIÓN PARA LOGIN */

function crearContenedorNotificacionesLogin() {
    let contenedor = document.getElementById("contenedorNotificaciones");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "contenedorNotificaciones";
        contenedor.className = "contenedor-notificaciones";
        document.body.appendChild(contenedor);
    }

    return contenedor;
}

function mostrarNotificacionLogin(mensaje, tipo) {
    const contenedor = crearContenedorNotificacionesLogin();

    let icono = "ri-information-line";
    let titulo = "Información";

    if (tipo === "exito") {
        icono = "ri-checkbox-circle-line";
        titulo = "Acceso correcto";
    }

    if (tipo === "error") {
        icono = "ri-close-circle-line";
        titulo = "Acceso denegado";
    }

    if (tipo === "advertencia") {
        icono = "ri-alert-line";
        titulo = "Atención";
    }

    const notificacion = document.createElement("div");
    notificacion.className = `notificacion notificacion-${tipo}`;

    notificacion.innerHTML = `
        <div class="notificacion-icono">
            <i class="${icono}"></i>
        </div>

        <div class="notificacion-contenido">
            <h4>${titulo}</h4>
            <p>${mensaje}</p>
        </div>

        <button class="notificacion-cerrar">
            <i class="ri-close-line"></i>
        </button>
    `;

    contenedor.appendChild(notificacion);

    const botonCerrar = notificacion.querySelector(".notificacion-cerrar");

    botonCerrar.addEventListener("click", function () {
        cerrarNotificacionLogin(notificacion);
    });

    setTimeout(function () {
        cerrarNotificacionLogin(notificacion);
    }, 3300);
}

function cerrarNotificacionLogin(notificacion) {
    if (!notificacion) {
        return;
    }

    notificacion.classList.add("notificacion-salir");

    setTimeout(function () {
        notificacion.remove();
    }, 350);
}

/* VALIDACIÓN DEL LOGIN DESDE SQL SERVER */

formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const usuario = inputUsuario.value.trim();
    const contrasena = inputPassword.value.trim();

    if (usuario === "" || contrasena === "") {
        mostrarNotificacionLogin("Ingresa usuario y contraseña.", "advertencia");
        return;
    }

    try {
        const respuesta = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario: usuario,
                contrasena: contrasena
            })
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            mostrarNotificacionLogin(datos.mensaje || "Usuario o contraseña incorrectos.", "error");
            return;
        }

        localStorage.setItem("sesionActiva", "true");
        localStorage.setItem("usuarioActivo", datos.usuario.usuario);
        localStorage.setItem("nombreUsuarioActivo", datos.usuario.nombreCompleto);

        mostrarNotificacionLogin(datos.mensaje, "exito");

        setTimeout(function () {
            window.location.href = "index.html";
        }, 900);

    } catch (error) {
        mostrarNotificacionLogin("No se pudo conectar con el servidor.", "error");
        console.error(error);
    }
});

/* MOSTRAR / OCULTAR CONTRASEÑA */

btnVerPassword.addEventListener("click", function () {
    if (inputPassword.type === "password") {
        inputPassword.type = "text";
        btnVerPassword.innerHTML = '<i class="ri-eye-off-line"></i>';
    } else {
        inputPassword.type = "password";
        btnVerPassword.innerHTML = '<i class="ri-eye-line"></i>';
    }
});