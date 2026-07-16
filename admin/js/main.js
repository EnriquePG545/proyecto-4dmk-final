const ventasDia = document.getElementById("ventasDia");
const cantidadProductos = document.getElementById("cantidadProductos");
const cantidadClientes = document.getElementById("cantidadClientes");
const cantidadStockBajo = document.getElementById("cantidadStockBajo");
const cantidadStockBajoHilos = document.getElementById("cantidadStockBajoHilos");

const tablaUltimasVentas = document.getElementById("tablaUltimasVentas");
const tablaStockBajo = document.getElementById("tablaStockBajo");
const tablaHilosStockBajo = document.getElementById("tablaHilosStockBajo");

let umbralStockProductos = 5;
let umbralStockHilos = 5;
let canalDashboard = null;

cargarDashboardDesdeSQL();

async function cargarDashboardDesdeSQL() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarConfiguracionDashboard();

    const [productosRes, clientesRes, ventasRes, hilosRes] = await Promise.all([
        supabaseClient.from("sistema_productos").select("*").order("stock", { ascending: true }),
        supabaseClient.from("sistema_clientes").select("id_cliente"),
        supabaseClient
            .from("sistema_ventas")
            .select(`
                *,
                sistema_clientes (
                    nombre_cliente
                ),
                sistema_productos (
                    nombre_producto
                )
            `)
            .eq("anulada", false)
            .order("fecha_registro", { ascending: false }),
        supabaseClient
            .from("inventario_hilos")
            .select(`
                *,
                proveedores (
                    nombre_tienda
                )
            `)
            .order("stock", { ascending: true })
    ]);

    const error = productosRes.error || clientesRes.error || ventasRes.error || hilosRes.error;

    if (error) {
        console.error(error);
        alert("No se pudo cargar el panel principal desde Supabase.");
        return;
    }

    const productos = productosRes.data || [];
    const clientes = clientesRes.data || [];
    const ventas = ventasRes.data || [];
    const hilos = hilosRes.data || [];
    const hoy = obtenerFechaActual();
    const productosStockBajo = productos.filter(producto => Number(producto.stock) <= umbralStockProductos);
    const hilosStockBajo = hilos.filter(hilo => Number(hilo.stock) <= umbralStockHilos);

    const resumen = {
        ventasDia: ventas
            .filter(venta => formatearFechaSQL(venta.fecha_venta) === hoy)
            .reduce((total, venta) => total + Number(venta.total_venta || 0), 0),
        cantidadProductos: productos.length,
        cantidadClientes: clientes.length,
        cantidadStockBajo: productosStockBajo.length,
        cantidadStockBajoHilos: hilosStockBajo.length
    };

    mostrarResumen(resumen);
    mostrarUltimasVentas(ventas.slice(0, 8).map(mapearVentaDashboard));
    mostrarProductosStockBajo(productosStockBajo);
    mostrarHilosStockBajo(hilosStockBajo);
    activarRealtimeDashboard();
}

async function cargarConfiguracionDashboard() {
    const { data, error } = await supabaseClient
        .from("sistema_configuracion")
        .select("clave, valor")
        .in("clave", ["stock_bajo_productos", "stock_bajo_hilos"]);

    if (error || !data) {
        return;
    }

    data.forEach(function (item) {
        if (item.clave === "stock_bajo_productos") {
            umbralStockProductos = Number(item.valor) || 5;
        }

        if (item.clave === "stock_bajo_hilos") {
            umbralStockHilos = Number(item.valor) || 5;
        }
    });
}

function mostrarResumen(resumen) {
    ventasDia.textContent = `S/ ${Number(resumen.ventasDia).toFixed(2)}`;
    cantidadProductos.textContent = `${resumen.cantidadProductos} registrados`;
    cantidadClientes.textContent = `${resumen.cantidadClientes} registrados`;
    cantidadStockBajo.textContent = `${resumen.cantidadStockBajo} productos`;
    cantidadStockBajoHilos.textContent = `${resumen.cantidadStockBajoHilos} hilos`;
}

function mostrarUltimasVentas(listaVentas) {
    tablaUltimasVentas.innerHTML = "";

    if (listaVentas.length === 0) {
        tablaUltimasVentas.innerHTML = `
            <tr>
                <td colspan="6">No hay ventas registradas todavia.</td>
            </tr>
        `;
        return;
    }

    listaVentas.forEach(function (venta) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${formatearFechaSQL(venta.fechaVenta)}</td>
            <td>${textoSeguro(venta.nombreCliente)}</td>
            <td>${textoSeguro(venta.nombreProducto)}</td>
            <td>${Number(venta.cantidad)}</td>
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
            <td>${textoSeguro(producto.orden_produccion)}</td>
            <td>${textoSeguro(producto.codigo_diseno)}</td>
            <td>${textoSeguro(producto.nombre_producto)}</td>
            <td>${Number(producto.stock)}</td>
            <td>S/ ${Number(producto.precio).toFixed(2)}</td>
        `;

        tablaStockBajo.appendChild(fila);
    });
}

function mostrarHilosStockBajo(listaHilos) {
    tablaHilosStockBajo.innerHTML = "";

    if (listaHilos.length === 0) {
        tablaHilosStockBajo.innerHTML = `
            <tr>
                <td colspan="4">No hay hilos con stock bajo.</td>
            </tr>
        `;
        return;
    }

    listaHilos.forEach(function (hilo) {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><strong>${textoSeguro(hilo.codigo_hilo)}</strong></td>
            <td>${textoSeguro(hilo.nombre_color)}</td>
            <td><span class="marca-hilo">${textoSeguro(hilo.marca)}</span></td>
            <td><span class="stock-hilo stock-hilo-bajo">${Number(hilo.stock || 0)}</span></td>
        `;

        tablaHilosStockBajo.appendChild(fila);
    });
}

function activarRealtimeDashboard() {
    if (canalDashboard) {
        return;
    }

    canalDashboard = supabaseClient
        .channel("sistema-dashboard-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_ventas"
        }, cargarDashboardDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_productos"
        }, cargarDashboardDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_clientes"
        }, cargarDashboardDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventario_hilos"
        }, cargarDashboardDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "proveedores"
        }, cargarDashboardDesdeSQL)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_configuracion"
        }, cargarDashboardDesdeSQL)
        .subscribe();
}

function mapearVentaDashboard(venta) {
    return {
        fechaVenta: venta.fecha_venta,
        nombreCliente: venta.sistema_clientes?.nombre_cliente || "Cliente eliminado",
        nombreProducto: venta.sistema_productos?.nombre_producto || "Producto eliminado",
        cantidad: venta.cantidad,
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
