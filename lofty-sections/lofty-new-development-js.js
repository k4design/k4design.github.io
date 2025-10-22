// JavaScript Snippet for Lofty.com - New Development Section Interactivity

// Development card hover effects and animations
document.addEventListener('DOMContentLoaded', function() {
    const developmentCards = document.querySelectorAll('.development-card');
    
    developmentCards.forEach(card => {
        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) scale(1.02)';
            this.style.boxShadow = '0 30px 80px rgba(0, 146, 255, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
        });
        
        // Parallax effect for images
        const image = card.querySelector('.development-image img');
        if (image) {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                image.style.transform = `scale(1.1) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            card.addEventListener('mouseleave', function() {
                image.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)';
            });
        }
    });
});

// Smooth scroll for development actions
document.addEventListener('DOMContentLoaded', function() {
    const devButtons = document.querySelectorAll('.dev-btn');
    
    devButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// CTA button interactions
document.addEventListener('DOMContentLoaded', function() {
    const ctaButtons = document.querySelectorAll('.cta-btn');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.classList.contains('primary')) {
                // Handle VIP list signup
                e.preventDefault();
                showVIPModal();
            }
        });
    });
});

// VIP Modal functionality
function showVIPModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'vip-modal-overlay';
    modal.innerHTML = `
        <div class="vip-modal">
            <div class="vip-modal-header">
                <h3>Join Our VIP List</h3>
                <button class="vip-modal-close">&times;</button>
            </div>
            <div class="vip-modal-content">
                <p>Get exclusive access to pre-construction opportunities, early pricing, and priority selection.</p>
                <form class="vip-form">
                    <input type="email" placeholder="Your email address" required>
                    <input type="text" placeholder="Your name" required>
                    <input type="tel" placeholder="Phone number" required>
                    <select required>
                        <option value="">Select your investment range</option>
                        <option value="1-5m">$1M - $5M</option>
                        <option value="5-10m">$5M - $10M</option>
                        <option value="10-25m">$10M - $25M</option>
                        <option value="25m+">$25M+</option>
                    </select>
                    <button type="submit" class="vip-submit-btn">Join VIP List</button>
                </form>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .vip-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        }
        
        .vip-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(0, 146, 255, 0.3);
            box-shadow: 0 25px 60px rgba(0, 146, 255, 0.2);
        }
        
        .vip-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .vip-modal-header h3 {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: 300;
        }
        
        .vip-modal-close {
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
        }
        
        .vip-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 146, 255, 0.4);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.vip-modal-close');
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
        // Handle form submission here
        alert('Thank you for joining our VIP list! We\'ll be in touch soon.');
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
    
    // Observe development cards
    const developmentCards = document.querySelectorAll('.development-card');
    developmentCards.forEach(card => {
        observer.observe(card);
    });
    
    // Observe CTA section
    const ctaSection = document.querySelector('.development-cta');
    if (ctaSection) {
        observer.observe(ctaSection);
    }
});

// Add CSS for animations
document.addEventListener('DOMContentLoaded', function() {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        .development-card {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .development-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .development-cta {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .development-cta.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
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
