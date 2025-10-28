// JavaScript Snippet for Lofty.com - New Development Page Interactivity

// New Development page functionality
document.addEventListener('DOMContentLoaded', function() {
    initNewDevelopmentPage();
    initParallaxEffect();
});

// Parallax effect for hero background
function initParallaxEffect() {
    const heroImage = document.querySelector('.hero-background img');
    
    if (heroImage) {
        let ticking = false;
        
        function updateParallax() {
            const scrolled = window.pageYOffset;
            const parallax = heroImage;
            const speed = scrolled * 0.5; // Adjust speed here (0.5 = 50% of scroll speed)
            
            parallax.style.transform = `translate3d(0, ${speed}px, 0)`;
            ticking = false;
        }
        
        function requestTick() {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', requestTick);
        updateParallax(); // Initial call
    }
}

function initNewDevelopmentPage() {
    // Initialize project cards
    initProjectCards();
    
    // Initialize load more functionality
    initLoadMore();
    
    // Initialize CTA interactions
    initCTAInteractions();
    
    // Initialize animations
    initAnimations();
}

// Project card interactions
function initProjectCards() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-12px) scale(1.02)';
            this.style.boxShadow = '0 25px 80px rgba(0, 146, 255, 0.3)';
            this.style.borderColor = 'rgba(0, 146, 255, 0.5)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
            this.style.borderColor = 'rgba(0, 146, 255, 0.15)';
        });
        
        // Click handler for project cards
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on buttons
            if (e.target.classList.contains('project-btn')) {
                return;
            }
            
            const viewProjectBtn = this.querySelector('.project-btn.primary');
            if (viewProjectBtn) {
                // Add ripple effect
                createRippleEffect(this, e);
                
                // Navigate to project page
                setTimeout(() => {
                    window.location.href = viewProjectBtn.href;
                }, 300);
            }
        });
        
        // Project button interactions
        const viewBtn = card.querySelector('.project-btn.primary');
        const brochureBtn = card.querySelector('.project-btn.secondary');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Add click animation
                this.style.transform = 'translateY(-2px) scale(1.05)';
                setTimeout(() => {
                    this.style.transform = 'translateY(-2px) scale(1)';
                }, 150);
            });
        }
        
        if (brochureBtn) {
            brochureBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showBrochureModal(card);
            });
        }
    });
}

// Brochure modal
function showBrochureModal(projectCard) {
    const projectTitle = projectCard.querySelector('h3').textContent;
    const projectLocation = projectCard.querySelector('.project-location span').textContent;
    const projectPrice = projectCard.querySelector('.project-price').textContent;
    
    const modal = document.createElement('div');
    modal.className = 'brochure-modal-overlay';
    modal.innerHTML = `
        <div class="brochure-modal">
            <div class="brochure-header">
                <h3>Request Brochure</h3>
                <button class="brochure-close">&times;</button>
            </div>
            <div class="brochure-content">
                <div class="project-info">
                    <h4>${projectTitle}</h4>
                    <p>${projectLocation}</p>
                    <p class="project-price-modal">${projectPrice}</p>
                </div>
                <form class="brochure-form">
                    <div class="form-group">
                        <input type="text" placeholder="Your name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" placeholder="Your email" required>
                    </div>
                    <div class="form-group">
                        <input type="tel" placeholder="Phone number" required>
                    </div>
                    <div class="form-group">
                        <select required>
                            <option value="">Investment range</option>
                            <option value="under-5m">Under $5M</option>
                            <option value="5m-10m">$5M - $10M</option>
                            <option value="10m-25m">$10M - $25M</option>
                            <option value="over-25m">Over $25M</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <textarea placeholder="Tell us about your investment goals..." rows="4"></textarea>
                    </div>
                    <button type="submit" class="brochure-submit-btn">Request Brochure</button>
                </form>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .brochure-modal-overlay {
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
        
        .brochure-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            border: 1px solid rgba(0, 146, 255, 0.3);
            box-shadow: 0 25px 60px rgba(0, 146, 255, 0.2);
        }
        
        .brochure-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .brochure-header h3 {
            color: #ffffff;
            font-size: 1.8rem;
            font-weight: 300;
            background: linear-gradient(135deg, #0092ff 0%, #ffffff 50%, #0092ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .brochure-close {
            background: none;
            border: none;
            color: #ffffff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .project-info {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
        }
        
        .project-info h4 {
            color: #ffffff;
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            font-family: 'Playfair Display', serif;
        }
        
        .project-info p {
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }
        
        .project-price-modal {
            color: var(--accent-blue) !important;
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .brochure-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .brochure-form input,
        .brochure-form select,
        .brochure-form textarea {
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 1rem;
        }
        
        .brochure-form input::placeholder,
        .brochure-form textarea::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .brochure-submit-btn {
            padding: 15px 30px;
            background: linear-gradient(135deg, #0092ff 0%, #0056b3 100%);
            color: #000000;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        
        .brochure-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 146, 255, 0.4);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.brochure-close');
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
    
    // Form submission
    const form = modal.querySelector('.brochure-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Handle form submission here
        alert('Thank you for your interest! We\'ll send you the brochure shortly.');
        modal.remove();
        modalStyles.remove();
    });
}

// Project filtering functionality removed per user request

// Load more functionality
function initLoadMore() {
    const loadMoreBtn = document.getElementById('load-more-projects');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.addEventListener('click', function() {
        // Add loading state
        this.textContent = 'Loading...';
        this.disabled = true;
        
        // Simulate loading more projects
        setTimeout(() => {
            // This would typically load more projects via AJAX
            alert('Load more functionality would be implemented here. This would typically fetch additional projects from your backend API.');
            
            // Reset button
            this.textContent = 'Load More Projects';
            this.disabled = false;
        }, 1500);
    });
}

// CTA interactions
function initCTAInteractions() {
    const vipBtn = document.querySelector('.cta-btn.primary');
    const contactBtn = document.querySelector('.cta-btn.secondary');
    
    if (vipBtn) {
        vipBtn.addEventListener('click', function() {
            showVIPModal();
        });
    }
    
    if (contactBtn) {
        contactBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // This would typically open a contact form or phone dialer
            alert('Contact functionality would be implemented here.');
        });
    }
}

// VIP modal
function showVIPModal() {
    const modal = document.createElement('div');
    modal.className = 'vip-modal-overlay';
    modal.innerHTML = `
        <div class="vip-modal">
            <div class="vip-header">
                <h3>Join VIP List</h3>
                <button class="vip-close">&times;</button>
            </div>
            <div class="vip-content">
                <p>Get exclusive access to pre-construction opportunities, early pricing, and priority selection.</p>
                <form class="vip-form">
                    <div class="form-group">
                        <input type="text" placeholder="Your name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" placeholder="Your email" required>
                    </div>
                    <div class="form-group">
                        <input type="tel" placeholder="Phone number" required>
                    </div>
                    <div class="form-group">
                        <select required>
                            <option value="">Investment range</option>
                            <option value="under-5m">Under $5M</option>
                            <option value="5m-10m">$5M - $10M</option>
                            <option value="10m-25m">$10M - $25M</option>
                            <option value="over-25m">Over $25M</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <select required>
                            <option value="">Preferred locations</option>
                            <option value="manhattan">Manhattan</option>
                            <option value="beverly-hills">Beverly Hills</option>
                            <option value="monaco">Monaco</option>
                            <option value="london">London</option>
                            <option value="dubai">Dubai</option>
                        </select>
                    </div>
                    <button type="submit" class="vip-submit-btn">Join VIP List</button>
                </form>
            </div>
        </div>
    `;
    
    // Add modal styles (similar to brochure modal)
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .vip-modal-overlay {
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
        
        .vip-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            border: 1px solid rgba(0, 146, 255, 0.3);
            box-shadow: 0 25px 60px rgba(0, 146, 255, 0.2);
        }
        
        .vip-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .vip-header h3 {
            color: #ffffff;
            font-size: 1.8rem;
            font-weight: 300;
            background: linear-gradient(135deg, #0092ff 0%, #ffffff 50%, #0092ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .vip-close {
            background: none;
            border: none;
            color: #ffffff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .vip-content p {
            color: var(--text-secondary);
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .vip-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .vip-form input,
        .vip-form select {
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 1rem;
        }
        
        .vip-form input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .vip-submit-btn {
            padding: 15px 30px;
            background: linear-gradient(135deg, #0092ff 0%, #0056b3 100%);
            color: #000000;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        
        .vip-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 146, 255, 0.4);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.vip-close');
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
    
    // Form submission
    const form = modal.querySelector('.vip-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for joining our VIP list! You\'ll receive exclusive updates and early access to new developments.');
        modal.remove();
        modalStyles.remove();
    });
}

// Animations
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 100);
            }
        });
    }, observerOptions);
    
    // Observe project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        observer.observe(card);
    });
    
    // Observe CTA section
    const ctaSection = document.querySelector('.dev-cta-section');
    if (ctaSection) {
        observer.observe(ctaSection);
    }
}

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

// Add CSS for animations
document.addEventListener('DOMContentLoaded', function() {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        .project-card {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.6s ease;
        }
        
        .project-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .dev-cta-section {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.6s ease;
        }
        
        .dev-cta-section.animate-in {
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
    `;
    document.head.appendChild(animationStyles);
});
