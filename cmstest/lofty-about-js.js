// JavaScript Snippet for Lofty.com - About Section Interactivity

// Optional: Add parallax effect for the globe
document.addEventListener('DOMContentLoaded', function() {
    const globe = document.querySelector('.earth-globe');
    if (!globe) return;

    let ticking = false;

    const updateGlobeParallax = () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.3; // Parallax speed (negative for slower movement)
        
        globe.style.transform = `translate(-50%, -50%) translateY(${rate}px)`;
        ticking = false;
    };

    const requestTick = () => {
        if (!ticking) {
            requestAnimationFrame(updateGlobeParallax);
            ticking = true;
        }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
});

// Optional: Add intersection observer for performance optimization
document.addEventListener('DOMContentLoaded', function() {
    const aboutSection = document.querySelector('.about');
    if (!aboutSection) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Section is visible, ensure animations are running
                entry.target.classList.add('in-view');
            } else {
                // Section is not visible, pause animations for performance
                entry.target.classList.remove('in-view');
            }
        });
    }, {
        threshold: 0.1
    });

    observer.observe(aboutSection);
});

// Optional: Add smooth scroll behavior for internal links
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Optional: Add feature card hover effects enhancement
document.addEventListener('DOMContentLoaded', function() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Optional: Add typing effect for the main heading
document.addEventListener('DOMContentLoaded', function() {
    const heading = document.querySelector('.about h2');
    if (!heading) return;
    
    const originalText = heading.textContent;
    heading.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < originalText.length) {
            heading.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    };
    
    // Start typing effect when section comes into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(typeWriter, 500);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(heading);
});
