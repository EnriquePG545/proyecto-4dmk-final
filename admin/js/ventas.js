const formVenta = document.getElementById("formVenta");
const tablaVentas = document.getElementById("tablaVentas");

const selectCliente = document.getElementById("cliente");
const selectProducto = document.getElementById("producto");

const inputStock = document.getElementById("stockDisponible");
const inputPrecio = document.getElementById("precio");
const inputCantidad = document.getElementById("cantidad");
const inputTotal = document.getElementById("total");
const inputObservacion = document.getElementById("observacion");

const selectPago = document.getElementById("pago");
const inputFecha = document.getElementById("fecha");

const buscadorVentas = document.getElementById("buscadorVentas");
const filtroFecha = document.getElementById("filtroFecha");
const filtroPago = document.getElementById("filtroPago");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

let productos = [];
let clientes = [];
let metodosPago = [];
let ventas = [];
let canalVentas = null;

iniciarVentas();

async function iniciarVentas() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    inputFecha.value = obtenerFechaActual();

    await Promise.all([
        cargarClientesDesdeSQL(),
        cargarProductosDesdeSQL(),
        cargarMetodosPagoDesdeSQL()
    ]);

    await cargarVentasDesdeSQL();
    activarRealtimeVentas();
    limpiarDatosProductoSeleccionado();
}

async function cargarClientesDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_clientes")
        .select("*")
        .order("nombre_cliente", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los clientes desde Supabase.");
        return;
    }

    clientes = (data || []).map(mapearCliente);

    selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>';

    clientes.forEach(function (cliente) {
        const opcion = document.createElement("option");
        opcion.value = cliente.idCliente;
        opcion.textContent = cliente.nombreCliente;
        selectCliente.appendChild(opcion);
    });
}

async function cargarProductosDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_productos")
        .select("*")
        .order("nombre_producto", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los productos desde Supabase.");
        return;
    }

    productos = (data || []).map(mapearProducto);

    const productoSeleccionado = selectProducto.value;
    selectProducto.innerHTML = '<option value="">Seleccione un producto</option>';

    productos.forEach(function (producto) {
        const opcion = document.createElement("option");
        opcion.value = producto.idProducto;
        opcion.textContent = `${producto.nombreProducto} - Stock: ${producto.stock}`;
        selectProducto.appendChild(opcion);
    });

    selectProducto.value = productoSeleccionado;
    actualizarDatosProductoSeleccionado();
}

async function cargarMetodosPagoDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_metodos_pago")
        .select("*")
        .eq("activo", true)
        .order("nombre_metodo", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los metodos de pago desde Supabase.");
        return;
    }

    metodosPago = (data || []).map(mapearMetodoPago);

    selectPago.innerHTML = '<option value="">Seleccione un metodo</option>';
    filtroPago.innerHTML = '<option value="">Todos</option>';

    metodosPago.forEach(function (metodo) {
        const opcionVenta = document.createElement("option");
        opcionVenta.value = metodo.idMetodoPago;
        opcionVenta.textContent = metodo.nombreMetodo;
        selectPago.appendChild(opcionVenta);

        const opcionFiltro = document.createElement("option");
        opcionFiltro.value = metodo.nombreMetodo;
        opcionFiltro.textContent = metodo.nombreMetodo;
        filtroPago.appendChild(opcionFiltro);
    });
}

async function cargarVentasDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_ventas")
        .select(`
            *,
            sistema_clientes (
                nombre_cliente
            ),
            sistema_productos (
                nombre_producto
            ),
            sistema_metodos_pago (
                nombre_metodo
            )
        `)
        .eq("anulada", false)
        .order("fecha_venta", { ascending: false })
        .order("fecha_registro", { ascending: false });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar las ventas desde Supabase.");
        return;
    }

    ventas = (data || []).map(mapearVenta);
    mostrarVentas();
}

selectProducto.addEventListener("change", actualizarDatosProductoSeleccionado);
inputCantidad.addEventListener("input", calcularTotal);

function actualizarDatosProductoSeleccionado() {
    const idProducto = Number(selectProducto.value);

    if (!idProducto) {
        limpiarDatosProductoSeleccionado();
        return;
    }

    const productoSeleccionado = productos.find(function (producto) {
        return Number(producto.idProducto) === idProducto;
    });

    if (!productoSeleccionado) {
        limpiarDatosProductoSeleccionado();
        return;
    }

    inputStock.value = Number(productoSeleccionado.stock);
    inputPrecio.value = Number(productoSeleccionado.precio).toFixed(2);
    calcularTotal();
}

function limpiarDatosProductoSeleccionado() {
    inputStock.value = "";
    inputPrecio.value = "";
    inputTotal.value = "";
}

function calcularTotal() {
    const cantidad = Number(inputCantidad.value);
    const precio = Number(inputPrecio.value);

    if (cantidad > 0 && precio > 0) {
        inputTotal.value = (cantidad * precio).toFixed(2);
    } else {
        inputTotal.value = "";
    }
}

formVenta.addEventListener("submit", async function (e) {
    e.preventDefault();

    const idCliente = Number(selectCliente.value);
    const idProducto = Number(selectProducto.value);
    const idMetodoPago = Number(selectPago.value);
    const cantidad = Number(inputCantidad.value);
    const fechaVenta = inputFecha.value;
    const observacion = inputObservacion.value.trim() || null;

    if (!idCliente || !idProducto || !idMetodoPago || cantidad <= 0 || fechaVenta === "") {
        alert("Completa todos los datos correctamente.");
        return;
    }

    const productoSeleccionado = productos.find(function (producto) {
        return Number(producto.idProducto) === idProducto;
    });

    if (!productoSeleccionado) {
        alert("El producto seleccionado no es valido.");
        return;
    }

    if (cantidad > Number(productoSeleccionado.stock)) {
        alert("No hay suficiente stock para realizar esta venta.");
        return;
    }

    const { error } = await supabaseClient.rpc("fn_registrar_venta_sistema", {
        p_id_cliente: idCliente,
        p_id_producto: idProducto,
        p_id_metodo_pago: idMetodoPago,
        p_cantidad: cantidad,
        p_fecha_venta: fechaVenta,
        p_observacion: observacion
    });

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorSupabase(error, "No se pudo registrar la venta."));
        return;
    }

    alert("Venta registrada correctamente.");
    formVenta.reset();
    inputFecha.value = obtenerFechaActual();
    limpiarDatosProductoSeleccionado();

    await Promise.all([
        cargarProductosDesdeSQL(),
        cargarVentasDesdeSQL()
    ]);
});

buscadorVentas.addEventListener("input", mostrarVentas);
filtroFecha.addEventListener("change", mostrarVentas);
filtroPago.addEventListener("change", mostrarVentas);

btnLimpiarFiltros.addEventListener("click", function () {
    buscadorVentas.value = "";
    filtroFecha.value = "";
    filtroPago.value = "";
    mostrarVentas();
});

function mostrarVentas() {
    tablaVentas.innerHTML = "";

    const textoBusqueda = buscadorVentas.value.toLowerCase();
    const fechaSeleccionada = filtroFecha.value;
    const pagoSeleccionado = filtroPago.value;

    const ventasFiltradas = ventas
        .filter(function (venta) {
            const cliente = String(venta.nombreCliente || "").toLowerCase();
            const producto = String(venta.nombreProducto || "").toLowerCase();
            const fechaVenta = formatearFechaSQL(venta.fechaVenta);

            const coincideTexto = cliente.includes(textoBusqueda) || producto.includes(textoBusqueda);
            const coincideFecha = fechaSeleccionada === "" || fechaVenta === fechaSeleccionada;
            const coincidePago = pagoSeleccionado === "" || venta.nombreMetodo === pagoSeleccionado;

            return coincideTexto && coincideFecha && coincidePago;
        })
        .sort(function (a, b) {
            const fechaA = new Date(a.fechaVenta).getTime();
            const fechaB = new Date(b.fechaVenta).getTime();

            if (fechaA !== fechaB) {
                return fechaB - fechaA;
            }

            return new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
        });

    if (ventasFiltradas.length === 0) {
        tablaVentas.innerHTML = `
            <tr>
                <td colspan="7">No se encontraron ventas relacionadas.</td>
            </tr>
        `;
        return;
    }

    ventasFiltradas.forEach(function (venta) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${textoSeguro(venta.nombreCliente)}</td>
            <td>${textoSeguro(venta.nombreProducto)}</td>
            <td>${Number(venta.cantidad)}</td>
            <td>${textoSeguro(venta.nombreMetodo)}</td>
            <td>${formatearFechaSQL(venta.fechaVenta)}</td>
            <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
            <td>
                <button class="boton-tabla eliminar" onclick="anularVenta(${Number(venta.idVenta)})">
                    <i class="ri-delete-bin-line"></i>
                    Anular
                </button>
            </td>
        `;

        tablaVentas.appendChild(fila);
    });
}

async function anularVenta(idVenta) {
    const confirmar = confirm("Estas seguro de anular esta venta? El stock sera recuperado automaticamente.");

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient.rpc("fn_anular_venta_sistema", {
        p_id_venta: Number(idVenta)
    });

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorSupabase(error, "No se pudo anular la venta."));
        return;
    }

    alert("Venta anulada correctamente.");

    await Promise.all([
        cargarProductosDesdeSQL(),
        cargarVentasDesdeSQL()
    ]);
}

function activarRealtimeVentas() {
    if (canalVentas) {
        return;
    }

    canalVentas = supabaseClient
        .channel("sistema-ventas-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_ventas"
        }, cargarVentasDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_productos"
        }, cargarProductosDesdeSQL)
        .subscribe();
}

function mapearCliente(cliente) {
    return {
        idCliente: cliente.id_cliente,
        nombreCliente: cliente.nombre_cliente
    };
}

function mapearProducto(producto) {
    return {
        idProducto: producto.id_producto,
        ordenProduccion: producto.orden_produccion,
        codigoDiseno: producto.codigo_diseno,
        stock: producto.stock,
        nombreProducto: producto.nombre_producto,
        precio: producto.precio
    };
}

function mapearMetodoPago(metodo) {
    return {
        idMetodoPago: metodo.id_metodo_pago,
        nombreMetodo: metodo.nombre_metodo
    };
}

function mapearVenta(venta) {
    return {
        idVenta: venta.id_venta,
        nombreCliente: venta.sistema_clientes?.nombre_cliente || "Cliente eliminado",
        nombreProducto: venta.sistema_productos?.nombre_producto || "Producto eliminado",
        cantidad: venta.cantidad,
        nombreMetodo: venta.sistema_metodos_pago?.nombre_metodo || "-",
        fechaVenta: venta.fecha_venta,
        fechaRegistro: venta.fecha_registro,
        totalVenta: venta.total_venta
    };
}

function formatearFechaSQL(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).slice(0, 10);
}

function obtenerFechaActual() {
    return new Date().toISOString().slice(0, 10);
}

function textoSeguro(valor) {
    if (typeof escaparHTML === "function") {
        return escaparHTML(valor);
    }

    return String(valor ?? "");
}

function obtenerMensajeErrorSupabase(error, mensajeBase) {
    const mensaje = error?.message || "";

    if (mensaje.includes("No hay suficiente stock")) {
        return "No hay suficiente stock para realizar esta venta.";
    }

    if (mensaje.includes("No autorizado")) {
        return "Tu usuario no tiene permiso para realizar esta accion.";
    }

    return mensajeBase;
}
