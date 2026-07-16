const resumenProductos = document.getElementById("resumenProductos");
const resumenClientes = document.getElementById("resumenClientes");
const resumenVentas = document.getElementById("resumenVentas");
const estadoRespaldo = document.getElementById("estadoRespaldo");

const formConfiguracionSistema = document.getElementById("formConfiguracionSistema");
const inputConfigPrecioPelon = document.getElementById("configPrecioPelon");
const inputConfigStockBajoProductos = document.getElementById("configStockBajoProductos");
const inputConfigStockBajoHilos = document.getElementById("configStockBajoHilos");
const inputConfigWhatsappNegocio = document.getElementById("configWhatsappNegocio");
const estadoConfiguracion = document.getElementById("estadoConfiguracion");

const btnExportar = document.getElementById("btnExportar");
const btnExportarExcel = document.getElementById("btnExportarExcel");
const btnGenerarPDF = document.getElementById("btnGenerarPDF");
const btnPDFInventarioHilos = document.getElementById("btnPDFInventarioHilos");
const btnPDFInventarioPelones = document.getElementById("btnPDFInventarioPelones");
const btnPDFGastosInventario = document.getElementById("btnPDFGastosInventario");
const btnPDFResumenInventario = document.getElementById("btnPDFResumenInventario");

const btnImportar = document.getElementById("btnImportar");
const archivoImportar = document.getElementById("archivoImportar");
const nombreArchivo = document.getElementById("nombreArchivo");

const btnLimpiarSistema = document.getElementById("btnLimpiarSistema");
const btnLimpiarVentasAnuladas = document.getElementById("btnLimpiarVentasAnuladas");

let datosSistema = {
    resumen: {},
    productos: [],
    clientes: [],
    ventas: [],
    configuracion: {}
};

iniciarConfiguracion();

async function iniciarConfiguracion() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarDatosConfiguracion();
    await cargarConfiguracionEditable();
}

async function cargarDatosConfiguracion() {
    const [configRes, productosRes, clientesRes, ventasRes] = await Promise.all([
        supabaseClient.from("sistema_configuracion").select("*"),
        supabaseClient.from("sistema_productos").select("*").order("nombre_producto", { ascending: true }),
        supabaseClient.from("sistema_clientes").select("*").order("nombre_cliente", { ascending: true }),
        supabaseClient
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
            .order("fecha_registro", { ascending: false })
    ]);

    const error = configRes.error || productosRes.error || clientesRes.error || ventasRes.error;

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los datos del sistema desde Supabase.");
        return;
    }

    const configuracion = convertirConfiguracionAObjeto(configRes.data || []);
    const productos = (productosRes.data || []).map(mapearProducto);
    const clientes = (clientesRes.data || []).map(mapearCliente);
    const ventas = (ventasRes.data || []).map(mapearVenta);
    const stockBajo = productos.filter(producto => Number(producto.stock) <= Number(configuracion.stock_bajo_productos || 5)).length;

    datosSistema = {
        resumen: {
            totalProductos: productos.length,
            totalClientes: clientes.length,
            totalVentas: ventas.length,
            ingresosTotales: ventas.reduce((total, venta) => total + Number(venta.totalVenta || 0), 0),
            stockBajo: stockBajo
        },
        productos: productos,
        clientes: clientes,
        ventas: ventas,
        configuracion: configuracion
    };

    actualizarResumen();
}

async function cargarConfiguracionEditable() {
    const config = datosSistema.configuracion || {};

    if (inputConfigPrecioPelon) {
        inputConfigPrecioPelon.value = config.precio_pelon || "190";
    }

    if (inputConfigStockBajoProductos) {
        inputConfigStockBajoProductos.value = config.stock_bajo_productos || "5";
    }

    if (inputConfigStockBajoHilos) {
        inputConfigStockBajoHilos.value = config.stock_bajo_hilos || "5";
    }

    if (inputConfigWhatsappNegocio) {
        inputConfigWhatsappNegocio.value = config.whatsapp_negocio || "51999999999";
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
        estadoRespaldo.textContent = "Vacio";
    } else {
        estadoRespaldo.textContent = "Activo";
    }
}

if (formConfiguracionSistema) {
    formConfiguracionSistema.addEventListener("submit", guardarConfiguracionSistema);
}

async function guardarConfiguracionSistema(event) {
    event.preventDefault();

    const precioPelon = Number(inputConfigPrecioPelon.value);
    const stockBajoProductos = Number(inputConfigStockBajoProductos.value);
    const stockBajoHilos = Number(inputConfigStockBajoHilos.value);
    const whatsapp = inputConfigWhatsappNegocio.value.trim();

    if (
        precioPelon < 0 ||
        stockBajoProductos < 0 ||
        stockBajoHilos < 0 ||
        whatsapp === ""
    ) {
        mostrarEstadoConfiguracion("Revisa los valores antes de guardar.", "error");
        return;
    }

    mostrarEstadoConfiguracion("Guardando ajustes...", "info");

    const { error } = await supabaseClient
        .from("sistema_configuracion")
        .upsert([
            {
                clave: "precio_pelon",
                valor: String(precioPelon),
                descripcion: "Precio base de un pelon para Calcupelones."
            },
            {
                clave: "stock_bajo_productos",
                valor: String(Math.floor(stockBajoProductos)),
                descripcion: "Umbral para alertar productos con stock bajo."
            },
            {
                clave: "stock_bajo_hilos",
                valor: String(Math.floor(stockBajoHilos)),
                descripcion: "Umbral para alertar hilos con stock bajo."
            },
            {
                clave: "whatsapp_negocio",
                valor: whatsapp,
                descripcion: "Numero de WhatsApp del negocio en formato internacional."
            }
        ], { onConflict: "clave" });

    if (error) {
        console.error(error);
        mostrarEstadoConfiguracion("No se pudieron guardar los ajustes.", "error");
        return;
    }

    await cargarDatosConfiguracion();
    await cargarConfiguracionEditable();
    mostrarEstadoConfiguracion("Ajustes guardados correctamente.", "exito");
}

btnExportar.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    const respaldo = {
        sistema: "4DMK",
        descripcion: "Respaldo generado desde Supabase",
        fechaExportacion: new Date().toISOString(),
        resumen: datosSistema.resumen,
        configuracion: datosSistema.configuracion,
        productos: datosSistema.productos,
        clientes: datosSistema.clientes,
        ventas: datosSistema.ventas
    };

    const archivo = new Blob([JSON.stringify(respaldo, null, 4)], {
        type: "application/json"
    });

    descargarBlob(archivo, `respaldo_4DMK_Supabase_${obtenerFechaNombreArchivo()}.json`);
    alert("Respaldo JSON exportado correctamente desde Supabase.");
});

btnExportarExcel.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    let contenidoExcel = `
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body>
            <h1>Reporte General 4DMK</h1>
            <p>Fecha de exportacion: ${new Date().toLocaleString()}</p>

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
                    <th>Orden Produccion</th>
                    <th>Codigo Diseno</th>
                    <th>Stock</th>
                    <th>Producto</th>
                    <th>Precio</th>
                </tr>
    `;

    datosSistema.productos.forEach(function (producto) {
        contenidoExcel += `
            <tr>
                <td>${textoSeguro(producto.ordenProduccion)}</td>
                <td>${textoSeguro(producto.codigoDiseno)}</td>
                <td>${Number(producto.stock)}</td>
                <td>${textoSeguro(producto.nombreProducto)}</td>
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
                    <th>Telefono</th>
                    <th>Tipo</th>
                    <th>Direccion</th>
                </tr>
    `;

    datosSistema.clientes.forEach(function (cliente) {
        contenidoExcel += `
            <tr>
                <td>${textoSeguro(cliente.nombreCliente)}</td>
                <td>${textoSeguro(cliente.documento)}</td>
                <td>${textoSeguro(cliente.telefono)}</td>
                <td>${textoSeguro(cliente.tipoCliente)}</td>
                <td>${textoSeguro(cliente.direccion || "")}</td>
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
                <td>${textoSeguro(venta.nombreCliente)}</td>
                <td>${textoSeguro(venta.nombreProducto)}</td>
                <td>${Number(venta.cantidad)}</td>
                <td>${textoSeguro(venta.nombreMetodo)}</td>
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

    descargarBlob(archivo, `reporte_4DMK_Supabase_${obtenerFechaNombreArchivo()}.xls`);
    alert("Archivo Excel exportado correctamente desde Supabase.");
});

btnGenerarPDF.addEventListener("click", async function () {
    await cargarDatosConfiguracion();

    const productosStockBajo = datosSistema.productos.filter(function (producto) {
        return Number(producto.stock) <= Number(datosSistema.configuracion.stock_bajo_productos || 5);
    });

    const ventanaPDF = window.open("", "_blank");

    if (!ventanaPDF) {
        alert("El navegador bloqueo la ventana del PDF. Permite ventanas emergentes para generar el reporte.");
        return;
    }

    ventanaPDF.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte 4DMK</title>
            <style>
                body{font-family:Arial,sans-serif;padding:35px;color:#111827;}
                .encabezado{text-align:center;border-bottom:4px solid #111827;padding-bottom:18px;margin-bottom:28px;}
                .encabezado h1{margin:0;font-size:34px;letter-spacing:3px;}
                .encabezado p{margin:8px 0 0 0;color:#4b5563;}
                .resumen{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px;}
                .caja{border:1px solid #d1d5db;padding:14px;border-radius:10px;text-align:center;}
                .caja h3{margin:0 0 8px 0;font-size:12px;color:#6b7280;}
                .caja p{margin:0;font-size:18px;font-weight:bold;}
                h2{margin-top:28px;border-left:6px solid #facc15;padding-left:10px;}
                table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;}
                th{background:#111827;color:white;padding:9px;border:1px solid #111827;}
                td{padding:8px;border:1px solid #d1d5db;text-align:center;}
                .nota{margin-top:30px;font-size:12px;color:#6b7280;text-align:center;}
                @media print{button{display:none;}}
            </style>
        </head>
        <body>
            <div class="encabezado">
                <h1>4DMK</h1>
                <p>Reporte General del Sistema de Gestion de Inventario y Ventas</p>
                <p>Fecha de generacion: ${new Date().toLocaleString()}</p>
            </div>

            <div class="resumen">
                <div class="caja"><h3>Productos</h3><p>${datosSistema.resumen.totalProductos || 0}</p></div>
                <div class="caja"><h3>Clientes</h3><p>${datosSistema.resumen.totalClientes || 0}</p></div>
                <div class="caja"><h3>Ventas</h3><p>${datosSistema.resumen.totalVentas || 0}</p></div>
                <div class="caja"><h3>Ingresos</h3><p>S/ ${Number(datosSistema.resumen.ingresosTotales || 0).toFixed(2)}</p></div>
                <div class="caja"><h3>Stock Bajo</h3><p>${datosSistema.resumen.stockBajo || 0}</p></div>
            </div>

            <h2>Productos con bajo stock</h2>
            <table>
                <thead>
                    <tr>
                        <th>Orden</th>
                        <th>Codigo</th>
                        <th>Producto</th>
                        <th>Stock</th>
                        <th>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                        productosStockBajo.length === 0
                        ? `<tr><td colspan="5">No hay productos con bajo stock.</td></tr>`
                        : productosStockBajo.map(function (producto) {
                            return `
                                <tr>
                                    <td>${textoSeguro(producto.ordenProduccion)}</td>
                                    <td>${textoSeguro(producto.codigoDiseno)}</td>
                                    <td>${textoSeguro(producto.nombreProducto)}</td>
                                    <td>${Number(producto.stock)}</td>
                                    <td>S/ ${Number(producto.precio).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join("")
                    }
                </tbody>
            </table>

            <h2>Ultimas ventas</h2>
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
                        ? `<tr><td colspan="6">No hay ventas registradas.</td></tr>`
                        : datosSistema.ventas.slice(0, 10).map(function (venta) {
                            return `
                                <tr>
                                    <td>${formatearFechaSQL(venta.fechaVenta)}</td>
                                    <td>${textoSeguro(venta.nombreCliente)}</td>
                                    <td>${textoSeguro(venta.nombreProducto)}</td>
                                    <td>${Number(venta.cantidad)}</td>
                                    <td>${textoSeguro(venta.nombreMetodo)}</td>
                                    <td>S/ ${Number(venta.totalVenta).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join("")
                    }
                </tbody>
            </table>

            <p class="nota">Reporte generado automaticamente desde Supabase por el Sistema 4DMK.</p>
            <script>window.onload = function(){ window.print(); }</script>
        </body>
        </html>
    `);

    ventanaPDF.document.close();
});

if (btnPDFInventarioHilos) {
    btnPDFInventarioHilos.addEventListener("click", function () {
        generarPDFInventario("hilos");
    });
}

if (btnPDFInventarioPelones) {
    btnPDFInventarioPelones.addEventListener("click", function () {
        generarPDFInventario("pelones");
    });
}

if (btnPDFGastosInventario) {
    btnPDFGastosInventario.addEventListener("click", function () {
        generarPDFInventario("gastos");
    });
}

if (btnPDFResumenInventario) {
    btnPDFResumenInventario.addEventListener("click", function () {
        generarPDFInventario("resumen");
    });
}

archivoImportar.addEventListener("change", function () {
    const archivo = archivoImportar.files[0];

    if (!archivo) {
        nombreArchivo.textContent = "Ningun archivo seleccionado";
        return;
    }

    if (!archivo.name.toLowerCase().endsWith(".json")) {
        alert("Solo se permiten archivos JSON.");
        archivoImportar.value = "";
        nombreArchivo.textContent = "Ningun archivo seleccionado";
        return;
    }

    nombreArchivo.textContent = archivo.name;
});

btnImportar.addEventListener("click", function () {
    alert("La restauracion automatica esta desactivada para proteger ventas, stock y relaciones. Usa el JSON como respaldo de consulta.");
});

btnLimpiarSistema.addEventListener("click", function () {
    alert("La limpieza total esta bloqueada por seguridad. Si algun dia se necesita reiniciar todo, conviene hacerlo con una copia de respaldo y una migracion revisada.");
});

if (btnLimpiarVentasAnuladas) {
    btnLimpiarVentasAnuladas.addEventListener("click", limpiarVentasAnuladasAntiguas);
}

async function limpiarVentasAnuladasAntiguas() {
    const confirmar = confirm(
        "Seguro que deseas eliminar las ventas anuladas con mas de 4 meses de antiguedad?\n\n" +
        "Esta accion NO elimina productos, clientes, usuarios ni metodos de pago."
    );

    if (!confirmar) {
        alert("Operacion cancelada.");
        return;
    }

    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 4);

    const { error } = await supabaseClient
        .from("sistema_ventas")
        .delete()
        .eq("anulada", true)
        .lt("fecha_registro", fechaLimite.toISOString());

    if (error) {
        console.error(error);
        alert("No se pudo limpiar las ventas anuladas antiguas.");
        return;
    }

    alert("Ventas anuladas antiguas limpiadas correctamente.");
    await cargarDatosConfiguracion();
}

let datosInventarioPDF = {
    hilos: [],
    pelones: [],
    compras: []
};

async function generarPDFInventario(tipo) {
    if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
        alert("No se pudo cargar el generador PDF. Revisa la conexion a internet y vuelve a intentarlo.");
        return;
    }

    mostrarEstadoConfiguracion("Preparando PDF de inventario...", "info");

    const cargado = await cargarDatosInventarioPDF();

    if (!cargado) {
        mostrarEstadoConfiguracion("No se pudo preparar el PDF.", "error");
        return;
    }

    const doc = crearDocumentoInventarioPDF(obtenerTituloPDFInventario(tipo));

    if (typeof doc.autoTable !== "function") {
        alert("No se pudo cargar el formato de tablas PDF. Recarga la pagina e intenta nuevamente.");
        return;
    }

    if (tipo === "hilos") {
        generarTablaPDFInventario(doc, "Inventario de hilos", [
            "Codigo",
            "Color",
            "Marca",
            "Stock",
            "Precio",
            "Detalle",
            "Actualizado"
        ], datosInventarioPDF.hilos.map(function (hilo) {
            return [
                hilo.codigo_hilo,
                hilo.nombre_color,
                hilo.marca,
                Number(hilo.stock || 0),
                formatearDineroPDF(hilo.precio_compra),
                hilo.detalle_compra || "-",
                formatearFechaSQL(hilo.updated_at)
            ];
        }));
    }

    if (tipo === "pelones") {
        generarTablaPDFInventario(doc, "Inventario pelones", [
            "Tipo",
            "% restante",
            "Rollos",
            "Precio",
            "Proveedor",
            "Detalle",
            "Actualizado"
        ], ordenarPelonesPDF(datosInventarioPDF.pelones).map(function (pelon) {
            return [
                pelon.tipo_pelon,
                `${Number(pelon.porcentaje || 0)}%`,
                Number(pelon.rollos_gigantes || 0),
                formatearDineroPDF(pelon.precio_compra),
                pelon.proveedores?.nombre_tienda || pelon.codigo_tienda || "-",
                pelon.detalle_compra || "-",
                formatearFechaSQL(pelon.updated_at)
            ];
        }));
    }

    if (tipo === "gastos") {
        generarTablaPDFInventario(doc, "Gastos registrados en compras de hilos", [
            "Fecha",
            "Codigo",
            "Color",
            "Proveedor",
            "Cantidad",
            "Precio",
            "Total",
            "Detalle"
        ], datosInventarioPDF.compras.map(function (compra) {
            const total = Number(compra.total_compra ?? (Number(compra.cantidad || 0) * Number(compra.precio_unitario || 0)));

            return [
                formatearFechaSQL(compra.fecha_compra),
                compra.codigo_hilo_snapshot,
                compra.nombre_color_snapshot,
                compra.proveedores?.nombre_tienda || compra.codigo_tienda || "-",
                Number(compra.cantidad || 0),
                formatearDineroPDF(compra.precio_unitario),
                formatearDineroPDF(total),
                compra.detalle_compra || "-"
            ];
        }));
    }

    if (tipo === "resumen") {
        generarResumenPDFInventario(doc);
    }

    agregarPiePDFInventario(doc);
    doc.save(`4dmk-${tipo}-inventario-${obtenerFechaNombreArchivo()}.pdf`);
    mostrarEstadoConfiguracion("PDF generado correctamente.", "exito");
}

async function cargarDatosInventarioPDF() {
    const [hilosRes, pelonesRes, comprasRes] = await Promise.all([
        supabaseClient
            .from("inventario_hilos")
            .select("*")
            .order("codigo_hilo", { ascending: true }),
        supabaseClient
            .from("pelones")
            .select(`
                *,
                proveedores (
                    codigo_tienda,
                    nombre_tienda
                )
            `)
            .order("tipo_pelon", { ascending: true }),
        supabaseClient
            .from("compras_hilos")
            .select(`
                *,
                proveedores (
                    codigo_tienda,
                    nombre_tienda
                )
            `)
            .order("fecha_compra", { ascending: false })
    ]);

    const error = hilosRes.error || pelonesRes.error || comprasRes.error;

    if (error) {
        console.error(error);
        alert("No se pudo cargar el inventario desde Supabase para generar el PDF.");
        return false;
    }

    datosInventarioPDF = {
        hilos: hilosRes.data || [],
        pelones: pelonesRes.data || [],
        compras: comprasRes.data || []
    };

    return true;
}

function crearDocumentoInventarioPDF(titulo) {
    const doc = new window.jspdf.jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });
    const ancho = doc.internal.pageSize.getWidth();

    doc.setProperties({
        title: `4DMK - ${titulo}`,
        subject: "Reporte de inventario",
        author: "Sistema 4DMK"
    });
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, ancho, 30, "F");
    doc.setTextColor(250, 204, 21);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("4DMK", 14, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(titulo, 14, 23);
    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, ancho - 14, 23, { align: "right" });

    return doc;
}

function generarTablaPDFInventario(doc, titulo, encabezados, filas) {
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titulo, 14, 40);

    const cuerpo = filas.length > 0
        ? filas
        : [encabezados.map((_, indice) => indice === 0 ? "No hay registros." : "")];

    doc.autoTable({
        startY: 44,
        head: [encabezados],
        body: cuerpo,
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: {
            font: "helvetica",
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: [31, 41, 55],
            lineColor: [229, 231, 235],
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: [17, 24, 39],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        }
    });
}

function generarResumenPDFInventario(doc) {
    const gastoCompras = datosInventarioPDF.compras.reduce(function (total, compra) {
        return total + Number(compra.total_compra ?? (Number(compra.cantidad || 0) * Number(compra.precio_unitario || 0)));
    }, 0);
    const valorHilos = datosInventarioPDF.hilos.reduce(function (total, hilo) {
        return total + Number(hilo.stock || 0) * Number(hilo.precio_compra || 0);
    }, 0);
    const valorPelones = datosInventarioPDF.pelones.reduce(function (total, pelon) {
        return total + Number(pelon.rollos_gigantes || 0) * Number(pelon.precio_compra || 0);
    }, 0);

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Resumen general del inventario", 14, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Compras registradas: ${formatearDineroPDF(gastoCompras)}`, 14, 48);
    doc.text(`Valor registrado de hilos: ${formatearDineroPDF(valorHilos)}`, 14, 55);
    doc.text(`Valor registrado de pelones: ${formatearDineroPDF(valorPelones)}`, 14, 62);

    const filas = [
        ...datosInventarioPDF.hilos.map(function (hilo) {
            const valor = Number(hilo.stock || 0) * Number(hilo.precio_compra || 0);
            return ["Hilo", hilo.codigo_hilo, hilo.nombre_color, Number(hilo.stock || 0), formatearDineroPDF(hilo.precio_compra), formatearDineroPDF(valor)];
        }),
        ...ordenarPelonesPDF(datosInventarioPDF.pelones).map(function (pelon) {
            const valor = Number(pelon.rollos_gigantes || 0) * Number(pelon.precio_compra || 0);
            return ["Pelon", pelon.tipo_pelon, `${Number(pelon.porcentaje || 0)}% restante`, Number(pelon.rollos_gigantes || 0), formatearDineroPDF(pelon.precio_compra), formatearDineroPDF(valor)];
        })
    ];

    doc.autoTable({
        startY: 68,
        head: [["Tipo", "Codigo o tipo", "Detalle", "Cantidad", "Precio", "Valor registrado"]],
        body: filas.length > 0 ? filas : [["-", "No hay registros.", "-", "-", "-", "-"]],
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: [31, 41, 55] },
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] }
    });
}

function agregarPiePDFInventario(doc) {
    const paginas = doc.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= paginas; pagina += 1) {
        doc.setPage(pagina);
        const alto = doc.internal.pageSize.getHeight();
        const ancho = doc.internal.pageSize.getWidth();
        doc.setDrawColor(229, 231, 235);
        doc.line(14, alto - 13, ancho - 14, alto - 13);
        doc.setTextColor(107, 114, 128);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("4DMK | Reporte generado desde Supabase", 14, alto - 7);
        doc.text(`Pagina ${pagina} de ${paginas}`, ancho - 14, alto - 7, { align: "right" });
    }
}

function obtenerTituloPDFInventario(tipo) {
    const titulos = {
        hilos: "Inventario de hilos",
        pelones: "Inventario pelones",
        gastos: "Gastos de compras",
        resumen: "Resumen de inventario"
    };

    return titulos[tipo] || "Reporte de inventario";
}

function ordenarPelonesPDF(lista) {
    const orden = ["Pelon Desgarrable", "Pelon Direccional", "Pelon Galleta"];

    return [...lista].sort((a, b) => orden.indexOf(a.tipo_pelon) - orden.indexOf(b.tipo_pelon));
}

function formatearDineroPDF(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function descargarBlob(archivo, nombre) {
    const enlace = document.createElement("a");

    enlace.href = URL.createObjectURL(archivo);
    enlace.download = nombre;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(enlace.href);
}

function obtenerFechaNombreArchivo() {
    const fecha = new Date();

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const hora = String(fecha.getHours()).padStart(2, "0");
    const minuto = String(fecha.getMinutes()).padStart(2, "0");

    return `${anio}-${mes}-${dia}_${hora}-${minuto}`;
}

function convertirConfiguracionAObjeto(lista) {
    return lista.reduce(function (objeto, item) {
        objeto[item.clave] = item.valor;
        return objeto;
    }, {});
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

function mapearCliente(cliente) {
    return {
        idCliente: cliente.id_cliente,
        nombreCliente: cliente.nombre_cliente,
        documento: cliente.documento,
        telefono: cliente.telefono,
        tipoCliente: cliente.tipo_cliente,
        direccion: cliente.direccion
    };
}

function mapearVenta(venta) {
    return {
        idVenta: venta.id_venta,
        idCliente: venta.id_cliente,
        idProducto: venta.id_producto,
        cantidad: venta.cantidad,
        nombreCliente: venta.sistema_clientes?.nombre_cliente || "Cliente eliminado",
        nombreProducto: venta.sistema_productos?.nombre_producto || "Producto eliminado",
        nombreMetodo: venta.sistema_metodos_pago?.nombre_metodo || "-",
        fechaVenta: venta.fecha_venta,
        totalVenta: venta.total_venta
    };
}

function formatearFechaSQL(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).slice(0, 10);
}

function mostrarEstadoConfiguracion(mensaje, tipo) {
    if (!estadoConfiguracion) {
        return;
    }

    estadoConfiguracion.textContent = mensaje;
    estadoConfiguracion.className = `estado-configuracion estado-configuracion-${tipo}`;
}

function textoSeguro(valor) {
    if (typeof escaparHTML === "function") {
        return escaparHTML(valor);
    }

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
