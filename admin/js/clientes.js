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

cargarClientesDesdeSQL();

/* ============================================================
   REGISTRAR / ACTUALIZAR CLIENTE
   ============================================================ */

formCliente.addEventListener("submit", async function (e) {
    e.preventDefault();

    const cliente = {
        nombreCliente: inputNombreCliente.value.trim() || "-",
        documento: inputDocumentoCliente.value.trim() || "-",
        telefono: inputTelefonoCliente.value.trim() || "-",
        tipoCliente: inputTipoCliente.value || "-",
        direccion: inputDireccionCliente.value.trim() || "-"
    };

        if (editandoCliente === true) {
            await actualizarCliente(cliente);
        } else {
            await registrarCliente(cliente);
        }
    });

/* ============================================================
   BUSCADOR
   ============================================================ */

buscadorClientes.addEventListener("input", function () {
    mostrarClientes();
});

/* ============================================================
   CARGAR CLIENTES DESDE SQL SERVER
   ============================================================ */

async function cargarClientesDesdeSQL() {
    try {
        const respuesta = await fetch("/api/clientes");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar clientes.");
            return;
        }

        clientes = datos.clientes;

        mostrarClientes();

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar clientes.");
        console.error(error);
    }
}

/* ============================================================
   REGISTRAR CLIENTE EN SQL SERVER
   ============================================================ */

async function registrarCliente(cliente) {
    try {
        const respuesta = await fetch("/api/clientes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cliente)
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo registrar el cliente.");
            return;
        }

        alert(datos.mensaje);

        limpiarFormularioCliente();

        await cargarClientesDesdeSQL();

    } catch (error) {
        alert("Error al registrar cliente en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   ACTUALIZAR CLIENTE EN SQL SERVER
   ============================================================ */

async function actualizarCliente(cliente) {
    try {
        const respuesta = await fetch(`/api/clientes/${idClienteEditando}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cliente)
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo actualizar el cliente.");
            return;
        }

        alert(datos.mensaje);

        limpiarFormularioCliente();

        await cargarClientesDesdeSQL();

    } catch (error) {
        alert("Error al actualizar cliente en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   MOSTRAR CLIENTES
   ============================================================ */

function mostrarClientes() {
    tablaClientes.innerHTML = "";

    const textoBusqueda = buscadorClientes.value.toLowerCase();

    const clientesFiltrados = clientes
        .filter(function (cliente) {
            const nombre = cliente.nombreCliente.toLowerCase();
            const documento = cliente.documento.toLowerCase();
            const telefono = cliente.telefono.toLowerCase();
            const tipo = cliente.tipoCliente.toLowerCase();
            const direccion = (cliente.direccion || "").toLowerCase();

            return (
                nombre.includes(textoBusqueda) ||
                documento.includes(textoBusqueda) ||
                telefono.includes(textoBusqueda) ||
                tipo.includes(textoBusqueda) ||
                direccion.includes(textoBusqueda)
            );
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
            <td>${cliente.nombreCliente}</td>
            <td>${cliente.documento}</td>
            <td>${cliente.telefono}</td>
            <td>${cliente.tipoCliente}</td>
            <td>${cliente.direccion || ""}</td>
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

/* ============================================================
   EDITAR CLIENTE
   ============================================================ */

function editarCliente(idCliente) {
    const cliente = clientes.find(function (item) {
        return item.idCliente === idCliente;
    });

    if (!cliente) {
        alert("No se encontró el cliente seleccionado.");
        return;
    }

    inputNombreCliente.value = cliente.nombreCliente;
    inputDocumentoCliente.value = cliente.documento;
    inputTelefonoCliente.value = cliente.telefono;
    inputTipoCliente.value = cliente.tipoCliente;
    inputDireccionCliente.value = cliente.direccion || "";

    editandoCliente = true;
    idClienteEditando = idCliente;

    tituloFormularioCliente.textContent = "Editar Cliente";
    btnGuardarCliente.innerHTML = '<i class="ri-save-line"></i> Actualizar Cliente';
    btnCancelarCliente.style.display = "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ============================================================
   ELIMINAR CLIENTE
   ============================================================ */

async function eliminarCliente(idCliente) {
    const confirmar = confirm("¿Estás seguro de eliminar este cliente?");

    if (confirmar === false) {
        return;
    }

    try {
        const respuesta = await fetch(`/api/clientes/${idCliente}`, {
            method: "DELETE"
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo eliminar el cliente.");
            return;
        }

        alert(datos.mensaje);

        await cargarClientesDesdeSQL();

    } catch (error) {
        alert("Error al eliminar cliente en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   CANCELAR EDICIÓN
   ============================================================ */

btnCancelarCliente.addEventListener("click", function () {
    limpiarFormularioCliente();
});

function limpiarFormularioCliente() {
    formCliente.reset();

    editandoCliente = false;
    idClienteEditando = null;

    tituloFormularioCliente.textContent = "Nuevo Cliente";
    btnGuardarCliente.innerHTML = '<i class="ri-save-line"></i> Registrar Cliente';
    btnCancelarCliente.style.display = "none";
}