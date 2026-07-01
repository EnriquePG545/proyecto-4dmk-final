(function () {
    document.addEventListener("DOMContentLoaded", async function () {
        if (typeof verificarAdminSupabase !== "function") {
            return;
        }

        try {
            await verificarAdminSupabase();
        } catch (error) {
            console.error("No se pudo verificar la sesion administrativa:", error);
            limpiarSesionAdmin();
            window.location.href = "../login.html";
        }
    });
})();
