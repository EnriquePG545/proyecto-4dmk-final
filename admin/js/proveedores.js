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
const inputEstadoProveedor = document.getElementById("estadoProveedor");
const inputObservacionProveedor = document.getElementById("observacionProveedor");

const proveedoresActivos = document.getElementById("proveedoresActivos");
const proveedoresInactivos = document.getElementById("proveedoresInactivos");
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
        observacion: inputObservacionProveedor.value.trim() || null,
        activo: inputEstadoProveedor.value === "true"
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
            .select("*")
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
                <td colspan="7">No se pudieron cargar los proveedores.</td>
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
        observacion: proveedor.observacion,
        activo: proveedor.activo
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
    const activos = proveedores.filter(proveedor => proveedor.activo).length;
    const inactivos = proveedores.length - activos;
    const hilosConProveedor = hilosProveedor.filter(item => item.codigo_tienda).length;
    const pelonesConProveedor = pelonesProveedor.filter(item => item.codigo_tienda).length;

    proveedoresActivos.textContent = activos;
    proveedoresInactivos.textContent = inactivos;
    hilosRelacionados.textContent = hilosConProveedor;
    pelonesRelacionados.textContent = pelonesConProveedor;
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
                proveedor.activo ? "activo" : "inactivo",
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
                <td colspan="7">No se encontraron proveedores relacionados.</td>
            </tr>
        `;
        return;
    }

    tablaProveedores.innerHTML = "";

    proveedoresFiltrados.forEach(function (proveedor) {
        const fila = document.createElement("tr");
        const uso = obtenerUsoProveedor(proveedor.codigo_tienda);
        const claseEstado = proveedor.activo ? "estado-proveedor estado-proveedor-activo" : "estado-proveedor estado-proveedor-inactivo";
        const textoEstado = proveedor.activo ? "Activo" : "Inactivo";
        const accionEstado = proveedor.activo ? "Inactivar" : "Reactivar";
        const iconoEstado = proveedor.activo ? "ri-pause-circle-line" : "ri-play-circle-line";

        fila.innerHTML = `
            <td><strong>${escaparHTML(proveedor.codigo_tienda)}</strong></td>
            <td>${escaparHTML(proveedor.nombre_tienda)}</td>
            <td>${escaparHTML(proveedor.direccion_proveedor || "-")}</td>
            <td>${escaparHTML(proveedor.telefono || "-")}</td>
            <td>
                <span class="badge-relacion">${uso.hilos} hilos</span>
                <span class="badge-relacion badge-relacion-secundario">${uso.pelones} pelones</span>
            </td>
            <td><span class="${claseEstado}">${textoEstado}</span></td>
            <td>
                <button type="button" class="boton-tabla editar" onclick="editarProveedor('${escaparAtributoProveedor(proveedor.codigo_tienda)}')">
                    <i class="ri-edit-line"></i>
                    Editar
                </button>

                <button type="button" class="boton-tabla eliminar" onclick="cambiarEstadoProveedor('${escaparAtributoProveedor(proveedor.codigo_tienda)}', ${!proveedor.activo})">
                    <i class="${iconoEstado}"></i>
                    ${accionEstado}
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
    inputEstadoProveedor.value = proveedor.activo ? "true" : "false";
    inputObservacionProveedor.value = proveedor.observacion || "";

    editandoProveedor = true;
    codigoProveedorEditando = proveedor.codigo_tienda;

    tituloFormularioProveedor.textContent = "Editar Proveedor";
    btnGuardarProveedor.innerHTML = '<i class="ri-save-line"></i> Actualizar Proveedor';
    btnCancelarProveedor.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function cambiarEstadoProveedor(codigoTienda, nuevoEstado) {
    const textoAccion = nuevoEstado ? "reactivar" : "inactivar";
    const confirmar = confirm(`Estas seguro de ${textoAccion} este proveedor?`);

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("proveedores")
        .update({ activo: nuevoEstado })
        .eq("codigo_tienda", codigoTienda);

    if (error) {
        console.error(error);
        alert("No se pudo cambiar el estado del proveedor.");
        return;
    }

    alert("Estado del proveedor actualizado correctamente.");
    await cargarDatosProveedores();
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
    inputEstadoProveedor.value = "true";
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
