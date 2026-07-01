if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/service-worker.js")
            .then(function (registration) {
                console.log("PWA activa:", registration.scope);
            })
            .catch(function (error) {
                console.log("Error registrando PWA:", error);
            });
    });
}

function detectarModoApp() {
    const esStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (esStandalone) {
        document.body.classList.add("app-instalada");
    }
}

detectarModoApp();