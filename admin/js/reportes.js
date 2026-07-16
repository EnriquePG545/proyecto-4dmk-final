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
const tablaInventarioBajoReporte = document.getElementById("tablaInventarioBajoReporte");

let reporteActual = "";
let ventasReporte = [];
let productosReporte = [];
let metodosPagoReporte = [];
let inventarioHilosReporte = [];
let inventarioPelonesReporte = [];
let comprasHilosReporte = [];
let umbralStockReporte = 5;

iniciarReportes();

async function iniciarReportes() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarDatosBaseReporte();
    cargarMetodosPagoReporte();
    cargarResumenReporte();
    mostrarProductosStockBajo();
    mostrarInventarioBajoReporte();
}

async function cargarDatosBaseReporte() {
    const [configRes, metodosRes, productosRes, ventasRes, hilosRes, pelonesRes, comprasHilosRes] = await Promise.all([
        supabaseClient
            .from("sistema_configuracion")
            .select("clave, valor")
            .eq("clave", "stock_bajo_productos")
            .maybeSingle(),
        supabaseClient
            .from("sistema_metodos_pago")
            .select("*")
            .eq("activo", true)
            .order("nombre_metodo", { ascending: true }),
        supabaseClient
            .from("sistema_productos")
            .select("*")
            .order("nombre_producto", { ascending: true }),
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
            .order("fecha_venta", { ascending: false }),
        supabaseClient
            .from("inventario_hilos")
            .select("*")
            .order("codigo_hilo", { ascending: true }),
        supabaseClient
            .from("pelones")
            .select("*")
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

    const error = configRes.error || metodosRes.error || productosRes.error || ventasRes.error || hilosRes.error || pelonesRes.error || comprasHilosRes.error;

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los reportes desde Supabase.");
        return;
    }

    if (configRes.data) {
        umbralStockReporte = Number(configRes.data.valor) || 5;
    }

    metodosPagoReporte = (metodosRes.data || []).map(mapearMetodoPago);
    productosReporte = productosRes.data || [];
    ventasReporte = (ventasRes.data || []).map(mapearVentaReporte);
    inventarioHilosReporte = hilosRes.data || [];
    inventarioPelonesReporte = ordenarPelonesReporte(pelonesRes.data || []);
    comprasHilosReporte = comprasHilosRes.data || [];
}

function cargarMetodosPagoReporte() {
    filtroPagoReporte.innerHTML = '<option value="">Todos</option>';

    metodosPagoReporte.forEach(function (metodo) {
        const opcion = document.createElement("option");
        opcion.value = metodo.idMetodoPago;
        opcion.textContent = metodo.nombreMetodo;
        filtroPagoReporte.appendChild(opcion);
    });
}

filtroFechaReporte.addEventListener("change", function () {
    cargarResumenReporte();
    recargarReporteActual();
});

filtroPagoReporte.addEventListener("change", function () {
    cargarResumenReporte();
    recargarReporteActual();
});

btnLimpiarReporte.addEventListener("click", function () {
    filtroFechaReporte.value = "";
    filtroPagoReporte.value = "";

    cargarResumenReporte();
    limpiarReporte();

    reporteActual = "";
    tituloReporte.textContent = "Resultado del reporte";
    descripcionReporte.textContent = "Selecciona una consulta para mostrar los datos correspondientes";
});

function obtenerVentasFiltradas() {
    const fecha = filtroFechaReporte.value;
    const idMetodoPago = Number(filtroPagoReporte.value);

    return ventasReporte.filter(function (venta) {
        const coincideFecha = fecha === "" || formatearFechaSQL(venta.fechaVenta) === fecha;
        const coincidePago = !idMetodoPago || Number(venta.idMetodoPago) === idMetodoPago;

        return coincideFecha && coincidePago;
    });
}

function recargarReporteActual() {
    if (reporteActual === "ventas") {
        mostrarVentasRecientes();
    }

    if (reporteActual === "productos") {
        mostrarProductosMasVendidos();
    }

    if (reporteActual === "clientes") {
        mostrarClientesFrecuentes();
    }

    if (reporteActual === "ingresos") {
        mostrarIngresosPorFecha();
    }
}

function cargarResumenReporte() {
    const ventasFiltradas = obtenerVentasFiltradas();

    totalVentas.textContent = ventasFiltradas.length;
    ingresosTotales.textContent = `S/ ${sumarVentas(ventasFiltradas).toFixed(2)}`;
    totalProductos.textContent = productosReporte.length;
    stockBajo.textContent = productosReporte.filter(producto => Number(producto.stock) <= umbralStockReporte).length;
}

function limpiarReporte() {
    encabezadoReporte.innerHTML = "";
    tablaReporte.innerHTML = "";
}

function mostrarVentasRecientes() {
    reporteActual = "ventas";
    limpiarReporte();

    tituloReporte.textContent = "Ventas recientes";
    descripcionReporte.textContent = "Muestra ventas ordenadas por fecha segun los filtros aplicados";

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

    const ventasFiltradas = obtenerVentasFiltradas();

    if (ventasFiltradas.length === 0) {
        tablaReporte.innerHTML = `
            <tr>
                <td colspan="6">No hay ventas para los filtros seleccionados.</td>
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
        `;

        tablaReporte.appendChild(fila);
    });
}

function mostrarProductosMasVendidos() {
    reporteActual = "productos";
    limpiarReporte();

    tituloReporte.textContent = "Productos mas vendidos";
    descripcionReporte.textContent = "Suma la cantidad vendida por producto segun los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Cantidad vendida</th>
            <th>Ingreso generado</th>
        </tr>
    `;

    const agrupado = new Map();

    obtenerVentasFiltradas().forEach(function (venta) {
        const clave = venta.idProducto || venta.nombreProducto;
        const actual = agrupado.get(clave) || {
            nombreProducto: venta.nombreProducto,
            cantidadVendida: 0,
            ingresoGenerado: 0
        };

        actual.cantidadVendida += Number(venta.cantidad || 0);
        actual.ingresoGenerado += Number(venta.totalVenta || 0);
        agrupado.set(clave, actual);
    });

    const productos = Array.from(agrupado.values())
        .sort((a, b) => b.cantidadVendida - a.cantidadVendida);

    if (productos.length === 0) {
        tablaReporte.innerHTML = `
            <tr>
                <td colspan="3">No hay productos vendidos para los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    productos.forEach(function (producto) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${textoSeguro(producto.nombreProducto)}</td>
            <td>${Number(producto.cantidadVendida)}</td>
            <td>S/ ${Number(producto.ingresoGenerado).toFixed(2)}</td>
        `;

        tablaReporte.appendChild(fila);
    });
}

function mostrarClientesFrecuentes() {
    reporteActual = "clientes";
    limpiarReporte();

    tituloReporte.textContent = "Clientes frecuentes";
    descripcionReporte.textContent = "Muestra clientes con mayor cantidad de compras segun los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Cliente</th>
            <th>Cantidad de compras</th>
            <th>Total comprado</th>
        </tr>
    `;

    const agrupado = new Map();

    obtenerVentasFiltradas().forEach(function (venta) {
        const clave = venta.idCliente || venta.nombreCliente;
        const actual = agrupado.get(clave) || {
            nombreCliente: venta.nombreCliente,
            cantidadCompras: 0,
            totalComprado: 0
        };

        actual.cantidadCompras += 1;
        actual.totalComprado += Number(venta.totalVenta || 0);
        agrupado.set(clave, actual);
    });

    const clientes = Array.from(agrupado.values())
        .sort((a, b) => b.totalComprado - a.totalComprado);

    if (clientes.length === 0) {
        tablaReporte.innerHTML = `
            <tr>
                <td colspan="3">No hay clientes para los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    clientes.forEach(function (cliente) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${textoSeguro(cliente.nombreCliente)}</td>
            <td>${Number(cliente.cantidadCompras)}</td>
            <td>S/ ${Number(cliente.totalComprado).toFixed(2)}</td>
        `;

        tablaReporte.appendChild(fila);
    });
}

function mostrarIngresosPorFecha() {
    reporteActual = "ingresos";
    limpiarReporte();

    tituloReporte.textContent = "Ingresos por fecha";
    descripcionReporte.textContent = "Agrupa las ventas por dia y calcula ingresos segun los filtros aplicados";

    encabezadoReporte.innerHTML = `
        <tr>
            <th>Fecha</th>
            <th>Cantidad de ventas</th>
            <th>Ingresos del dia</th>
        </tr>
    `;

    const agrupado = new Map();

    obtenerVentasFiltradas().forEach(function (venta) {
        const fecha = formatearFechaSQL(venta.fechaVenta);
        const actual = agrupado.get(fecha) || {
            fechaVenta: fecha,
            cantidadVentas: 0,
            ingresos: 0
        };

        actual.cantidadVentas += 1;
        actual.ingresos += Number(venta.totalVenta || 0);
        agrupado.set(fecha, actual);
    });

    const ingresos = Array.from(agrupado.values())
        .sort((a, b) => String(b.fechaVenta).localeCompare(String(a.fechaVenta)));

    if (ingresos.length === 0) {
        tablaReporte.innerHTML = `
            <tr>
                <td colspan="3">No hay ingresos para los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    ingresos.forEach(function (item) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${formatearFechaSQL(item.fechaVenta)}</td>
            <td>${Number(item.cantidadVentas)}</td>
            <td>S/ ${Number(item.ingresos).toFixed(2)}</td>
        `;

        tablaReporte.appendChild(fila);
    });
}

function mostrarProductosStockBajo() {
    tablaStockBajoReporte.innerHTML = "";

    const productosStockBajo = productosReporte
        .filter(producto => Number(producto.stock) <= umbralStockReporte)
        .sort((a, b) => Number(a.stock) - Number(b.stock));

    if (productosStockBajo.length === 0) {
        tablaStockBajoReporte.innerHTML = `
            <tr>
                <td colspan="5">No hay productos con bajo stock.</td>
            </tr>
        `;
        return;
    }

    productosStockBajo.forEach(function (producto) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${textoSeguro(producto.orden_produccion)}</td>
            <td>${textoSeguro(producto.codigo_diseno)}</td>
            <td>${textoSeguro(producto.nombre_producto)}</td>
            <td>${Number(producto.stock)}</td>
            <td>S/ ${Number(producto.precio).toFixed(2)}</td>
        `;

        tablaStockBajoReporte.appendChild(fila);
    });
}

function mostrarInventarioBajoReporte() {
    if (!tablaInventarioBajoReporte) {
        return;
    }

    const hilosBajos = inventarioHilosReporte
        .filter(hilo => Number(hilo.stock || 0) <= umbralStockReporte)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    const pelonesBajos = inventarioPelonesReporte
        .filter(pelon => Number(pelon.porcentaje || 0) < 25);

    const filas = [
        ...hilosBajos.map(hilo => ({
            tipo: "Hilo",
            nombre: hilo.codigo_hilo,
            detalle: `${hilo.nombre_color || "-"} - ${hilo.marca || "-"}`,
            stock: `${Number(hilo.stock || 0)} unidades`,
            rollos: "-",
            orden: 1,
            valor: Number(hilo.stock || 0)
        })),
        ...pelonesBajos.map(pelon => ({
            tipo: "Pelon",
            nombre: pelon.tipo_pelon,
            detalle: "Requiere revisar y programar compra",
            stock: `${Number(pelon.porcentaje || 0)}% restante`,
            rollos: Number(pelon.rollos_gigantes || 0),
            orden: 2,
            valor: Number(pelon.porcentaje || 0)
        }))
    ].sort((a, b) => a.orden - b.orden || a.valor - b.valor);

    if (filas.length === 0) {
        tablaInventarioBajoReporte.innerHTML = '<tr><td colspan="5">No hay inventario por debajo de los limites definidos.</td></tr>';
        return;
    }

    tablaInventarioBajoReporte.innerHTML = filas.map(function (fila) {
        return `
            <tr>
                <td><span class="marca-hilo">${textoSeguro(fila.tipo)}</span></td>
                <td><strong>${textoSeguro(fila.nombre)}</strong></td>
                <td>${textoSeguro(fila.detalle)}</td>
                <td><span class="stock-hilo stock-hilo-bajo">${textoSeguro(fila.stock)}</span></td>
                <td>${textoSeguro(fila.rollos)}</td>
            </tr>
        `;
    }).join("");
}

function descargarInventarioHilos() {
    descargarCSVReporte("4dmk-inventario-hilos.csv", [
        "Codigo hilo",
        "Color",
        "Marca",
        "Stock",
        "Precio compra",
        "Detalle",
        "Ultima actualizacion"
    ], inventarioHilosReporte.map(function (hilo) {
        return [
            hilo.codigo_hilo,
            hilo.nombre_color,
            hilo.marca,
            hilo.stock,
            Number(hilo.precio_compra || 0).toFixed(2),
            hilo.detalle_compra || "",
            formatearFechaSQL(hilo.updated_at)
        ];
    }));
}

function descargarInventarioPelones() {
    descargarCSVReporte("4dmk-inventario-pelones.csv", [
        "Tipo de pelon",
        "Porcentaje restante",
        "Rollos gigantes",
        "Precio registrado",
        "Proveedor relacionado",
        "Detalle",
        "Ultima actualizacion"
    ], inventarioPelonesReporte.map(function (pelon) {
        return [
            pelon.tipo_pelon,
            `${Number(pelon.porcentaje || 0)}%`,
            pelon.rollos_gigantes || 0,
            Number(pelon.precio_compra || 0).toFixed(2),
            pelon.proveedores?.nombre_tienda || pelon.codigo_tienda || "",
            pelon.detalle_compra || "",
            formatearFechaSQL(pelon.updated_at)
        ];
    }));
}

function descargarGastosInventario() {
    descargarCSVReporte("4dmk-gastos-compras-hilos.csv", [
        "Fecha",
        "Codigo hilo",
        "Color",
        "Proveedor",
        "Cantidad",
        "Precio unitario",
        "Total compra",
        "Detalle"
    ], comprasHilosReporte.map(function (compra) {
        const total = Number(compra.total_compra ?? (Number(compra.cantidad || 0) * Number(compra.precio_unitario || 0)));

        return [
            formatearFechaSQL(compra.fecha_compra),
            compra.codigo_hilo_snapshot,
            compra.nombre_color_snapshot,
            compra.proveedores?.nombre_tienda || compra.codigo_tienda || "",
            compra.cantidad,
            Number(compra.precio_unitario || 0).toFixed(2),
            total.toFixed(2),
            compra.detalle_compra || ""
        ];
    }));
}

function descargarResumenInventario() {
    const filasHilos = inventarioHilosReporte.map(function (hilo) {
        const valorRegistrado = Number(hilo.stock || 0) * Number(hilo.precio_compra || 0);
        return [
            "Hilo",
            hilo.codigo_hilo,
            hilo.nombre_color,
            hilo.stock,
            Number(hilo.precio_compra || 0).toFixed(2),
            valorRegistrado.toFixed(2)
        ];
    });
    const filasPelones = inventarioPelonesReporte.map(function (pelon) {
        const valorRegistrado = Number(pelon.rollos_gigantes || 0) * Number(pelon.precio_compra || 0);
        return [
            "Pelon",
            pelon.tipo_pelon,
            `${Number(pelon.porcentaje || 0)}% restante`,
            pelon.rollos_gigantes || 0,
            Number(pelon.precio_compra || 0).toFixed(2),
            valorRegistrado.toFixed(2)
        ];
    });

    descargarCSVReporte("4dmk-resumen-inventario.csv", [
        "Tipo",
        "Codigo o pelon",
        "Detalle",
        "Cantidad",
        "Precio registrado",
        "Valor registrado"
    ], [...filasHilos, ...filasPelones]);
}

function descargarCSVReporte(nombre, encabezados, filas) {
    const contenido = [encabezados, ...filas]
        .map(fila => fila.map(valor => escaparCSVReporte(valor)).join(","))
        .join("\r\n");
    const blob = new Blob(["\ufeff", contenido], { type: "text/csv;charset=utf-8;" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
}

function escaparCSVReporte(valor) {
    return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function ordenarPelonesReporte(lista) {
    const orden = ["Pelon Desgarrable", "Pelon Direccional", "Pelon Galleta"];

    return [...lista].sort((a, b) => orden.indexOf(a.tipo_pelon) - orden.indexOf(b.tipo_pelon));
}

function sumarVentas(lista) {
    return lista.reduce((total, venta) => total + Number(venta.totalVenta || 0), 0);
}

function mapearMetodoPago(metodo) {
    return {
        idMetodoPago: metodo.id_metodo_pago,
        nombreMetodo: metodo.nombre_metodo
    };
}

function mapearVentaReporte(venta) {
    return {
        idVenta: venta.id_venta,
        idCliente: venta.id_cliente,
        idProducto: venta.id_producto,
        idMetodoPago: venta.id_metodo_pago,
        nombreCliente: venta.sistema_clientes?.nombre_cliente || "Cliente eliminado",
        nombreProducto: venta.sistema_productos?.nombre_producto || "Producto eliminado",
        nombreMetodo: venta.sistema_metodos_pago?.nombre_metodo || "-",
        cantidad: venta.cantidad,
        totalVenta: venta.total_venta,
        fechaVenta: venta.fecha_venta
    };
}

function formatearFechaSQL(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).slice(0, 10);
}

function textoSeguro(valor) {
    if (typeof escaparHTML === "function") {
        return escaparHTML(valor);
    }

    return String(valor ?? "");
}
