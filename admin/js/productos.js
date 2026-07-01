const formProducto = document.getElementById("formProducto");
const tablaProductos = document.getElementById("tablaProductos");
const buscadorProductos = document.getElementById("buscadorProductos");

const tituloFormulario = document.getElementById("tituloFormulario");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");

const inputOrden = document.getElementById("ordenProduccion");
const inputCodigo = document.getElementById("codigoDiseno");
const inputStock = document.getElementById("stockProducto");
const inputNombre = document.getElementById("nombreProducto");
const inputPrecio = document.getElementById("precioProducto");

let productos = [];
let editando = false;
let idProductoEditando = null;

btnCancelar.style.display = "none";

iniciarProductos();

async function iniciarProductos() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    await cargarProductosDesdeSQL();
    activarRealtimeProductos();
}

formProducto.addEventListener("submit", async function (e) {
    e.preventDefault();

    const producto = {
        orden_produccion: inputOrden.value.trim() || "-",
        codigo_diseno: (inputCodigo.value.trim() || "-").toUpperCase(),
        stock: inputStock.value.trim() === "" ? 0 : Number(inputStock.value),
        nombre_producto: inputNombre.value.trim() || "-",
        precio: inputPrecio.value.trim() === "" ? 0 : Number(inputPrecio.value)
    };

    if (producto.stock < 0 || producto.precio < 0) {
        alert("El stock y el precio no pueden ser negativos.");
        return;
    }

    if (editando) {
        await actualizarProducto(producto);
    } else {
        await registrarProducto(producto);
    }
});

buscadorProductos.addEventListener("input", mostrarProductos);

async function cargarProductosDesdeSQL() {
    const { data, error } = await supabaseClient
        .from("sistema_productos")
        .select("*")
        .order("codigo_diseno", { ascending: true });

    if (error) {
        console.error(error);
        alert("No se pudo cargar productos desde Supabase.");
        return;
    }

    productos = (data || []).map(mapearProducto);
    mostrarProductos();
}

async function registrarProducto(producto) {
    const { error } = await supabaseClient
        .from("sistema_productos")
        .insert(producto);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorProducto(error, "No se pudo registrar el producto."));
        return;
    }

    alert("Producto registrado correctamente.");
    limpiarFormulario();
    await cargarProductosDesdeSQL();
}

async function actualizarProducto(producto) {
    const { error } = await supabaseClient
        .from("sistema_productos")
        .update(producto)
        .eq("id_producto", idProductoEditando);

    if (error) {
        console.error(error);
        alert(obtenerMensajeErrorProducto(error, "No se pudo actualizar el producto."));
        return;
    }

    alert("Producto actualizado correctamente.");
    limpiarFormulario();
    await cargarProductosDesdeSQL();
}

function mostrarProductos() {
    tablaProductos.innerHTML = "";

    const textoBusqueda = buscadorProductos.value.toLowerCase();

    const productosFiltrados = productos
        .filter(function (producto) {
            const orden = String(producto.ordenProduccion || "").toLowerCase();
            const codigo = String(producto.codigoDiseno || "").toLowerCase();
            const nombre = String(producto.nombreProducto || "").toLowerCase();

            return orden.includes(textoBusqueda) || codigo.includes(textoBusqueda) || nombre.includes(textoBusqueda);
        })
        .sort(ordenarPorCodigoDiseno);

    if (productosFiltrados.length === 0) {
        tablaProductos.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron productos relacionados.</td>
            </tr>
        `;
        return;
    }

    productosFiltrados.forEach(function (producto) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${escaparHTML(producto.ordenProduccion)}</td>
            <td>${escaparHTML(producto.codigoDiseno)}</td>
            <td>${Number(producto.stock)}</td>
            <td>${escaparHTML(producto.nombreProducto)}</td>
            <td>S/ ${Number(producto.precio).toFixed(2)}</td>
            <td>
                <button type="button" class="boton-tabla editar" onclick="editarProducto(${Number(producto.idProducto)})">
                    <i class="ri-edit-line"></i>
                    Editar
                </button>

                <button type="button" class="boton-tabla eliminar" onclick="eliminarProducto(${Number(producto.idProducto)})">
                    <i class="ri-delete-bin-line"></i>
                    Eliminar
                </button>
            </td>
        `;

        tablaProductos.appendChild(fila);
    });
}

function ordenarPorCodigoDiseno(a, b) {
    const codigoA = separarCodigo(String(a.codigoDiseno || ""));
    const codigoB = separarCodigo(String(b.codigoDiseno || ""));
    const comparacionLetras = codigoA.letras.localeCompare(codigoB.letras);

    if (comparacionLetras !== 0) {
        return comparacionLetras;
    }

    const cantidadNumeros = Math.max(codigoA.numeros.length, codigoB.numeros.length);

    for (let i = 0; i < cantidadNumeros; i++) {
        const numeroA = codigoA.numeros[i] || 0;
        const numeroB = codigoB.numeros[i] || 0;

        if (numeroA !== numeroB) {
            return numeroB - numeroA;
        }
    }

    return String(a.codigoDiseno || "").localeCompare(String(b.codigoDiseno || ""));
}

function separarCodigo(codigo) {
    const letras = codigo.match(/[A-Z]+/g)?.join("") || "";
    const numeros = codigo.match(/\d+/g)?.map(Number) || [];

    return { letras, numeros };
}

function editarProducto(idProducto) {
    const idBuscado = Number(idProducto);
    const producto = productos.find(item => Number(item.idProducto) === idBuscado);

    if (!producto) {
        alert("No se encontro el producto seleccionado.");
        return;
    }

    inputOrden.value = producto.ordenProduccion;
    inputCodigo.value = producto.codigoDiseno;
    inputStock.value = producto.stock;
    inputNombre.value = producto.nombreProducto;
    inputPrecio.value = producto.precio;

    editando = true;
    idProductoEditando = idBuscado;

    tituloFormulario.textContent = "Editar Producto";
    btnGuardar.innerHTML = '<i class="ri-save-line"></i> Actualizar Producto';
    btnCancelar.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarProducto(idProducto) {
    const confirmar = confirm("Estas seguro de eliminar este producto?");

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("sistema_productos")
        .delete()
        .eq("id_producto", Number(idProducto));

    if (error) {
        console.error(error);
        alert("No se pudo eliminar el producto. Si tiene ventas asociadas, no se eliminara para proteger el historial.");
        return;
    }

    alert("Producto eliminado correctamente.");
    await cargarProductosDesdeSQL();
}

btnCancelar.addEventListener("click", limpiarFormulario);

function limpiarFormulario() {
    formProducto.reset();
    editando = false;
    idProductoEditando = null;
    tituloFormulario.textContent = "Nuevo Producto";
    btnGuardar.innerHTML = '<i class="ri-save-line"></i> Registrar Producto';
    btnCancelar.style.display = "none";
}

function activarRealtimeProductos() {
    supabaseClient
        .channel("sistema-productos-admin")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sistema_productos"
        }, cargarProductosDesdeSQL)
        .subscribe();
}

function mapearProducto(producto) {
    return {
        idProducto: producto.id_producto,
        ordenProduccion: producto.orden_produccion,
        codigoDiseno: producto.codigo_diseno,
        stock: producto.stock,
        nombreProducto: producto.nombre_producto,
        precio: producto.precio
    };
}

function obtenerMensajeErrorProducto(error, mensajeBase) {
    if (error && error.code === "23505") {
        return "Ya existe un producto con ese codigo de diseno.";
    }

    return mensajeBase;
}
