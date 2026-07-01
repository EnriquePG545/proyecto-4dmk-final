let usuarioActual = null;
let perfilActual = null;

verificarSesionAntesDeCotizar();

async function verificarSesionAntesDeCotizar() {
    try {
        const { data } = await supabaseClient.auth.getSession();

        if (!data.session) {
            window.location.href = "login.html";
            return;
        }

        usuarioActual = data.session.user;

        const { data: perfil, error } = await supabaseClient
            .from("perfiles")
            .select("*")
            .eq("user_id", usuarioActual.id)
            .maybeSingle();

        if (error) {
            console.error("Error obteniendo perfil:", error);
            alert("No se pudo cargar tu perfil. Inicia sesión nuevamente.");
            await supabaseClient.auth.signOut();
            window.location.href = "login.html";
            return;
        }

        if (!perfil) {
            alert("Tu cuenta no tiene perfil registrado.");
            await supabaseClient.auth.signOut();
            window.location.href = "login.html";
            return;
        }

        perfilActual = perfil;

        mostrarDatosClienteEnCotizacion();

    } catch (error) {
        console.error("Error verificando sesión:", error);
        window.location.href = "login.html";
    }
}

function mostrarDatosClienteEnCotizacion() {
    const contenedor = document.getElementById("datosClienteCotizacion");

    if (!contenedor || !perfilActual) {
        return;
    }

    contenedor.innerHTML = `
        <div class="datos-cliente-cotizacion">
            <h3>Datos del cliente</h3>
            <p><strong>Nombre:</strong> ${perfilActual.nombre_completo}</p>
            <p><strong>Correo:</strong> ${perfilActual.correo}</p>
            <p><strong>Teléfono:</strong> ${perfilActual.telefono}</p>
        </div>
    `;

    rellenarDatosClienteAutomaticamente();
}

function rellenarDatosClienteAutomaticamente() {
    const inputNombre = document.getElementById("nombre");
    const inputTelefono = document.getElementById("telefono");

    if (inputNombre) {
        inputNombre.value = perfilActual.nombre_completo || "";
        inputNombre.readOnly = true;

        const grupoNombre = inputNombre.closest(".form-group");

        if (grupoNombre) {
            grupoNombre.style.display = "none";
        }
    }

    if (inputTelefono) {
        inputTelefono.value = perfilActual.telefono || "";
        inputTelefono.readOnly = true;

        const grupoTelefono = inputTelefono.closest(".form-group");

        if (grupoTelefono) {
            grupoTelefono.style.display = "none";
        }
    }
}

// =========================================================
// COTIZACIÓN 4DMK + SUPABASE + PDF + QR
// =========================================================

const form = document.getElementById("cotizacionForm");
const generarBtn = document.getElementById("generarBtn");
const cotizacionMensaje = document.getElementById("cotizacionMensaje");

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
        const datos = obtenerDatosFormulario();

        if (!validarDatos(datos)) {
            mostrarMensaje("Por favor, completa los campos obligatorios antes de generar el PDF.", "error");
            return;
        }

        bloquearBoton(true);
        mostrarMensaje("Generando código y registrando pedido en Supabase...", "info");

        datos.codigoPedido = generarCodigoPedido(datos.nombre);
        datos.qrContenido = generarContenidoQR(datos);

        const pedidoGuardado = await guardarCotizacionSupabase(datos);

        if (!pedidoGuardado) {
            bloquearBoton(false);
            return;
        }

        mostrarMensaje("Pedido registrado correctamente. Generando PDF...", "success");

        await generarPDF(datos);

        localStorage.setItem("ultimo_codigo_4dmk", datos.codigoPedido);

        alert("Tu PDF fue generado correctamente. Ahora presiona Aceptar para continuar y enviarlo a WhatsApp.");

        window.location.href = "enviar.html";

    } catch (error) {
        console.error("Error general:", error);
        mostrarMensaje(`Error inesperado: ${error.message}`, "error");
        bloquearBoton(false);
    }
});

function obtenerDatosFormulario() {
    const fechaInput = document.getElementById("fecha").value;

    return {
        nombre: document.getElementById("nombre").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        tipoCliente: document.getElementById("tipoCliente").value,
        tipoPrenda: document.getElementById("tipoPrenda").value.trim(),
        cantidad: document.getElementById("cantidad").value,
        tipoBordado: document.getElementById("tipoBordado").value.trim(),
        ubicacionBordado: document.getElementById("ubicacionBordado").value,
        colorPrenda: document.getElementById("colorPrenda").value.trim() || "No especificado",
        fechaSQL: fechaInput || null,
        fecha: formatearFecha(fechaInput),
        archivoReferencia: document.getElementById("archivoReferencia").value,
        descripcion: document.getElementById("descripcion").value.trim() || "No se agregó descripción del diseño.",
        observaciones: document.getElementById("observaciones").value.trim() || "Sin observaciones adicionales"
    };
}

function validarDatos(datos) {
    return (
        datos.nombre &&
        datos.telefono &&
        datos.tipoCliente &&
        datos.tipoPrenda &&
        datos.cantidad &&
        Number(datos.cantidad) > 0 &&
        datos.tipoBordado &&
        datos.ubicacionBordado
    );
}

async function guardarCotizacionSupabase(datos) {
    if (typeof supabaseClient === "undefined") {
        mostrarMensaje("No se encontró la conexión con Supabase. Revisa supabase-config.js.", "error");
        return null;
    }

    if (!usuarioActual || !perfilActual) {
        mostrarMensaje("Debes iniciar sesión antes de registrar una cotización.", "error");
        return null;
    }

    const { data, error } = await supabaseClient.rpc("registrar_cotizacion", {
        p_nombre: datos.nombre,
        p_telefono: datos.telefono,
        p_tipo_cliente: datos.tipoCliente,
        p_codigo_pedido: datos.codigoPedido,
        p_tipo_prenda: datos.tipoPrenda,
        p_cantidad: Number(datos.cantidad),
        p_tipo_bordado: datos.tipoBordado,
        p_ubicacion_bordado: datos.ubicacionBordado,
        p_color_prenda: datos.colorPrenda,
        p_fecha_aproximada: datos.fechaSQL,
        p_descripcion: datos.descripcion,
        p_observaciones: datos.observaciones,
        p_archivo_referencia: datos.archivoReferencia,
        p_qr_contenido: datos.qrContenido
    });

    if (error) {
        console.error("Error guardando en Supabase:", error);
        mostrarMensaje(`No se pudo guardar el pedido: ${error.message}`, "error");
        return null;
    }

    const { error: vincularError } = await supabaseClient.rpc("fn_vincular_pedido_usuario", {
        p_codigo_pedido: datos.codigoPedido
    });

    if (vincularError) {
        console.error("Error vinculando pedido al usuario:", vincularError);
        mostrarMensaje("El pedido fue guardado, pero no se pudo vincular a tu cuenta.", "error");
        return null;
    }

    console.log("Pedido guardado y vinculado:", data);
    return data;
}

function generarCodigoPedido(nombre) {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const hora = String(ahora.getHours()).padStart(2, "0");
    const minuto = String(ahora.getMinutes()).padStart(2, "0");
    const segundo = String(ahora.getSeconds()).padStart(2, "0");

    const iniciales = obtenerIniciales(nombre);
    const random = Math.floor(Math.random() * 900 + 100);

    return `4DMK-${anio}${mes}${dia}-${hora}${minuto}${segundo}-${iniciales}${random}`;
}

function obtenerIniciales(nombre) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function generarContenidoQR(datos) {
    return `4DMK - COTIZACION
Codigo: ${datos.codigoPedido}
Cliente: ${datos.nombre}
Telefono: ${datos.telefono}
Prenda: ${datos.tipoPrenda}
Cantidad: ${datos.cantidad}
Bordado: ${datos.tipoBordado}
Ubicacion: ${datos.ubicacionBordado}
Fecha: ${datos.fecha}
Estado: Pendiente`;
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "No especificado";
    }

    const partes = fecha.split("-");
    const anio = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${anio}`;
}

async function generarPDF(datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const fechaGeneracion = new Date().toLocaleDateString("es-PE", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    const qrDataUrl = await generarQRDataUrl(datos.qrContenido);

    const azulOscuro = [7, 11, 22];
    const dorado = [255, 209, 102];
    const grisTexto = [70, 70, 70];

    // Encabezado
    doc.setFillColor(...azulOscuro);
    doc.rect(0, 0, 210, 44, "F");

    doc.setTextColor(...dorado);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("4DMK", 15, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Bordados computarizados y prendas personalizadas", 15, 27);
    doc.text("Villa El Salvador, Lima - Perú | WhatsApp: +51 964 141 528", 15, 35);

    // Título
    doc.setTextColor(...azulOscuro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Solicitud de Cotización", 15, 56);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grisTexto);
    doc.text(`Fecha de generación: ${fechaGeneracion}`, 15, 63);

    // Código visible
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(15, 70, 180, 18, 3, 3, "F");

    doc.setTextColor(80, 60, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Código de solicitud:", 20, 81);

    doc.setTextColor(7, 11, 22);
    doc.setFontSize(12);
    doc.text(datos.codigoPedido, 68, 81);

    let y = 100;

    y = crearSeccion(doc, "Datos del cliente", y);
    y = agregarCampo(doc, "Nombre completo", datos.nombre, y);
    y = agregarCampo(doc, "Teléfono / WhatsApp", datos.telefono, y);
    y = agregarCampo(doc, "Tipo de cliente", datos.tipoCliente, y);

    y += 6;
    y = crearSeccion(doc, "Detalles del pedido", y);
    y = agregarCampo(doc, "Tipo de prenda", datos.tipoPrenda, y);
    y = agregarCampo(doc, "Cantidad aproximada", `${datos.cantidad} unidad(es)`, y);
    y = agregarCampo(doc, "Tipo de bordado", datos.tipoBordado, y);
    y = agregarCampo(doc, "Ubicación del bordado", datos.ubicacionBordado, y);
    y = agregarCampo(doc, "Color de prenda", datos.colorPrenda, y);
    y = agregarCampo(doc, "Fecha aproximada", datos.fecha, y);
    y = agregarCampo(doc, "Archivo de referencia", datos.archivoReferencia, y);

    if (y > 215) {
        doc.addPage();
        y = 20;
    }

    y += 6;
    y = crearSeccion(doc, "Descripción del diseño o pedido", y);
    y = agregarTextoLargo(doc, datos.descripcion, y);

    y += 6;
    y = crearSeccion(doc, "Observaciones adicionales", y);
    y = agregarTextoLargo(doc, datos.observaciones, y);

    if (y > 205) {
        doc.addPage();
        y = 25;
    }

    // QR
    y += 8;

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, y, 180, 48, 3, 3, "F");

    doc.setTextColor(7, 11, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("QR de información del pedido", 20, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text("Escanea este código para leer un resumen rápido de la solicitud.", 20, y + 17);

    if (qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", 155, y + 7, 30, 30);
    }

    y += 55;

    if (y > 235) {
        doc.addPage();
        y = 25;
    }

    // Nota final
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(15, y, 180, 31, 3, 3, "F");

    doc.setTextColor(80, 60, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Nota:", 20, y + 10);

    doc.setFont("helvetica", "normal");
    const nota = "Esta solicitud fue registrada en el sistema de 4DMK con estado Pendiente. Si cuentas con imagen, logo, Excel o PDF de referencia, adjúntalo por WhatsApp junto con este documento.";
    const notaLineas = doc.splitTextToSize(nota, 165);
    doc.text(notaLineas, 20, y + 17);

    // Footer
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(9);
    doc.text("Documento generado desde la página web informativa de 4DMK.", 15, 287);

    const nombreArchivo = limpiarNombreArchivo(`Cotizacion_${datos.codigoPedido}_${datos.nombre}.pdf`);
    doc.save(nombreArchivo);
}

async function generarQRDataUrl(texto) {
    try {
        if (typeof QRCode === "undefined") {
            console.error("La librería QRCode no cargó.");
            return null;
        }

        const qrDataUrl = await QRCode.toDataURL(texto, {
            width: 260,
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
                dark: "#000000",
                light: "#ffffff"
            }
        });

        return qrDataUrl;

    } catch (error) {
        console.error("Error generando QR:", error);
        return null;
    }
}

function crearSeccion(doc, titulo, y) {
    doc.setFillColor(7, 11, 22);
    doc.roundedRect(15, y, 180, 10, 2, 2, "F");

    doc.setTextColor(255, 209, 102);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(titulo, 20, y + 7);

    return y + 17;
}

function agregarCampo(doc, etiqueta, valor, y) {
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${etiqueta}:`, 20, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);

    const valorLineas = doc.splitTextToSize(String(valor), 105);
    doc.text(valorLineas, 75, y);

    return y + Math.max(8, valorLineas.length * 5);
}

function agregarTextoLargo(doc, texto, y) {
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lineas = doc.splitTextToSize(texto, 170);
    doc.text(lineas, 20, y);

    return y + lineas.length * 6;
}

function limpiarNombreArchivo(nombre) {
    return nombre
        .replace(/[áÁ]/g, "a")
        .replace(/[éÉ]/g, "e")
        .replace(/[íÍ]/g, "i")
        .replace(/[óÓ]/g, "o")
        .replace(/[úÚ]/g, "u")
        .replace(/[ñÑ]/g, "n")
        .replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function mostrarMensaje(texto, tipo) {
    cotizacionMensaje.textContent = texto;
    cotizacionMensaje.className = `login-mensaje ${tipo}`;
}

function bloquearBoton(bloquear) {
    generarBtn.disabled = bloquear;

    if (bloquear) {
        generarBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Procesando...
        `;
    } else {
        generarBtn.innerHTML = `
            <i class="fa-solid fa-file-pdf"></i>
            Generar PDF de cotización
        `;
    }
}