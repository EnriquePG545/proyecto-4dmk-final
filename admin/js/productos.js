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

cargarProductosDesdeSQL();

/* ============================================================
   REGISTRAR / ACTUALIZAR PRODUCTO
   ============================================================ */

formProducto.addEventListener("submit", async function (e) {
    e.preventDefault();

    const producto = {
        ordenProduccion: inputOrden.value.trim() || "-",
        codigoDiseno: (inputCodigo.value.trim() || "-").toUpperCase(),
        stock: inputStock.value.trim() === "" ? 0 : Number(inputStock.value),
        nombreProducto: inputNombre.value.trim() || "-",
        precio: inputPrecio.value.trim() === "" ? 0 : Number(inputPrecio.value)
    };

    if (
        producto.stock < 0 ||
        producto.precio < 0
    ) {
        alert("El stock y el precio no pueden ser negativos.");
        return;
    }

    if (editando === true) {
        await actualizarProducto(producto);
    } else {
        await registrarProducto(producto);
    }
});

/* ============================================================
   BUSCADOR
   ============================================================ */

buscadorProductos.addEventListener("input", function () {
    mostrarProductos();
});

/* ============================================================
   CARGAR PRODUCTOS DESDE SQL SERVER
   ============================================================ */

async function cargarProductosDesdeSQL() {
    try {
        const respuesta = await fetch("/api/productos");
        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "Error al cargar productos.");
            return;
        }

        productos = datos.productos;

        mostrarProductos();

    } catch (error) {
        alert("No se pudo conectar con el servidor para cargar productos.");
        console.error(error);
    }
}

/* ============================================================
   REGISTRAR PRODUCTO EN SQL SERVER
   ============================================================ */

async function registrarProducto(producto) {
    try {
        const respuesta = await fetch("/api/productos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo registrar el producto.");
            return;
        }

        alert(datos.mensaje);

        limpiarFormulario();

        await cargarProductosDesdeSQL();

    } catch (error) {
        alert("Error al registrar producto en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   ACTUALIZAR PRODUCTO EN SQL SERVER
   ============================================================ */

async function actualizarProducto(producto) {
    try {
        const respuesta = await fetch(`/api/productos/${idProductoEditando}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo actualizar el producto.");
            return;
        }

        alert(datos.mensaje);

        limpiarFormulario();

        await cargarProductosDesdeSQL();

    } catch (error) {
        alert("Error al actualizar producto en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   MOSTRAR PRODUCTOS
   ============================================================ */

function mostrarProductos() {
    tablaProductos.innerHTML = "";

    const textoBusqueda = buscadorProductos.value.toLowerCase();

    const productosFiltrados = productos
        .filter(function (producto) {
            const orden = String(producto.ordenProduccion || "").toLowerCase();
            const codigo = String(producto.codigoDiseno || "").toLowerCase();
            const nombre = String(producto.nombreProducto || "").toLowerCase();

            return (
                orden.includes(textoBusqueda) ||
                codigo.includes(textoBusqueda) ||
                nombre.includes(textoBusqueda)
            );
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
            <td>${producto.ordenProduccion}</td>
            <td>${producto.codigoDiseno}</td>
            <td>${producto.stock}</td>
            <td>${producto.nombreProducto}</td>
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

/* ============================================================
   ORDENAMIENTO
   ============================================================ */

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

    return {
        letras: letras,
        numeros: numeros
    };
}

/* ============================================================
   EDITAR PRODUCTO
   ============================================================ */

function editarProducto(idProducto) {
    const idBuscado = Number(idProducto);

    const producto = productos.find(function (item) {
        return Number(item.idProducto) === idBuscado;
    });

    if (!producto) {
        alert("No se encontró el producto seleccionado.");
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

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ============================================================
   ELIMINAR PRODUCTO
   ============================================================ */

async function eliminarProducto(idProducto) {
    const idBuscado = Number(idProducto);

    const producto = productos.find(function (item) {
        return Number(item.idProducto) === idBuscado;
    });

    if (!producto) {
        alert("No se encontró el producto seleccionado.");
        return;
    }

    const confirmar = confirm("¿Estás seguro de eliminar este producto?");

    if (confirmar === false) {
        return;
    }

    try {
        const respuesta = await fetch(`/api/productos/${idBuscado}`, {
            method: "DELETE"
        });

        const datos = await respuesta.json();

        if (datos.ok === false) {
            alert(datos.mensaje || "No se pudo eliminar el producto.");
            return;
        }

        alert(datos.mensaje);

        await cargarProductosDesdeSQL();

    } catch (error) {
        alert("Error al eliminar producto en el servidor.");
        console.error(error);
    }
}

/* ============================================================
   LIMPIAR FORMULARIO
   ============================================================ */

btnCancelar.addEventListener("click", function () {
    limpiarFormulario();
});

function limpiarFormulario() {
    formProducto.reset();

    editando = false;
    idProductoEditando = null;

    tituloFormulario.textContent = "Nuevo Producto";
    btnGuardar.innerHTML = '<i class="ri-save-line"></i> Registrar Producto';
    btnCancelar.style.display = "none";
}