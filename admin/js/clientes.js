const formCliente = document.getElementById("formCliente");
const tablaClientes = document.getElementById("tablaClientes");
const buscadorClientes = document.getElementById("buscadorClientes");

const tituloFormularioCliente = document.getElementById("tituloFormularioCliente");
const btnGuardarCliente = document.getElementById("btnGuardarCliente");
const btnCancelarCliente = document.getElementById("btnCancelarCliente");

const inputNombreCliente = document.getElementById("nombreCliente");
const inputDocumentoCliente = document.getElementById("documentoCliente");
const inputTelefonoCliente = document.getElementById("telefonoCliente");
const inputTipoCliente = document.getElementById("tipoCliente");
const inputDireccionCliente = document.getElementById("direccionCliente");

let clientes = [];
let editandoCliente = false;
let idClienteEditando = null;

btnCancelarCliente.style.display = "none";

iniciarClientes();

async function iniciarClientes() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarClientesDesdeSQL();
    activarRealtimeClientes();
}

formCliente.addEventListener("submit", async function (e) {
    e.preventDefault();

    const cliente = {
        nombre_cliente: inputNombreCliente.value.trim() || "-",
        documento: inputDocumentoCliente.value.trim() || "-",
        telefono: inputTelefonoCliente.value.trim() || "-",
        tipo_cliente: inputTipoCliente.value || "-",
        direccion: inputDireccionCliente.value.trim() || "-"
    };

    if (editandoCliente) {
        await actualizarCliente(cliente);
    } else {
        await registrarCliente(cliente);
    }
});

buscadorClientes.addEventListener("input", mostrarClientes);

async function cargarClientesDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_clientes")
        .select("*")
        .order("nombre_cliente", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudo cargar clientes desde Supabase.");
        return;
    }

    clientes = (data || []).map(mapearCliente);
    mostrarClientes();
}

async function registrarCliente(cliente) {
    const { error } = await supabaseClient
        .from("sistema_clientes")
        .insert(cliente);

    if (error) {
        console.error(error);
        alert("No se pudo registrar el cliente.");
        return;
    }

    alert("Cliente registrado correctamente.");
    limpiarFormularioCliente();
    await cargarClientesDesdeSQL();
}

async function actualizarCliente(cliente) {
    const { error } = await supabaseClient
        .from("sistema_clientes")
        .update(cliente)
        .eq("id_cliente", idClienteEditando);

    if (error) {
        console.error(error);
        alert("No se pudo actualizar el cliente.");
        return;
    }

    alert("Cliente actualizado correctamente.");
    limpiarFormularioCliente();
    await cargarClientesDesdeSQL();
}

function mostrarClientes() {
    tablaClientes.innerHTML = "";

    const textoBusqueda = buscadorClientes.value.toLowerCase();

    const clientesFiltrados = clientes
        .filter(function (cliente) {
            const campos = [
                cliente.nombreCliente,
                cliente.documento,
                cliente.telefono,
                cliente.tipoCliente,
                cliente.direccion
            ].join(" ").toLowerCase();

            return campos.includes(textoBusqueda);
        })
        .sort(function (a, b) {
            return a.nombreCliente.localeCompare(b.nombreCliente);
        });

    if (clientesFiltrados.length === 0) {
        tablaClientes.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron clientes relacionados.</td>
            </tr>
        `;
        return;
    }

    clientesFiltrados.forEach(function (cliente) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${escaparHTML(cliente.nombreCliente)}</td>
            <td>${escaparHTML(cliente.documento)}</td>
            <td>${escaparHTML(cliente.telefono)}</td>
            <td>${escaparHTML(cliente.tipoCliente)}</td>
            <td>${escaparHTML(cliente.direccion || "")}</td>
            <td>
                <button class="boton-tabla editar" onclick="editarCliente(${cliente.idCliente})">
                    <i class="ri-edit-line"></i>
                    Editar
                </button>

                <button class="boton-tabla eliminar" onclick="eliminarCliente(${cliente.idCliente})">
                    <i class="ri-delete-bin-line"></i>
                    Eliminar
                </button>
            </td>
        `;

        tablaClientes.appendChild(fila);
    });
}

function editarCliente(idCliente) {
    const cliente = clientes.find(item => Number(item.idCliente) === Number(idCliente));

    if (!cliente) {
        alert("No se encontro el cliente seleccionado.");
        return;
    }

    inputNombreCliente.value = cliente.nombreCliente;
    inputDocumentoCliente.value = cliente.documento;
    inputTelefonoCliente.value = cliente.telefono;
    inputTipoCliente.value = cliente.tipoCliente;
    inputDireccionCliente.value = cliente.direccion || "";

    editandoCliente = true;
    idClienteEditando = Number(idCliente);

    tituloFormularioCliente.textContent = "Editar Cliente";
    btnGuardarCliente.innerHTML = '<i class="ri-save-line"></i> Actualizar Cliente';
    btnCancelarCliente.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarCliente(idCliente) {
    const confirmar = confirm("Estas seguro de eliminar este cliente?");

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("sistema_clientes")
        .delete()
        .eq("id_cliente", Number(idCliente));

    if (error) {
        console.error(error);
        alert("No se pudo eliminar el cliente. Si tiene ventas asociadas, se conserva para proteger el historial.");
        return;
    }

    alert("Cliente eliminado correctamente.");
    await cargarClientesDesdeSQL();
}

btnCancelarCliente.addEventListener("click", limpiarFormularioCliente);

function limpiarFormularioCliente() {
    formCliente.reset();
    editandoCliente = false;
    idClienteEditando = null;
    tituloFormularioCliente.textContent = "Nuevo Cliente";
    btnGuardarCliente.innerHTML = '<i class="ri-save-line"></i> Registrar Cliente';
    btnCancelarCliente.style.display = "none";
}

function activarRealtimeClientes() {
    supabaseClient
        .channel("sistema-clientes-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_clientes"
        }, cargarClientesDesdeSQL)
        .subscribe();
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
