// JavaScript Snippet for Lofty.com - EliteView Media Page Interactivity

// EliteView Media page functionality
document.addEventListener('DOMContentLoaded', function() {
    initEliteViewMediaPage();
});

function initEliteViewMediaPage() {
    // Initialize form handling
    initFormHandling();
    
    // Initialize FAQ functionality
    initFAQ();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Initialize analytics tracking
    initAnalytics();
}

// Form handling
function initFormHandling() {
    const consultationForm = document.getElementById('consultation-form');
    if (!consultationForm) return;
    
    consultationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Log to console (in production, this would be sent to backend)
        console.log('Form submission:', data);
        
        // Show success message
        alert('Thank you! We\'ll contact you within 24 hours to schedule your private consultation.');
        
        // Track form submission
        trackEvent('Form Submit', {
            formType: 'consultation_request',
            markets: data.markets,
            budget: data.budget
        });
        
        // Reset form
        this.reset();
    });
}

// Success message (using simple alert)
function showSuccessMessage(message) {
    alert(message);
}

// FAQ functionality
function initFAQ() {
    // Make toggleFAQ globally available
    window.toggleFAQ = function(element) {
        const faqItem = element.parentElement;
        const answer = faqItem.querySelector('.faq-answer');
        
        // Close all other FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) {
                item.classList.remove('active');
                item.querySelector('.faq-answer').classList.remove('active');
            }
        });
        
        // Toggle current item
        faqItem.classList.toggle('active');
        answer.classList.toggle('active');
        
        // Track FAQ interaction
        trackEvent('FAQ Open', {
            question: element.textContent.trim()
        });
    };
}

// Scroll animations
function initScrollAnimations() {
    function handleScrollAnimations() {
        const elements = document.querySelectorAll('.fade-in');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    }
    
    // Event listeners
    window.addEventListener('scroll', handleScrollAnimations);
    window.addEventListener('load', handleScrollAnimations);
    
    // Initial check
    handleScrollAnimations();
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Analytics tracking
function initAnalytics() {
    // Track CTA clicks
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            trackEvent('CTA Click', {
                buttonText: this.textContent.trim(),
                section: this.closest('section').id || 'hero'
            });
        });
    });
    
    // Track stat card interactions
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function() {
            const statNumber = this.querySelector('.stat-number').textContent;
            const statLabel = this.querySelector('.stat-label').textContent;
            
            trackEvent('Stat Card Click', {
                statNumber: statNumber,
                statLabel: statLabel
            });
        });
    });
    
    // Track result card interactions
    document.querySelectorAll('.result-card').forEach(card => {
        card.addEventListener('click', function() {
            const metric = this.querySelector('.result-metric')?.textContent;
            const description = this.querySelector('.result-description')?.textContent;
            
            trackEvent('Result Card Click', {
                metric: metric,
                description: description
            });
        });
    });
    
    // Track badge interactions
    document.querySelectorAll('.badge').forEach(badge => {
        badge.addEventListener('click', function() {
            trackEvent('Badge Click', {
                badgeText: this.textContent.trim()
            });
        });
    });
}

// Analytics event tracking
function trackEvent(eventName, properties = {}) {
    console.log('Analytics Event:', eventName, properties);
    
    // In production, this would send to your analytics platform
    // Example: gtag('event', eventName, properties);
    // Example: analytics.track(eventName, properties);
}

// Enhanced form validation
function initFormValidation() {
    const form = document.getElementById('consultation-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = `${fieldName} is required`;
    }
    
    // Email validation
    if (fieldName === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    
    // Phone validation
    if (fieldName === 'phone' && value) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ff6b6b';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#ff6b6b';
}

function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '';
}

// Initialize form validation
document.addEventListener('DOMContentLoaded', function() {
    initFormValidation();
});

// Enhanced scroll animations with intersection observer
function initAdvancedScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 100); // Stagger animation
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        observer.observe(element);
    });
}

// Initialize advanced scroll animations
document.addEventListener('DOMContentLoaded', function() {
    initAdvancedScrollAnimations();
});

// Add CSS for animations and form validation
document.addEventListener('DOMContentLoaded', function() {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        .fade-in {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.6s ease;
        }
        
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .field-error {
            color: #ff6b6b;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        
        .stat-card,
        .result-card {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover,
        .result-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-blue);
            box-shadow: var(--shadow-soft);
        }
        
        .badge {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .badge:hover {
            background: rgba(0, 146, 255, 0.2);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(animationStyles);
});
