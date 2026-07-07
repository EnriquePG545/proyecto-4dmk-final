const contenedorPelones = document.getElementById("contenedorPelones");

let pelones = [];
let proveedoresPelones = [];
let canalPelones = null;

iniciarPelones();

async function iniciarPelones() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarProveedoresPelones();
    await cargarPelones();
    activarRealtimePelones();
}

async function cargarProveedoresPelones() {
    const { data, error } = await supabaseClient
        .from("proveedores")
        .select("*")
        .order("nombre_tienda", { ascending: true });

    if (error) {
        console.error(error);
        proveedoresPelones = [];
        alert("No se pudieron cargar proveedores para pelones. Verifica la migracion de Supabase.");
        return;
    }

    proveedoresPelones = data || [];
}

async function cargarPelones() {
    const { data, error } = await supabaseClient
        .from("pelones")
        .select(`
            *,
            proveedores (
                codigo_tienda,
                nombre_tienda
            )
        `)
        .order("tipo_pelon", { ascending: true });

    if (error) {
        console.error(error);
        contenedorPelones.innerHTML = '<div class="pelon-cargando">No se pudieron cargar los pelones.</div>';
        alert("No se pudieron cargar los pelones.");
        return;
    }

    pelones = ordenarPelones(data || []);
    mostrarPelones();
}

function mostrarPelones() {
    if (pelones.length === 0) {
        contenedorPelones.innerHTML = '<div class="pelon-cargando">No hay pelones registrados.</div>';
        return;
    }

    contenedorPelones.innerHTML = "";

    pelones.forEach(function (pelon) {
        const tarjeta = document.createElement("article");
        const porcentaje = normalizarPorcentajePelon(pelon.porcentaje);
        const estado = obtenerEstadoPorcentaje(porcentaje);
        const claseEstado = normalizarClasePelon(estado.valor);
        const color = obtenerColorPelon(porcentaje);
        const proveedor = pelon.proveedores?.nombre_tienda || obtenerNombreProveedorPelon(pelon.codigo_tienda) || "Sin proveedor";

        tarjeta.className = "pelon-card";
        tarjeta.innerHTML = `
            <div class="pelon-card-header">
                <div>
                    <h3>${escaparHTML(pelon.tipo_pelon)}</h3>
                    <p>${escaparHTML(proveedor)}</p>
                </div>
                <span class="estado-pelon estado-pelon-${claseEstado}">${estado.etiqueta}</span>
            </div>

            <div class="pelon-card-cuerpo">
                <div class="pelon-circular" style="--valor:${porcentaje}; --pelon-color:${color};">
                    <span>${porcentaje}%</span>
                </div>

                <div class="pelon-controles">
                    <label>Disponibilidad</label>
                    <input type="range" min="0" max="100" value="${porcentaje}" class="rango-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}">
                    <div class="pelon-rango-texto">
                        <span>0%</span>
                        <strong>${estado.etiqueta}</strong>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            <div class="pelon-detalles-grid">
                <div class="grupo-formulario">
                    <label>Proveedor</label>
                    <select class="select-proveedor-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}">
                        ${crearOpcionesProveedorPelon(pelon.codigo_tienda)}
                    </select>
                </div>

                <div class="grupo-formulario">
                    <label>Precio compra</label>
                    <input type="number" min="0" step="0.01" class="precio-compra-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}" value="${Number(pelon.precio_compra || 0).toFixed(2)}">
                </div>

                <div class="grupo-formulario">
                    <label>Fecha compra</label>
                    <input type="date" class="fecha-compra-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}" value="${pelon.fecha_compra || ""}">
                </div>

                <div class="grupo-formulario ancho-completo">
                    <label>Detalle</label>
                    <textarea rows="3" class="detalle-compra-pelon" data-tipo="${escaparHTML(pelon.tipo_pelon)}" placeholder="Nota de compra o revision">${escaparHTML(pelon.detalle_compra || "")}</textarea>
                </div>
            </div>

            <div class="pelon-footer">
                <span>Actualizado: ${formatearFechaPelon(pelon.updated_at)}</span>
                <button type="button" class="boton-guardar boton-pelon" onclick="guardarPelon('${escaparAtributo(pelon.tipo_pelon)}')">
                    <i class="ri-save-line"></i>
                    Guardar
                </button>
            </div>
        `;

        contenedorPelones.appendChild(tarjeta);
    });

    document.querySelectorAll(".rango-pelon").forEach(function (rango) {
        rango.addEventListener("input", actualizarVistaRangoPelon);
    });
}

function actualizarVistaRangoPelon(event) {
    const rango = event.target;
    const tarjeta = rango.closest(".pelon-card");
    const porcentaje = normalizarPorcentajePelon(rango.value);
    const estado = obtenerEstadoPorcentaje(porcentaje);
    const circular = tarjeta.querySelector(".pelon-circular");
    const etiqueta = tarjeta.querySelector(".estado-pelon");
    const textoCentral = circular.querySelector("span");
    const textoRango = tarjeta.querySelector(".pelon-rango-texto strong");

    circular.style.setProperty("--valor", porcentaje);
    circular.style.setProperty("--pelon-color", obtenerColorPelon(porcentaje));
    textoCentral.textContent = `${porcentaje}%`;
    textoRango.textContent = estado.etiqueta;
    etiqueta.className = `estado-pelon estado-pelon-${normalizarClasePelon(estado.valor)}`;
    etiqueta.textContent = estado.etiqueta;
}

async function guardarPelon(tipoPelon) {
    const rango = document.querySelector(`.rango-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);
    const proveedor = document.querySelector(`.select-proveedor-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);
    const precio = document.querySelector(`.precio-compra-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);
    const fecha = document.querySelector(`.fecha-compra-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);
    const detalle = document.querySelector(`.detalle-compra-pelon[data-tipo="${CSS.escape(tipoPelon)}"]`);

    if (!rango || !proveedor || !precio || !fecha || !detalle) {
        alert("No se encontro el pelon seleccionado.");
        return;
    }

    const porcentaje = normalizarPorcentajePelon(rango.value);
    const estado = obtenerEstadoPorcentaje(porcentaje);
    const precioCompra = Number(precio.value || 0);

    if (Number.isNaN(precioCompra) || precioCompra < 0) {
        alert("El precio de compra del pelon debe ser mayor o igual a cero.");
        return;
    }

    const { error } = await supabaseClient
        .from("pelones")
        .update({
            porcentaje,
            estado: estado.valor,
            codigo_tienda: proveedor.value || null,
            precio_compra: precioCompra,
            fecha_compra: fecha.value || null,
            detalle_compra: detalle.value.trim() || null
        })
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
    if (canalPelones) {
        return;
    }

    canalPelones = supabaseClient
        .channel("pelones-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "pelones"
        }, cargarPelones)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "proveedores"
        }, async function () {
            await cargarProveedoresPelones();
            await cargarPelones();
        })
        .subscribe();
}

function crearOpcionesProveedorPelon(codigoActual) {
    const opciones = ['<option value="">Sin proveedor asignado</option>'];

    proveedoresPelones.forEach(function (proveedor) {
        const selected = proveedor.codigo_tienda === codigoActual ? "selected" : "";
        const estado = proveedor.activo ? "" : " (inactivo)";
        opciones.push(`<option value="${escaparHTML(proveedor.codigo_tienda)}" ${selected}>${escaparHTML(proveedor.nombre_tienda)} - ${escaparHTML(proveedor.codigo_tienda)}${estado}</option>`);
    });

    return opciones.join("");
}

function ordenarPelones(lista) {
    const orden = ["Pelon Desgarrable", "Pelon Direccional", "Pelon Galleta"];

    return lista.sort(function (a, b) {
        return orden.indexOf(a.tipo_pelon) - orden.indexOf(b.tipo_pelon);
    });
}

function obtenerEstadoPorcentaje(porcentaje) {
    if (porcentaje <= 10) {
        return { valor: "casi nada", etiqueta: "Casi nada" };
    }

    if (porcentaje <= 35) {
        return { valor: "poco", etiqueta: "Poco" };
    }

    if (porcentaje <= 65) {
        return { valor: "normal", etiqueta: "Medio" };
    }

    if (porcentaje <= 85) {
        return { valor: "mucho", etiqueta: "Mucho" };
    }

    return { valor: "completo", etiqueta: "Lleno" };
}

function obtenerColorPelon(porcentaje) {
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

function normalizarPorcentajePelon(valor) {
    const numero = Math.round(Number(valor || 0));

    if (numero < 0) {
        return 0;
    }

    if (numero > 100) {
        return 100;
    }

    return numero;
}

function normalizarClasePelon(estado) {
    return String(estado || "normal").replace(/\s+/g, "-");
}

function obtenerNombreProveedorPelon(codigoTienda) {
    if (!codigoTienda) {
        return "";
    }

    const proveedor = proveedoresPelones.find(item => item.codigo_tienda === codigoTienda);
    return proveedor ? proveedor.nombre_tienda : codigoTienda;
}

function formatearFechaPelon(fecha) {
    if (!fecha) {
        return "-";
    }

    return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function escaparAtributo(valor) {
    return String(valor).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
