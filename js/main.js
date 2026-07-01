const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");

document.body.insertAdjacentHTML("afterbegin", `
    <div class="preloader">
        <div class="loader-content">
            <div class="loader-logo">4DMK</div>
            <p>CARGANDO EXPERIENCIA</p>
        </div>
    </div>

    <div class="scroll-progress"></div>
`);

window.addEventListener("load", () => {
    const preloader = document.querySelector(".preloader");

    if (!preloader) {
        return;
    }

    setTimeout(() => {
        preloader.classList.add("hide");
    }, 600);
});

if (menuBtn && navMenu) {
    menuBtn.addEventListener("click", () => {
        navMenu.classList.toggle("active");

        const icon = menuBtn.querySelector("i");

        if (!icon) {
            return;
        }

        if (navMenu.classList.contains("active")) {
            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");
        } else {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    });
}

const navLinks = document.querySelectorAll(".nav-menu a");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        if (!navMenu) {
            return;
        }

        navMenu.classList.remove("active");

        const icon = menuBtn?.querySelector("i");

        if (icon) {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    });
});

const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
    reveals.forEach(element => {
        const revealTop = element.getBoundingClientRect().top;
        const revealPoint = 120;

        if (revealTop < window.innerHeight - revealPoint) {
            element.classList.add("active");
        }
    });
}

window.addEventListener("scroll", revealOnScroll, { passive: true });
window.addEventListener("load", revealOnScroll);

const header = document.querySelector(".header");
const progressBar = document.querySelector(".scroll-progress");
const sections = document.querySelectorAll("section");

function updateHeaderAndProgress() {
    if (!header || !progressBar) {
        return;
    }

    if (window.scrollY > 80) {
        header.style.background = "rgba(2, 6, 23, 0.94)";
        header.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.38)";
        header.style.borderBottom = "1px solid rgba(247, 201, 72, 0.35)";
    } else {
        header.style.background = "rgba(7, 11, 22, 0.72)";
        header.style.boxShadow = "none";
        header.style.borderBottom = "1px solid rgba(247, 201, 72, 0.22)";
    }

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${scrollPercent}%`;

    let currentSection = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute("id") || "";
        }
    });

    if (currentSection === "servicios") {
        header.style.borderBottom = "1px solid rgba(255, 77, 109, 0.45)";
    } else if (currentSection === "galeria") {
        header.style.borderBottom = "1px solid rgba(0, 187, 249, 0.45)";
    } else if (currentSection === "contacto") {
        header.style.borderBottom = "1px solid rgba(37, 211, 102, 0.45)";
    }
}

window.addEventListener("scroll", updateHeaderAndProgress, { passive: true });
window.addEventListener("load", updateHeaderAndProgress);

const buttons = document.querySelectorAll(".btn, .whatsapp-float");

buttons.forEach(button => {
    button.addEventListener("click", function (event) {
        const ripple = document.createElement("span");
        ripple.classList.add("ripple-effect");

        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

const servicioCards = document.querySelectorAll(".servicio-card");

servicioCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.08}s`;
});

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");

    if (!question) {
        return;
    }

    question.addEventListener("click", () => {
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove("active");
            }
        });

        item.classList.toggle("active");
    });
});
