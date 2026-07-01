const formCalcupelones = document.getElementById("formCalcupelones");
const inputNumeroPrendas = document.getElementById("numeroPrendas");
const tablaCalcupelones = document.getElementById("tablaCalcupelones");

const precioPelon = 190;
const basePelon = 10000;

const bastidores = [
    { nombre: "C1", numerador: 12, denominador: 13 },
    { nombre: "C2", numerador: 8, denominador: 17 },
    { nombre: "C3", numerador: 6, denominador: 19.5 },
    { nombre: "C4", numerador: 4, denominador: 24 },
    { nombre: "CUADRADO", numerador: 3, denominador: 37 },
    { nombre: "GRANDE", numerador: 2, denominador: 47 }
];

iniciarCalcupelones();

async function iniciarCalcupelones() {
    const usuario = await verificarAdminSupabase();

    if (!usuario) {
        return;
    }

    renderizarTablaCalcupelones(0);
}

formCalcupelones.addEventListener("submit", function (event) {
    event.preventDefault();

    const numeroPrendas = Number(inputNumeroPrendas.value);

    if (!Number.isFinite(numeroPrendas) || numeroPrendas < 0) {
        alert("Ingresa un numero de prendas valido.");
        inputNumeroPrendas.focus();
        return;
    }

    renderizarTablaCalcupelones(Math.floor(numeroPrendas));
});

inputNumeroPrendas.addEventListener("input", function () {
    if (inputNumeroPrendas.value === "") {
        renderizarTablaCalcupelones(0);
    }
});

function renderizarTablaCalcupelones(numeroPrendas) {
    tablaCalcupelones.innerHTML = "";

    bastidores.forEach(function (bastidor) {
        const pelonExacto = calcularPelonExacto(bastidor);
        const pelonMostrado = Math.floor(pelonExacto);
        const precioUnitario = precioPelon / pelonExacto;
        const precioPrendas = precioUnitario * numeroPrendas;

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>
                <strong class="calcupelones-bastidor">${bastidor.nombre}</strong>
            </td>
            <td>
                <span class="calcupelones-pelon">${formatearEntero(pelonMostrado)}</span>
            </td>
            <td>
                <span class="calcupelones-precio">S/ ${formatearPrecio(precioPrendas)}</span>
            </td>
        `;

        tablaCalcupelones.appendChild(fila);
    });
}

function calcularPelonExacto(bastidor) {
    return basePelon * (bastidor.numerador / bastidor.denominador);
}

function formatearEntero(valor) {
    return Number(valor).toLocaleString("es-PE", {
        maximumFractionDigits: 0
    });
}

function formatearPrecio(valor) {
    return Number(valor).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
