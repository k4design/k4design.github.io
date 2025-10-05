// ===== DATA STRUCTURE (SWAPPABLE) =====
const eventData = {
    event: {
        name: "Ascend Agent Expo",
        dates: "March 15-17, 2025",
        location: "Miami Beach Convention Center",
        tagline: "Elevate Your Real Estate Career to New Heights",
        earlyBirdDeadline: "2024-10-15T09:00:00-04:00"
    },
    
    sponsors: [
        {
            name: "Adobe",
            logo: "img/sponsors/sponsor-01.png",
            link: "https://adobe.com"
        },
        {
            name: "Microsoft",
            logo: "img/sponsors/sponsor-02.png",
            link: "https://microsoft.com"
        },
        {
            name: "Google",
            logo: "img/sponsors/sponsor-03.png",
            link: "https://google.com"
        },
        {
            name: "Amazon",
            logo: "img/sponsors/sponsor-04.png",
            link: "https://amazon.com"
        },
        {
            name: "Apple",
            logo: "img/sponsors/sponsor-05.png",
            link: "https://apple.com"
        },
        {
            name: "Netflix",
            logo: "img/sponsors/sponsor-06.png",
            link: "https://netflix.com"
        },
        {
            name: "Spotify",
            logo: "img/sponsors/sponsor-07.png",
            link: "https://spotify.com"
        },
        {
            name: "Tesla",
            logo: "img/sponsors/sponsor-08.png",
            link: "https://tesla.com"
        },
        {
            name: "Uber",
            logo: "img/sponsors/sponsor-01.png",
            link: "https://uber.com"
        },
        {
            name: "Airbnb",
            logo: "img/sponsors/sponsor-02.png",
            link: "https://airbnb.com"
        }
    ],
    
    pillars: [
        {
            title: "Network & Connect",
            description: "Build meaningful relationships with industry leaders, top-performing agents, and innovative service providers. Our curated networking sessions and exclusive meetups create opportunities for lasting professional connections.",
            icon: "🤝"
        },
        {
            title: "Learn & Grow",
            description: "Access cutting-edge strategies, market insights, and proven systems from the industry's most successful professionals. Interactive workshops and keynote sessions deliver actionable knowledge you can implement immediately.",
            icon: "📈"
        },
        {
            title: "Accelerate Success",
            description: "Discover the tools, technologies, and tactics that will propel your career forward. From lead generation to closing techniques, gain the competitive edge needed to dominate your market.",
            icon: "🚀"
        }
    ],
    
    tickets: [
        {
            tier: "Free Registration",
            price: "FREE",
            perks: [
                "3-day conference access",
                "Welcome reception",
                "Networking lunch",
                "Digital resource library",
                "Conference mobile app",
                "Certificate of completion",
                "Access to all sessions",
                "Networking opportunities",
                "Swag bag"
            ],
            countdown: false,
            available: true,
            featured: true
        }
    ],
    
    venue: {
        name: "Orlando Marriott World Center - Cypress Ballroom 2",
        address: "8701 World Center Dr, Orlando, FL 32821",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3510.4!2d-81.50928669917572!3d28.360979974698278!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd7b8c8c8c8c8d%3A0x8c8c8c8c8c8c8c8d!2sOrlando+Marriott+World+Center!5e0!3m2!1sen!2sus!4v1234567890",
        travelTips: "Orlando International Airport (MCO) is 20 minutes away. Uber, Lyft, and taxi services are readily available. The hotel offers complimentary airport shuttle service.",
        hotels: [
            {
                name: "Orlando Marriott World Center",
                link: "https://marriott.com/hotels/travel/mcowc-orlando-marriott-world-center"
            }
        ]
    },
    
    presentingSponsors: [
        {
            name: "LPT Realty",
            logo: "img/lptrealty_logo_horizontal_BFL.png",
            description: "Leading the future of real estate with innovative solutions and comprehensive support for agents nationwide.",
            link: "https://lptrealty.com",
            mediaUrl: null
        },
        {
            name: "Aperture Global Real Estate",
            logo: "img/apertureglobal_logo-white.png",
            description: "Expanding real estate opportunities globally with cutting-edge technology and world-class service.",
            link: "https://apertureglobal.com",
            mediaUrl: null
        },
        {
            name: "Team Growth Plus",
            logo: "https://via.placeholder.com/300x150/f093fb/ffffff?text=Team+Growth+Plus",
            description: "Empowering real estate teams with growth strategies, training programs, and business development tools.",
            link: "https://teamgrowthplus.com",
            mediaUrl: null
        },
        {
            name: "Zillow Showcase",
            logo: "https://via.placeholder.com/300x150/4facfe/ffffff?text=Zillow+Showcase",
            description: "Showcasing properties with innovative marketing tools and technology that drives results.",
            link: "https://zillow.com",
            mediaUrl: null
        }
    ],
    
    faq: [
        {
            question: "What is included in my ticket?",
            answer: "Your ticket includes access to all conference sessions, networking events, welcome reception, lunch, digital resources, mobile app, and certificate of completion. VIP tickets include additional perks like premium seating and exclusive meet & greets."
        },
        {
            question: "What is your refund policy?",
            answer: "Full refunds are available up to 30 days before the event. Between 30-14 days, a 50% refund applies. No refunds within 14 days of the event, but tickets can be transferred to another person."
        },
        {
            question: "Is the venue accessible?",
            answer: "Yes, the Miami Beach Convention Center is fully ADA compliant with wheelchair accessibility, accessible parking, restrooms, and seating areas. Please contact us if you have specific accessibility needs."
        },
        {
            question: "Will sessions be recorded?",
            answer: "Select keynote sessions will be recorded and made available to ticket holders within 48 hours after the event. Workshop sessions are not recorded to encourage active participation."
        },
        {
            question: "What should I bring?",
            answer: "Bring business cards for networking, a notebook or device for taking notes, comfortable shoes for walking, and professional attire. All materials and resources will be provided digitally."
        },
        {
            question: "Can I upgrade my ticket?",
            answer: "Yes, you can upgrade your ticket at any time before the event by paying the difference. Contact our support team for assistance with upgrades."
        },
        {
            question: "What is the code of conduct?",
            answer: "We maintain a professional, inclusive environment. Harassment, discrimination, or disruptive behavior will not be tolerated. All attendees must treat others with respect and professionalism."
        },
        {
            question: "Are meals provided?",
            answer: "Yes, we provide a welcome reception, networking lunch, and coffee breaks throughout the event. Special dietary requirements can be accommodated with advance notice."
        }
    ]
};

// ===== DOM ELEMENTS =====
const nav = document.getElementById('nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

// ===== NAVIGATION FUNCTIONALITY =====
function initNavigation() {
    let lastScrollTop = 0;
    
    // Scroll effect for navigation
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add scrolled class for styling
        if (scrollTop > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
            nav.classList.remove('nav-hidden');
        }
        
        // Hide/show navigation based on scroll direction
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down - hide nav
            nav.classList.add('nav-hidden');
        } else if (scrollTop < lastScrollTop) {
            // Scrolling up - show nav
            nav.classList.remove('nav-hidden');
        }
        
        // Hero background zoom effect (throttled for smoothness)
        requestAnimationFrame(() => {
            const heroBackground = document.querySelector('.hero-background');
            if (heroBackground) {
                // Smooth zoom calculation based on scroll position
                const heroHeight = document.querySelector('.hero').offsetHeight;
                const scrollProgress = Math.min(scrollTop / heroHeight, 1);
                const zoomFactor = 1 + (scrollProgress * 0.8); // 80% max zoom
                heroBackground.style.transform = `scale(${zoomFactor})`;
            }
        });
        
        lastScrollTop = scrollTop;
    });

    // Mobile navigation toggle
    navToggle?.addEventListener('click', () => {
        navLinks?.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== COUNTDOWN FUNCTIONALITY =====
function initCountdown() {
    const countdownElements = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    };

    const priceCountdownElements = {
        days: document.getElementById('price-days'),
        hours: document.getElementById('price-hours'),
        minutes: document.getElementById('price-minutes')
    };

    function updateCountdown() {
        const now = new Date().getTime();
        const eventDate = new Date(eventData.event.earlyBirdDeadline).getTime();
        const distance = eventDate - now;

        if (distance > 0) {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Update main countdown
            if (countdownElements.days) countdownElements.days.textContent = days.toString().padStart(2, '0');
            if (countdownElements.hours) countdownElements.hours.textContent = hours.toString().padStart(2, '0');
            if (countdownElements.minutes) countdownElements.minutes.textContent = minutes.toString().padStart(2, '0');
            if (countdownElements.seconds) countdownElements.seconds.textContent = seconds.toString().padStart(2, '0');

            // Update price countdown
            if (priceCountdownElements.days) priceCountdownElements.days.textContent = days.toString().padStart(2, '0');
            if (priceCountdownElements.hours) priceCountdownElements.hours.textContent = hours.toString().padStart(2, '0');
            if (priceCountdownElements.minutes) priceCountdownElements.minutes.textContent = minutes.toString().padStart(2, '0');
        } else {
            // Early bird period has ended
            const earlyBirdBadge = document.getElementById('early-bird-badge');
            if (earlyBirdBadge) {
                earlyBirdBadge.style.display = 'none';
            }
            
            // Hide countdown elements
            if (countdownElements.days) countdownElements.days.textContent = '00';
            if (countdownElements.hours) countdownElements.hours.textContent = '00';
            if (countdownElements.minutes) countdownElements.minutes.textContent = '00';
            if (countdownElements.seconds) countdownElements.seconds.textContent = '00';
            
            if (priceCountdownElements.days) priceCountdownElements.days.textContent = '00';
            if (priceCountdownElements.hours) priceCountdownElements.hours.textContent = '00';
            if (priceCountdownElements.minutes) priceCountdownElements.minutes.textContent = '00';
        }
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ===== SPONSORS RENDERING =====
function renderSponsors() {
    const sponsorsGrid = document.getElementById('sponsors-grid');
    if (!sponsorsGrid) return;

    const html = eventData.sponsors.map(sponsor => `
        <div class="sponsor-item">
            <img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-logo" loading="lazy">
        </div>
    `).join('');

    sponsorsGrid.innerHTML = html;
}

// ===== PILLARS RENDERING =====
function renderPillars() {
    const pillarsGrid = document.getElementById('pillars-grid');
    if (!pillarsGrid) return;

    const html = eventData.pillars.map(pillar => `
        <div class="pillar-item">
            <div class="pillar-icon">${pillar.icon}</div>
            <h3 class="pillar-title">${pillar.title}</h3>
            <p class="pillar-description">${pillar.description}</p>
        </div>
    `).join('');

    pillarsGrid.innerHTML = html;
}

// ===== TICKETS RENDERING =====
function renderTickets() {
    const ticketsGrid = document.getElementById('tickets-grid');
    if (!ticketsGrid) return;

    const html = eventData.tickets.map(ticket => `
        <div class="ticket-card ${ticket.featured ? 'featured' : ''}">
            <div class="ticket-card-left">
                <h3 class="ticket-tier">${ticket.tier}</h3>
                <div class="ticket-price">
                    ${ticket.price}
                    ${ticket.originalPrice ? `<span style="text-decoration: line-through; font-size: 1.5rem; opacity: 0.6; margin-left: 8px;">${ticket.originalPrice}</span>` : ''}
                </div>
                <p class="ticket-price-note">per person</p>
                <ul class="ticket-perks">
                    ${ticket.perks.map(perk => `<li>${perk}</li>`).join('')}
                </ul>
                <a href="#" class="btn btn-primary">Select Ticket</a>
            </div>
            <div class="ticket-card-right">
                <!-- Form will be added here later -->
            </div>
        </div>
    `).join('');

    ticketsGrid.innerHTML = html;
}

// ===== VENUE RENDERING =====
function renderVenue() {
    const venueDetails = document.getElementById('venue-details');
    const mapContainer = document.getElementById('map-container');
    
    if (venueDetails) {
        venueDetails.innerHTML = `
            <h3>${eventData.venue.name}</h3>
            <p class="venue-address">${eventData.venue.address}</p>
            
            <div class="venue-info-section">
                <h4>Travel Information</h4>
                <p>${eventData.venue.travelTips}</p>
            </div>
            
            <div class="venue-info-section">
                <h4>Partner Hotels</h4>
                <ul class="hotel-list">
                    ${eventData.venue.hotels.map(hotel => `
                        <li class="hotel-item">
                            <span class="hotel-name">${hotel.name}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <a href="mailto:travel@ascendagentexpo.com" class="btn btn-outline">
                Book Hotel Package
                <span class="btn-arrow">→</span>
            </a>
        `;
    }

    if (mapContainer) {
        mapContainer.innerHTML = `
            <iframe 
                src="${eventData.venue.mapUrl}" 
                width="100%" 
                height="100%" 
                style="border:0; border-radius: 16px;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade"
                title="Venue Location Map">
            </iframe>
        `;
    }
}

// ===== PRESENTING SPONSORS RENDERING =====
function renderPresentingSponsors() {
    const presentingSponsorsGrid = document.getElementById('presenting-sponsors-grid');
    if (!presentingSponsorsGrid) return;

    const html = eventData.presentingSponsors.map(sponsor => `
        <div class="presenting-sponsor-item">
            <img src="${sponsor.logo}" alt="${sponsor.name}" class="presenting-sponsor-logo" loading="lazy">
            <p class="presenting-sponsor-description">${sponsor.description}</p>
            <a href="${sponsor.link}" class="presenting-sponsor-link" target="_blank" rel="noopener">
                Learn More →
            </a>
        </div>
    `).join('');

    presentingSponsorsGrid.innerHTML = html;
}

// ===== FAQ FUNCTIONALITY =====
function initFAQ() {
    const faqContainer = document.getElementById('faq-container');
    if (!faqContainer) return;

    // Render FAQ items
    const html = eventData.faq.map((item, index) => `
        <div class="faq-item" data-index="${index}">
            <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${index}">
                ${item.question}
                <span class="faq-icon">+</span>
            </button>
            <div class="faq-answer" id="faq-answer-${index}">
                <div class="faq-answer-content">${item.answer}</div>
            </div>
        </div>
    `).join('');

    faqContainer.innerHTML = html;

    // Add click handlers for FAQ items
    faqContainer.addEventListener('click', (e) => {
        const question = e.target.closest('.faq-question');
        if (!question) return;

        const faqItem = question.closest('.faq-item');
        const isActive = faqItem.classList.contains('active');

        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
            const btn = item.querySelector('.faq-question');
            btn.setAttribute('aria-expanded', 'false');
        });

        // Open clicked item if it wasn't active
        if (!isActive) {
            faqItem.classList.add('active');
            question.setAttribute('aria-expanded', 'true');
        }
    });
}

// ===== NEWSLETTER FUNCTIONALITY =====
function initNewsletter() {
    const newsletterForm = document.getElementById('newsletter-form');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        
        // Simulate form submission
        alert(`Thank you for subscribing with ${email}! You'll receive updates about Ascend Agent Expo.`);
        e.target.reset();
    });
}

// ===== ANIMATIONS & INTERACTIONS =====
function initAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.pillar-item, .ticket-card, .sponsor-item, .presenting-sponsor-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ===== ACCESSIBILITY ENHANCEMENTS =====
function initAccessibility() {
    // Skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#hero';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #667eea;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1001;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Keyboard navigation for mobile menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            navLinks?.classList.remove('active');
            navToggle?.classList.remove('active');
        }
    });

    // Focus management for FAQ
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const faqQuestion = e.target.closest('.faq-question');
            if (faqQuestion) {
                e.preventDefault();
                faqQuestion.click();
            }
        }
    });
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function initPerformance() {
    // Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Preload critical resources
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'font';
    preloadLink.type = 'font/woff2';
    preloadLink.crossOrigin = 'anonymous';
    preloadLink.href = 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2';
    document.head.appendChild(preloadLink);
}

// ===== FUTURISTIC BACKGROUND EFFECTS =====
function initFuturisticBackground() {
    const heroSection = document.querySelector('.hero');
    const dotsLayers = document.querySelectorAll('.dots-layer');
    const connectionLines = document.querySelector('.connection-lines');
    
    if (!heroSection || !dotsLayers.length) return;
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        const rate2 = scrolled * -0.3;
        const rate3 = scrolled * -0.1;
        
        // Parallax effect for different layers
        if (dotsLayers[0]) dotsLayers[0].style.transform = `translateY(${rate}px)`;
        if (dotsLayers[1]) dotsLayers[1].style.transform = `translateY(${rate2}px)`;
        if (dotsLayers[2]) dotsLayers[2].style.transform = `translateY(${rate3}px)`;
        if (connectionLines) connectionLines.style.transform = `translateY(${rate * 0.7}px)`;
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    // Throttled scroll listener for performance
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Mouse movement effect
    heroSection.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        
        const xPos = (clientX / innerWidth - 0.5) * 20;
        const yPos = (clientY / innerHeight - 0.5) * 20;
        
        dotsLayers.forEach((layer, index) => {
            const intensity = (index + 1) * 0.3;
            layer.style.transform = `translate(${xPos * intensity}px, ${yPos * intensity}px)`;
        });
    });
    
    // Reset on mouse leave
    heroSection.addEventListener('mouseleave', () => {
        dotsLayers.forEach(layer => {
            layer.style.transform = '';
        });
        if (connectionLines) connectionLines.style.transform = '';
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCountdown();
    renderSponsors();
    renderPillars();
    renderTickets();
    renderVenue();
    renderPresentingSponsors();
    initFAQ();
    initNewsletter();
    initAnimations();
    initAccessibility();
    initPerformance();
    initFuturisticBackground();
});

// ===== UTILITY FUNCTIONS =====
function updateEventData(newData) {
    Object.assign(eventData, newData);
    
    // Re-render affected sections
    renderSponsors();
    renderPillars();
    renderTickets();
    renderVenue();
    renderPresentingSponsors();
    initFAQ();
}

// Export for external use
window.AscendExpo = {
    eventData,
    updateEventData
};
