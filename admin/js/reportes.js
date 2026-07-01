const totalVentas = document.getElementById("totalVentas");
const ingresosTotales = document.getElementById("ingresosTotales");
const totalProductos = document.getElementById("totalProductos");
const stockBajo = document.getElementById("stockBajo");

const filtroFechaReporte = document.getElementById("filtroFechaReporte");
const filtroPagoReporte = document.getElementById("filtroPagoReporte");
const btnLimpiarReporte = document.getElementById("btnLimpiarReporte");

const tituloReporte = document.getElementById("tituloReporte");
const descripcionReporte = document.getElementById("descripcionReporte");
const encabezadoReporte = document.getElementById("encabezadoReporte");
const tablaReporte = document.getElementById("tablaReporte");
const tablaStockBajoReporte = document.getElementById("tablaStockBajoReporte");

let reporteActual = "";

iniciarReportes();

async function iniciarReportes() {
    await cargarMetodosPagoReporte();
    await cargarResumenReporte();
    await mostrarProductosStockBajo();
}

/* ============================================================
   CARGAR MÉTODOS DE PAGO
   ============================================================ */

async function cargarMetodosPagoReporte() {
    try {
        const respuesta = await fetch("/api/metodos-pago");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar métodos de pago.");
            return;
        }

        filtroPagoReporte.innerHTML = '<option value="">Todos</option>';

        datos.metodos.forEach(function (metodo) {
            const opcion = document.createElement("option");

            opcion.value = metodo.idMetodoPago;
            opcion.textContent = metodo.nombreMetodo;

            filtroPagoReporte.appendChild(opcion);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar métodos de pago.");
        console.error(error);
    }
}

/* ============================================================
   FILTROS
   ============================================================ */

filtroFechaReporte.addEventListener("change", async function () {
    await cargarResumenReporte();
    await recargarReporteActual();
});

filtroPagoReporte.addEventListener("change", async function () {
    await cargarResumenReporte();
    await recargarReporteActual();
});

btnLimpiarReporte.addEventListener("click", async function () {
    filtroFechaReporte.value = "";
    filtroPagoReporte.value = "";

    await cargarResumenReporte();
    limpiarReporte();

    reporteActual = "";
    tituloReporte.textContent = "Resultado del reporte";
    descripcionReporte.textContent = "Selecciona una consulta para mostrar los datos correspondientes";
});

function obtenerQueryFiltros() {
    const fecha = filtroFechaReporte.value;
    const idMetodoPago = filtroPagoReporte.value;

    const parametros = new URLSearchParams();

    if (fecha !== "") {
        parametros.append("fecha", fecha);
    }

    if (idMetodoPago !== "") {
        parametros.append("idMetodoPago", idMetodoPago);
    }

    return parametros.toString();
}

async function recargarReporteActual() {
    if (reporteActual === "ventas") {
        await mostrarVentasRecientes();
    }

    if (reporteActual === "productos") {
        await mostrarProductosMasVendidos();
    }

    if (reporteActual === "clientes") {
        await mostrarClientesFrecuentes();
    }

    if (reporteActual === "ingresos") {
        await mostrarIngresosPorFecha();
    }
}

/* ============================================================
   RESUMEN
   ============================================================ */

async function cargarResumenReporte() {
    try {
        const query = obtenerQueryFiltros();

        const respuesta = await fetch(`/api/reportes/resumen?${query}`);
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar resumen.");
            return;
        }

        const resumen = datos.resumen;

        totalVentas.textContent = resumen.totalVentas;
        ingresosTotales.textContent = `S/ ${Number(resumen.ingresosTotales).toFixed(2)}`;
        totalProductos.textContent = resumen.totalProductos;
        stockBajo.textContent = resumen.stockBajo;

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar el resumen.");
        console.error(error);
    }
}

/* ============================================================
   UTILIDADES
   ============================================================ */

function limpiarReporte() {
    encabezadoReporte.innerHTML = "";
    tablaReporte.innerHTML = "";
}

function formatearFechaSQL(fecha) {
    const fechaObjeto = new Date(fecha);

    const anio = fechaObjeto.getFullYear();
    const mes = String(fechaObjeto.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaObjeto.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

/* ============================================================
   VENTAS RECIENTES
   ============================================================ */

async function mostrarVentasRecientes() {
    reporteActual = "ventas";
    limpiarReporte();

    tituloReporte.textContent = "Ventas recientes";
    descripcionReporte.textContent = "Muestra ventas ordenadas por fecha según los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Pago</th>
            <th>Fecha</th>
            <th>Total</th>
        </tr>
    `;

    try {
        const query = obtenerQueryFiltros();

        const respuesta = await fetch(`/api/reportes/ventas-recientes?${query}`);
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar ventas recientes.");
            return;
        }

        if (datos.ventas.length === 0) {
            tablaReporte.innerHTML = `
                <tr>
                    <td colspan="6">No hay ventas para los filtros seleccionados.</td>
                </tr>
            `;
            return;
        }

        datos.ventas.forEach(function (venta) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${venta.nombreCliente}</td>
                <td>${venta.nombreProducto}</td>
                <td>${venta.cantidad}</td>
                <td>${venta.nombreMetodo}</td>
                <td>${formatearFechaSQL(venta.fechaVenta)}</td>
                <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
            `;

            tablaReporte.appendChild(fila);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar ventas recientes.");
        console.error(error);
    }
}

/* ============================================================
   PRODUCTOS MÁS VENDIDOS
   ============================================================ */

async function mostrarProductosMasVendidos() {
    reporteActual = "productos";
    limpiarReporte();

    tituloReporte.textContent = "Productos más vendidos";
    descripcionReporte.textContent = "Suma la cantidad vendida por producto según los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Cantidad vendida</th>
            <th>Ingreso generado</th>
        </tr>
    `;

    try {
        const query = obtenerQueryFiltros();

        const respuesta = await fetch(`/api/reportes/productos-mas-vendidos?${query}`);
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar productos más vendidos.");
            return;
        }

        if (datos.productos.length === 0) {
            tablaReporte.innerHTML = `
                <tr>
                    <td colspan="3">No hay productos vendidos para los filtros seleccionados.</td>
                </tr>
            `;
            return;
        }

        datos.productos.forEach(function (producto) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${producto.nombreProducto}</td>
                <td>${producto.cantidadVendida}</td>
                <td>S/ ${Number(producto.ingresoGenerado).toFixed(2)}</td>
            `;

            tablaReporte.appendChild(fila);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar productos más vendidos.");
        console.error(error);
    }
}

/* ============================================================
   CLIENTES FRECUENTES
   ============================================================ */

async function mostrarClientesFrecuentes() {
    reporteActual = "clientes";
    limpiarReporte();

    tituloReporte.textContent = "Clientes frecuentes";
    descripcionReporte.textContent = "Muestra clientes con mayor cantidad de compras según los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Cliente</th>
            <th>Cantidad de compras</th>
            <th>Total comprado</th>
        </tr>
    `;

    try {
        const query = obtenerQueryFiltros();

        const respuesta = await fetch(`/api/reportes/clientes-frecuentes?${query}`);
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar clientes frecuentes.");
            return;
        }

        if (datos.clientes.length === 0) {
            tablaReporte.innerHTML = `
                <tr>
                    <td colspan="3">No hay clientes para los filtros seleccionados.</td>
                </tr>
            `;
            return;
        }

        datos.clientes.forEach(function (cliente) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${cliente.nombreCliente}</td>
                <td>${cliente.cantidadCompras}</td>
                <td>S/ ${Number(cliente.totalComprado).toFixed(2)}</td>
            `;

            tablaReporte.appendChild(fila);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar clientes frecuentes.");
        console.error(error);
    }
}

/* ============================================================
   INGRESOS POR FECHA
   ============================================================ */

async function mostrarIngresosPorFecha() {
    reporteActual = "ingresos";
    limpiarReporte();

    tituloReporte.textContent = "Ingresos por fecha";
    descripcionReporte.textContent = "Agrupa las ventas por día y calcula ingresos según los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Fecha</th>
            <th>Cantidad de ventas</th>
            <th>Ingresos del día</th>
        </tr>
    `;

    try {
        const query = obtenerQueryFiltros();

        const respuesta = await fetch(`/api/reportes/ingresos-por-fecha?${query}`);
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar ingresos por fecha.");
            return;
        }

        if (datos.ingresos.length === 0) {
            tablaReporte.innerHTML = `
                <tr>
                    <td colspan="3">No hay ingresos para los filtros seleccionados.</td>
                </tr>
            `;
            return;
        }

        datos.ingresos.forEach(function (item) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${formatearFechaSQL(item.fechaVenta)}</td>
                <td>${item.cantidadVentas}</td>
                <td>S/ ${Number(item.ingresos).toFixed(2)}</td>
            `;

            tablaReporte.appendChild(fila);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar ingresos por fecha.");
        console.error(error);
    }
}

/* ============================================================
   STOCK BAJO
   ============================================================ */

async function mostrarProductosStockBajo() {
    tablaStockBajoReporte.innerHTML = "";

    try {
        const respuesta = await fetch("/api/reportes/stock-bajo");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar productos con bajo stock.");
            return;
        }

        if (datos.productos.length === 0) {
            tablaStockBajoReporte.innerHTML = `
                <tr>
                    <td colspan="5">No hay productos con bajo stock.</td>
                </tr>
            `;
            return;
        }

        datos.productos.forEach(function (producto) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${producto.ordenProduccion}</td>
                <td>${producto.codigoDiseno}</td>
                <td>${producto.nombreProducto}</td>
                <td>${producto.stock}</td>
                <td>S/ ${Number(producto.precio).toFixed(2)}</td>
            `;

            tablaStockBajoReporte.appendChild(fila);
        });

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar productos con bajo stock.");
        console.error(error);
    }
}