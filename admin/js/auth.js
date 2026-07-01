const sesionActiva = localStorage.getItem("sesionActiva");

if (sesionActiva !== "true") {
    window.location.href = "../login.html";
}

async function cerrarSesion() {
    if (typeof supabaseClient !== "undefined") {
        await supabaseClient.auth.signOut();
    }

    localStorage.removeItem("sesionActiva");
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("nombreUsuarioActivo");
    localStorage.removeItem("rolAdminActivo");

    window.location.href = "../login.html";
}

/* ============================================================
   NOTIFICACIONES PERSONALIZADAS
   ============================================================ */

function crearContenedorNotificaciones() {
    let contenedor = document.getElementById("contenedorNotificaciones");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "contenedorNotificaciones";
        contenedor.className = "contenedor-notificaciones";
        document.body.appendChild(contenedor);
    }

    return contenedor;
}

function obtenerTipoNotificacion(mensaje) {
    const texto = String(mensaje).toLowerCase();

    if (
        texto.includes("correctamente") ||
        texto.includes("exportado") ||
        texto.includes("restaurado") ||
        texto.includes("recuperado") ||
        texto.includes("bienvenido")
    ) {
        return "exito";
    }

    if (
        texto.includes("ya existe") ||
        texto.includes("completa") ||
        texto.includes("no hay") ||
        texto.includes("verifica") ||
        texto.includes("primero") ||
        texto.includes("solo se permiten") ||
        texto.includes("operación cancelada") ||
        texto.includes("seleccionado no es válido")
    ) {
        return "advertencia";
    }

    if (
        texto.includes("incorrecto") ||
        texto.includes("error") ||
        texto.includes("no se pudo") ||
        texto.includes("el archivo")
    ) {
        return "error";
    }

    return "info";
}

function obtenerIconoNotificacion(tipo) {
    if (tipo === "exito") {
        return "ri-checkbox-circle-line";
    }

    if (tipo === "advertencia") {
        return "ri-alert-line";
    }

    if (tipo === "error") {
        return "ri-close-circle-line";
    }

    return "ri-information-line";
}

function obtenerTituloNotificacion(tipo) {
    if (tipo === "exito") {
        return "Operación exitosa";
    }

    if (tipo === "advertencia") {
        return "Atención";
    }

    if (tipo === "error") {
        return "Error";
    }

    return "Información";
}

function mostrarNotificacion(mensaje, tipoPersonalizado) {
    const tipo = tipoPersonalizado || obtenerTipoNotificacion(mensaje);
    const icono = obtenerIconoNotificacion(tipo);

    const contenedor = crearContenedorNotificaciones();

    const notificacion = document.createElement("div");
    notificacion.className = `notificacion notificacion-${tipo}`;

    notificacion.innerHTML = `
        <div class="notificacion-icono">
            <i class="${icono}"></i>
        </div>

        <div class="notificacion-contenido">
            <h4>${obtenerTituloNotificacion(tipo)}</h4>
            <p>${mensaje}</p>
        </div>

        <button class="notificacion-cerrar" type="button">
            <i class="ri-close-line"></i>
        </button>
    `;

    contenedor.appendChild(notificacion);

    const botonCerrar = notificacion.querySelector(".notificacion-cerrar");

    botonCerrar.addEventListener("click", function () {
        cerrarNotificacion(notificacion);
    });

    setTimeout(function () {
        cerrarNotificacion(notificacion);
    }, 3600);
}

function cerrarNotificacion(notificacion) {
    if (!notificacion) {
        return;
    }

    notificacion.classList.add("notificacion-salir");

    setTimeout(function () {
        notificacion.remove();
    }, 350);
}

window.alert = function (mensaje) {
    mostrarNotificacion(mensaje);
};
