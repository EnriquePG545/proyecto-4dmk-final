const miCuentaForm = document.getElementById("miCuentaForm");
const inputNombreCompleto = document.getElementById("nombreCompleto");
const inputTelefono = document.getElementById("telefono");
const inputCorreo = document.getElementById("correo");
const cuentaMensaje = document.getElementById("cuentaMensaje");

let usuarioCuenta = null;
let perfilCuenta = null;

cargarMiCuenta();

async function cargarMiCuenta() {
    try {
        mostrarMensajeCuenta("Cargando tus datos...", "info");

        const { data } = await supabaseClient.auth.getSession();

        if (!data.session) {
            window.location.href = "login.html";
            return;
        }

        usuarioCuenta = data.session.user;

        const { data: perfil, error } = await supabaseClient
            .from("perfiles")
            .select("*")
            .eq("user_id", usuarioCuenta.id)
            .maybeSingle();

        if (error) {
            console.error("Error cargando perfil:", error);
            mostrarMensajeCuenta("No se pudo cargar tu perfil.", "error");
            return;
        }

        if (!perfil) {
            mostrarMensajeCuenta("Tu cuenta no tiene perfil registrado.", "error");
            return;
        }

        perfilCuenta = perfil;

        inputNombreCompleto.value = perfil.nombre_completo || "";
        inputTelefono.value = perfil.telefono || "";
        inputCorreo.value = perfil.correo || usuarioCuenta.email || "";

        mostrarMensajeCuenta("", "");

    } catch (error) {
        console.error("Error general:", error);
        mostrarMensajeCuenta("Error inesperado al cargar tu cuenta.", "error");
    }
}

miCuentaForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombreCompleto = inputNombreCompleto.value.trim();
    const telefono = inputTelefono.value.trim();

    if (!nombreCompleto || !telefono) {
        mostrarMensajeCuenta("Completa tu nombre y teléfono.", "error");
        return;
    }

    try {
        mostrarMensajeCuenta("Guardando cambios...", "info");

        const { error } = await supabaseClient
            .from("perfiles")
            .update({
                nombre_completo: nombreCompleto,
                telefono: telefono
            })
            .eq("user_id", usuarioCuenta.id);

        if (error) {
            console.error("Error actualizando perfil:", error);
            mostrarMensajeCuenta("No se pudieron guardar los cambios.", "error");
            return;
        }

        mostrarMensajeCuenta("Datos actualizados correctamente.", "success");

    } catch (error) {
        console.error("Error inesperado:", error);
        mostrarMensajeCuenta("Error inesperado al guardar los cambios.", "error");
    }
});

function mostrarMensajeCuenta(texto, tipo) {
    cuentaMensaje.textContent = texto;
    cuentaMensaje.className = `cuenta-mensaje ${tipo || ""}`;
}