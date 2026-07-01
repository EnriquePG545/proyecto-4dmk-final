const ventasDia = document.getElementById("ventasDia");
const cantidadProductos = document.getElementById("cantidadProductos");
const cantidadClientes = document.getElementById("cantidadClientes");
const cantidadStockBajo = document.getElementById("cantidadStockBajo");

const tablaUltimasVentas = document.getElementById("tablaUltimasVentas");
const tablaStockBajo = document.getElementById("tablaStockBajo");

cargarDashboardDesdeSQL();

async function cargarDashboardDesdeSQL() {
    try {
        const respuesta = await fetch("/api/dashboard");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo cargar el panel principal.");
            return;
        }

        mostrarResumen(datos.resumen);
        mostrarUltimasVentas(datos.ultimasVentas);
        mostrarProductosStockBajo(datos.productosStockBajo);

    } catch (error) {
        alert("Error al conectar con el servidor para cargar el panel principal.");
        console.error(error);
    }
}

function mostrarResumen(resumen) {
    ventasDia.textContent = `S/ ${Number(resumen.ventasDia).toFixed(2)}`;
    cantidadProductos.textContent = `${resumen.cantidadProductos} registrados`;
    cantidadClientes.textContent = `${resumen.cantidadClientes} registrados`;
    cantidadStockBajo.textContent = `${resumen.cantidadStockBajo} productos`;
}

function mostrarUltimasVentas(listaVentas) {
    tablaUltimasVentas.innerHTML = "";

    if (listaVentas.length === 0) {
        tablaUltimasVentas.innerHTML = `
            <tr>
                <td colspan="6">No hay ventas registradas todavía.</td>
            </tr>
        `;
        return;
    }

    listaVentas.forEach(function (venta) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${formatearFechaSQL(venta.fechaVenta)}</td>
            <td>${venta.nombreCliente}</td>
            <td>${venta.nombreProducto}</td>
            <td>${venta.cantidad}</td>
            <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
            <td>
                <span class="estado completado">Completado</span>
            </td>
        `;

        tablaUltimasVentas.appendChild(fila);
    });
}

function mostrarProductosStockBajo(listaProductos) {
    tablaStockBajo.innerHTML = "";

    if (listaProductos.length === 0) {
        tablaStockBajo.innerHTML = `
            <tr>
                <td colspan="5">No hay productos con stock bajo.</td>
            </tr>
        `;
        return;
    }

    listaProductos.forEach(function (producto) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${producto.ordenProduccion}</td>
            <td>${producto.codigoDiseno}</td>
            <td>${producto.nombreProducto}</td>
            <td>${producto.stock}</td>
            <td>S/ ${Number(producto.precio).toFixed(2)}</td>
        `;

        tablaStockBajo.appendChild(fila);
    });
}

function formatearFechaSQL(fecha) {
    const fechaObjeto = new Date(fecha);

    const anio = fechaObjeto.getFullYear();
    const mes = String(fechaObjeto.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaObjeto.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}