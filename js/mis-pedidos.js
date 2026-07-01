const datosCliente = document.getElementById("datosCliente");
const btnCerrarSesionCliente = document.getElementById("btnCerrarSesionCliente");
const pedidosCard = document.querySelector(".pedidos-card");

let usuarioCliente = null;
let perfilCliente = null;
let canalPedidosCliente = null;

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

        await cargarPedidosCliente();
        activarRealtimePedidosCliente();

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

function activarRealtimePedidosCliente() {
    if (!usuarioCliente || canalPedidosCliente) {
        return;
    }

    canalPedidosCliente = supabaseClient
        .channel(`pedidos-cliente-${usuarioCliente.id}`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pedidos_cotizacion",
            filter: `user_id=eq.${usuarioCliente.id}`
        }, async function () {
            await cargarPedidosCliente();
        })
        .subscribe();
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

            ${crearProgresoEstado(estado)}

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

function crearProgresoEstado(estadoActual) {
    const estadoNormalizado = normalizarEstado(estadoActual || "Pendiente");

    if (estadoNormalizado === "cancelado") {
        return `
            <div class="pedido-progreso pedido-progreso-cancelado">
                <div class="pedido-progreso-paso activo">
                    <span><i class="fa-solid fa-xmark"></i></span>
                    <p>Cancelado</p>
                </div>
            </div>
        `;
    }

    const pasos = [
        { estado: "pendiente", texto: "Pendiente" },
        { estado: "revisado", texto: "Revisado" },
        { estado: "cotizado", texto: "Cotizado" },
        { estado: "en-proceso", texto: "En proceso" },
        { estado: "finalizado", texto: "Finalizado" }
    ];

    const indiceEncontrado = pasos.findIndex(paso => paso.estado === estadoNormalizado);
    const indiceActual = indiceEncontrado >= 0 ? indiceEncontrado : 0;

    return `
        <div class="pedido-progreso">
            ${pasos.map(function (paso, indice) {
                const claseActiva = indice <= indiceActual ? "activo" : "";
                const icono = indice < indiceActual ? "fa-check" : "fa-circle";

                return `
                    <div class="pedido-progreso-paso ${claseActiva}">
                        <span><i class="fa-solid ${icono}"></i></span>
                        <p>${paso.texto}</p>
                    </div>
                `;
            }).join("")}
        </div>
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
