document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.carousel-vip .slide');
    const indicators = document.querySelectorAll('.carousel-vip .indicator');
    let current = 0;
    let intervalId;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.remove('active');
        indicators[i].classList.remove('active');
        if (i === index) {
          slide.classList.add('active');
          indicators[i].classList.add('active');
        }
      });
      current = index;
    }

    function nextSlide() {
      const next = (current + 1) % slides.length;
      showSlide(next);
    }

    function startAutoSlide() {
      intervalId = setInterval(nextSlide, 5000);
    }

    function resetAutoSlide() {
      clearInterval(intervalId);
      startAutoSlide();
    }

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        showSlide(index);
        resetAutoSlide();
      });
    });

    // Initialize carousel
    showSlide(current);
    startAutoSlide();
  });