const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");

/* ============================= */
/* ELEMENTOS DINÁMICOS PREMIUM */
/* ============================= */

document.body.insertAdjacentHTML("afterbegin", `
    <div class="preloader">
        <div class="loader-content">
            <div class="loader-logo">4DMK</div>
            <p>CARGANDO EXPERIENCIA</p>
        </div>
    </div>

    <div class="scroll-progress"></div>
    <div class="particles"></div>
`);

/* PRELOADER */

window.addEventListener("load", () => {
    const preloader = document.querySelector(".preloader");

    setTimeout(() => {
        preloader.classList.add("hide");
    }, 850);
});

/* MENÚ RESPONSIVE */

menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("active");

    const icon = menuBtn.querySelector("i");

    if (navMenu.classList.contains("active")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-xmark");
    } else {
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
    }
});

const navLinks = document.querySelectorAll(".nav-menu a");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        navMenu.classList.remove("active");

        const icon = menuBtn.querySelector("i");
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
    });
});

/* ANIMACIÓN AL HACER SCROLL */

const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
    for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const revealTop = reveals[i].getBoundingClientRect().top;
        const revealPoint = 120;

        if (revealTop < windowHeight - revealPoint) {
            reveals[i].classList.add("active");
        }
    }
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

/* HEADER Y BARRA DE PROGRESO */

const header = document.querySelector(".header");
const progressBar = document.querySelector(".scroll-progress");

window.addEventListener("scroll", () => {
    if (window.scrollY > 80) {
        header.style.background = "rgba(2, 6, 23, 0.94)";
        header.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.38)";
        header.style.borderBottom = "1px solid rgba(247, 201, 72, 0.35)";
    } else {
        header.style.background = "rgba(7, 11, 22, 0.72)";
        header.style.boxShadow = "none";
        header.style.borderBottom = "1px solid rgba(247, 201, 72, 0.22)";
    }

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    progressBar.style.width = `${scrollPercent}%`;
});

/* EFECTO PARALLAX SUAVE EN HERO */

const heroCard = document.querySelector(".hero-card");

document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth / 2 - e.clientX) / 45;
    const y = (window.innerHeight / 2 - e.clientY) / 45;

    if (heroCard && window.innerWidth > 768) {
        heroCard.style.transform = `translate(${x}px, ${y}px)`;
    }
});

document.addEventListener("mouseleave", () => {
    if (heroCard) {
        heroCard.style.transform = "translate(0, 0)";
    }
});

/* PARTÍCULAS FLOTANTES */

const particlesContainer = document.querySelector(".particles");

function createParticles() {
    const totalParticles = 22;

    for (let i = 0; i < totalParticles; i++) {
        const particle = document.createElement("span");
        particle.classList.add("particle");

        const size = Math.random() * 5 + 3;
        const positionX = Math.random() * 100;
        const duration = Math.random() * 7 + 7;
        const delay = Math.random() * 8;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${positionX}%`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.opacity = Math.random() * 0.7 + 0.25;

        particlesContainer.appendChild(particle);
    }
}

createParticles();

/* EFECTO 3D EN TARJETAS */

const cards3D = document.querySelectorAll(".servicio-card, .timeline-item, .beneficios-grid div, .contacto-card");

cards3D.forEach(card => {
    const shine = document.createElement("span");
    shine.classList.add("shine");
    card.appendChild(shine);

    card.addEventListener("mousemove", (e) => {
        if (window.innerWidth <= 768) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateX = ((y / rect.height) - 0.5) * -10;
        const rotateY = ((x / rect.width) - 0.5) * 10;

        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        shine.style.setProperty("--x", `${x}px`);
        shine.style.setProperty("--y", `${y}px`);
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "";
    });
});

/* EFECTO CLICK EN BOTONES */

const buttons = document.querySelectorAll(".btn, .whatsapp-float");

buttons.forEach(button => {
    button.addEventListener("click", function(e) {
        const ripple = document.createElement("span");
        ripple.classList.add("ripple-effect");

        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

/* ========================================================= */
/* MÁS VIDA VISUAL RGB - 4DMK */
/* ========================================================= */

/* AURORA RGB */
document.body.insertAdjacentHTML("afterbegin", `
    <div class="rgb-ambiente">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
    </div>

    <div class="rgb-lines"></div>
`);

/* ONDA DECORATIVA EN HERO */
const heroSection = document.querySelector(".hero");

if (heroSection) {
    const wave = document.createElement("div");
    wave.classList.add("hero-wave");
    heroSection.appendChild(wave);
}

/* LÍNEAS RGB FLOTANTES */
const rgbLines = document.querySelector(".rgb-lines");

function createRgbLines() {
    const totalLines = 7;

    for (let i = 0; i < totalLines; i++) {
        const line = document.createElement("span");
        line.classList.add("rgb-line");

        line.style.left = `${Math.random() * 100}%`;
        line.style.animationDuration = `${Math.random() * 8 + 7}s`;
        line.style.animationDelay = `${Math.random() * 8}s`;
        line.style.height = `${Math.random() * 120 + 80}px`;
        line.style.opacity = Math.random() * 0.28 + 0.12;

        rgbLines.appendChild(line);
    }
}

createRgbLines();

/* CHISPAS AL MOVER EL MOUSE */
let lastSparkleTime = 0;

document.addEventListener("mousemove", (e) => {
    const now = Date.now();

    if (now - lastSparkleTime > 320 && window.innerWidth > 768) {
        const sparkle = document.createElement("span");
        sparkle.classList.add("sparkle");

        sparkle.style.left = `${e.clientX}px`;
        sparkle.style.top = `${e.clientY}px`;

        const colors = ["#ffd166", "#ff4d6d", "#00bbf9", "#25d366", "#8338ec"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        sparkle.style.background = color;
        sparkle.style.boxShadow = `
            0 0 8px ${color},
            0 0 18px ${color},
            0 0 28px ${color}
        `;

        document.body.appendChild(sparkle);

        setTimeout(() => {
            sparkle.remove();
        }, 900);

        lastSparkleTime = now;
    }
});

/* ENTRADA ESCALONADA MÁS BONITA EN SERVICIOS */
const servicioCards = document.querySelectorAll(".servicio-card");

servicioCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.08}s`;
});

/* EFECTO DE IMÁN EN BOTONES */
const magneticButtons = document.querySelectorAll(".btn");

magneticButtons.forEach(button => {
    button.addEventListener("mousemove", (e) => {
        if (window.innerWidth <= 768) return;

        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        button.style.transform = `translate(${x * 0.10}px, ${y * 0.18}px) scale(1.04)`;
    });

    button.addEventListener("mouseleave", () => {
        button.style.transform = "";
    });
});

/* GALERÍA CON MOVIMIENTO SEGÚN MOUSE */
const galleryItems = document.querySelectorAll(".galeria-item");

galleryItems.forEach(item => {
    item.addEventListener("mousemove", (e) => {
        if (window.innerWidth <= 768) return;

        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const moveX = ((x / rect.width) - 0.5) * 12;
        const moveY = ((y / rect.height) - 0.5) * 12;

        const img = item.querySelector("img");

        if (img) {
            img.style.transform = `scale(1.16) translate(${moveX}px, ${moveY}px)`;
        }
    });

    item.addEventListener("mouseleave", () => {
        const img = item.querySelector("img");

        if (img) {
            img.style.transform = "";
        }
    });
});

/* CAMBIO SUAVE DE COLOR EN EL HEADER SEGÚN SECCIÓN */
const sections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
    let currentSection = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute("id");
        }
    });

    if (currentSection === "servicios") {
        header.style.borderBottom = "1px solid rgba(255, 77, 109, 0.45)";
    } else if (currentSection === "galeria") {
        header.style.borderBottom = "1px solid rgba(0, 187, 249, 0.45)";
    } else if (currentSection === "contacto") {
        header.style.borderBottom = "1px solid rgba(37, 211, 102, 0.45)";
    }
});

/* ========================================================= */
/* PREGUNTAS FRECUENTES - ACORDEÓN */
/* ========================================================= */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove("active");
            }
        });

        item.classList.toggle("active");
    });
});