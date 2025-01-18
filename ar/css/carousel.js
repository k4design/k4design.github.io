$(document).ready(function() {
    let currentIndex = 0;
    const $slides = $('.carousel-slide');
    const totalSlides = $slides.length;

    $('.next-btn').click(function() {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
    });

    $('.prev-btn').click(function() {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateCarousel();
    });

    function updateCarousel() {
        const offset = -currentIndex * 100;
        $('.carousel-track').css('transform', `translateX(${offset}%)`);
    }

    // Modal Functionality
    $('.carousel-slide').click(function() {
        const imgSrc = $(this).find('img').attr('src');
        $('#modalImg').attr('src', imgSrc);
        $('#carouselModal').fadeIn();
    });

    $('.close-modal').click(function() {
        $('#carouselModal').fadeOut();
    });

    $(window).click(function(event) {
        if ($(event.target).is('#carouselModal')) {
            $('#carouselModal').fadeOut();
        }
    });
});