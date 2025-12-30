// JavaScript Snippet for Lofty.com - Popular Searches Section

document.addEventListener('DOMContentLoaded', function() {
    initPopularSearchesAnimations();
});

// Initialize animations for popular searches section
function initPopularSearchesAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe the content container
    const content = document.querySelector('.popular-searches-content');
    if (content) {
        observer.observe(content);
    }
}








