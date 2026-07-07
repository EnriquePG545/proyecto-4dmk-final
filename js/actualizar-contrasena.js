const actualizarPasswordForm = document.getElementById("actualizarPasswordForm");
const nuevaPassword = document.getElementById("nuevaPassword");
const confirmarPassword = document.getElementById("confirmarPassword");
const actualizarMensaje = document.getElementById("actualizarMensaje");
const btnActualizarPassword = document.getElementById("btnActualizarPassword");
const volverLoginActualizacion = document.getElementById("volverLoginActualizacion");
const botonesToggleRecovery = document.querySelectorAll(".toggle-recovery-password");

const parametrosActualizacion = new URLSearchParams(window.location.search);
const hashActualizacion = new URLSearchParams(window.location.hash.replace("#", ""));
const origenActualizacion = parametrosActualizacion.get("origen") === "admin" ? "admin" : "cliente";
const vieneDeEnlaceRecuperacion = hashActualizacion.get("type") === "recovery" || parametrosActualizacion.has("code");

let recuperacionLista = false;

if (origenActualizacion === "admin" && volverLoginActualizacion) {
    volverLoginActualizacion.href = "admin/login.html";
}

botonesToggleRecovery.forEach(function (boton) {
    boton.addEventListener("click", function () {
        const input = document.getElementById(boton.dataset.target);
        const icono = boton.querySelector("i");

        if (!input || !icono) {
            return;
        }

        if (input.type === "password") {
            input.type = "text";
            icono.classList.remove("fa-eye");
            icono.classList.add("fa-eye-slash");
        } else {
            input.type = "password";
            icono.classList.remove("fa-eye-slash");
            icono.classList.add("fa-eye");
        }
    });
});

inicializarRecuperacion();

actualizarPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!recuperacionLista) {
        mostrarMensajeActualizacion("El enlace de recuperacion no esta activo o ya expiro. Solicita uno nuevo.", "error");
        return;
    }

    const password = nuevaPassword.value.trim();
    const confirmacion = confirmarPassword.value.trim();

    if (password.length < 8) {
        mostrarMensajeActualizacion("La nueva contrasena debe tener minimo 8 caracteres.", "error");
        return;
    }

    if (password !== confirmacion) {
        mostrarMensajeActualizacion("Las contrasenas no coinciden.", "error");
        return;
    }

    bloquearFormularioActualizacion(true);
    mostrarMensajeActualizacion("Guardando nueva contrasena...", "info");

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password
        });

        if (error) {
            console.error("Error actualizando contrasena:", error);
            mostrarMensajeActualizacion("No pudimos actualizar la contrasena. Solicita un enlace nuevo e intenta otra vez.", "error");
            return;
        }

        await supabaseClient.auth.signOut();
        actualizarPasswordForm.reset();
        recuperacionLista = false;
        mostrarMensajeActualizacion("Contrasena actualizada correctamente. Ya puedes iniciar sesion.", "success");

        setTimeout(function () {
            window.location.href = origenActualizacion === "admin" ? "admin/login.html" : "login.html";
        }, 1800);
    } catch (error) {
        console.error("Error inesperado actualizando contrasena:", error);
        mostrarMensajeActualizacion("Ocurrio un error inesperado. Revisa tu conexion e intenta otra vez.", "error");
    } finally {
        bloquearFormularioActualizacion(false);
    }
});

async function inicializarRecuperacion() {
    bloquearFormularioActualizacion(true);
    mostrarMensajeActualizacion("Verificando enlace seguro...", "info");

    try {
        if (parametrosActualizacion.has("code") && supabaseClient.auth.exchangeCodeForSession) {
            await supabaseClient.auth.exchangeCodeForSession(parametrosActualizacion.get("code"));
        }

        const { data } = await supabaseClient.auth.getSession();

        recuperacionLista = Boolean(data.session && vieneDeEnlaceRecuperacion);

        if (recuperacionLista) {
            mostrarMensajeActualizacion("Enlace verificado. Escribe tu nueva contrasena.", "success");
            return;
        }

        mostrarMensajeActualizacion("Este enlace no esta activo o ya expiro. Solicita uno nuevo desde el login.", "error");
    } catch (error) {
        console.error("Error verificando recuperacion:", error);
        mostrarMensajeActualizacion("No pudimos verificar el enlace. Solicita uno nuevo desde el login.", "error");
    } finally {
        bloquearFormularioActualizacion(!recuperacionLista);
    }
}

function bloquearFormularioActualizacion(bloqueado) {
    nuevaPassword.disabled = bloqueado;
    confirmarPassword.disabled = bloqueado;
    btnActualizarPassword.disabled = bloqueado;

    btnActualizarPassword.innerHTML = bloqueado
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...'
        : '<i class="fa-solid fa-key"></i> Guardar nueva contrasena';
}

function mostrarMensajeActualizacion(texto, tipo) {
    actualizarMensaje.textContent = texto;
    actualizarMensaje.className = `login-mensaje ${tipo}`;
}
