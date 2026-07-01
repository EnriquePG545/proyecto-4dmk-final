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

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSesionAdmin();
    await cargarPedidos();
});

async function verificarSesionAdmin() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        window.location.href = "login.html";
        return;
    }

    const usuario = sessionData.session.user;
    adminCorreo.textContent = usuario.email;

    const { data: adminData, error: adminError } = await supabaseClient
        .from("admins")
        .select("*")
        .eq("user_id", usuario.id)
        .single();

    if (adminError || !adminData) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    }
}

async function cargarPedidos() {
    mostrarMensaje("Cargando pedidos...", "info");

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

        mostrarMensaje("No se pudieron cargar los pedidos. Revisa la conexión o las políticas RLS.", "error");

        tablaPedidos.innerHTML = `
            <tr>
                <td colspan="9">Error al cargar pedidos.</td>
            </tr>
        `;

        return;
    }

    pedidos = data || [];
    pedidosFiltrados = [...pedidos];

    actualizarResumen();
    cargarFiltroMeses();
    renderizarTabla(pedidosFiltrados);
    renderizarGraficoMensual();

    if (pedidos.length === 0) {
        mostrarMensaje("Todavía no hay pedidos registrados.", "info");
    } else {
        mostrarMensaje(`Se cargaron ${pedidos.length} pedido(s).`, "success");
    }
}

function actualizarResumen() {
    const mesActual = obtenerClaveMes(new Date());

    totalPedidos.textContent = pedidos.length;

    totalMesActual.textContent = pedidos.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha_solicitud);
        return obtenerClaveMes(fechaPedido) === mesActual;
    }).length;

    totalPendientes.textContent = pedidos.filter(p => p.estado === "Pendiente").length;
    totalCotizados.textContent = pedidos.filter(p => p.estado === "Cotizado").length;
    totalFinalizados.textContent = pedidos.filter(p => p.estado === "Finalizado").length;
}

function cargarFiltroMeses() {
    const meses = new Set();

    pedidos.forEach(pedido => {
        const fecha = new Date(pedido.fecha_solicitud);
        const claveMes = obtenerClaveMes(fecha);
        meses.add(claveMes);
    });

    filtroMes.innerHTML = `<option value="Todos">Todos los meses</option>`;

    [...meses].sort().reverse().forEach(mes => {
        const option = document.createElement("option");
        option.value = mes;
        option.textContent = convertirClaveMesATexto(mes);
        filtroMes.appendChild(option);
    });
}

function renderizarTabla(lista) {
    if (!lista.length) {
        tablaPedidos.innerHTML = `
            <tr>
                <td colspan="9">No se encontraron pedidos con esos filtros.</td>
            </tr>
        `;

        return;
    }

    tablaPedidos.innerHTML = "";

    lista.forEach(pedido => {
        const cliente = pedido.clientes || {};
        const fecha = formatearFechaHora(pedido.fecha_solicitud);
        const telefonoLimpio = limpiarTelefono(cliente.telefono);
        const mensajeWhatsapp = generarMensajeWhatsApp(pedido, cliente);
        const enlaceWhatsapp = `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensajeWhatsapp)}`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <strong>${pedido.codigo_pedido}</strong>
            </td>

            <td>${cliente.nombre || "Sin nombre"}</td>

            <td>
                <a href="${enlaceWhatsapp}" target="_blank">
                    ${cliente.telefono || "Sin teléfono"}
                </a>
            </td>

            <td>${pedido.tipo_prenda}</td>

            <td>${pedido.cantidad}</td>

            <td>${pedido.tipo_bordado}</td>

            <td>
                <select class="estado-select estado-${normalizarEstado(pedido.estado)}" data-id="${pedido.id_pedido}">
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
                <button class="accion-btn ver-detalle" data-id="${pedido.id_pedido}" title="Ver detalle">
                    <i class="fa-solid fa-eye"></i>
                </button>

                <a class="accion-btn whatsapp-admin" href="${enlaceWhatsapp}" target="_blank" title="Responder por WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i>
                </a>
            </td>
        `;

        tablaPedidos.appendChild(tr);
    });

    activarEventosTabla();
}

function activarEventosTabla() {
    const selectsEstado = document.querySelectorAll(".estado-select");

    selectsEstado.forEach(select => {
        select.addEventListener("change", async () => {
            const idPedido = select.dataset.id;
            const nuevoEstado = select.value;

            select.className = `estado-select estado-${normalizarEstado(nuevoEstado)}`;

            await actualizarEstadoPedido(idPedido, nuevoEstado);
        });
    });

    const botonesDetalle = document.querySelectorAll(".ver-detalle");

    botonesDetalle.forEach(boton => {
        boton.addEventListener("click", () => {
            const idPedido = boton.dataset.id;
            abrirDetallePedido(idPedido);
        });
    });
}

async function actualizarEstadoPedido(idPedido, nuevoEstado) {
    mostrarMensaje("Actualizando estado...", "info");

    const { error } = await supabaseClient
        .from("pedidos_cotizacion")
        .update({ estado: nuevoEstado })
        .eq("id_pedido", idPedido);

    if (error) {
        console.error(error);
        mostrarMensaje("No se pudo actualizar el estado.", "error");
        return;
    }

    pedidos = pedidos.map(pedido => {
        if (String(pedido.id_pedido) === String(idPedido)) {
            return {
                ...pedido,
                estado: nuevoEstado
            };
        }

        return pedido;
    });

    aplicarFiltros();
    actualizarResumen();
    renderizarGraficoMensual();

    if (nuevoEstado === "Cancelado") {
    mostrarMensaje("Pedido cancelado correctamente.", "success");

    mostrarNotificacionPedido(
        "La solicitud fue cancelada correctamente. El cliente podrá ver que su pedido fue marcado como cancelado.",
        "advertencia"
    );
} else {
    mostrarMensaje("Estado actualizado correctamente.", "success");

    mostrarNotificacionPedido(
        `El estado del pedido fue actualizado a "${nuevoEstado}".`,
        "exito"
    );
}
}

function abrirDetallePedido(idPedido) {
    const pedido = pedidos.find(p => String(p.id_pedido) === String(idPedido));

    if (!pedido) {
        return;
    }

    const cliente = pedido.clientes || {};
    const telefonoLimpio = limpiarTelefono(cliente.telefono);
    const mensajeWhatsapp = generarMensajeWhatsApp(pedido, cliente);
    const enlaceWhatsapp = `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensajeWhatsapp)}`;

    detallePedido.innerHTML = `
        <div class="detalle-estado">
            <span class="badge-estado estado-${normalizarEstado(pedido.estado)}">
                ${pedido.estado}
            </span>

            <a href="${enlaceWhatsapp}" target="_blank" class="detalle-whatsapp">
                <i class="fa-brands fa-whatsapp"></i>
                Responder por WhatsApp
            </a>
        </div>

        <div class="detalle-grid">
            <div>
                <span>Código</span>
                <strong>${pedido.codigo_pedido}</strong>
            </div>

            <div>
                <span>Fecha de solicitud</span>
                <strong>${formatearFechaHora(pedido.fecha_solicitud)}</strong>
            </div>

            <div>
                <span>Cliente</span>
                <strong>${cliente.nombre || "Sin nombre"}</strong>
            </div>

            <div>
                <span>Teléfono</span>
                <strong>${cliente.telefono || "Sin teléfono"}</strong>
            </div>

            <div>
                <span>Tipo de cliente</span>
                <strong>${cliente.tipo_cliente || "No especificado"}</strong>
            </div>

            <div>
                <span>Tipo de prenda</span>
                <strong>${pedido.tipo_prenda}</strong>
            </div>

            <div>
                <span>Cantidad</span>
                <strong>${pedido.cantidad}</strong>
            </div>

            <div>
                <span>Tipo de bordado</span>
                <strong>${pedido.tipo_bordado}</strong>
            </div>

            <div>
                <span>Ubicación</span>
                <strong>${pedido.ubicacion_bordado}</strong>
            </div>

            <div>
                <span>Color de prenda</span>
                <strong>${pedido.color_prenda || "No especificado"}</strong>
            </div>

            <div>
                <span>Fecha aproximada</span>
                <strong>${pedido.fecha_aproximada || "No especificado"}</strong>
            </div>

            <div>
                <span>Archivo referencia</span>
                <strong>${pedido.archivo_referencia || "No especificado"}</strong>
            </div>
        </div>

        <div class="detalle-texto">
            <span>Descripción</span>
            <p>${pedido.descripcion || "Sin descripción."}</p>
        </div>

        <div class="detalle-texto">
            <span>Observaciones</span>
            <p>${pedido.observaciones || "Sin observaciones."}</p>
        </div>
    `;

    pedidoModal.classList.add("active");
}

cerrarModal.addEventListener("click", () => {
    pedidoModal.classList.remove("active");
});

pedidoModal.addEventListener("click", (e) => {
    if (e.target === pedidoModal) {
        pedidoModal.classList.remove("active");
    }
});

function aplicarFiltros() {
    const texto = busquedaPedido.value.trim().toLowerCase();
    const estado = filtroEstado.value;
    const mes = filtroMes.value;

    pedidosFiltrados = pedidos.filter(pedido => {
        const cliente = pedido.clientes || {};

        const nombre = (cliente.nombre || "").toLowerCase();
        const telefono = (cliente.telefono || "").toLowerCase();
        const codigo = (pedido.codigo_pedido || "").toLowerCase();
        const prenda = (pedido.tipo_prenda || "").toLowerCase();
        const bordado = (pedido.tipo_bordado || "").toLowerCase();

        const coincideTexto =
            !texto ||
            nombre.startsWith(texto) ||
            telefono.startsWith(texto) ||
            codigo.startsWith(texto) ||
            prenda.startsWith(texto) ||
            bordado.startsWith(texto) ||
            nombre.includes(texto) ||
            telefono.includes(texto) ||
            codigo.includes(texto) ||
            prenda.includes(texto) ||
            bordado.includes(texto);

        const coincideEstado =
            estado === "Todos" || pedido.estado === estado;

        const fechaPedido = new Date(pedido.fecha_solicitud);
        const claveMes = obtenerClaveMes(fechaPedido);

        const coincideMes =
            mes === "Todos" || claveMes === mes;

        return coincideTexto && coincideEstado && coincideMes;
    });

    renderizarTabla(pedidosFiltrados);
}

busquedaPedido.addEventListener("input", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);
filtroMes.addEventListener("change", aplicarFiltros);

recargarBtn.addEventListener("click", cargarPedidos);

logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
});

function renderizarGraficoMensual() {
    const canvas = document.getElementById("graficoMensual");

    const conteoMeses = {};

    pedidos.forEach(pedido => {
        const fecha = new Date(pedido.fecha_solicitud);
        const claveMes = obtenerClaveMes(fecha);

        if (!conteoMeses[claveMes]) {
            conteoMeses[claveMes] = 0;
        }

        conteoMeses[claveMes]++;
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
                label: "Pedidos registrados",
                data: valores,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "#d7e3f4"
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#d7e3f4"
                    },
                    grid: {
                        color: "rgba(255,255,255,0.08)"
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#d7e3f4",
                        precision: 0
                    },
                    grid: {
                        color: "rgba(255,255,255,0.08)"
                    }
                }
            }
        }
    });
}

function generarMensajeWhatsApp(pedido, cliente) {
    return `Hola ${cliente.nombre || ""}, somos 4DMK.

Hemos recibido tu solicitud de cotización.

Código de pedido: ${pedido.codigo_pedido}
Estado actual: ${pedido.estado}

Detalle principal:
- Prenda: ${pedido.tipo_prenda}
- Cantidad: ${pedido.cantidad}
- Bordado: ${pedido.tipo_bordado}
- Ubicación: ${pedido.ubicacion_bordado}

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
    const [year, month] = clave.split("-");

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return `${meses[Number(month) - 1]} ${year}`;
}

function formatearFechaHora(fechaISO) {
    const fecha = new Date(fechaISO);

    return fecha.toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function limpiarTelefono(telefono) {
    return String(telefono || "").replace(/\D/g, "");
}

function mostrarMensaje(texto, tipo) {
    adminMensaje.textContent = texto;
    adminMensaje.className = `admin-mensaje ${tipo}`;
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

    let icono = "fa-circle-check";
    let titulo = "Operación realizada";

    if (tipo === "error") {
        icono = "fa-circle-xmark";
        titulo = "Error";
    }

    if (tipo === "advertencia") {
        icono = "fa-triangle-exclamation";
        titulo = "Atención";
    }

    notificacion.innerHTML = `
        <div class="notificacion-pedido-icono">
            <i class="fa-solid ${icono}"></i>
        </div>

        <div class="notificacion-pedido-texto">
            <h4>${titulo}</h4>
            <p>${mensaje}</p>
        </div>
    `;

    contenedor.appendChild(notificacion);

    setTimeout(() => {
        notificacion.classList.add("salir");
        setTimeout(() => {
            notificacion.remove();
        }, 350);
    }, 3500);
}