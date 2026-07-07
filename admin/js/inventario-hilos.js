const formHilo = document.getElementById("formHilo");
const formCompraHilo = document.getElementById("formCompraHilo");
const tablaHilos = document.getElementById("tablaHilos");
const tablaComprasHilos = document.getElementById("tablaComprasHilos");
const buscadorHilos = document.getElementById("buscadorHilos");

const tituloFormularioHilo = document.getElementById("tituloFormularioHilo");
const btnGuardarHilo = document.getElementById("btnGuardarHilo");
const btnCancelarHilo = document.getElementById("btnCancelarHilo");

const inputCodigoHilo = document.getElementById("codigoHilo");
const inputNombreColor = document.getElementById("nombreColor");
const inputMarcaHilo = document.getElementById("marcaHilo");
const inputStockHilo = document.getElementById("stockHilo");
const inputProveedorHilo = document.getElementById("proveedorHilo");
const inputPrecioCompraHilo = document.getElementById("precioCompraHilo");
const inputFechaCompraHilo = document.getElementById("fechaCompraHilo");
const inputDetalleCompraHilo = document.getElementById("detalleCompraHilo");

const inputHiloCompra = document.getElementById("hiloCompra");
const inputProveedorCompra = document.getElementById("proveedorCompra");
const inputCantidadCompraHilo = document.getElementById("cantidadCompraHilo");
const inputPrecioUnitarioCompraHilo = document.getElementById("precioUnitarioCompraHilo");
const inputFechaRegistroCompraHilo = document.getElementById("fechaRegistroCompraHilo");
const inputDetalleRegistroCompraHilo = document.getElementById("detalleRegistroCompraHilo");

let hilos = [];
let proveedores = [];
let comprasHilos = [];
let editandoHilo = false;
let idHiloEditando = null;
let umbralStockHilos = 5;
let canalHilos = null;

btnCancelarHilo.style.display = "none";
inputFechaRegistroCompraHilo.value = obtenerFechaActualHilo();

iniciarInventarioHilos();

async function iniciarInventarioHilos() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarUmbralStockHilos();
    await cargarProveedoresHilos();
    await cargarHilos();
    await cargarComprasHilos();
    activarRealtimeHilos();
}

async function cargarUmbralStockHilos() {
    const { data, error } = await supabaseClient
        .from("sistema_configuracion")
        .select("valor")
        .eq("clave", "stock_bajo_hilos")
        .maybeSingle();

    if (!error && data) {
        umbralStockHilos = Number(data.valor) || 5;
    }
}

async function cargarProveedoresHilos() {
    const { data, error } = await supabaseClient
        .from("proveedores")
        .select("*")
        .order("nombre_tienda", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar proveedores. Aplica la migracion de Supabase antes de usar esta seccion.");
        proveedores = [];
        actualizarSelectsHilos();
        return;
    }

    proveedores = data || [];
    actualizarSelectsHilos();
}

formHilo.addEventListener("submit", async function (event) {
    event.preventDefault();

    const hilo = {
        codigo_hilo: inputCodigoHilo.value.trim().toUpperCase(),
        nombre_color: inputNombreColor.value.trim(),
        marca: inputMarcaHilo.value,
        stock: inputStockHilo.value.trim() === "" ? 0 : Number(inputStockHilo.value),
        codigo_tienda: inputProveedorHilo.value || null,
        precio_compra: inputPrecioCompraHilo.value.trim() === "" ? 0 : Number(inputPrecioCompraHilo.value),
        fecha_compra: inputFechaCompraHilo.value || null,
        detalle_compra: inputDetalleCompraHilo.value.trim() || null
    };

    if (!hilo.codigo_hilo || !hilo.nombre_color) {
        alert("Completa el codigo del hilo y el nombre del color.");
        return;
    }

    if (!Number.isInteger(hilo.stock) || hilo.stock < 0) {
        alert("El stock debe ser un numero entero mayor o igual a cero.");
        return;
    }

    if (Number.isNaN(hilo.precio_compra) || hilo.precio_compra < 0) {
        alert("El precio de compra debe ser mayor o igual a cero.");
        return;
    }

    if (editandoHilo) {
        await actualizarHilo(hilo);
    } else {
        await registrarHilo(hilo);
    }
});

formCompraHilo.addEventListener("submit", async function (event) {
    event.preventDefault();
    await registrarCompraHilo();
});

buscadorHilos.addEventListener("input", mostrarHilos);
btnCancelarHilo.addEventListener("click", limpiarFormularioHilo);

async function cargarHilos() {
    const { data, error } = await supabaseClient
        .from("inventario_hilos")
        .select(`
            *,
            proveedores (
                codigo_tienda,
                nombre_tienda
            )
        `)
        .order("codigo_hilo", { ascending: true });

    if (error) {
        console.error(error);
        tablaHilos.innerHTML = `
            <tr>
                <td colspan="9">No se pudo cargar el inventario de hilos.</td>
            </tr>
        `;
        alert("No se pudo cargar el inventario de hilos.");
        return;
    }

    hilos = data || [];
    actualizarSelectsHilos();
    mostrarHilos();
}

async function cargarComprasHilos() {
    const { data, error } = await supabaseClient
        .from("compras_hilos")
        .select(`
            *,
            proveedores (
                codigo_tienda,
                nombre_tienda
            )
        `)
        .order("fecha_compra", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) {
        console.error(error);
        tablaComprasHilos.innerHTML = `
            <tr>
                <td colspan="7">No se pudo cargar el historial de compras.</td>
            </tr>
        `;
        return;
    }

    comprasHilos = data || [];
    mostrarComprasHilos();
}

async function registrarHilo(hilo) {
    const { error } = await supabaseClient
        .from("inventario_hilos")
        .insert(hilo);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorHilo(error, "No se pudo registrar el hilo."));
        return;
    }

    alert("Hilo registrado correctamente.");
    limpiarFormularioHilo();
    await cargarHilos();
}

async function actualizarHilo(hilo) {
    const { error } = await supabaseClient
        .from("inventario_hilos")
        .update(hilo)
        .eq("id_hilo", idHiloEditando);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorHilo(error, "No se pudo actualizar el hilo."));
        return;
    }

    alert("Hilo actualizado correctamente.");
    limpiarFormularioHilo();
    await cargarHilos();
}

async function registrarCompraHilo() {
    const idHilo = Number(inputHiloCompra.value);
    const codigoTienda = inputProveedorCompra.value;
    const cantidad = Number(inputCantidadCompraHilo.value);
    const precioUnitario = Number(inputPrecioUnitarioCompraHilo.value);
    const fechaCompra = inputFechaRegistroCompraHilo.value || obtenerFechaActualHilo();
    const detalleCompra = inputDetalleRegistroCompraHilo.value.trim() || null;

    if (!idHilo || !codigoTienda) {
        alert("Selecciona el hilo y el proveedor de la compra.");
        return;
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        alert("La cantidad comprada debe ser un numero entero mayor a cero.");
        return;
    }

    if (Number.isNaN(precioUnitario) || precioUnitario < 0) {
        alert("El precio unitario debe ser mayor o igual a cero.");
        return;
    }

    const { error } = await supabaseClient.rpc("fn_registrar_compra_hilo", {
        p_id_hilo: idHilo,
        p_codigo_tienda: codigoTienda,
        p_cantidad: cantidad,
        p_precio_unitario: precioUnitario,
        p_fecha_compra: fechaCompra,
        p_detalle_compra: detalleCompra
    });

    if (error) {
        console.error(error);
        alert("No se pudo registrar la compra. Verifica proveedor, hilo y migracion de Supabase.");
        return;
    }

    alert("Compra registrada correctamente. El stock del hilo fue actualizado.");
    limpiarFormularioCompraHilo();
    await cargarHilos();
    await cargarComprasHilos();
}

function mostrarHilos() {
    const textoBusqueda = buscadorHilos.value.trim().toLowerCase();

    const hilosFiltrados = hilos
        .filter(function (hilo) {
            const proveedor = obtenerNombreProveedorHilo(hilo);
            const campos = [
                hilo.codigo_hilo,
                hilo.nombre_color,
                hilo.marca,
                hilo.stock,
                proveedor,
                hilo.precio_compra,
                hilo.detalle_compra
            ].join(" ").toLowerCase();

            return campos.includes(textoBusqueda);
        })
        .sort(function (a, b) {
            return String(a.codigo_hilo).localeCompare(String(b.codigo_hilo));
        });

    if (hilosFiltrados.length === 0) {
        tablaHilos.innerHTML = `
            <tr>
                <td colspan="9">No se encontraron hilos relacionados.</td>
            </tr>
        `;
        return;
    }

    tablaHilos.innerHTML = "";

    hilosFiltrados.forEach(function (hilo) {
        const fila = document.createElement("tr");
        const stock = Number(hilo.stock || 0);
        const claseStock = stock <= umbralStockHilos ? "stock-hilo stock-hilo-bajo" : "stock-hilo";
        const proveedor = obtenerNombreProveedorHilo(hilo);

        fila.innerHTML = `
            <td><strong>${escaparHTML(hilo.codigo_hilo)}</strong></td>
            <td>${escaparHTML(hilo.nombre_color)}</td>
            <td><span class="marca-hilo">${escaparHTML(hilo.marca)}</span></td>
            <td><span class="${claseStock}">${stock}</span></td>
            <td>${escaparHTML(proveedor)}</td>
            <td>${formatearDineroHilo(hilo.precio_compra)}</td>
            <td>${escaparHTML(hilo.detalle_compra || "-")}</td>
            <td>${formatearFechaHilo(hilo.updated_at)}</td>
            <td>
                <button type="button" class="boton-tabla editar" onclick="editarHilo(${Number(hilo.id_hilo)})">
                    <i class="ri-edit-line"></i>
                    Editar
                </button>

                <button type="button" class="boton-tabla eliminar" onclick="eliminarHilo(${Number(hilo.id_hilo)})">
                    <i class="ri-delete-bin-line"></i>
                    Eliminar
                </button>
            </td>
        `;

        tablaHilos.appendChild(fila);
    });
}

function mostrarComprasHilos() {
    if (comprasHilos.length === 0) {
        tablaComprasHilos.innerHTML = `
            <tr>
                <td colspan="7">Todavia no hay compras de hilos registradas.</td>
            </tr>
        `;
        return;
    }

    tablaComprasHilos.innerHTML = "";

    comprasHilos.forEach(function (compra) {
        const fila = document.createElement("tr");
        const nombreProveedor = compra.proveedores?.nombre_tienda || compra.codigo_tienda || "-";
        const hilo = `${compra.codigo_hilo_snapshot || "-"} - ${compra.nombre_color_snapshot || "-"}`;

        fila.innerHTML = `
            <td>${formatearFechaHilo(compra.fecha_compra)}</td>
            <td>${escaparHTML(hilo)}</td>
            <td>${escaparHTML(nombreProveedor)}</td>
            <td>${Number(compra.cantidad || 0)}</td>
            <td>${formatearDineroHilo(compra.precio_unitario)}</td>
            <td><strong>${formatearDineroHilo(compra.total_compra)}</strong></td>
            <td>${escaparHTML(compra.detalle_compra || "-")}</td>
        `;

        tablaComprasHilos.appendChild(fila);
    });
}

function editarHilo(idHilo) {
    const hilo = hilos.find(function (item) {
        return Number(item.id_hilo) === Number(idHilo);
    });

    if (!hilo) {
        alert("No se encontro el hilo seleccionado.");
        return;
    }

    inputCodigoHilo.value = hilo.codigo_hilo;
    inputNombreColor.value = hilo.nombre_color;
    inputMarcaHilo.value = hilo.marca;
    inputStockHilo.value = hilo.stock;
    inputProveedorHilo.value = hilo.codigo_tienda || "";
    inputPrecioCompraHilo.value = Number(hilo.precio_compra || 0).toFixed(2);
    inputFechaCompraHilo.value = hilo.fecha_compra || "";
    inputDetalleCompraHilo.value = hilo.detalle_compra || "";

    editandoHilo = true;
    idHiloEditando = Number(idHilo);

    tituloFormularioHilo.textContent = "Editar Hilo";
    btnGuardarHilo.innerHTML = '<i class="ri-save-line"></i> Actualizar Hilo';
    btnCancelarHilo.style.display = "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function eliminarHilo(idHilo) {
    const confirmar = confirm("Estas seguro de eliminar este hilo?");

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("inventario_hilos")
        .delete()
        .eq("id_hilo", idHilo);

    if (error) {
        console.error(error);
        alert("No se pudo eliminar el hilo. Si tiene compras asociadas, el historial se protege automaticamente.");
        return;
    }

    alert("Hilo eliminado correctamente.");
    await cargarHilos();
    await cargarComprasHilos();
}

function limpiarFormularioHilo() {
    formHilo.reset();
    inputMarcaHilo.value = "Lumina";
    inputProveedorHilo.value = "";
    inputPrecioCompraHilo.value = "";
    inputFechaCompraHilo.value = "";
    inputDetalleCompraHilo.value = "";

    editandoHilo = false;
    idHiloEditando = null;

    tituloFormularioHilo.textContent = "Nuevo Hilo";
    btnGuardarHilo.innerHTML = '<i class="ri-save-line"></i> Registrar Hilo';
    btnCancelarHilo.style.display = "none";
}

function limpiarFormularioCompraHilo() {
    formCompraHilo.reset();
    inputFechaRegistroCompraHilo.value = obtenerFechaActualHilo();
}

function actualizarSelectsHilos() {
    if (inputProveedorHilo) {
        const opcionesProveedorHilo = proveedores.map(function (proveedor) {
            const estado = proveedor.activo ? "" : " (inactivo)";
            return `<option value="${escaparHTML(proveedor.codigo_tienda)}">${escaparHTML(proveedor.nombre_tienda)} - ${escaparHTML(proveedor.codigo_tienda)}${estado}</option>`;
        }).join("");

        inputProveedorHilo.innerHTML = `<option value="">Sin proveedor asignado</option>${opcionesProveedorHilo}`;
    }

    if (inputProveedorCompra) {
        const proveedoresActivos = proveedores.filter(proveedor => proveedor.activo);
        const opcionesProveedorCompra = proveedoresActivos.map(function (proveedor) {
            return `<option value="${escaparHTML(proveedor.codigo_tienda)}">${escaparHTML(proveedor.nombre_tienda)} - ${escaparHTML(proveedor.codigo_tienda)}</option>`;
        }).join("");

        inputProveedorCompra.innerHTML = `<option value="">Selecciona un proveedor</option>${opcionesProveedorCompra}`;
    }

    if (inputHiloCompra) {
        const opcionesHilos = hilos.map(function (hilo) {
            return `<option value="${Number(hilo.id_hilo)}">${escaparHTML(hilo.codigo_hilo)} - ${escaparHTML(hilo.nombre_color)} (${Number(hilo.stock || 0)} und.)</option>`;
        }).join("");

        inputHiloCompra.innerHTML = `<option value="">Selecciona un hilo</option>${opcionesHilos}`;
    }
}

function activarRealtimeHilos() {
    if (canalHilos) {
        return;
    }

    canalHilos = supabaseClient
        .channel("inventario-hilos-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventario_hilos"
        }, async function () {
            await cargarHilos();
        })
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "proveedores"
        }, async function () {
            await cargarProveedoresHilos();
            await cargarHilos();
            await cargarComprasHilos();
        })
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "compras_hilos"
        }, async function () {
            await cargarComprasHilos();
        })
        .subscribe();
}

function obtenerNombreProveedorHilo(hilo) {
    return hilo.proveedores?.nombre_tienda || obtenerNombreProveedorPorCodigo(hilo.codigo_tienda) || "Sin proveedor";
}

function obtenerNombreProveedorPorCodigo(codigoTienda) {
    if (!codigoTienda) {
        return "";
    }

    const proveedor = proveedores.find(item => item.codigo_tienda === codigoTienda);
    return proveedor ? proveedor.nombre_tienda : codigoTienda;
}

function formatearFechaHilo(fecha) {
    if (!fecha) {
        return "-";
    }

    return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function formatearDineroHilo(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function obtenerFechaActualHilo() {
    return new Date().toISOString().slice(0, 10);
}

function obtenerMensajeErrorHilo(error, mensajeBase) {
    if (error && error.code === "23505") {
        return "Ya existe un hilo con ese codigo.";
    }

    if (error && error.code === "23503") {
        return "El proveedor seleccionado no existe o no esta disponible.";
    }

    return mensajeBase;
}
