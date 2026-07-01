async function verificarAdminSupabase() {
    if (typeof supabaseClient === "undefined") {
        alert("No se encontro la conexion con Supabase.");
        window.location.href = "../login.html";
        return null;
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        limpiarSesionAdmin();
        window.location.href = "../login.html";
        return null;
    }

    const usuario = sessionData.session.user;

    const { data: adminData, error: adminError } = await supabaseClient
        .from("admins")
        .select("user_id")
        .eq("user_id", usuario.id)
        .maybeSingle();

    if (adminError || !adminData) {
        await supabaseClient.auth.signOut();
        limpiarSesionAdmin();
        alert("Tu usuario no tiene permisos de administrador.");
        window.location.href = "../login.html";
        return null;
    }

    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("usuarioActivo", usuario.email || "admin");
    localStorage.setItem("nombreUsuarioActivo", "Administrador 4DMK");

    return usuario;
}

function limpiarSesionAdmin() {
    localStorage.removeItem("sesionActiva");
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("nombreUsuarioActivo");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
