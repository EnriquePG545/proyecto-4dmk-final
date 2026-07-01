const registroForm = document.getElementById("registroForm");
const registroMensaje = document.getElementById("registroMensaje");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const icon = togglePassword.querySelector("i");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            passwordInput.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    });
}

registroForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombreCompleto = document.getElementById("nombreCompleto").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();

    if (!nombreCompleto || !telefono || !email || !password) {
        mostrarMensajeRegistro("Completa todos los campos.", "error");
        return;
    }

    if (password.length < 6) {
        mostrarMensajeRegistro("La contraseña debe tener mínimo 6 caracteres.", "error");
        return;
    }

    try {
        mostrarMensajeRegistro("Creando cuenta...", "info");

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre_completo: nombreCompleto,
                    telefono: telefono,
                    rol: "cliente"
                }
            }
        });

        if (error) {
            console.error("Error al crear usuario:", error);

            if (error.message.toLowerCase().includes("already")) {
                mostrarMensajeRegistro("Este correo ya está registrado. Inicia sesión.", "error");
                return;
            }

            mostrarMensajeRegistro(error.message || "No se pudo crear la cuenta.", "error");
            return;
        }

        if (!data.user) {
            mostrarMensajeRegistro("No se recibió información del usuario.", "error");
            return;
        }

        mostrarMensajeRegistro("Cuenta creada correctamente. Redirigiendo...", "success");

        setTimeout(() => {
            window.location.href = "mis-pedidos.html";
        }, 1000);

    } catch (error) {
        console.error("Error inesperado:", error);
        mostrarMensajeRegistro("Error inesperado al crear la cuenta.", "error");
    }
});

function mostrarMensajeRegistro(texto, tipo) {
    registroMensaje.textContent = texto;
    registroMensaje.className = `login-mensaje ${tipo}`;
}