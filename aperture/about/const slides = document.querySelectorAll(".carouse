const slides = document.querySelectorAll(".carousel-slide");
const leftArrow = document.querySelectorAll(".left-arrow");
const rightArrow = document.querySelectorAll(".right-arrow");

let currentIndex = 0;

function updateCarousel() {
    slides.forEach((slide, index) => {
        slide.classList.toggle("active", index === currentIndex);
    });
    document.querySelector(".carousel-container").style.transform = `translateX(-${currentIndex * 100}%)`;
}

rightArrow.forEach((button) => {
    button.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateCarousel();
    });
});

leftArrow.forEach((button) => {
    button.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateCarousel();
    });
});

// Initialize carousel
updateCarousel();
