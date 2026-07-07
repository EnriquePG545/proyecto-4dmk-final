const dashHilosStockBajo = document.getElementById("dashHilosStockBajo");
const dashProveedoresActivos = document.getElementById("dashProveedoresActivos");
const dashGastoMes = document.getElementById("dashGastoMes");
const dashPelonesPromedio = document.getElementById("dashPelonesPromedio");

const periodoGastoDashboard = document.getElementById("periodoGastoDashboard");
const fechaInicioDashboard = document.getElementById("fechaInicioDashboard");
const fechaFinDashboard = document.getElementById("fechaFinDashboard");
const tablaDashboardHilosBajos = document.getElementById("tablaDashboardHilosBajos");

let dashboardHilos = [];
let dashboardProveedores = [];
let dashboardCompras = [];
let dashboardPelones = [];
let umbralDashboardHilos = 5;
let canalDashboardOperativo = null;

const chartsDashboard = {};
const prefijosPermitidos = ["50", "51", "52", "53", "54", "55", "56", "60"];
const coloresDashboard = ["#facc15", "#111827", "#22c55e", "#3b82f6", "#f97316", "#a855f7", "#ef4444", "#14b8a6"];

iniciarDashboardOperativo();

async function iniciarDashboardOperativo() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    fechaInicioDashboard.value = obtenerInicioMesDashboard();
    fechaFinDashboard.value = obtenerFechaActualDashboard();

    periodoGastoDashboard.addEventListener("change", renderizarDashboard);
    fechaInicioDashboard.addEventListener("change", renderizarDashboard);
    fechaFinDashboard.addEventListener("change", renderizarDashboard);

    await cargarDatosDashboard();
    activarRealtimeDashboardOperativo();
}

async function cargarDatosDashboard() {
    const [configRes, hilosRes, proveedoresRes, comprasRes, pelonesRes] = await Promise.all([
        supabaseClient
            .from("sistema_configuracion")
            .select("clave, valor")
            .eq("clave", "stock_bajo_hilos")
            .maybeSingle(),
        supabaseClient
            .from("inventario_hilos")
            .select(`
                *,
                proveedores (
                    codigo_tienda,
                    nombre_tienda
                )
            `)
            .order("stock", { ascending: true }),
        supabaseClient
            .from("proveedores")
            .select("*")
            .order("nombre_tienda", { ascending: true }),
        supabaseClient
            .from("compras_hilos")
            .select(`
                *,
                proveedores (
                    codigo_tienda,
                    nombre_tienda
                )
            `)
            .order("fecha_compra", { ascending: true }),
        supabaseClient
            .from("pelones")
            .select("*")
            .order("tipo_pelon", { ascending: true })
    ]);

    const error = configRes.error || hilosRes.error || proveedoresRes.error || comprasRes.error || pelonesRes.error;

    if (error) {
        console.error(error);
        alert("No se pudo cargar el dashboard. Verifica que la migracion de Supabase este aplicada.");
        return;
    }

    if (configRes.data) {
        umbralDashboardHilos = Number(configRes.data.valor) || 5;
    }

    dashboardHilos = hilosRes.data || [];
    dashboardProveedores = proveedoresRes.data || [];
    dashboardCompras = comprasRes.data || [];
    dashboardPelones = pelonesRes.data || [];

    renderizarDashboard();
}

function renderizarDashboard() {
    actualizarTarjetasDashboard();
    renderizarGraficoPrefijos();
    renderizarGraficoMarcas();
    renderizarGraficoGasto();
    renderizarGraficoStock();
    renderizarGraficoPelones();
    mostrarTablaHilosBajosDashboard();
}

function actualizarTarjetasDashboard() {
    const hilosBajos = dashboardHilos.filter(hilo => Number(hilo.stock || 0) <= umbralDashboardHilos);
    const proveedoresActivos = dashboardProveedores.filter(proveedor => proveedor.activo).length;
    const gastoMes = dashboardCompras
        .filter(compra => String(compra.fecha_compra || "").slice(0, 7) === obtenerFechaActualDashboard().slice(0, 7))
        .reduce((total, compra) => total + Number(compra.total_compra || 0), 0);
    const promedioPelones = dashboardPelones.length === 0
        ? 0
        : Math.round(dashboardPelones.reduce((total, pelon) => total + Number(pelon.porcentaje || 0), 0) / dashboardPelones.length);

    dashHilosStockBajo.textContent = hilosBajos.length;
    dashProveedoresActivos.textContent = proveedoresActivos;
    dashGastoMes.textContent = formatearDineroDashboard(gastoMes);
    dashPelonesPromedio.textContent = `${promedioPelones}%`;
}

function renderizarGraficoPrefijos() {
    const conteo = new Map(prefijosPermitidos.map(prefijo => [prefijo, 0]));

    dashboardHilos.forEach(function (hilo) {
        const prefijo = String(hilo.codigo_hilo || "").slice(0, 2);

        if (conteo.has(prefijo)) {
            conteo.set(prefijo, conteo.get(prefijo) + 1);
        }
    });

    crearGrafico("chartPrefijosHilos", {
        type: "bar",
        data: {
            labels: prefijosPermitidos,
            datasets: [{
                label: "Cantidad de hilos",
                data: prefijosPermitidos.map(prefijo => conteo.get(prefijo)),
                backgroundColor: coloresDashboard
            }]
        },
        options: opcionesBaseDashboard()
    });
}

function renderizarGraficoMarcas() {
    const marcas = ["Lumina", "Polifill", "Polineon"];
    const conteo = marcas.map(function (marca) {
        return dashboardHilos.filter(hilo => hilo.marca === marca).length;
    });

    crearGrafico("chartMarcasHilos", {
        type: "doughnut",
        data: {
            labels: marcas,
            datasets: [{
                data: conteo,
                backgroundColor: ["#facc15", "#3b82f6", "#111827"],
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            ...opcionesBaseDashboard(),
            cutout: "60%"
        }
    });
}

function renderizarGraficoGasto() {
    const comprasFiltradas = obtenerComprasFiltradasDashboard();
    const agrupado = new Map();

    comprasFiltradas.forEach(function (compra) {
        const clave = obtenerClavePeriodoDashboard(compra.fecha_compra, periodoGastoDashboard.value);
        agrupado.set(clave, (agrupado.get(clave) || 0) + Number(compra.total_compra || 0));
    });

    const labels = Array.from(agrupado.keys()).sort();

    crearGrafico("chartGastoHilos", {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Gasto en hilos",
                data: labels.map(label => Number(agrupado.get(label) || 0)),
                borderColor: "#166534",
                backgroundColor: "rgba(34,197,94,0.18)",
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointBackgroundColor: "#166534"
            }]
        },
        options: opcionesBaseDashboard(true)
    });
}

function renderizarGraficoStock() {
    const rangos = [
        { label: "0", min: 0, max: 0 },
        { label: "1-5", min: 1, max: 5 },
        { label: "6-10", min: 6, max: 10 },
        { label: "11-20", min: 11, max: 20 },
        { label: "21+", min: 21, max: Infinity }
    ];

    const datos = rangos.map(function (rango) {
        return dashboardHilos.filter(function (hilo) {
            const stock = Number(hilo.stock || 0);
            return stock >= rango.min && stock <= rango.max;
        }).length;
    });

    crearGrafico("chartStockHilos", {
        type: "bar",
        data: {
            labels: rangos.map(rango => rango.label),
            datasets: [{
                label: "Hilos por rango de stock",
                data: datos,
                backgroundColor: ["#ef4444", "#f97316", "#facc15", "#3b82f6", "#22c55e"]
            }]
        },
        options: opcionesBaseDashboard()
    });
}

function renderizarGraficoPelones() {
    const pelonesOrdenados = ordenarPelonesDashboard(dashboardPelones);

    crearGrafico("chartPelones", {
        type: "bar",
        data: {
            labels: pelonesOrdenados.map(pelon => pelon.tipo_pelon),
            datasets: [{
                label: "Disponibilidad",
                data: pelonesOrdenados.map(pelon => Number(pelon.porcentaje || 0)),
                backgroundColor: pelonesOrdenados.map(pelon => obtenerColorPelonDashboard(Number(pelon.porcentaje || 0)))
            }]
        },
        options: {
            ...opcionesBaseDashboard(),
            indexAxis: "y",
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => `${value}%`
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function mostrarTablaHilosBajosDashboard() {
    const hilosBajos = dashboardHilos
        .filter(hilo => Number(hilo.stock || 0) <= umbralDashboardHilos)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 8);

    if (hilosBajos.length === 0) {
        tablaDashboardHilosBajos.innerHTML = `
            <tr>
                <td colspan="5">No hay hilos con stock bajo.</td>
            </tr>
        `;
        return;
    }

    tablaDashboardHilosBajos.innerHTML = "";

    hilosBajos.forEach(function (hilo) {
        const fila = document.createElement("tr");
        const proveedor = hilo.proveedores?.nombre_tienda || "Sin proveedor";

        fila.innerHTML = `
            <td><strong>${textoSeguroDashboard(hilo.codigo_hilo)}</strong></td>
            <td>${textoSeguroDashboard(hilo.nombre_color)}</td>
            <td><span class="marca-hilo">${textoSeguroDashboard(hilo.marca)}</span></td>
            <td><span class="stock-hilo stock-hilo-bajo">${Number(hilo.stock || 0)}</span></td>
            <td>${textoSeguroDashboard(proveedor)}</td>
        `;

        tablaDashboardHilosBajos.appendChild(fila);
    });
}

function crearGrafico(canvasId, config) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (chartsDashboard[canvasId]) {
        chartsDashboard[canvasId].destroy();
    }

    chartsDashboard[canvasId] = new Chart(canvas, config);
}

function opcionesBaseDashboard(esDinero) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    boxWidth: 14,
                    color: "#374151",
                    font: {
                        family: "Segoe UI"
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const valor = context.parsed.y ?? context.parsed.x ?? context.parsed;
                        return esDinero
                            ? `${context.dataset.label}: ${formatearDineroDashboard(valor)}`
                            : `${context.dataset.label || context.label}: ${valor}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: "rgba(17,24,39,0.08)"
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(17,24,39,0.08)"
                }
            }
        }
    };
}

function obtenerComprasFiltradasDashboard() {
    const inicio = fechaInicioDashboard.value;
    const fin = fechaFinDashboard.value;

    return dashboardCompras.filter(function (compra) {
        const fecha = String(compra.fecha_compra || "").slice(0, 10);
        const cumpleInicio = !inicio || fecha >= inicio;
        const cumpleFin = !fin || fecha <= fin;

        return cumpleInicio && cumpleFin;
    });
}

function obtenerClavePeriodoDashboard(fecha, periodo) {
    const fechaCorta = String(fecha || "").slice(0, 10);

    if (periodo === "mes") {
        return fechaCorta.slice(0, 7);
    }

    if (periodo === "semana") {
        const fechaBase = new Date(`${fechaCorta}T00:00:00`);
        const dia = fechaBase.getDay() || 7;
        fechaBase.setDate(fechaBase.getDate() - dia + 1);
        return `Semana ${fechaBase.toISOString().slice(0, 10)}`;
    }

    return fechaCorta;
}

function activarRealtimeDashboardOperativo() {
    if (canalDashboardOperativo) {
        return;
    }

    canalDashboardOperativo = supabaseClient
        .channel("dashboard-operativo-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventario_hilos"
        }, cargarDatosDashboard)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "proveedores"
        }, cargarDatosDashboard)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "compras_hilos"
        }, cargarDatosDashboard)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pelones"
        }, cargarDatosDashboard)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_configuracion"
        }, cargarDatosDashboard)
        .subscribe();
}

function ordenarPelonesDashboard(lista) {
    const orden = ["Pelon Desgarrable", "Pelon Direccional", "Pelon Galleta"];

    return [...lista].sort(function (a, b) {
        return orden.indexOf(a.tipo_pelon) - orden.indexOf(b.tipo_pelon);
    });
}

function obtenerColorPelonDashboard(porcentaje) {
    if (porcentaje <= 10) {
        return "#ef4444";
    }

    if (porcentaje <= 35) {
        return "#f97316";
    }

    if (porcentaje <= 65) {
        return "#facc15";
    }

    if (porcentaje <= 85) {
        return "#3b82f6";
    }

    return "#22c55e";
}

function formatearDineroDashboard(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function obtenerFechaActualDashboard() {
    return new Date().toISOString().slice(0, 10);
}

function obtenerInicioMesDashboard() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
}

function textoSeguroDashboard(valor) {
    if (typeof escaparHTML === "function") {
        return escaparHTML(valor);
    }

    return String(valor ?? "");
}
