const tablaPelones = document.getElementById("tablaPelones");

const estadosPelon = ["casi nada", "poco", "normal", "mucho", "completo"];
let pelones = [];

iniciarPelones();

async function iniciarPelones() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarPelones();
    activarRealtimePelones();
}

async function cargarPelones() {
    const { data, error } = await supabaseClient
        .from("pelones")
        .select("*")
        .order("tipo_pelon", { ascending: true });

    if (error) {
        console.error(error);
        tablaPelones.innerHTML = `
            <tr>
                <td colspan="5">No se pudieron cargar los pelones.</td>
            </tr>
        `;
        alert("No se pudieron cargar los pelones.");
        return;
    }

    pelones = ordenarPelones(data || []);
    mostrarPelones();
}

function mostrarPelones() {
    if (pelones.length === 0) {
        tablaPelones.innerHTML = `
            <tr>
                <td colspan="5">No hay pelones registrados.</td>
            </tr>
        `;
        return;
    }

    tablaPelones.innerHTML = "";

    pelones.forEach(function (pelon) {
        const fila = document.createElement("tr");
        const estadoNormalizado = normalizarClasePelon(pelon.estado);

        fila.innerHTML = `
            <td><strong>${escaparHTML(pelon.tipo_pelon)}</strong></td>
            <td>
                <span class="estado-pelon estado-pelon-${estadoNormalizado}">
                    ${escaparHTML(pelon.estado)}
                </span>
            </td>
            <td>
                <select class="select-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}">
                    ${crearOpcionesEstado(pelon.estado)}
                </select>
            </td>
            <td>${formatearFechaPelon(pelon.updated_at)}</td>
            <td>
                <button type="button" class="boton-tabla editar" onclick="guardarEstadoPelon('${escaparAtributo(pelon.tipo_pelon)}')">
                    <i class="ri-save-line"></i>
                    Guardar
                </button>
            </td>
        `;

        tablaPelones.appendChild(fila);
    });
}

async function guardarEstadoPelon(tipoPelon) {
    const selector = document.querySelector(`.select-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);

    if (!selector) {
        alert("No se encontro el pelon seleccionado.");
        return;
    }

    const nuevoEstado = selector.value;

    const { error } = await supabaseClient
        .from("pelones")
        .update({ estado: nuevoEstado })
        .eq("tipo_pelon", tipoPelon);

    if (error) {
        console.error(error);
        alert("No se pudo actualizar el pelon.");
        return;
    }

    alert("Pelon actualizado correctamente.");
    await cargarPelones();
}

function activarRealtimePelones() {
    supabaseClient
        .channel("pelones-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pelones"
        }, async function () {
            await cargarPelones();
        })
        .subscribe();
}

function crearOpcionesEstado(estadoActual) {
    return estadosPelon.map(function (estado) {
        const selected = estado === estadoActual ? "selected" : "";
        return `<option value="${estado}" ${selected}>${estado}</option>`;
    }).join("");
}

function ordenarPelones(lista) {
    const orden = ["Pelon Desgarrable", "Pelon Direccional", "Pelon Galleta"];

    return lista.sort(function (a, b) {
        return orden.indexOf(a.tipo_pelon) - orden.indexOf(b.tipo_pelon);
    });
}

function normalizarClasePelon(estado) {
    return String(estado || "normal").replace(/\s+/g, "-");
}

function formatearFechaPelon(fecha) {
    if (!fecha) {
        return "-";
    }

    return new Date(fecha).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function escaparAtributo(valor) {
    return String(valor).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
