const datosCliente = document.getElementById("datosCliente");
const btnCerrarSesionCliente = document.getElementById("btnCerrarSesionCliente");
const pedidosCard = document.querySelector(".pedidos-card");

let usuarioCliente = null;
let perfilCliente = null;

verificarSesionCliente();

async function verificarSesionCliente() {
    try {
        const { data } = await supabaseClient.auth.getSession();

        if (!data.session) {
            window.location.href = "login.html";
            return;
        }

        usuarioCliente = data.session.user;

        const { data: perfil, error } = await supabaseClient
            .from("perfiles")
            .select("*")
            .eq("user_id", usuarioCliente.id)
            .maybeSingle();

        if (error) {
            console.error("Error buscando perfil:", error);
            datosCliente.textContent = usuarioCliente.email;
            return;
        }

        if (!perfil) {
            datosCliente.textContent = usuarioCliente.email;
            return;
        }

        perfilCliente = perfil;
        datosCliente.textContent = `${perfil.nombre_completo} | ${perfil.correo} | ${perfil.telefono}`;

        cargarPedidosCliente();

    } catch (error) {
        console.error("Error verificando sesión:", error);
        window.location.href = "login.html";
    }
}

async function cargarPedidosCliente() {
    try {
        pedidosCard.innerHTML = `
            <div class="pedido-vacio">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h2>Cargando tus pedidos...</h2>
                <p>Estamos consultando tus solicitudes registradas.</p>
            </div>
        `;

        const { data: pedidos, error } = await supabaseClient
            .from("pedidos_cotizacion")
            .select("*")
            .eq("user_id", usuarioCliente.id)
            .order("fecha_registro", { ascending: false });

        if (error) {
            console.error("Error cargando pedidos:", error);
            pedidosCard.innerHTML = `
                <div class="pedido-vacio">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h2>No se pudieron cargar tus pedidos</h2>
                    <p>Intenta nuevamente en unos minutos.</p>
                </div>
            `;
            return;
        }

        if (!pedidos || pedidos.length === 0) {
            pedidosCard.innerHTML = `
                <div class="pedido-vacio">
                    <i class="fa-solid fa-clipboard-list"></i>
                    <h2>Aún no tienes pedidos registrados</h2>
                    <p>Cuando solicites una cotización, aparecerá aquí con su estado.</p>
                </div>
            `;
            return;
        }

        pedidosCard.innerHTML = `
            <div class="lista-pedidos-cliente">
                ${pedidos.map(crearPedidoHTML).join("")}
            </div>
        `;

    } catch (error) {
        console.error("Error general cargando pedidos:", error);
    }
}

function crearPedidoHTML(pedido) {
    const estado = pedido.estado || "Pendiente";
    const fecha = formatearFechaPedido(pedido.fecha_registro || pedido.fecha_solicitud);

    return `
        <article class="pedido-cliente-card">
            <div class="pedido-cliente-header">
                <div>
                    <h3>${pedido.codigo_pedido || "Sin código"}</h3>
                    <p>${fecha}</p>
                </div>

                <span class="pedido-estado ${normalizarEstado(estado)}">
                    ${estado}
                </span>
            </div>

            <div class="pedido-cliente-body">
                <p><strong>Prenda:</strong> ${pedido.tipo_prenda || "-"}</p>
                <p><strong>Cantidad:</strong> ${pedido.cantidad || "-"}</p>
                <p><strong>Bordado:</strong> ${pedido.tipo_bordado || "-"}</p>
                <p><strong>Ubicación:</strong> ${pedido.ubicacion_bordado || "-"}</p>
                <p><strong>Color:</strong> ${pedido.color_prenda || "-"}</p>
            </div>

            <div class="pedido-cliente-footer">
                <p><strong>Descripción:</strong> ${pedido.descripcion || "Sin descripción"}</p>
            </div>
        </article>
    `;
}

function normalizarEstado(estado) {
    return String(estado)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
}

function formatearFechaPedido(fecha) {
    if (!fecha) {
        return "Fecha no registrada";
    }

    const fechaObj = new Date(fecha);

    return fechaObj.toLocaleDateString("es-PE", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

btnCerrarSesionCliente.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();

    localStorage.removeItem("sesionActiva");
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("nombreUsuarioActivo");

    window.location.href = "login.html";
});