// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navMenu.contains(event.target) || navToggle.contains(event.target);
            if (!isClickInsideNav && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navHeight = document.querySelector('.nav').offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function updateActiveNavLink() {
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink();
    
    // Twinkling background particles
    initTwinkles();
    // Gold Confetti Particles Animation
    initParticles();
});

// Twinkling particles (small thin stars in hero background)
function initTwinkles() {
    const container = document.getElementById('heroTwinkles');
    if (!container) return;

    const count = 90;

    function createTwinkles() {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            const isLine = Math.random() < 0.35;
            el.className = 'twinkle-particle twinkle-particle--' + (isLine ? 'line' : 'dot');
            el.style.left = Math.random() * 100 + '%';
            el.style.top = Math.random() * 100 + '%';
            el.style.animationDuration = (1.8 + Math.random() * 2.2).toFixed(2) + 's';
            el.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
            container.appendChild(el);
        }
    }

    createTwinkles();
    window.addEventListener('resize', () => createTwinkles());
}

// Particle Animation System
function initParticles() {
    const particlesContainer = document.getElementById('heroParticles');
    if (!particlesContainer) return;
    
    const particleCount = 50;
    const particles = [];
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer, particles);
    }
    
    // Animate particles
    function animate() {
        particles.forEach(particle => {
            updateParticle(particle);
        });
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Respawn particles that have fallen off screen
    setInterval(() => {
        particles.forEach((particle, index) => {
            if (particle.y > window.innerHeight + 50) {
                resetParticle(particle);
            }
        });
    }, 1000);
}

function createParticle(container, particlesArray) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random particle type
    const types = ['square', 'rectangle', 'circle', 'star'];
    const type = types[Math.floor(Math.random() * types.length)];
    particle.classList.add(`particle-${type}`);
    
    // Initial position - spread across width, start above viewport
    particle.x = Math.random() * window.innerWidth;
    particle.y = -50 - Math.random() * 200;
    
    // Random properties
    particle.speed = 0.8 + Math.random() * 1.2;
    particle.rotation = Math.random() * 360;
    particle.rotationSpeed = (Math.random() - 0.5) * 5;
    particle.drift = (Math.random() - 0.5) * 0.8;
    particle.opacity = 0.7 + Math.random() * 0.3;
    particle.size = 0.9 + Math.random() * 0.5;
    
    // Apply initial transform
    updateParticleTransform(particle);
    particle.style.opacity = particle.opacity;
    
    container.appendChild(particle);
    particlesArray.push(particle);
}

function updateParticle(particle) {
    // Update position
    particle.y += particle.speed;
    particle.x += particle.drift;
    particle.rotation += particle.rotationSpeed;
    
    // Wrap around horizontally
    if (particle.x > window.innerWidth + 20) {
        particle.x = -20;
    } else if (particle.x < -20) {
        particle.x = window.innerWidth + 20;
    }
    
    // Update transform
    updateParticleTransform(particle);
    
    // Fade in/out at edges
    const fadeDistance = 100;
    if (particle.y < fadeDistance) {
        particle.style.opacity = (particle.y / fadeDistance) * particle.opacity;
    } else if (particle.y > window.innerHeight - fadeDistance) {
        particle.style.opacity = ((window.innerHeight - particle.y) / fadeDistance) * particle.opacity;
    } else {
        particle.style.opacity = particle.opacity;
    }
}

function updateParticleTransform(particle) {
    particle.style.transform = `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg) scale(${particle.size})`;
}

function resetParticle(particle) {
    particle.x = Math.random() * window.innerWidth;
    particle.y = -50 - Math.random() * 200;
    particle.speed = 0.8 + Math.random() * 1.2;
    particle.rotation = Math.random() * 360;
    particle.rotationSpeed = (Math.random() - 0.5) * 5;
    particle.drift = (Math.random() - 0.5) * 0.8;
    particle.opacity = 0.7 + Math.random() * 0.3;
    particle.size = 0.9 + Math.random() * 0.5;
    particle.style.opacity = particle.opacity;
    updateParticleTransform(particle);
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            if (particle.x > window.innerWidth) {
                particle.x = Math.random() * window.innerWidth;
            }
        });
    }, 250);
});
