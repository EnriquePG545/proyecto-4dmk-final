const formVenta = document.getElementById("formVenta");
const tablaVentas = document.getElementById("tablaVentas");

const selectCliente = document.getElementById("cliente");
const selectProducto = document.getElementById("producto");

const inputStock = document.getElementById("stockDisponible");
const inputPrecio = document.getElementById("precio");
const inputCantidad = document.getElementById("cantidad");
const inputTotal = document.getElementById("total");

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

iniciarVentas();

async function iniciarVentas() {
    await cargarClientesDesdeSQL();
    await cargarProductosDesdeSQL();
    await cargarMetodosPagoDesdeSQL();
    await cargarVentasDesdeSQL();

    limpiarDatosProductoSeleccionado();
}

/* ============================================================
   CARGAR CLIENTES
   ============================================================ */

async function cargarClientesDesdeSQL() {
    try {
        const respuesta = await fetch("/api/clientes");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar clientes.");
            return;
        }

        clientes = datos.clientes;

        selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>';

        clientes
            .slice()
            .sort(function (a, b) {
                return a.nombreCliente.localeCompare(b.nombreCliente);
            })
            .forEach(function (cliente) {
                const opcion = document.createElement("option");

                opcion.value = cliente.idCliente;
                opcion.textContent = cliente.nombreCliente;

                selectCliente.appendChild(opcion);
            });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar clientes.");
        console.error(error);
    }
}

/* ============================================================
   CARGAR PRODUCTOS
   ============================================================ */

async function cargarProductosDesdeSQL() {
    try {
        const respuesta = await fetch("/api/productos");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar productos.");
            return;
        }

        productos = datos.productos;

        selectProducto.innerHTML = '<option value="">Seleccione un producto</option>';

        productos
            .slice()
            .sort(function (a, b) {
                return a.nombreProducto.localeCompare(b.nombreProducto);
            })
            .forEach(function (producto) {
                const opcion = document.createElement("option");

                opcion.value = producto.idProducto;
                opcion.textContent = `${producto.nombreProducto} - Stock: ${producto.stock}`;

                selectProducto.appendChild(opcion);
            });

        selectProducto.value = "";
        limpiarDatosProductoSeleccionado();

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar productos.");
        console.error(error);
    }
}

/* ============================================================
   CARGAR MÉTODOS DE PAGO
   ============================================================ */

async function cargarMetodosPagoDesdeSQL() {
    try {
        const respuesta = await fetch("/api/metodos-pago");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar métodos de pago.");
            return;
        }

        metodosPago = datos.metodos;

        selectPago.innerHTML = "";
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

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar métodos de pago.");
        console.error(error);
    }
}

/* ============================================================
   CARGAR VENTAS
   ============================================================ */

async function cargarVentasDesdeSQL() {
    try {
        const respuesta = await fetch("/api/ventas");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar ventas.");
            return;
        }

        ventas = datos.ventas;

        mostrarVentas();

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar ventas.");
        console.error(error);
    }
}

/* ============================================================
   SELECCIONAR PRODUCTO Y LLENAR DATOS
   ============================================================ */

selectProducto.addEventListener("change", function () {
    actualizarDatosProductoSeleccionado();
});

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

/* ============================================================
   CALCULAR TOTAL
   ============================================================ */

inputCantidad.addEventListener("input", function () {
    calcularTotal();
});

function calcularTotal() {
    const cantidad = Number(inputCantidad.value);
    const precio = Number(inputPrecio.value);

    if (cantidad > 0 && precio > 0) {
        inputTotal.value = (cantidad * precio).toFixed(2);
    } else {
        inputTotal.value = "";
    }
}

/* ============================================================
   REGISTRAR VENTA EN SQL SERVER
   ============================================================ */

formVenta.addEventListener("submit", async function (e) {
    e.preventDefault();

    const idCliente = Number(selectCliente.value);
    const idProducto = Number(selectProducto.value);
    const idMetodoPago = Number(selectPago.value);
    const cantidad = Number(inputCantidad.value);
    const fechaVenta = inputFecha.value;

    if (
        !idCliente ||
        !idProducto ||
        !idMetodoPago ||
        cantidad <= 0 ||
        fechaVenta === ""
    ) {
        alert("Completa todos los datos correctamente.");
        return;
    }

    const productoSeleccionado = productos.find(function (producto) {
        return Number(producto.idProducto) === idProducto;
    });

    if (!productoSeleccionado) {
        alert("El producto seleccionado no es válido.");
        return;
    }

    if (cantidad > Number(productoSeleccionado.stock)) {
        alert("No hay suficiente stock para realizar esta venta.");
        return;
    }

    try {
        const respuesta = await fetch("/api/ventas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                idCliente: idCliente,
                idMetodoPago: idMetodoPago,
                idProducto: idProducto,
                cantidad: cantidad,
                fechaVenta: fechaVenta
            })
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo registrar la venta.");
            return;
        }

        alert(datos.mensaje);

        formVenta.reset();

        limpiarDatosProductoSeleccionado();

        await cargarProductosDesdeSQL();
        await cargarVentasDesdeSQL();

    } catch (error) {
        alert("Error al registrar venta en el servidor.");
        console.error(error);
    }
});

/* ============================================================
   FILTROS
   ============================================================ */

buscadorVentas.addEventListener("input", function () {
    mostrarVentas();
});

filtroFecha.addEventListener("change", function () {
    mostrarVentas();
});

filtroPago.addEventListener("change", function () {
    mostrarVentas();
});

btnLimpiarFiltros.addEventListener("click", function () {
    buscadorVentas.value = "";
    filtroFecha.value = "";
    filtroPago.value = "";

    mostrarVentas();
});

/* ============================================================
   MOSTRAR VENTAS
   ============================================================ */

function mostrarVentas() {
    tablaVentas.innerHTML = "";

    const textoBusqueda = buscadorVentas.value.toLowerCase();
    const fechaSeleccionada = filtroFecha.value;
    const pagoSeleccionado = filtroPago.value;

    const ventasFiltradas = ventas
        .filter(function (venta) {
            const cliente = venta.nombreCliente.toLowerCase();
            const producto = venta.nombreProducto.toLowerCase();
            const fechaVenta = formatearFechaSQL(venta.fechaVenta);

            const coincideTexto =
                cliente.includes(textoBusqueda) ||
                producto.includes(textoBusqueda);

            const coincideFecha =
                fechaSeleccionada === "" ||
                fechaVenta === fechaSeleccionada;

            const coincidePago =
                pagoSeleccionado === "" ||
                venta.nombreMetodo === pagoSeleccionado;

            return coincideTexto && coincideFecha && coincidePago;
        })
        .sort(function (a, b) {
            const fechaA = new Date(a.fechaVenta).getTime();
            const fechaB = new Date(b.fechaVenta).getTime();

            if (fechaA !== fechaB) {
                return fechaB - fechaA;
            }

            const registroA = new Date(a.fechaRegistro).getTime();
            const registroB = new Date(b.fechaRegistro).getTime();

            return registroB - registroA;
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
            <td>${venta.nombreCliente}</td>
            <td>${venta.nombreProducto}</td>
            <td>${venta.cantidad}</td>
            <td>${venta.nombreMetodo}</td>
            <td>${formatearFechaSQL(venta.fechaVenta)}</td>
            <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
            <td>
                <button class="boton-tabla eliminar" onclick="anularVenta(${venta.idVenta})">
                    <i class="ri-delete-bin-line"></i>
                    Anular
                </button>
            </td>
        `;

        tablaVentas.appendChild(fila);
    });
}

/* ============================================================
   ANULAR VENTA
   ============================================================ */

async function anularVenta(idVenta) {
    const confirmar = confirm(
        "¿Estás seguro de anular esta venta? El stock será recuperado automáticamente."
    );

    if (confirmar === false) {
        return;
    }

    try {
        const respuesta = await fetch(`/api/ventas/${idVenta}`, {
            method: "DELETE"
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo anular la venta.");
            return;
        }

        alert(datos.mensaje);

        await cargarProductosDesdeSQL();
        await cargarVentasDesdeSQL();

    } catch (error) {
        alert("Error al anular venta en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   FORMATEAR FECHA
   ============================================================ */

function formatearFechaSQL(fecha) {
    const fechaObjeto = new Date(fecha);

    const anio = fechaObjeto.getFullYear();
    const mes = String(fechaObjeto.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaObjeto.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}