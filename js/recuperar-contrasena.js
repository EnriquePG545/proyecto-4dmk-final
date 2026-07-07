const recuperarForm = document.getElementById("recuperarForm");
const emailRecuperacion = document.getElementById("emailRecuperacion");
const recuperarMensaje = document.getElementById("recuperarMensaje");
const btnEnviarRecuperacion = document.getElementById("btnEnviarRecuperacion");
const volverLoginRecuperacion = document.getElementById("volverLoginRecuperacion");

const parametrosRecuperacion = new URLSearchParams(window.location.search);
const origenRecuperacion = parametrosRecuperacion.get("origen") === "admin" ? "admin" : "cliente";

if (origenRecuperacion === "admin" && volverLoginRecuperacion) {
    volverLoginRecuperacion.href = "admin/login.html";
}

recuperarForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailRecuperacion.value.trim().toLowerCase();

    if (!email) {
        mostrarMensajeRecuperacion("Ingresa el correo de tu cuenta 4DMK.", "error");
        return;
    }

    bloquearFormularioRecuperacion(true);
    mostrarMensajeRecuperacion("Preparando enlace seguro...", "info");

    const redirectTo = `${window.location.origin}/actualizar-contrasena.html?origen=${origenRecuperacion}`;

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo
        });

        if (error) {
            console.error("Error enviando recuperacion:", error);
            mostrarMensajeRecuperacion("No pudimos enviar el enlace en este momento. Intenta nuevamente en unos minutos.", "error");
            return;
        }

        mostrarMensajeRecuperacion("Si el correo pertenece a una cuenta 4DMK, recibiras un enlace para crear una nueva contrasena.", "success");
        recuperarForm.reset();
    } catch (error) {
        console.error("Error inesperado en recuperacion:", error);
        mostrarMensajeRecuperacion("Ocurrio un error inesperado. Revisa tu conexion e intenta otra vez.", "error");
    } finally {
        bloquearFormularioRecuperacion(false);
    }
});

function bloquearFormularioRecuperacion(bloqueado) {
    emailRecuperacion.disabled = bloqueado;
    btnEnviarRecuperacion.disabled = bloqueado;

    btnEnviarRecuperacion.innerHTML = bloqueado
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...'
        : '<i class="fa-solid fa-paper-plane"></i> Enviar enlace';
}

function mostrarMensajeRecuperacion(texto, tipo) {
    recuperarMensaje.textContent = texto;
    recuperarMensaje.className = `login-mensaje ${tipo}`;
}
