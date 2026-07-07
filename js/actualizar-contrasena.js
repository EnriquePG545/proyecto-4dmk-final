const actualizarPasswordForm = document.getElementById("actualizarPasswordForm");
const nuevaPassword = document.getElementById("nuevaPassword");
const confirmarPassword = document.getElementById("confirmarPassword");
const actualizarMensaje = document.getElementById("actualizarMensaje");
const btnActualizarPassword = document.getElementById("btnActualizarPassword");
const volverLoginActualizacion = document.getElementById("volverLoginActualizacion");
const botonesToggleRecovery = document.querySelectorAll(".toggle-recovery-password");

const parametrosActualizacion = new URLSearchParams(window.location.search);
const hashActualizacion = new URLSearchParams(window.location.hash.replace("#", ""));
const origenGuardadoActualizacion = sessionStorage.getItem("recuperacionOrigen4DMK");
const origenActualizacion = origenGuardadoActualizacion === "admin" || parametrosActualizacion.get("origen") === "admin" ? "admin" : "cliente";
const tokenHashRecuperacion = parametrosActualizacion.get("token_hash");
const tipoRecuperacion = parametrosActualizacion.get("type");
const accessTokenRecuperacion = hashActualizacion.get("access_token");
const refreshTokenRecuperacion = hashActualizacion.get("refresh_token");
const vieneDeEnlaceRecuperacion = tipoRecuperacion === "recovery" || hashActualizacion.get("type") === "recovery" || parametrosActualizacion.has("code");
const errorRecuperacion = hashActualizacion.get("error") || parametrosActualizacion.get("error");
const descripcionErrorRecuperacion = hashActualizacion.get("error_description") || parametrosActualizacion.get("error_description");

let recuperacionLista = false;
let enlaceInvalido = false;

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

        const destinoDespuesDeActualizar = await resolverDestinoDespuesDeActualizar();

        await supabaseClient.auth.signOut();
        sessionStorage.removeItem("recuperacionOrigen4DMK");
        actualizarPasswordForm.reset();
        recuperacionLista = false;
        mostrarMensajeActualizacion("Contrasena actualizada correctamente. Ya puedes iniciar sesion.", "success");

        setTimeout(function () {
            window.location.href = destinoDespuesDeActualizar;
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
        if (errorRecuperacion) {
            const mensajeExpirado = descripcionErrorRecuperacion
                ? decodeURIComponent(descripcionErrorRecuperacion.replace(/\+/g, " "))
                : "El enlace de recuperacion ya expiro o no es valido.";

            mostrarEnlaceInvalido(`${mensajeExpirado} Solicita un enlace nuevo para continuar.`);
            return;
        }

        if (tokenHashRecuperacion && tipoRecuperacion === "recovery") {
            const { error } = await supabaseClient.auth.verifyOtp({
                token_hash: tokenHashRecuperacion,
                type: "recovery"
            });

            if (error) {
                console.error("Error verificando token hash de recuperacion:", error);
                mostrarEnlaceInvalido("El enlace de recuperacion no es valido o ya fue usado. Solicita uno nuevo para continuar.");
                return;
            }

            limpiarUrlRecuperacion();
        }

        if (accessTokenRecuperacion && refreshTokenRecuperacion) {
            const { error } = await supabaseClient.auth.setSession({
                access_token: accessTokenRecuperacion,
                refresh_token: refreshTokenRecuperacion
            });

            if (error) {
                console.error("Error creando sesion desde enlace:", error);
                mostrarEnlaceInvalido("No pudimos activar este enlace de recuperacion. Solicita uno nuevo para continuar.");
                return;
            }

            limpiarUrlRecuperacion();
        }

        if (parametrosActualizacion.has("code") && supabaseClient.auth.exchangeCodeForSession) {
            await supabaseClient.auth.exchangeCodeForSession(parametrosActualizacion.get("code"));
            limpiarUrlRecuperacion();
        }

        const { data } = await supabaseClient.auth.getSession();

        recuperacionLista = Boolean(data.session && (vieneDeEnlaceRecuperacion || tokenHashRecuperacion || accessTokenRecuperacion));

        if (recuperacionLista) {
            mostrarMensajeActualizacion("Enlace verificado. Escribe tu nueva contrasena.", "success");
            return;
        }

        mostrarEnlaceInvalido("Este enlace no esta activo o ya expiro. Solicita uno nuevo para continuar.");
    } catch (error) {
        console.error("Error verificando recuperacion:", error);
        mostrarEnlaceInvalido("No pudimos verificar el enlace. Solicita uno nuevo para continuar.");
    } finally {
        if (!enlaceInvalido) {
            bloquearFormularioActualizacion(!recuperacionLista);
        }
    }
}

function bloquearFormularioActualizacion(bloqueado) {
    nuevaPassword.disabled = bloqueado;
    confirmarPassword.disabled = bloqueado;
    btnActualizarPassword.disabled = bloqueado;
    btnActualizarPassword.type = "submit";
    btnActualizarPassword.onclick = null;

    btnActualizarPassword.innerHTML = bloqueado
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...'
        : '<i class="fa-solid fa-key"></i> Guardar nueva contrasena';
}

function mostrarEnlaceInvalido(mensaje) {
    enlaceInvalido = true;
    recuperacionLista = false;
    nuevaPassword.disabled = true;
    confirmarPassword.disabled = true;
    btnActualizarPassword.disabled = false;
    btnActualizarPassword.type = "button";
    btnActualizarPassword.innerHTML = '<i class="fa-solid fa-envelope"></i> Solicitar nuevo enlace';
    btnActualizarPassword.onclick = function () {
        window.location.href = origenActualizacion === "admin"
            ? "recuperar-contrasena.html?origen=admin"
            : "recuperar-contrasena.html";
    };
    mostrarMensajeActualizacion(mensaje, "error");
}

function limpiarUrlRecuperacion() {
    const urlLimpia = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, urlLimpia);
}

async function resolverDestinoDespuesDeActualizar() {
    if (origenActualizacion === "admin") {
        return "admin/login.html";
    }

    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData && userData.user ? userData.user.id : null;

        if (!userId) {
            return "login.html";
        }

        const { data: adminData } = await supabaseClient
            .from("admins")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

        return adminData ? "admin/login.html" : "login.html";
    } catch (error) {
        console.warn("No se pudo resolver el destino despues de actualizar:", error);
        return "login.html";
    }
}

function mostrarMensajeActualizacion(texto, tipo) {
    actualizarMensaje.textContent = texto;
    actualizarMensaje.className = `login-mensaje ${tipo}`;
}
