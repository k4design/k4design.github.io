// JavaScript Snippet for Lofty.com - Lifestyle Section Interactivity

// Lifestyle card hover effects and animations
document.addEventListener('DOMContentLoaded', function() {
    const lifestyleCards = document.querySelectorAll('.lifestyle-card');
    
    lifestyleCards.forEach(card => {
        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-12px) scale(1.03)';
            this.style.boxShadow = '0 30px 80px rgba(0, 146, 255, 0.3)';
            
            // Add glow effect
            this.style.border = '1px solid rgba(0, 146, 255, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
            this.style.border = 'none';
        });
        
        // Parallax effect for images
        const image = card.querySelector('.lifestyle-image img');
        if (image) {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 15;
                const rotateY = (centerX - x) / 15;
                
                image.style.transform = `scale(1.1) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            card.addEventListener('mouseleave', function() {
                image.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)';
            });
        }
        
        // Click handler for lifestyle cards
        card.addEventListener('click', function() {
            const link = this.querySelector('.lifestyle-link');
            if (link) {
                // Add ripple effect
                createRippleEffect(this, e);
                
                // Navigate to lifestyle page
                setTimeout(() => {
                    window.location.href = link.href;
                }, 300);
            }
        });
    });
});

// Ripple effect function
function createRippleEffect(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Lifestyle button interactions
document.addEventListener('DOMContentLoaded', function() {
    const lifestyleButton = document.querySelector('.lifestyle-button');
    
    if (lifestyleButton) {
        lifestyleButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add button animation
            this.style.transform = 'translateY(-3px) scale(1.05)';
            setTimeout(() => {
                this.style.transform = 'translateY(-3px) scale(1)';
            }, 150);
            
            // Show lifestyle modal or navigate
            showLifestyleModal();
        });
    }
});

// Lifestyle Modal functionality
function showLifestyleModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'lifestyle-modal-overlay';
    modal.innerHTML = `
        <div class="lifestyle-modal">
            <div class="lifestyle-modal-header">
                <h3>Discover Your Perfect Lifestyle</h3>
                <button class="lifestyle-modal-close">&times;</button>
            </div>
            <div class="lifestyle-modal-content">
                <p>Let us help you find the perfect lifestyle property that matches your unique preferences and aspirations.</p>
                <div class="lifestyle-options">
                    <div class="lifestyle-option" data-lifestyle="waterfront">
                        <div class="option-icon">🏖️</div>
                        <h4>Waterfront Estates</h4>
                        <p>Oceanfront villas and lakeside compounds</p>
                    </div>
                    <div class="lifestyle-option" data-lifestyle="skyline">
                        <div class="option-icon">🏙️</div>
                        <h4>Skyline Living</h4>
                        <p>Iconic penthouses and designer high-rises</p>
                    </div>
                    <div class="lifestyle-option" data-lifestyle="alpine">
                        <div class="option-icon">🏔️</div>
                        <h4>Alpine Sanctuaries</h4>
                        <p>Ski-in chalets and mountain retreats</p>
                    </div>
                    <div class="lifestyle-option" data-lifestyle="equestrian">
                        <div class="option-icon">🐎</div>
                        <h4>Equestrian Estates</h4>
                        <p>Ranches and countryside properties</p>
                    </div>
                    <div class="lifestyle-option" data-lifestyle="resort">
                        <div class="option-icon">⛳</div>
                        <h4>Resort-Style Living</h4>
                        <p>Gated communities and golf estates</p>
                    </div>
                    <div class="lifestyle-option" data-lifestyle="aviation">
                        <div class="option-icon">✈️</div>
                        <h4>Private Aviation Estates</h4>
                        <p>Hangar homes and runway access</p>
                    </div>
                </div>
                <div class="lifestyle-form">
                    <h4>Get Personalized Recommendations</h4>
                    <form class="lifestyle-contact-form">
                        <input type="text" placeholder="Your name" required>
                        <input type="email" placeholder="Your email" required>
                        <input type="tel" placeholder="Phone number" required>
                        <select required>
                            <option value="">Select your preferred lifestyle</option>
                            <option value="waterfront">Waterfront Estates</option>
                            <option value="skyline">Skyline Living</option>
                            <option value="alpine">Alpine Sanctuaries</option>
                            <option value="equestrian">Equestrian Estates</option>
                            <option value="resort">Resort-Style Living</option>
                            <option value="aviation">Private Aviation Estates</option>
                        </select>
                        <textarea placeholder="Tell us about your ideal lifestyle..." rows="4"></textarea>
                        <button type="submit" class="lifestyle-submit-btn">Get Recommendations</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .lifestyle-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
            padding: 2rem;
        }
        
        .lifestyle-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid rgba(0, 146, 255, 0.3);
            box-shadow: 0 25px 60px rgba(0, 146, 255, 0.2);
        }
        
        .lifestyle-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .lifestyle-modal-header h3 {
            color: #ffffff;
            font-size: 1.8rem;
            font-weight: 300;
            background: linear-gradient(135deg, #0092ff 0%, #ffffff 50%, #0092ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .lifestyle-modal-close {
            background: none;
            border: none;
            color: #ffffff;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .lifestyle-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .lifestyle-option {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .lifestyle-option:hover {
            background: rgba(0, 146, 255, 0.1);
            border-color: rgba(0, 146, 255, 0.3);
            transform: translateY(-2px);
        }
        
        .option-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .lifestyle-option h4 {
            color: #ffffff;
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }
        
        .lifestyle-option p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
        }
        
        .lifestyle-form h4 {
            color: #ffffff;
            font-size: 1.2rem;
            margin-bottom: 1rem;
            text-align: center;
        }
        
        .lifestyle-contact-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .lifestyle-contact-form input,
        .lifestyle-contact-form select,
        .lifestyle-contact-form textarea {
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 1rem;
        }
        
        .lifestyle-contact-form input::placeholder,
        .lifestyle-contact-form textarea::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .lifestyle-submit-btn {
            padding: 15px 30px;
            background: linear-gradient(135deg, #0092ff 0%, #0056b3 100%);
            color: #000000;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .lifestyle-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 146, 255, 0.4);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.lifestyle-modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
        modalStyles.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            modalStyles.remove();
        }
    });
    
    // Lifestyle option selection
    const lifestyleOptions = modal.querySelectorAll('.lifestyle-option');
    lifestyleOptions.forEach(option => {
        option.addEventListener('click', function() {
            lifestyleOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            const lifestyleType = this.dataset.lifestyle;
            const select = modal.querySelector('select');
            select.value = lifestyleType;
        });
    });
    
    // Form submission
    const form = modal.querySelector('.lifestyle-contact-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Handle form submission here
        alert('Thank you for your interest! We\'ll be in touch soon with personalized recommendations.');
        modal.remove();
        modalStyles.remove();
    });
}

// Intersection Observer for animations
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe lifestyle cards
    const lifestyleCards = document.querySelectorAll('.lifestyle-card');
    lifestyleCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Observe CTA section
    const ctaSection = document.querySelector('.lifestyle-cta');
    if (ctaSection) {
        observer.observe(ctaSection);
    }
});

// Add CSS for animations
document.addEventListener('DOMContentLoaded', function() {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        .lifestyle-card {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .lifestyle-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .lifestyle-cta {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .lifestyle-cta.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(0, 146, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .lifestyle-option.selected {
            background: rgba(0, 146, 255, 0.2);
            border-color: rgba(0, 146, 255, 0.5);
        }
    `;
    document.head.appendChild(animationStyles);
});

// Parallax effect for hero section
function initParallaxHero() {
    const heroBackground = document.querySelector('.lifestyle-hero .hero-background img');
    const heroSection = document.querySelector('.lifestyle-hero');
    
    if (!heroBackground || !heroSection) return;

    // Disable parallax on mobile for better performance
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        return;
    }

    let ticking = false;

    function updateParallax() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const heroHeight = heroSection.offsetHeight;
        const heroTop = heroSection.getBoundingClientRect().top;
        const heroBottom = heroTop + heroHeight;

        // Only apply parallax when hero is in viewport
        if (heroBottom > 0 && heroTop < window.innerHeight) {
            // Calculate parallax offset (background moves slower than scroll)
            const parallaxSpeed = 0.5; // Adjust this value to control parallax intensity
            const offset = (scrollTop - heroTop) * parallaxSpeed;
            
            // Apply transform to background image
            heroBackground.style.transform = `translateY(${offset}px)`;
        } else {
            // Reset transform when out of viewport
            heroBackground.style.transform = 'translateY(0)';
        }
        
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Listen to scroll events
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateParallax();
        }, 100);
    }, { passive: true });
    
    // Initial call
    updateParallax();
}

// Initialize parallax when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initParallaxHero();
    });
} else {
    // DOM is already ready
    initParallaxHero();
}
