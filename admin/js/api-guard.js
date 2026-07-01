(function () {
    const fetchOriginal = window.fetch.bind(window);
    const mensajeBackend = "Este modulo depende del backend interno de ventas. No se pudieron cargar datos ahora; intenta recargar en unos segundos.";

    window.fetch = async function (input, init) {
        const esApi = esPeticionApi(input);

        if (!esApi) {
            return fetchOriginal(input, init);
        }

        try {
            const respuesta = await fetchOriginal(input, init);
            const tipoContenido = respuesta.headers.get("content-type") || "";

            if (!respuesta.ok || !tipoContenido.includes("application/json")) {
                mostrarAvisoBackendAntiguo();
                return crearRespuestaControlada();
            }

            return respuesta;
        } catch (error) {
            mostrarAvisoBackendAntiguo();
            console.error("Backend interno no disponible:", error);
            return crearRespuestaControlada();
        }
    };

    function esPeticionApi(input) {
        try {
            const url = typeof input === "string"
                ? new URL(input, window.location.origin)
                : new URL(input.url, window.location.origin);

            return url.pathname.startsWith("/api/");
        } catch (error) {
            return false;
        }
    }

    function crearRespuestaControlada() {
        return new Response(JSON.stringify({
            ok: false,
            mensaje: mensajeBackend,
            backendNoDisponible: true
        }), {
            status: 503,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    function mostrarAvisoBackendAntiguo() {
        if (document.getElementById("avisoBackendAntiguo")) {
            return;
        }

        const aviso = document.createElement("div");
        aviso.id = "avisoBackendAntiguo";
        aviso.className = "aviso-backend";
        aviso.innerHTML = `
            <i class="ri-alert-line"></i>
            <div>
                <strong>Modulo temporalmente sin conexion</strong>
                <p>${mensajeBackend}</p>
            </div>
        `;

        const contenido = document.querySelector(".contenido");
        const barraSuperior = document.querySelector(".barra-superior");

        if (contenido && barraSuperior) {
            barraSuperior.insertAdjacentElement("afterend", aviso);
            return;
        }

        document.body.prepend(aviso);
    }
})();
