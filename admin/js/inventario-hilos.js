const formHilo = document.getElementById("formHilo");
const tablaHilos = document.getElementById("tablaHilos");
const buscadorHilos = document.getElementById("buscadorHilos");

const tituloFormularioHilo = document.getElementById("tituloFormularioHilo");
const btnGuardarHilo = document.getElementById("btnGuardarHilo");
const btnCancelarHilo = document.getElementById("btnCancelarHilo");

const inputCodigoHilo = document.getElementById("codigoHilo");
const inputNombreColor = document.getElementById("nombreColor");
const inputMarcaHilo = document.getElementById("marcaHilo");
const inputStockHilo = document.getElementById("stockHilo");

let hilos = [];
let editandoHilo = false;
let idHiloEditando = null;
let umbralStockHilos = 5;

btnCancelarHilo.style.display = "none";

iniciarInventarioHilos();

async function iniciarInventarioHilos() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarUmbralStockHilos();
    await cargarHilos();
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

formHilo.addEventListener("submit", async function (event) {
    event.preventDefault();

    const hilo = {
        codigo_hilo: inputCodigoHilo.value.trim().toUpperCase(),
        nombre_color: inputNombreColor.value.trim(),
        marca: inputMarcaHilo.value,
        stock: inputStockHilo.value.trim() === "" ? 0 : Number(inputStockHilo.value)
    };

    if (!hilo.codigo_hilo || !hilo.nombre_color) {
        alert("Completa el codigo del hilo y el nombre del color.");
        return;
    }

    if (!Number.isInteger(hilo.stock) || hilo.stock < 0) {
        alert("El stock debe ser un numero entero mayor o igual a cero.");
        return;
    }

    if (editandoHilo) {
        await actualizarHilo(hilo);
    } else {
        await registrarHilo(hilo);
    }
});

buscadorHilos.addEventListener("input", mostrarHilos);

btnCancelarHilo.addEventListener("click", limpiarFormularioHilo);

async function cargarHilos() {
    const { data, error } = await supabaseClient
        .from("inventario_hilos")
        .select("*")
        .order("codigo_hilo", { ascending: true });

    if (error) {
        console.error(error);
        tablaHilos.innerHTML = `
            <tr>
                <td colspan="6">No se pudo cargar el inventario de hilos.</td>
            </tr>
        `;
        alert("No se pudo cargar el inventario de hilos.");
        return;
    }

    hilos = data || [];
    mostrarHilos();
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

function mostrarHilos() {
    const textoBusqueda = buscadorHilos.value.trim().toLowerCase();

    const hilosFiltrados = hilos
        .filter(function (hilo) {
            const campos = [
                hilo.codigo_hilo,
                hilo.nombre_color,
                hilo.marca,
                hilo.stock
            ].join(" ").toLowerCase();

            return campos.includes(textoBusqueda);
        })
        .sort(function (a, b) {
            return String(a.codigo_hilo).localeCompare(String(b.codigo_hilo));
        });

    if (hilosFiltrados.length === 0) {
        tablaHilos.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron hilos relacionados.</td>
            </tr>
        `;
        return;
    }

    tablaHilos.innerHTML = "";

    hilosFiltrados.forEach(function (hilo) {
        const fila = document.createElement("tr");
        const stock = Number(hilo.stock || 0);
        const claseStock = stock <= umbralStockHilos ? "stock-hilo stock-hilo-bajo" : "stock-hilo";

        fila.innerHTML = `
            <td><strong>${escaparHTML(hilo.codigo_hilo)}</strong></td>
            <td>${escaparHTML(hilo.nombre_color)}</td>
            <td><span class="marca-hilo">${escaparHTML(hilo.marca)}</span></td>
            <td><span class="${claseStock}">${stock}</span></td>
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
        alert("No se pudo eliminar el hilo.");
        return;
    }

    alert("Hilo eliminado correctamente.");
    await cargarHilos();
}

function limpiarFormularioHilo() {
    formHilo.reset();
    inputMarcaHilo.value = "Lumina";

    editandoHilo = false;
    idHiloEditando = null;

    tituloFormularioHilo.textContent = "Nuevo Hilo";
    btnGuardarHilo.innerHTML = '<i class="ri-save-line"></i> Registrar Hilo';
    btnCancelarHilo.style.display = "none";
}

function activarRealtimeHilos() {
    supabaseClient
        .channel("inventario-hilos-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventario_hilos"
        }, async function () {
            await cargarHilos();
        })
        .subscribe();
}

function formatearFechaHilo(fecha) {
    if (!fecha) {
        return "-";
    }

    return new Date(fecha).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function obtenerMensajeErrorHilo(error, mensajeBase) {
    if (error && error.code === "23505") {
        return "Ya existe un hilo con ese codigo.";
    }

    return mensajeBase;
}
