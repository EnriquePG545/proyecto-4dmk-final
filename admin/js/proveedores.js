const formProveedor = document.getElementById("formProveedor");
const tablaProveedores = document.getElementById("tablaProveedores");
const buscadorProveedores = document.getElementById("buscadorProveedores");

const tituloFormularioProveedor = document.getElementById("tituloFormularioProveedor");
const btnGuardarProveedor = document.getElementById("btnGuardarProveedor");
const btnCancelarProveedor = document.getElementById("btnCancelarProveedor");

const inputCodigoTienda = document.getElementById("codigoTienda");
const inputNombreTienda = document.getElementById("nombreTienda");
const inputDireccionProveedor = document.getElementById("direccionProveedor");
const inputTelefonoProveedor = document.getElementById("telefonoProveedor");
const inputObservacionProveedor = document.getElementById("observacionProveedor");

const proveedoresRegistrados = document.getElementById("proveedoresRegistrados");
const hilosRelacionados = document.getElementById("hilosRelacionados");
const pelonesRelacionados = document.getElementById("pelonesRelacionados");

let proveedores = [];
let hilosProveedor = [];
let pelonesProveedor = [];
let editandoProveedor = false;
let codigoProveedorEditando = null;
let canalProveedores = null;

btnCancelarProveedor.style.display = "none";

iniciarProveedores();

async function iniciarProveedores() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarDatosProveedores();
    activarRealtimeProveedores();
}

formProveedor.addEventListener("submit", async function (event) {
    event.preventDefault();

    const proveedor = {
        codigo_tienda: normalizarCodigoProveedor(inputCodigoTienda.value),
        nombre_tienda: inputNombreTienda.value.trim(),
        direccion_proveedor: inputDireccionProveedor.value.trim() || "-",
        telefono: inputTelefonoProveedor.value.trim() || "-",
        observacion: inputObservacionProveedor.value.trim() || null
    };

    if (!proveedor.codigo_tienda || !proveedor.nombre_tienda) {
        alert("Completa el codigo de tienda y el nombre del proveedor.");
        return;
    }

    if (editandoProveedor) {
        await actualizarProveedor(proveedor);
    } else {
        await registrarProveedor(proveedor);
    }
});

buscadorProveedores.addEventListener("input", mostrarProveedores);
btnCancelarProveedor.addEventListener("click", limpiarFormularioProveedor);

async function cargarDatosProveedores() {
    const [proveedoresRes, hilosRes, pelonesRes] = await Promise.all([
        supabaseClient
            .from("proveedores")
            .select("codigo_tienda, nombre_tienda, direccion_proveedor, telefono, observacion")
            .order("nombre_tienda", { ascending: true }),
        supabaseClient
            .from("inventario_hilos")
            .select("id_hilo, codigo_tienda"),
        supabaseClient
            .from("pelones")
            .select("tipo_pelon, codigo_tienda")
    ]);

    const error = proveedoresRes.error || hilosRes.error || pelonesRes.error;

    if (error) {
        console.error(error);
        tablaProveedores.innerHTML = `
            <tr>
                <td colspan="6">No se pudieron cargar los proveedores.</td>
            </tr>
        `;
        alert("No se pudieron cargar los proveedores. Verifica que la migracion de Supabase este aplicada.");
        return;
    }

    proveedores = proveedoresRes.data || [];
    hilosProveedor = hilosRes.data || [];
    pelonesProveedor = pelonesRes.data || [];

    mostrarResumenProveedores();
    mostrarProveedores();
}

async function registrarProveedor(proveedor) {
    const { error } = await supabaseClient
        .from("proveedores")
        .insert(proveedor);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorProveedor(error, "No se pudo registrar el proveedor."));
        return;
    }

    alert("Proveedor registrado correctamente.");
    limpiarFormularioProveedor();
    await cargarDatosProveedores();
}

async function actualizarProveedor(proveedor) {
    const datosActualizacion = {
        nombre_tienda: proveedor.nombre_tienda,
        direccion_proveedor: proveedor.direccion_proveedor,
        telefono: proveedor.telefono,
        observacion: proveedor.observacion
    };

    const { error } = await supabaseClient
        .from("proveedores")
        .update(datosActualizacion)
        .eq("codigo_tienda", codigoProveedorEditando);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorProveedor(error, "No se pudo actualizar el proveedor."));
        return;
    }

    alert("Proveedor actualizado correctamente.");
    limpiarFormularioProveedor();
    await cargarDatosProveedores();
}

function mostrarResumenProveedores() {
    proveedoresRegistrados.textContent = proveedores.length;
    hilosRelacionados.textContent = hilosProveedor.filter(item => item.codigo_tienda).length;
    pelonesRelacionados.textContent = pelonesProveedor.filter(item => item.codigo_tienda).length;
}

function mostrarProveedores() {
    const textoBusqueda = buscadorProveedores.value.trim().toLowerCase();

    const proveedoresFiltrados = proveedores
        .filter(function (proveedor) {
            const uso = obtenerUsoProveedor(proveedor.codigo_tienda);
            const campos = [
                proveedor.codigo_tienda,
                proveedor.nombre_tienda,
                proveedor.direccion_proveedor,
                proveedor.telefono,
                proveedor.observacion,
                uso.hilos,
                uso.pelones
            ].join(" ").toLowerCase();

            return campos.includes(textoBusqueda);
        })
        .sort(function (a, b) {
            return String(a.nombre_tienda).localeCompare(String(b.nombre_tienda));
        });

    if (proveedoresFiltrados.length === 0) {
        tablaProveedores.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron proveedores relacionados.</td>
            </tr>
        `;
        return;
    }

    tablaProveedores.innerHTML = "";

    proveedoresFiltrados.forEach(function (proveedor) {
        const fila = document.createElement("tr");
        const uso = obtenerUsoProveedor(proveedor.codigo_tienda);

        fila.innerHTML = `
            <td><strong>${escaparHTML(proveedor.codigo_tienda)}</strong></td>
            <td>${escaparHTML(proveedor.nombre_tienda)}</td>
            <td>${escaparHTML(proveedor.direccion_proveedor || "-")}</td>
            <td>${escaparHTML(proveedor.telefono || "-")}</td>
            <td>
                <span class="badge-relacion">${uso.hilos} hilos</span>
                <span class="badge-relacion badge-relacion-secundario">${uso.pelones} pelones</span>
            </td>
            <td>
                <button type="button" class="boton-tabla editar" onclick="editarProveedor('${escaparAtributoProveedor(proveedor.codigo_tienda)}')">
                    <i class="ri-edit-line"></i>
                    Editar
                </button>
            </td>
        `;

        tablaProveedores.appendChild(fila);
    });
}

function editarProveedor(codigoTienda) {
    const proveedor = proveedores.find(item => item.codigo_tienda === codigoTienda);

    if (!proveedor) {
        alert("No se encontro el proveedor seleccionado.");
        return;
    }

    inputCodigoTienda.value = proveedor.codigo_tienda;
    inputCodigoTienda.disabled = true;
    inputNombreTienda.value = proveedor.nombre_tienda;
    inputDireccionProveedor.value = proveedor.direccion_proveedor || "";
    inputTelefonoProveedor.value = proveedor.telefono || "";
    inputObservacionProveedor.value = proveedor.observacion || "";

    editandoProveedor = true;
    codigoProveedorEditando = proveedor.codigo_tienda;

    tituloFormularioProveedor.textContent = "Editar Proveedor";
    btnGuardarProveedor.innerHTML = '<i class="ri-save-line"></i> Actualizar Proveedor';
    btnCancelarProveedor.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function obtenerUsoProveedor(codigoTienda) {
    return {
        hilos: hilosProveedor.filter(item => item.codigo_tienda === codigoTienda).length,
        pelones: pelonesProveedor.filter(item => item.codigo_tienda === codigoTienda).length
    };
}

function limpiarFormularioProveedor() {
    formProveedor.reset();
    inputCodigoTienda.disabled = false;
    editandoProveedor = false;
    codigoProveedorEditando = null;
    tituloFormularioProveedor.textContent = "Nuevo Proveedor";
    btnGuardarProveedor.innerHTML = '<i class="ri-save-line"></i> Registrar Proveedor';
    btnCancelarProveedor.style.display = "none";
}

function activarRealtimeProveedores() {
    if (canalProveedores) {
        return;
    }

    canalProveedores = supabaseClient
        .channel("proveedores-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "proveedores"
        }, cargarDatosProveedores)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventario_hilos"
        }, cargarDatosProveedores)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pelones"
        }, cargarDatosProveedores)
        .subscribe();
}

function normalizarCodigoProveedor(valor) {
    return String(valor || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-");
}

function obtenerMensajeErrorProveedor(error, mensajeBase) {
    if (error && error.code === "23505") {
        return "Ya existe un proveedor con ese codigo de tienda.";
    }

    if (error && error.code === "23503") {
        return "Este proveedor esta relacionado con otros registros y no puede quedar inconsistente.";
    }

    return mensajeBase;
}

function escaparAtributoProveedor(valor) {
    return String(valor).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
