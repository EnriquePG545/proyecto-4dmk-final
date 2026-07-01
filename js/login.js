const loginForm = document.getElementById("loginForm");
const loginMensaje = document.getElementById("loginMensaje");
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

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
        mostrarMensaje("Verificando datos...", "info");

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            mostrarMensaje("Ingresa correo y contraseña.", "error");
            return;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Error login:", error);
            mostrarMensaje("Correo o contraseña incorrectos.", "error");
            return;
        }

        if (!data.user) {
            mostrarMensaje("No se recibió información del usuario.", "error");
            return;
        }

        mostrarMensaje("Acceso correcto. Verificando perfil...", "success");

        const userId = data.user.id;

        const { data: perfil, error: perfilError } = await supabaseClient
            .from("perfiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (perfilError) {
            console.error("Error buscando perfil:", perfilError);
            mostrarMensaje("No se pudo verificar el perfil del usuario.", "error");
            return;
        }

        if (!perfil) {
            await supabaseClient.auth.signOut();
            mostrarMensaje("Tu cuenta no tiene perfil registrado. Crea una cuenta nuevamente.", "error");
            return;
        }

        if (perfil.estado === false) {
            await supabaseClient.auth.signOut();
            mostrarMensaje("Esta cuenta está desactivada.", "error");
            return;
        }

        if (perfil.rol === "admin") {
            localStorage.setItem("sesionActiva", "true");
            localStorage.setItem("usuarioActivo", perfil.correo);
            localStorage.setItem("nombreUsuarioActivo", perfil.nombre_completo);

            setTimeout(() => {
                window.location.href = "panel.html";
            }, 700);

            return;
        }

        if (perfil.rol === "cliente") {
            localStorage.removeItem("sesionActiva");
            localStorage.removeItem("usuarioActivo");
            localStorage.removeItem("nombreUsuarioActivo");

            setTimeout(() => {
                window.location.href = "mis-pedidos.html";
            }, 700);

            return;
        }

        await supabaseClient.auth.signOut();
        mostrarMensaje("Rol de usuario no válido.", "error");

    } catch (error) {
        console.error("Error general:", error);
        mostrarMensaje("Error inesperado al iniciar sesión.", "error");
    }
});

function mostrarMensaje(texto, tipo) {
    loginMensaje.textContent = texto;
    loginMensaje.className = `login-mensaje ${tipo}`;
}