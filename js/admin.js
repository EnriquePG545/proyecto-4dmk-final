const adminMensaje = document.getElementById("adminMensaje");
const adminCorreo = document.getElementById("adminCorreo");

const totalPedidos = document.getElementById("totalPedidos");
const totalMesActual = document.getElementById("totalMesActual");
const totalPendientes = document.getElementById("totalPendientes");
const totalCotizados = document.getElementById("totalCotizados");
const totalFinalizados = document.getElementById("totalFinalizados");

const tablaPedidos = document.getElementById("tablaPedidos");
const busquedaPedido = document.getElementById("busquedaPedido");
const filtroEstado = document.getElementById("filtroEstado");
const filtroMes = document.getElementById("filtroMes");
const recargarBtn = document.getElementById("recargarBtn");
const logoutBtn = document.getElementById("logoutBtn");

const pedidoModal = document.getElementById("pedidoModal");
const cerrarModal = document.getElementById("cerrarModal");
const detallePedido = document.getElementById("detallePedido");

let pedidos = [];
let pedidosFiltrados = [];
let graficoMensual = null;
let canalPedidosAdmin = null;
let usuarioAdminActual = null;

document.addEventListener("DOMContentLoaded", async function () {
    await verificarSesionAdmin();
    await cargarPedidos();
    activarRealtimePedidosAdmin();
});

async function verificarSesionAdmin() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        window.location.href = "login.html";
        return;
    }

    const usuario = sessionData.session.user;
    usuarioAdminActual = usuario;
    adminCorreo.textContent = usuario.email || "Administrador";

    const { data: adminData, error: adminError } = await supabaseClient
        .from("admins")
        .select("user_id, rol")
        .eq("user_id", usuario.id)
        .maybeSingle();

    if (adminError || !adminData) {
        await supabaseClient.auth.signOut();
        limpiarSesionCotizaciones();
        window.location.href = "login.html";
        return;
    }

    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("usuarioActivo", usuario.email || "admin");
    localStorage.setItem("nombreUsuarioActivo", "Administrador 4DMK");
    localStorage.setItem("rolAdminActivo", adminData.rol || "admin");
}

async function cargarPedidos() {
    mostrarMensaje("Cargando cotizaciones...", "info");

    const { data, error } = await supabaseClient
        .from("pedidos_cotizacion")
        .select(`
            *,
            clientes (
                nombre,
                telefono,
                tipo_cliente
            )
        `)
        .order("fecha_solicitud", { ascending: false });

    if (error) {
        console.error(error);
        mostrarMensaje("No se pudieron cargar las cotizaciones. Revisa la conexion o permisos.", "error");
        tablaPedidos.innerHTML = `
            <tr>
                <td colspan="9">Error al cargar cotizaciones.</td>
            </tr>
        `;
        return;
    }

    pedidos = data || [];
    pedidosFiltrados = obtenerPedidosFiltrados();

    actualizarResumen();
    cargarFiltroMeses();
    renderizarTabla(pedidosFiltrados);
    renderizarGraficoMensual();

    if (pedidos.length === 0) {
        mostrarMensaje("Todavia no hay cotizaciones registradas.", "info");
        return;
    }

    mostrarMensaje(`Se cargaron ${pedidos.length} cotizacion(es).`, "success");
}

function activarRealtimePedidosAdmin() {
    if (canalPedidosAdmin) {
        return;
    }

    canalPedidosAdmin = supabaseClient
        .channel("pedidos-admin-tiempo-real")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pedidos_cotizacion"
        }, async function () {
            await cargarPedidos();
        })
        .subscribe();
}

function actualizarResumen() {
    const mesActual = obtenerClaveMes(new Date());

    totalPedidos.textContent = pedidos.length;
    totalMesActual.textContent = pedidos.filter(function (pedido) {
        return obtenerClaveMes(new Date(pedido.fecha_solicitud)) === mesActual;
    }).length;
    totalPendientes.textContent = pedidos.filter(pedido => pedido.estado === "Pendiente").length;
    totalCotizados.textContent = pedidos.filter(pedido => pedido.estado === "Cotizado").length;
    totalFinalizados.textContent = pedidos.filter(pedido => pedido.estado === "Finalizado").length;
}

function cargarFiltroMeses() {
    const mesSeleccionado = filtroMes.value || "Todos";
    const meses = new Set();

    pedidos.forEach(function (pedido) {
        meses.add(obtenerClaveMes(new Date(pedido.fecha_solicitud)));
    });

    filtroMes.innerHTML = '<option value="Todos">Todos los meses</option>';

    Array.from(meses).sort().reverse().forEach(function (mes) {
        const option = document.createElement("option");
        option.value = mes;
        option.textContent = convertirClaveMesATexto(mes);
        filtroMes.appendChild(option);
    });

    if (Array.from(filtroMes.options).some(option => option.value === mesSeleccionado)) {
        filtroMes.value = mesSeleccionado;
    }
}

function renderizarTabla(lista) {
    if (!lista.length) {
        tablaPedidos.innerHTML = `
            <tr>
                <td colspan="9">No se encontraron cotizaciones con esos filtros.</td>
            </tr>
        `;
        return;
    }

    tablaPedidos.innerHTML = "";

    lista.forEach(function (pedido) {
        const cliente = pedido.clientes || {};
        const fecha = formatearFechaHora(pedido.fecha_solicitud);
        const telefonoWhatsapp = obtenerTelefonoWhatsapp(cliente.telefono);
        const mensajeWhatsapp = generarMensajeWhatsApp(pedido, cliente);
        const enlaceWhatsapp = telefonoWhatsapp
            ? `https://wa.me/${telefonoWhatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`
            : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${textoSeguroPedido(pedido.codigo_pedido)}</strong></td>
            <td>${textoSeguroPedido(cliente.nombre || "Sin nombre")}</td>
            <td>${crearTelefonoCotizacion(cliente.telefono, enlaceWhatsapp)}</td>
            <td>${textoSeguroPedido(pedido.tipo_prenda)}</td>
            <td>${Number(pedido.cantidad || 0)}</td>
            <td>${textoSeguroPedido(pedido.tipo_bordado)}</td>
            <td>
                <select class="estado-select estado-${normalizarEstado(pedido.estado)}" data-id="${Number(pedido.id_pedido)}">
                    <option value="Pendiente" ${pedido.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                    <option value="Revisado" ${pedido.estado === "Revisado" ? "selected" : ""}>Revisado</option>
                    <option value="Cotizado" ${pedido.estado === "Cotizado" ? "selected" : ""}>Cotizado</option>
                    <option value="En proceso" ${pedido.estado === "En proceso" ? "selected" : ""}>En proceso</option>
                    <option value="Finalizado" ${pedido.estado === "Finalizado" ? "selected" : ""}>Finalizado</option>
                    <option value="Cancelado" ${pedido.estado === "Cancelado" ? "selected" : ""}>Cancelado</option>
                </select>
            </td>
            <td>${fecha}</td>
            <td>
                <button class="accion-btn ver-detalle" data-id="${Number(pedido.id_pedido)}" title="Ver detalle" type="button">
                    <i class="ri-eye-line"></i>
                </button>
                ${crearBotonWhatsappCotizacion(enlaceWhatsapp)}
            </td>
        `;

        tablaPedidos.appendChild(tr);
    });

    activarEventosTabla();
}

function activarEventosTabla() {
    document.querySelectorAll(".estado-select").forEach(function (select) {
        select.addEventListener("change", async function () {
            const idPedido = select.dataset.id;
            const nuevoEstado = select.value;
            select.className = `estado-select estado-${normalizarEstado(nuevoEstado)}`;
            await actualizarEstadoPedido(idPedido, nuevoEstado);
        });
    });

    document.querySelectorAll(".ver-detalle").forEach(function (boton) {
        boton.addEventListener("click", function () {
            abrirDetallePedido(boton.dataset.id);
        });
    });
}

async function actualizarEstadoPedido(idPedido, nuevoEstado) {
    mostrarMensaje("Actualizando estado...", "info");

    const pedidoAnterior = pedidos.find(pedido => String(pedido.id_pedido) === String(idPedido));
    const estadoAnterior = pedidoAnterior?.estado || null;

    if (estadoAnterior === nuevoEstado) {
        mostrarMensaje("La cotizacion ya tenia ese estado.", "info");
        return;
    }

    const { error } = await supabaseClient
        .from("pedidos_cotizacion")
        .update({ estado: nuevoEstado })
        .eq("id_pedido", idPedido);

    if (error) {
        console.error(error);
        mostrarMensaje("No se pudo actualizar el estado.", "error");
        return;
    }

    await registrarHistorialEstado(idPedido, estadoAnterior, nuevoEstado);

    pedidos = pedidos.map(function (pedido) {
        if (String(pedido.id_pedido) === String(idPedido)) {
            return { ...pedido, estado: nuevoEstado };
        }

        return pedido;
    });

    aplicarFiltros();
    actualizarResumen();
    renderizarGraficoMensual();

    mostrarMensaje("Estado actualizado correctamente.", "success");
    mostrarNotificacionPedido(`El estado de la cotizacion cambio a "${nuevoEstado}".`, nuevoEstado === "Cancelado" ? "advertencia" : "exito");
}

async function registrarHistorialEstado(idPedido, estadoAnterior, estadoNuevo) {
    const { error } = await supabaseClient
        .from("historial_estados_cotizacion")
        .insert({
            id_pedido: Number(idPedido),
            estado_anterior: estadoAnterior,
            estado_nuevo: estadoNuevo,
            cambiado_por: usuarioAdminActual?.id || null
        });

    if (error) {
        console.warn("No se pudo registrar el historial de estado:", error);
    }
}

async function cargarHistorialPedido(idPedido) {
    const { data, error } = await supabaseClient
        .from("historial_estados_cotizacion")
        .select("*")
        .eq("id_pedido", Number(idPedido))
        .order("creado_at", { ascending: false });

    if (error) {
        console.warn("No se pudo cargar el historial de estado:", error);
        return `
            <div class="historial-estados">
                <h3>Historial de estados</h3>
                <p class="historial-vacio">No se pudo cargar el historial.</p>
            </div>
        `;
    }

    if (!data || data.length === 0) {
        return `
            <div class="historial-estados">
                <h3>Historial de estados</h3>
                <p class="historial-vacio">Aun no hay cambios registrados para esta cotizacion.</p>
            </div>
        `;
    }

    return `
        <div class="historial-estados">
            <h3>Historial de estados</h3>
            <div class="historial-lista">
                ${data.map(function (item) {
                    return `
                        <div class="historial-item">
                            <span class="historial-fecha">${formatearFechaHora(item.creado_at)}</span>
                            <strong>${textoSeguroPedido(item.estado_anterior || "Sin estado")} -> ${textoSeguroPedido(item.estado_nuevo)}</strong>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

async function abrirDetallePedido(idPedido) {
    const pedido = pedidos.find(pedido => String(pedido.id_pedido) === String(idPedido));

    if (!pedido) {
        return;
    }

    const cliente = pedido.clientes || {};
    const telefonoWhatsapp = obtenerTelefonoWhatsapp(cliente.telefono);
    const mensajeWhatsapp = generarMensajeWhatsApp(pedido, cliente);
    const enlaceWhatsapp = telefonoWhatsapp
        ? `https://wa.me/${telefonoWhatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`
        : "";
    const historialHTML = await cargarHistorialPedido(idPedido);

    detallePedido.innerHTML = `
        <div class="detalle-estado">
            <span class="badge-estado estado-${normalizarEstado(pedido.estado)}">
                ${textoSeguroPedido(pedido.estado)}
            </span>
            ${crearEnlaceDetalleWhatsapp(enlaceWhatsapp)}
        </div>

        <div class="detalle-grid">
            ${crearDetalleItem("Codigo", pedido.codigo_pedido)}
            ${crearDetalleItem("Fecha de solicitud", formatearFechaHora(pedido.fecha_solicitud))}
            ${crearDetalleItem("Cliente", cliente.nombre || "Sin nombre")}
            ${crearDetalleItem("Telefono", cliente.telefono || "Sin telefono")}
            ${crearDetalleItem("Tipo de cliente", cliente.tipo_cliente || "No especificado")}
            ${crearDetalleItem("Tipo de prenda", pedido.tipo_prenda)}
            ${crearDetalleItem("Cantidad", Number(pedido.cantidad || 0))}
            ${crearDetalleItem("Tipo de bordado", pedido.tipo_bordado)}
            ${crearDetalleItem("Ubicacion", pedido.ubicacion_bordado)}
            ${crearDetalleItem("Color de prenda", pedido.color_prenda || "No especificado")}
            ${crearDetalleItem("Fecha aproximada", pedido.fecha_aproximada || "No especificado")}
            ${crearDetalleItem("Archivo referencia", pedido.archivo_referencia || "No especificado")}
        </div>

        <div class="detalle-texto">
            <span>Descripcion</span>
            <p>${textoSeguroPedido(pedido.descripcion || "Sin descripcion.")}</p>
        </div>

        <div class="detalle-texto">
            <span>Observaciones</span>
            <p>${textoSeguroPedido(pedido.observaciones || "Sin observaciones.")}</p>
        </div>

        ${historialHTML}
    `;

    pedidoModal.classList.add("active");
}

cerrarModal.addEventListener("click", function () {
    pedidoModal.classList.remove("active");
});

pedidoModal.addEventListener("click", function (event) {
    if (event.target === pedidoModal) {
        pedidoModal.classList.remove("active");
    }
});

function obtenerPedidosFiltrados() {
    const texto = busquedaPedido.value.trim().toLowerCase();
    const estado = filtroEstado.value;
    const mes = filtroMes.value;

    return pedidos.filter(function (pedido) {
        const cliente = pedido.clientes || {};
        const campos = [
            cliente.nombre,
            cliente.telefono,
            pedido.codigo_pedido,
            pedido.tipo_prenda,
            pedido.tipo_bordado
        ].join(" ").toLowerCase();

        const coincideTexto = !texto || campos.includes(texto);
        const coincideEstado = estado === "Todos" || pedido.estado === estado;
        const coincideMes = mes === "Todos" || obtenerClaveMes(new Date(pedido.fecha_solicitud)) === mes;

        return coincideTexto && coincideEstado && coincideMes;
    });
}

function aplicarFiltros() {
    pedidosFiltrados = obtenerPedidosFiltrados();
    renderizarTabla(pedidosFiltrados);
}

busquedaPedido.addEventListener("input", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);
filtroMes.addEventListener("change", aplicarFiltros);
recargarBtn.addEventListener("click", cargarPedidos);

logoutBtn.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    limpiarSesionCotizaciones();
    window.location.href = "login.html";
});

function renderizarGraficoMensual() {
    const canvas = document.getElementById("graficoMensual");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const conteoMeses = {};

    pedidos.forEach(function (pedido) {
        const claveMes = obtenerClaveMes(new Date(pedido.fecha_solicitud));
        conteoMeses[claveMes] = (conteoMeses[claveMes] || 0) + 1;
    });

    const etiquetas = Object.keys(conteoMeses).sort();
    const valores = etiquetas.map(mes => conteoMeses[mes]);

    if (graficoMensual) {
        graficoMensual.destroy();
    }

    graficoMensual = new Chart(canvas, {
        type: "bar",
        data: {
            labels: etiquetas.map(convertirClaveMesATexto),
            datasets: [{
                label: "Cotizaciones registradas",
                data: valores,
                backgroundColor: "#facc15",
                borderColor: "#111827",
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#374151"
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#374151"
                    },
                    grid: {
                        color: "rgba(17,24,39,0.08)"
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#374151",
                        precision: 0
                    },
                    grid: {
                        color: "rgba(17,24,39,0.08)"
                    }
                }
            }
        }
    });
}

function generarMensajeWhatsApp(pedido, cliente) {
    return `Hola ${cliente.nombre || ""}, somos 4DMK.

Hemos recibido tu solicitud de cotizacion.

Codigo de pedido: ${pedido.codigo_pedido}
Estado actual: ${pedido.estado}

Detalle principal:
- Prenda: ${pedido.tipo_prenda}
- Cantidad: ${pedido.cantidad}
- Bordado: ${pedido.tipo_bordado}
- Ubicacion: ${pedido.ubicacion_bordado}

Te escribimos para coordinar los detalles de tu pedido.`;
}

function normalizarEstado(estado) {
    return String(estado || "Pendiente")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
}

function obtenerClaveMes(fecha) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function convertirClaveMesATexto(clave) {
    const [year, month] = String(clave).split("-");
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return `${meses[Number(month) - 1] || month} ${year}`;
}

function formatearFechaHora(fechaISO) {
    if (!fechaISO) {
        return "-";
    }

    return new Date(fechaISO).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function limpiarTelefono(telefono) {
    return String(telefono || "").replace(/\D/g, "");
}

function obtenerTelefonoWhatsapp(telefono) {
    const limpio = limpiarTelefono(telefono);

    if (!limpio) {
        return "";
    }

    if (limpio.startsWith("51") && limpio.length > 9) {
        return limpio;
    }

    return `51${limpio}`;
}

function mostrarMensaje(texto, tipo) {
    adminMensaje.textContent = texto;
    adminMensaje.className = `mensaje-cotizaciones ${tipo}`;
}

function mostrarNotificacionPedido(mensaje, tipo = "exito") {
    let contenedor = document.getElementById("contenedorNotificacionesPedidos");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "contenedorNotificacionesPedidos";
        contenedor.className = "contenedor-notificaciones-pedidos";
        document.body.appendChild(contenedor);
    }

    const notificacion = document.createElement("div");
    notificacion.className = `notificacion-pedido notificacion-pedido-${tipo}`;

    let icono = "ri-checkbox-circle-line";
    let titulo = "Operacion realizada";

    if (tipo === "error") {
        icono = "ri-close-circle-line";
        titulo = "Error";
    }

    if (tipo === "advertencia") {
        icono = "ri-alert-line";
        titulo = "Atencion";
    }

    notificacion.innerHTML = `
        <div class="notificacion-pedido-icono">
            <i class="${icono}"></i>
        </div>
        <div class="notificacion-pedido-texto">
            <h4>${titulo}</h4>
            <p>${textoSeguroPedido(mensaje)}</p>
        </div>
    `;

    contenedor.appendChild(notificacion);

    setTimeout(function () {
        notificacion.classList.add("salir");
        setTimeout(function () {
            notificacion.remove();
        }, 350);
    }, 3500);
}

function crearTelefonoCotizacion(telefono, enlaceWhatsapp) {
    const texto = textoSeguroPedido(telefono || "Sin telefono");

    if (!enlaceWhatsapp) {
        return `<span class="texto-muted">${texto}</span>`;
    }

    return `<a href="${enlaceWhatsapp}" target="_blank" rel="noopener noreferrer">${texto}</a>`;
}

function crearBotonWhatsappCotizacion(enlaceWhatsapp) {
    if (!enlaceWhatsapp) {
        return `
            <button class="accion-btn accion-disabled" type="button" title="Telefono no disponible" disabled>
                <i class="ri-whatsapp-line"></i>
            </button>
        `;
    }

    return `
        <a class="accion-btn whatsapp-admin" href="${enlaceWhatsapp}" target="_blank" rel="noopener noreferrer" title="Responder por WhatsApp">
            <i class="ri-whatsapp-line"></i>
        </a>
    `;
}

function crearEnlaceDetalleWhatsapp(enlaceWhatsapp) {
    if (!enlaceWhatsapp) {
        return `
            <span class="detalle-whatsapp detalle-whatsapp-disabled">
                <i class="ri-whatsapp-line"></i>
                Sin telefono
            </span>
        `;
    }

    return `
        <a href="${enlaceWhatsapp}" target="_blank" rel="noopener noreferrer" class="detalle-whatsapp">
            <i class="ri-whatsapp-line"></i>
            Responder por WhatsApp
        </a>
    `;
}

function crearDetalleItem(etiqueta, valor) {
    return `
        <div>
            <span>${textoSeguroPedido(etiqueta)}</span>
            <strong>${textoSeguroPedido(valor || "-")}</strong>
        </div>
    `;
}

function textoSeguroPedido(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function limpiarSesionCotizaciones() {
    localStorage.removeItem("sesionActiva");
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("nombreUsuarioActivo");
    localStorage.removeItem("rolAdminActivo");
}
