const formLogin = document.getElementById("formLogin");
const inputUsuario = document.getElementById("usuario");
const inputPassword = document.getElementById("password");
const btnVerPassword = document.getElementById("btnVerPassword");

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
    let titulo = "Informacion";

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
        titulo = "Atencion";
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

formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const correo = inputUsuario.value.trim().toLowerCase();
    const contrasena = inputPassword.value.trim();

    if (correo === "" || contrasena === "") {
        mostrarNotificacionLogin("Ingresa correo y contrasena.", "advertencia");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: correo,
        password: contrasena
    });

    if (error || !data.user) {
        console.error(error);
        mostrarNotificacionLogin("Correo o contrasena incorrectos.", "error");
        return;
    }

    const { data: adminData, error: adminError } = await supabaseClient
        .from("admins")
        .select("user_id, rol")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminError || !adminData) {
        await supabaseClient.auth.signOut();
        mostrarNotificacionLogin("Tu cuenta no tiene permisos de administrador.", "error");
        return;
    }

    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("usuarioActivo", data.user.email || correo);
    localStorage.setItem("nombreUsuarioActivo", "Administrador 4DMK");
    localStorage.setItem("rolAdminActivo", adminData.rol || "admin");

    mostrarNotificacionLogin("Ingresaste correctamente.", "exito");

    setTimeout(function () {
        window.location.href = "index.html";
    }, 900);
});

btnVerPassword.addEventListener("click", function () {
    if (inputPassword.type === "password") {
        inputPassword.type = "text";
        btnVerPassword.innerHTML = '<i class="ri-eye-off-line"></i>';
    } else {
        inputPassword.type = "password";
        btnVerPassword.innerHTML = '<i class="ri-eye-line"></i>';
    }
});
