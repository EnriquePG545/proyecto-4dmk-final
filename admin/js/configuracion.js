const resumenProductos = document.getElementById("resumenProductos");
const resumenClientes = document.getElementById("resumenClientes");
const resumenVentas = document.getElementById("resumenVentas");
const estadoRespaldo = document.getElementById("estadoRespaldo");

const btnExportar = document.getElementById("btnExportar");
const btnExportarExcel = document.getElementById("btnExportarExcel");
const btnGenerarPDF = document.getElementById("btnGenerarPDF");

const btnImportar = document.getElementById("btnImportar");
const archivoImportar = document.getElementById("archivoImportar");
const nombreArchivo = document.getElementById("nombreArchivo");

const btnLimpiarSistema = document.getElementById("btnLimpiarSistema");

let datosSistema = {
    resumen: {},
    productos: [],
    clientes: [],
    ventas: []
};

cargarDatosConfiguracion();

/* ============================================================
   CARGAR DATOS DESDE SQL SERVER
   ============================================================ */

async function cargarDatosConfiguracion() {
    try {
        const respuesta = await fetch("/api/configuracion/datos");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudieron cargar los datos del sistema.");
            return;
        }

        datosSistema = {
            resumen: datos.resumen,
            productos: datos.productos,
            clientes: datos.clientes,
            ventas: datos.ventas
        };

        actualizarResumen();

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar configuración.");
        console.error(error);
    }
}

function actualizarResumen() {
    const resumen = datosSistema.resumen;

    resumenProductos.textContent = resumen.totalProductos || 0;
    resumenClientes.textContent = resumen.totalClientes || 0;
    resumenVentas.textContent = resumen.totalVentas || 0;

    if (
        Number(resumen.totalProductos) === 0 &&
        Number(resumen.totalClientes) === 0 &&
        Number(resumen.totalVentas) === 0
    ) {
        estadoRespaldo.textContent = "Vacío";
    } else {
        estadoRespaldo.textContent = "Activo";
    }
}

/* ============================================================
   EXPORTAR JSON DESDE SQL
   ============================================================ */

btnExportar.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    const respaldo = {
        sistema: "4DMK",
        descripcion: "Respaldo generado desde SQL Server",
        fechaExportacion: new Date().toISOString(),
        resumen: datosSistema.resumen,
        productos: datosSistema.productos,
        clientes: datosSistema.clientes,
        ventas: datosSistema.ventas
    };

    const datos = JSON.stringify(respaldo, null, 4);

    const archivo = new Blob([datos], {
        type: "application/json"
    });

    const enlace = document.createElement("a");
    const fecha = obtenerFechaNombreArchivo();

    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `respaldo_4DMK_SQL_${fecha}.json`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    alert("Respaldo JSON exportado correctamente desde SQL Server.");
});

/* ============================================================
   EXPORTAR EXCEL DESDE SQL
   ============================================================ */

btnExportarExcel.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    const fecha = obtenerFechaNombreArchivo();

    let contenidoExcel = `
        <html>
        <head>
            <meta charset="UTF-8">
        </head>

        <body>
            <h1>Reporte General 4DMK</h1>
            <p>Fecha de exportación: ${new Date().toLocaleString()}</p>

            <h2>Resumen</h2>
            <table border="1">
                <tr>
                    <th>Productos</th>
                    <th>Clientes</th>
                    <th>Ventas</th>
                    <th>Ingresos Totales</th>
                    <th>Stock Bajo</th>
                </tr>
                <tr>
                    <td>${datosSistema.resumen.totalProductos || 0}</td>
                    <td>${datosSistema.resumen.totalClientes || 0}</td>
                    <td>${datosSistema.resumen.totalVentas || 0}</td>
                    <td>${Number(datosSistema.resumen.ingresosTotales || 0).toFixed(2)}</td>
                    <td>${datosSistema.resumen.stockBajo || 0}</td>
                </tr>
            </table>

            <h2>Productos</h2>
            <table border="1">
                <tr>
                    <th>Orden Producción</th>
                    <th>Código Diseño</th>
                    <th>Stock</th>
                    <th>Producto</th>
                    <th>Precio</th>
                </tr>
    `;

    datosSistema.productos.forEach(function (producto) {
        contenidoExcel += `
            <tr>
                <td>${producto.ordenProduccion}</td>
                <td>${producto.codigoDiseno}</td>
                <td>${producto.stock}</td>
                <td>${producto.nombreProducto}</td>
                <td>${Number(producto.precio).toFixed(2)}</td>
            </tr>
        `;
    });

    contenidoExcel += `
            </table>

            <h2>Clientes</h2>
            <table border="1">
                <tr>
                    <th>Cliente</th>
                    <th>DNI/RUC</th>
                    <th>Teléfono</th>
                    <th>Tipo</th>
                    <th>Dirección</th>
                </tr>
    `;

    datosSistema.clientes.forEach(function (cliente) {
        contenidoExcel += `
            <tr>
                <td>${cliente.nombreCliente}</td>
                <td>${cliente.documento}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.tipoCliente}</td>
                <td>${cliente.direccion || ""}</td>
            </tr>
        `;
    });

    contenidoExcel += `
            </table>

            <h2>Ventas</h2>
            <table border="1">
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Pago</th>
                    <th>Total</th>
                </tr>
    `;

    datosSistema.ventas.forEach(function (venta) {
        contenidoExcel += `
            <tr>
                <td>${formatearFechaSQL(venta.fechaVenta)}</td>
                <td>${venta.nombreCliente}</td>
                <td>${venta.nombreProducto}</td>
                <td>${venta.cantidad}</td>
                <td>${venta.nombreMetodo}</td>
                <td>${Number(venta.totalVenta).toFixed(2)}</td>
            </tr>
        `;
    });

    contenidoExcel += `
            </table>
        </body>
        </html>
    `;

    const archivo = new Blob([contenidoExcel], {
        type: "application/vnd.ms-excel;charset=utf-8;"
    });

    const enlace = document.createElement("a");

    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `reporte_4DMK_SQL_${fecha}.xls`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    alert("Archivo Excel exportado correctamente desde SQL Server.");
});

/* ============================================================
   GENERAR PDF DESDE SQL
   ============================================================ */

btnGenerarPDF.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    const productosStockBajo = datosSistema.productos.filter(function (producto) {
        return Number(producto.stock) <= 5;
    });

    const ventanaPDF = window.open("", "_blank");

    ventanaPDF.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte 4DMK</title>

            <style>
                body{
                    font-family: Arial, sans-serif;
                    padding: 35px;
                    color: #111827;
                }

                .encabezado{
                    text-align: center;
                    border-bottom: 4px solid #111827;
                    padding-bottom: 18px;
                    margin-bottom: 28px;
                }

                .encabezado h1{
                    margin: 0;
                    font-size: 34px;
                    letter-spacing: 3px;
                }

                .encabezado p{
                    margin: 8px 0 0 0;
                    color: #4b5563;
                }

                .resumen{
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 12px;
                    margin-bottom: 28px;
                }

                .caja{
                    border: 1px solid #d1d5db;
                    padding: 14px;
                    border-radius: 10px;
                    text-align: center;
                }

                .caja h3{
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: #6b7280;
                }

                .caja p{
                    margin: 0;
                    font-size: 18px;
                    font-weight: bold;
                }

                h2{
                    margin-top: 28px;
                    border-left: 6px solid #facc15;
                    padding-left: 10px;
                }

                table{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                    font-size: 12px;
                }

                th{
                    background: #111827;
                    color: white;
                    padding: 9px;
                    border: 1px solid #111827;
                }

                td{
                    padding: 8px;
                    border: 1px solid #d1d5db;
                    text-align: center;
                }

                .nota{
                    margin-top: 30px;
                    font-size: 12px;
                    color: #6b7280;
                    text-align: center;
                }

                @media print{
                    button{
                        display: none;
                    }
                }
            </style>
        </head>

        <body>

            <div class="encabezado">
                <h1>4DMK</h1>
                <p>Reporte General del Sistema de Gestión de Inventario y Ventas</p>
                <p>Fecha de generación: ${new Date().toLocaleString()}</p>
            </div>

            <div class="resumen">
                <div class="caja">
                    <h3>Productos</h3>
                    <p>${datosSistema.resumen.totalProductos || 0}</p>
                </div>

                <div class="caja">
                    <h3>Clientes</h3>
                    <p>${datosSistema.resumen.totalClientes || 0}</p>
                </div>

                <div class="caja">
                    <h3>Ventas</h3>
                    <p>${datosSistema.resumen.totalVentas || 0}</p>
                </div>

                <div class="caja">
                    <h3>Ingresos</h3>
                    <p>S/ ${Number(datosSistema.resumen.ingresosTotales || 0).toFixed(2)}</p>
                </div>

                <div class="caja">
                    <h3>Stock Bajo</h3>
                    <p>${datosSistema.resumen.stockBajo || 0}</p>
                </div>
            </div>

            <h2>Productos con bajo stock</h2>

            <table>
                <thead>
                    <tr>
                        <th>Orden</th>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Stock</th>
                        <th>Precio</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        productosStockBajo.length === 0
                        ? `
                            <tr>
                                <td colspan="5">No hay productos con bajo stock.</td>
                            </tr>
                        `
                        : productosStockBajo.map(function (producto) {
                            return `
                                <tr>
                                    <td>${producto.ordenProduccion}</td>
                                    <td>${producto.codigoDiseno}</td>
                                    <td>${producto.nombreProducto}</td>
                                    <td>${producto.stock}</td>
                                    <td>S/ ${Number(producto.precio).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join("")
                    }
                </tbody>
            </table>

            <h2>Últimas ventas</h2>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Pago</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        datosSistema.ventas.length === 0
                        ? `
                            <tr>
                                <td colspan="6">No hay ventas registradas.</td>
                            </tr>
                        `
                        : datosSistema.ventas.slice(0, 10).map(function (venta) {
                            return `
                                <tr>
                                    <td>${formatearFechaSQL(venta.fechaVenta)}</td>
                                    <td>${venta.nombreCliente}</td>
                                    <td>${venta.nombreProducto}</td>
                                    <td>${venta.cantidad}</td>
                                    <td>${venta.nombreMetodo}</td>
                                    <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join("")
                    }
                </tbody>
            </table>

            <p class="nota">
                Reporte generado automáticamente desde SQL Server por el Sistema 4DMK.
            </p>

            <script>
                window.onload = function(){
                    window.print();
                }
            </script>

        </body>
        </html>
    `);

    ventanaPDF.document.close();
});

/* ============================================================
   IMPORTAR JSON
   ============================================================ */

archivoImportar.addEventListener("change", function () {
    const archivo = archivoImportar.files[0];

    if (!archivo) {
        nombreArchivo.textContent = "Ningún archivo seleccionado";
        return;
    }

    if (!archivo.name.toLowerCase().endsWith(".json")) {
        alert("Solo se permiten archivos JSON.");
        archivoImportar.value = "";
        nombreArchivo.textContent = "Ningún archivo seleccionado";
        return;
    }

    nombreArchivo.textContent = archivo.name;
});

btnImportar.addEventListener("click", function () {
    alert("La restauración automática hacia SQL Server se realizará en una etapa posterior para evitar inconsistencias en ventas, stock y relaciones de datos.");
});

/* ============================================================
   LIMPIAR SISTEMA DESDE SQL
   ============================================================ */

btnLimpiarSistema.addEventListener("click", async function () {
    const confirmar = prompt(
        "Esta acción eliminará productos, clientes y ventas de SQL Server. Escribe ELIMINAR para confirmar."
    );

    if (confirmar !== "ELIMINAR") {
        alert("Operación cancelada.");
        return;
    }

    try {
        const respuesta = await fetch("/api/configuracion/limpiar", {
            method: "DELETE"
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudieron eliminar los datos.");
            return;
        }

        alert(datos.mensaje);

        await cargarDatosConfiguracion();

    } catch (error) {
        alert("Error al limpiar datos desde SQL Server.");
        console.error(error);
    }
});

/* ============================================================
   FUNCIONES AUXILIARES
   ============================================================ */

function obtenerFechaNombreArchivo() {
    const fecha = new Date();

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    const hora = String(fecha.getHours()).padStart(2, "0");
    const minuto = String(fecha.getMinutes()).padStart(2, "0");

    return `${anio}-${mes}-${dia}_${hora}-${minuto}`;
}

function formatearFechaSQL(fecha) {
    if (!fecha) {
        return "";
    }

    const fechaObjeto = new Date(fecha);

    const anio = fechaObjeto.getFullYear();
    const mes = String(fechaObjeto.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaObjeto.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

const btnLimpiarVentasAnuladas = document.getElementById("btnLimpiarVentasAnuladas");

if (btnLimpiarVentasAnuladas) {
    btnLimpiarVentasAnuladas.addEventListener("click", limpiarVentasAnuladasAntiguas);
}

async function limpiarVentasAnuladasAntiguas() {
    const confirmar = confirm(
        "¿Seguro que deseas eliminar las ventas anuladas con más de 4 meses de antigüedad?\n\n" +
        "Esta acción NO eliminará productos, clientes, usuarios ni métodos de pago."
    );

    if (!confirmar) {
        alert("Operación cancelada.");
        return;
    }

    try {
        const respuesta = await fetch("/api/configuracion/limpiar-ventas-anuladas", {
            method: "DELETE"
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo limpiar las ventas anuladas antiguas.");
            return;
        }

        alert(datos.mensaje || "Ventas anuladas antiguas eliminadas correctamente.");

        if (typeof cargarDatosConfiguracion === "function") {
            cargarDatosConfiguracion();
        }

    } catch (error) {
        alert("Error al conectar con el servidor para limpiar ventas anuladas antiguas.");
        console.error(error);
    }
}