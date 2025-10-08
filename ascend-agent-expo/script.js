// ===== DATA STRUCTURE (SWAPPABLE) =====
const eventData = {
    event: {
        name: "Ascend Agent Expo",
        dates: "October 16-17, 2025",
        location: "Orlando Marriott World Center",
        tagline: "Elevate Your Real Estate Career to New Heights",
        earlyBirdDeadline: "2025-08-15T09:00:00-04:00",
        eventStartDate: "2025-10-16T09:00:00-04:00"
    },
    
    sponsors: [
        {
            name: "LPT Realty",
            logo: "img/sponsors/lptrealty_logo_horizontal_white.png",
            link: "https://lptrealty.com"
        },
        {
            name: "Aperture Global",
            logo: "img/sponsors/apertureglobal_logo_white.png",
            link: "https://apertureglobal.com"
        },
        {
            name: "Showingtime Plus",
            logo: "img/sponsors/showing-logo.png",
            link: "https://showingtime.com"
        },
        {
            name: "Rocket Mortgage",
            logo: "img/sponsors/rocketmortgage_logo.webp",
            link: "https://rocketmortgage.com"
        },
        {
            name: "Fello",
            logo: "img/sponsors/sponsor-02.png",
            link: "https://fello.com"
        },
        {
            name: "Realtor.com",
            logo: "img/sponsors/realtorcom.png",
            link: "https://realtor.com"
        },
        {
            name: "Realty.com",
            logo: "img/sponsors/realtycom.svg",
            link: "https://realty.com"
        },
        {
            name: "ZooDealio",
            logo: "img/sponsors/zoodealio.png",
            link: "https://zoodealio.com"
        },
        {
            name: "Ruuster",
            logo: "img/sponsors/ruuster.png",
            link: "https://ruuster.com"
        },
        {
            name: "House Whisperer",
            logo: "img/sponsors/housewhisper.png",
            link: "https://housewhisper.com"
        },
        {
            name: "Comparion Insurance",
            logo: "img/sponsors/comparion_logo.png",
            link: "https://comparion.com"
        },
        {
            name: "Home Warranty of America",
            logo: "img/sponsors/hwa.png",
            link: "https://hwa.com"
        },
        {
            name: "Crexi",
            logo: "img/sponsors/sponsor-03.png",
            link: "https://crexi.com"
        },
        {
            name: "AM Cards",
            logo: "img/sponsors/amcards.png",
            link: "https://amcards.com"
        },
        {
            name: "Sponsor 01",
            logo: "img/sponsors/sponsor-01.png",
            link: "https://sponsor01.com"
        },
        {
            name: "UWM",
            logo: "img/sponsors/UWM_Logo.png",
            link: "https://uwm.com"
        },
        {
            name: "Citywide",
            logo: "img/sponsors/citywide_logo.png",
            link: "https://citywide.com"
        },
        {
            name: "MJV",
            logo: "img/sponsors/mjv.png",
            link: "https://mjv.com"
        },
        {
            name: "Mutual",
            logo: "img/sponsors/mutual-brand-white.svg",
            link: "https://mutual.com"
        },
        {
            name: "Responsive",
            logo: "img/sponsors/responsive_logo.png",
            link: "https://responsive.com"
        },
        {
            name: "Sponsor 5",
            logo: "img/sponsors/sponsor-05.png",
            link: "https://sponsor5.com"
        },
        {
            name: "Sponsor 6",
            logo: "img/sponsors/sponsor-06.png",
            link: "https://sponsor6.com"
        },
        {
            name: "Sponsor 7",
            logo: "img/sponsors/sponsor-07.png",
            link: "https://sponsor7.com"
        },
        {
            name: "Sponsor 8",
            logo: "img/sponsors/sponsor-08.png",
            link: "https://sponsor8.com"
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
    
    speakers: [
        {
            name: "Sarah Martinez",
            title: "Chief Innovation Officer",
            company: "Premier Real Estate Group",
            photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop",
            tagline: "Transforming the future of real estate through technology and human connection.",
            bioUrl: "#"
        },
        {
            name: "Michael Chen",
            title: "Top Producer & Team Leader",
            company: "Luxury Properties International",
            photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=800&fit=crop",
            tagline: "Building seven-figure businesses through strategic lead generation and client relationships.",
            bioUrl: "#"
        },
        {
            name: "Jennifer Thompson",
            title: "CEO & Founder",
            company: "Market Dominance Academy",
            photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=800&fit=crop",
            tagline: "Empowering agents to scale their businesses with proven systems and sustainable growth strategies.",
            bioUrl: "#"
        },
        {
            name: "David Rodriguez",
            title: "Digital Marketing Strategist",
            company: "RealEstate.AI",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop",
            tagline: "Leveraging AI and automation to revolutionize how agents attract and convert clients.",
            bioUrl: "#"
        },
        {
            name: "Amanda Foster",
            title: "Luxury Market Specialist",
            company: "Elite Estates Global",
            photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800&h=800&fit=crop",
            tagline: "Mastering high-end property sales through personalized client experiences.",
            bioUrl: "#"
        },
        {
            name: "James Patterson",
            title: "Investment Property Expert",
            company: "Wealth Builder Realty",
            photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop",
            tagline: "Helping investors build wealth through strategic real estate acquisitions.",
            bioUrl: "#"
        },
        {
            name: "Lisa Wang",
            title: "Social Media Marketing Coach",
            company: "Digital Agent Academy",
            photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=800&fit=crop",
            tagline: "Teaching agents to dominate social media and attract qualified leads organically.",
            bioUrl: "#"
        },
        {
            name: "Robert Taylor",
            title: "Negotiation Strategist",
            company: "Deal Makers Institute",
            photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop",
            tagline: "Expert tactics for winning negotiations and maximizing client outcomes.",
            bioUrl: "#"
        },
        {
            name: "Maria Gonzalez",
            title: "First-Time Buyer Specialist",
            company: "New Home Navigators",
            photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=800&fit=crop",
            tagline: "Guiding new buyers through the home purchase process with confidence and clarity.",
            bioUrl: "#"
        },
        {
            name: "Kevin Anderson",
            title: "Commercial Real Estate Advisor",
            company: "Business Property Solutions",
            photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop",
            tagline: "Connecting businesses with ideal commercial spaces for growth and success.",
            bioUrl: "#"
        },
        {
            name: "Nicole Johnson",
            title: "Staging & Design Consultant",
            company: "Home Impression Studios",
            photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop",
            tagline: "Transforming properties to sell faster and for higher prices through strategic staging.",
            bioUrl: "#"
        },
        {
            name: "Christopher Lee",
            title: "Tech Integration Specialist",
            company: "PropTech Innovations",
            photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=800&fit=crop",
            tagline: "Implementing cutting-edge technology solutions to streamline real estate operations.",
            bioUrl: "#"
        }
    ],
    
    agenda: [
        {
            day: "Day 1",
            date: "October 16, 2025",
            sessions: [
                {
                    time: "8:00 AM – 9:00 AM",
                    duration: "1 hour",
                    title: "Registration & Welcome Coffee",
                    speaker: null,
                    location: "Main Lobby",
                    tag: null,
                    description: "Network with fellow attendees while enjoying refreshments."
                },
                {
                    time: "9:00 AM – 10:00 AM",
                    duration: "1 hour",
                    title: "Opening Keynote: The Future of Real Estate",
                    speaker: "Sarah Martinez",
                    location: "Expo Main Stage",
                    tag: "Keynote",
                    description: "Discover how technology and innovation are reshaping the real estate landscape."
                },
                {
                    time: "10:15 AM – 11:15 AM",
                    duration: "1 hour",
                    title: "Mastering Digital Marketing for Agents",
                    speaker: "Michael Chen",
                    location: "Expo Main Stage",
                    tag: "Marketing",
                    description: "Learn proven strategies to generate leads and build your online presence."
                },
                {
                    time: "11:30 AM – 12:30 PM",
                    duration: "1 hour",
                    title: "Building a Seven-Figure Real Estate Business",
                    speaker: "Jennifer Thompson",
                    location: "Expo Main Stage",
                    tag: "Business Growth",
                    description: "Actionable insights on scaling your business and maximizing profitability."
                },
                {
                    time: "12:30 PM – 1:30 PM",
                    duration: "1 hour",
                    title: "Lunch Break & Networking",
                    speaker: null,
                    location: "Exhibition Hall",
                    tag: null,
                    description: "Connect with sponsors, vendors, and fellow professionals."
                },
                {
                    time: "1:30 PM – 2:30 PM",
                    duration: "1 hour",
                    title: "AI & Automation in Real Estate",
                    speaker: "David Rodriguez",
                    location: "Expo Mini Stage",
                    tag: "Technology",
                    description: "Harness the power of AI to streamline operations and close more deals."
                },
                {
                    time: "2:45 PM – 3:45 PM",
                    duration: "1 hour",
                    title: "Luxury Market Strategies",
                    speaker: "Amanda Foster",
                    location: "Expo Mini Stage",
                    tag: "Luxury Sales",
                    description: "Expert tactics for breaking into and dominating the luxury real estate market."
                },
                {
                    time: "4:00 PM – 5:00 PM",
                    duration: "1 hour",
                    title: "Panel: Investment Properties & Wealth Building",
                    speaker: "James Patterson & Guests",
                    location: "Expo Main Stage",
                    tag: "Panel Discussion",
                    description: "Learn how to help clients build wealth through strategic property investments."
                }
            ]
        },
        {
            day: "Day 2",
            date: "October 17, 2025",
            sessions: [
                {
                    time: "8:30 AM – 9:00 AM",
                    duration: "30 minutes",
                    title: "Morning Coffee & Networking",
                    speaker: null,
                    location: "Main Lobby",
                    tag: null,
                    description: "Start your day connecting with industry professionals."
                },
                {
                    time: "9:00 AM – 10:00 AM",
                    duration: "1 hour",
                    title: "Social Media Mastery for Real Estate",
                    speaker: "Lisa Wang",
                    location: "Expo Main Stage",
                    tag: "Marketing",
                    description: "Build a powerful social media presence that attracts and converts leads."
                },
                {
                    time: "10:15 AM – 11:15 AM",
                    duration: "1 hour",
                    title: "Negotiation Tactics That Close Deals",
                    speaker: "Robert Taylor",
                    location: "Expo Main Stage",
                    tag: "Sales",
                    description: "Win-win negotiation strategies that benefit both you and your clients."
                },
                {
                    time: "11:30 AM – 12:30 PM",
                    duration: "1 hour",
                    title: "First-Time Buyer Success Strategies",
                    speaker: "Maria Gonzalez",
                    location: "Expo Mini Stage",
                    tag: "Client Service",
                    description: "Guide first-time buyers through the process with confidence and expertise."
                },
                {
                    time: "12:30 PM – 1:30 PM",
                    duration: "1 hour",
                    title: "Lunch & Expo Floor Exploration",
                    speaker: null,
                    location: "Exhibition Hall",
                    tag: null,
                    description: "Discover new tools, services, and opportunities from our sponsors."
                },
                {
                    time: "1:30 PM – 2:30 PM",
                    duration: "1 hour",
                    title: "Commercial Real Estate Opportunities",
                    speaker: "Kevin Anderson",
                    location: "Expo Mini Stage",
                    tag: "Commercial",
                    description: "Expand your business into the lucrative commercial real estate sector."
                },
                {
                    time: "2:45 PM – 3:45 PM",
                    duration: "1 hour",
                    title: "Home Staging Secrets for Faster Sales",
                    speaker: "Nicole Johnson",
                    location: "Expo Mini Stage",
                    tag: "Staging",
                    description: "Transform properties to sell faster and at higher prices."
                },
                {
                    time: "4:00 PM – 5:00 PM",
                    duration: "1 hour",
                    title: "Closing Session: Your Action Plan for Success",
                    speaker: "Christopher Lee & Team",
                    location: "Expo Main Stage",
                    tag: "Keynote",
                    description: "Leave with a clear roadmap to implement everything you've learned."
                }
            ]
        }
    ],
    
    // Tickets section is now static HTML - no data needed
    
    venue: {
        name: "Orlando Marriott World Center - Cypress Ballroom 2",
        address: "8701 World Center Dr, Orlando, FL 32821",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3510.4!2d-81.50928669917572!3d28.360979974698278!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd7b8c8c8c8c8d%3A0x8c8c8c8c8c8c8c8d!2sOrlando+Marriott+World+Center!5e0!3m2!1sen!2sus!4v1234567890",
        travelTips: "Orlando International Airport (MCO) is 20 minutes away. Uber, Lyft, and taxi services are readily available.",
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
            name: "AM Cards",
            logo: "img/sponsors/amcards.png",
            description: "Providing innovative real estate marketing solutions and business development tools for agents.",
            link: "https://amcards.com",
            mediaUrl: null
        },
        {
            name: "HWA",
            logo: "img/sponsors/hwa.png",
            description: "Empowering real estate professionals with cutting-edge technology and comprehensive support services.",
            link: "https://hwa.com",
            mediaUrl: null
        },
        {
            name: "Ruuster",
            logo: "img/sponsors/ruuster.png",
            description: "Revolutionizing real estate transactions with innovative technology and streamlined processes.",
            link: "https://ruuster.com",
            mediaUrl: null
        },
        {
            name: "ZooDealio",
            logo: "img/sponsors/zoodealio.png",
            description: "Connecting real estate professionals with innovative tools and resources for success.",
            link: "https://zoodealio.com",
            mediaUrl: null
        }
    ],
    
    faq: [
        {
            question: "What is included in my free ticket?",
            answer: "Your free ticket includes access to all expo exhibitors, 8 hours of educational content from the Expo Stage, 8 hours of educational content from the Expo Mini Stage, networking opportunities with top industry vendors, games, raffles, and prizes."
        },
        {
            question: "Who is eligible for a free ticket?",
            answer: "Tickets are free to any Licensed Real Estate Agent, Referral Agent, or Aspiring Real Estate Agent. Simply register with your name and email to claim your spot."
        },
        {
            question: "Is the venue accessible?",
            answer: "Yes, the Orlando Marriott World Center is fully ADA compliant with wheelchair accessibility, accessible parking, restrooms, and seating areas. Please contact us if you have specific accessibility needs."
        },
        {
            question: "Will sessions be recorded?",
            answer: "Select sessions may be recorded. Please check with individual speakers or our team for specific session recording availability."
        },
        {
            question: "What should I bring?",
            answer: "Bring business cards for networking, a notebook or device for taking notes, comfortable shoes for walking, and professional attire. We recommend planning for meals on your own as food is not provided at the event."
        },
        {
            question: "What is the code of conduct?",
            answer: "We maintain a professional, inclusive environment. Harassment, discrimination, or disruptive behavior will not be tolerated. All attendees must treat others with respect and professionalism."
        },
        {
            question: "Are meals provided?",
            answer: "No, meals are not provided at the event. The venue is located at the Orlando Marriott World Center which has multiple dining options available on-site, and there are many restaurants nearby."
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
        
        // Check if mobile menu is open
        const isMobileMenuOpen = navLinks?.classList.contains('active');
        
        // Add scrolled class for styling
        if (scrollTop > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
            nav.classList.remove('nav-hidden');
        }
        
        // Hide/show navigation based on scroll direction
        // Don't hide if mobile menu is open
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down - hide nav (but not if mobile menu is open)
            if (!isMobileMenuOpen) {
                nav.classList.add('nav-hidden');
            }
        } else if (scrollTop < lastScrollTop) {
            // Scrolling up - show nav
            nav.classList.remove('nav-hidden');
        }
        
        // Hero background parallax effect (throttled for smoothness)
        requestAnimationFrame(() => {
            const heroBackground = document.querySelector('.hero-background');
            const heroSection = document.querySelector('.hero');
            if (heroBackground && heroSection) {
                const heroHeight = heroSection.offsetHeight;
                const scrollProgress = Math.min(scrollTop / heroHeight, 1);
                
                // Parallax movement - background moves slower than scroll
                const parallaxOffset = scrollTop * 0.5; // 50% of scroll speed
                const zoomFactor = 1 + (scrollProgress * 0.2); // 20% max zoom
                
                // Apply parallax transform without overriding the breathing animation
                heroBackground.style.setProperty('--parallax-offset', `${parallaxOffset}px`);
                heroBackground.style.setProperty('--parallax-scale', zoomFactor);
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
                // Close mobile menu when clicking a nav link
                navLinks?.classList.remove('active');
                navToggle?.classList.remove('active');
                
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
        const eventDate = new Date(eventData.event.eventStartDate).getTime();
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
    if (!sponsorsGrid) {
        console.error('Sponsors grid not found');
        return;
    }

    // Split sponsors into visible and hidden groups
    const totalSponsors = eventData.sponsors.length;
    // Show 5 sponsors on mobile, 12 on desktop
    const isMobile = window.innerWidth <= 768;
    const visibleCount = isMobile ? 5 : 12;
    const visibleSponsors = eventData.sponsors.slice(0, visibleCount);
    const hiddenSponsors = eventData.sponsors.slice(visibleCount);
    
    console.log('Total sponsors:', totalSponsors);
    console.log('Visible sponsors:', visibleSponsors.length);
    console.log('Hidden sponsors:', hiddenSponsors.length);

    // Render visible sponsors
    const visibleHtml = visibleSponsors.map(sponsor => `
        <div class="sponsor-item">
            <img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-logo" loading="lazy">
        </div>
    `).join('');

    // Render hidden sponsors
    const hiddenHtml = hiddenSponsors.map(sponsor => `
        <div class="sponsor-item sponsor-hidden">
            <img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-logo" loading="lazy">
        </div>
    `).join('');

    // Render only the sponsors in the grid
    sponsorsGrid.innerHTML = visibleHtml + hiddenHtml;

    // Add reveal button outside the grid if there are hidden sponsors
    if (hiddenSponsors.length > 0) {
        const sponsorsSection = sponsorsGrid.closest('.sponsors');
        const existingButton = sponsorsSection.querySelector('.sponsor-reveal-container');
        const existingText = sponsorsSection.querySelector('.more-sponsors-text');
        
        if (existingButton) {
            existingButton.remove();
        }
        if (existingText) {
            existingText.remove();
        }
        
        // Add text about more sponsors not listed
        const moreSponsorsText = document.createElement('p');
        moreSponsorsText.className = 'more-sponsors-text';
        moreSponsorsText.innerHTML = 'More sponsors not listed above';
        sponsorsSection.appendChild(moreSponsorsText);
        
        const revealButton = document.createElement('div');
        revealButton.className = 'sponsor-reveal-container';
        revealButton.innerHTML = `
            <button class="btn btn-outline sponsor-reveal-btn" id="sponsor-reveal-btn">
                Show More Sponsors
                <span class="btn-arrow">↓</span>
            </button>
        `;
        
        sponsorsSection.appendChild(revealButton);
    }

    // Add event listener for reveal button
    if (hiddenSponsors.length > 0) {
        const revealBtn = document.getElementById('sponsor-reveal-btn');
        if (revealBtn) {
            revealBtn.addEventListener('click', toggleSponsorVisibility);
        }
    }
}

// ===== SPONSOR VISIBILITY TOGGLE =====
function toggleSponsorVisibility() {
    const hiddenSponsors = document.querySelectorAll('.sponsor-hidden');
    const revealBtn = document.getElementById('sponsor-reveal-btn');
    
    if (!hiddenSponsors.length || !revealBtn) return;
    
    const isRevealed = hiddenSponsors[0].classList.contains('sponsor-revealed');
    
    if (isRevealed) {
        // Hide sponsors
        hiddenSponsors.forEach(sponsor => {
            sponsor.style.display = 'none';
            sponsor.classList.remove('sponsor-revealed');
        });
        revealBtn.innerHTML = 'Show More Sponsors <span class="btn-arrow">↓</span>';
    } else {
        // Show sponsors
        hiddenSponsors.forEach(sponsor => {
            sponsor.style.display = 'block';
            sponsor.classList.add('sponsor-revealed');
        });
        revealBtn.innerHTML = 'Show Less Sponsors <span class="btn-arrow">↑</span>';
    }
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

// ===== FEATURED SPEAKER CAROUSEL =====
let currentSpeakerIndex = 0;
let speakerAutoRotateInterval = null;
let speakerRotationPaused = false;
let speakerLastInteractionTime = 0;
let speakerTouchStartX = 0;
let speakerTouchEndX = 0;

function renderSpeakers() {
    const carouselInner = document.getElementById('speaker-carousel-inner');
    const dotsContainer = document.getElementById('speaker-dots');
    
    if (!carouselInner || !dotsContainer) return;

    // Limit carousel to first 5 speakers
    const featuredSpeakers = eventData.speakers.slice(0, 5);

    // Render speaker slides
    const slidesHtml = featuredSpeakers.map((speaker, index) => `
        <div class="speaker-slide ${index === 0 ? 'active' : ''}" 
             data-index="${index}"
             role="tabpanel"
             aria-label="Speaker ${index + 1} of ${featuredSpeakers.length}: ${speaker.name}">
            <div class="speaker-image-container">
                <img src="${speaker.photo}" 
                     alt="${speaker.name}" 
                     class="speaker-headshot"
                     loading="${index === 0 ? 'eager' : 'lazy'}">
            </div>
            <div class="speaker-content">
                <h3 class="speaker-name">${speaker.name}</h3>
                <p class="speaker-title">${speaker.title}</p>
                <p class="speaker-company">${speaker.company}</p>
                ${speaker.tagline ? `<p class="speaker-tagline">${speaker.tagline}</p>` : ''}
                ${speaker.bioUrl ? `
                    <a href="${speaker.bioUrl}" class="speaker-bio-link">
                        Read Full Bio
                        <i class="fas fa-arrow-right"></i>
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');

    carouselInner.innerHTML = slidesHtml;

    // Render dots
    const dotsHtml = featuredSpeakers.map((speaker, index) => `
        <button class="speaker-dot ${index === 0 ? 'active' : ''}" 
                data-index="${index}"
                role="tab"
                aria-label="Go to speaker ${index + 1}: ${speaker.name}"
                aria-selected="${index === 0}">
        </button>
    `).join('');

    dotsContainer.innerHTML = dotsHtml;

    // Initialize carousel
    initSpeakerCarousel();
    
    // Update speaker count display
    updateSpeakerCount(featuredSpeakers.length);
    
    // Render all speakers grid
    renderAllSpeakersGrid();
    
    // Initialize view all toggle
    initViewAllSpeakersToggle();
}

function updateSpeakerCount(featuredCount) {
    const countElement = document.getElementById('additional-speaker-count');
    if (!countElement) return;
    
    const totalSpeakers = eventData.speakers.length;
    const additionalSpeakers = totalSpeakers - featuredCount;
    
    if (additionalSpeakers > 0) {
        countElement.textContent = additionalSpeakers;
    }
}

function renderAllSpeakersGrid() {
    const gridContainer = document.getElementById('all-speakers-grid');
    if (!gridContainer) return;

    const cardsHtml = eventData.speakers.map((speaker, index) => `
        <div class="speaker-card">
            <div class="speaker-card-image">
                <img src="${speaker.photo}" 
                     alt="${speaker.name}" 
                     class="speaker-card-photo"
                     loading="lazy">
            </div>
            <div class="speaker-card-content">
                <h3 class="speaker-card-name">${speaker.name}</h3>
                <p class="speaker-card-title">${speaker.title}</p>
                <p class="speaker-card-company">${speaker.company}</p>
                ${speaker.tagline ? `<p class="speaker-card-tagline">${speaker.tagline}</p>` : ''}
                ${speaker.bioUrl ? `
                    <a href="${speaker.bioUrl}" class="speaker-card-link">
                        Read Full Bio
                        <i class="fas fa-arrow-right"></i>
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');

    gridContainer.innerHTML = cardsHtml;
}

function initViewAllSpeakersToggle() {
    const toggleBtn = document.getElementById('view-all-speakers-btn');
    const container = document.getElementById('all-speakers-container');
    
    if (!toggleBtn || !container) return;

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default button behavior
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            // Collapse
            container.classList.remove('visible');
            container.setAttribute('aria-hidden', 'true');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.innerHTML = 'View All Speakers <span class="btn-arrow" id="speaker-arrow">↓</span>';
        } else {
            // Expand
            container.style.display = 'block';
            setTimeout(() => {
                container.classList.add('visible');
                container.setAttribute('aria-hidden', 'false');
                toggleBtn.setAttribute('aria-expanded', 'true');
                toggleBtn.innerHTML = 'Hide Speakers <span class="btn-arrow" id="speaker-arrow">↑</span>';
            }, 10);
        }
    });
}

function initSpeakerCarousel() {
    const carousel = document.querySelector('.speaker-carousel');
    const prevBtn = document.querySelector('.speaker-prev');
    const nextBtn = document.querySelector('.speaker-next');
    const dotsContainer = document.getElementById('speaker-dots');
    
    if (!carousel) return;

    // Navigation button handlers
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            changeSpeaker('prev');
            pauseSpeakerRotationTemporarily();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            changeSpeaker('next');
            pauseSpeakerRotationTemporarily();
        });
    }

    // Dot navigation
    if (dotsContainer) {
        dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.speaker-dot');
            if (dot) {
                const index = parseInt(dot.dataset.index);
                goToSpeaker(index);
                pauseSpeakerRotationTemporarily();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const carousel = document.querySelector('.speaker-carousel');
        if (!carousel) return;
        
        // Check if carousel is in viewport
        const rect = carousel.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInViewport) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                changeSpeaker('prev');
                pauseSpeakerRotationTemporarily();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                changeSpeaker('next');
                pauseSpeakerRotationTemporarily();
            }
        }
    });

    // Hover pause/resume
    carousel.addEventListener('mouseenter', () => {
        pauseSpeakerRotation();
        carousel.classList.add('paused');
    });

    carousel.addEventListener('mouseleave', () => {
        resumeSpeakerRotation();
        carousel.classList.remove('paused');
    });

    // Focus pause/resume
    carousel.addEventListener('focusin', () => {
        pauseSpeakerRotation();
        carousel.classList.add('paused');
    });

    carousel.addEventListener('focusout', () => {
        resumeSpeakerRotation();
        carousel.classList.remove('paused');
    });

    // Touch/swipe gestures for mobile
    const carouselInner = document.getElementById('speaker-carousel-inner');
    if (carouselInner) {
        carouselInner.addEventListener('touchstart', (e) => {
            speakerTouchStartX = e.touches[0].clientX;
        }, { passive: true });

        carouselInner.addEventListener('touchend', (e) => {
            speakerTouchEndX = e.changedTouches[0].clientX;
            handleSpeakerSwipe();
        }, { passive: true });
    }

    // Start auto-rotation
    startSpeakerRotation();
}

function changeSpeaker(direction) {
    const slides = document.querySelectorAll('.speaker-slide');
    const dots = document.querySelectorAll('.speaker-dot');
    
    if (!slides.length) return;

    // Remove active class from current slide
    slides[currentSpeakerIndex].classList.remove('active', 'slide-in-left', 'slide-in-right');
    dots[currentSpeakerIndex].classList.remove('active');
    dots[currentSpeakerIndex].setAttribute('aria-selected', 'false');

    // Calculate new index
    if (direction === 'next') {
        currentSpeakerIndex = (currentSpeakerIndex + 1) % slides.length;
    } else {
        currentSpeakerIndex = (currentSpeakerIndex - 1 + slides.length) % slides.length;
    }

    // Add active class to new slide with animation
    const animationClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
    slides[currentSpeakerIndex].classList.add('active', animationClass);
    dots[currentSpeakerIndex].classList.add('active');
    dots[currentSpeakerIndex].setAttribute('aria-selected', 'true');

    // Update ARIA live region for screen readers
    const carousel = document.querySelector('.speaker-carousel');
    const speaker = eventData.speakers[currentSpeakerIndex];
    carousel?.setAttribute('aria-label', 
        `Now showing speaker ${currentSpeakerIndex + 1} of ${slides.length}: ${speaker.name}, ${speaker.title} at ${speaker.company}`
    );
}

function goToSpeaker(index) {
    const slides = document.querySelectorAll('.speaker-slide');
    const dots = document.querySelectorAll('.speaker-dot');
    
    if (index === currentSpeakerIndex || !slides.length) return;

    const direction = index > currentSpeakerIndex ? 'next' : 'prev';

    // Remove active class from current slide
    slides[currentSpeakerIndex].classList.remove('active', 'slide-in-left', 'slide-in-right');
    dots[currentSpeakerIndex].classList.remove('active');
    dots[currentSpeakerIndex].setAttribute('aria-selected', 'false');

    // Update index
    currentSpeakerIndex = index;

    // Add active class to new slide with animation
    const animationClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
    slides[currentSpeakerIndex].classList.add('active', animationClass);
    dots[currentSpeakerIndex].classList.add('active');
    dots[currentSpeakerIndex].setAttribute('aria-selected', 'true');

    // Update ARIA
    const carousel = document.querySelector('.speaker-carousel');
    const speaker = eventData.speakers[currentSpeakerIndex];
    carousel?.setAttribute('aria-label', 
        `Now showing speaker ${currentSpeakerIndex + 1} of ${slides.length}: ${speaker.name}`
    );
}

function handleSpeakerSwipe() {
    const swipeThreshold = 50;
    const diff = speakerTouchStartX - speakerTouchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next slide
            changeSpeaker('next');
        } else {
            // Swipe right - previous slide
            changeSpeaker('prev');
        }
        pauseSpeakerRotationTemporarily();
    }
}

function startSpeakerRotation() {
    if (speakerAutoRotateInterval) return;
    
    // Auto-rotate every 5 seconds (5000ms)
    speakerAutoRotateInterval = setInterval(() => {
        if (!speakerRotationPaused) {
            changeSpeaker('next');
        }
    }, 5000);
}

function pauseSpeakerRotation() {
    speakerRotationPaused = true;
}

function resumeSpeakerRotation() {
    speakerRotationPaused = false;
}

function pauseSpeakerRotationTemporarily() {
    speakerRotationPaused = true;
    speakerLastInteractionTime = Date.now();

    // Resume after 10 seconds of no interaction
    setTimeout(() => {
        const timeSinceLastInteraction = Date.now() - speakerLastInteractionTime;
        if (timeSinceLastInteraction >= 10000) {
            speakerRotationPaused = false;
        }
    }, 10000);
}

function stopSpeakerRotation() {
    if (speakerAutoRotateInterval) {
        clearInterval(speakerAutoRotateInterval);
        speakerAutoRotateInterval = null;
    }
}

// ===== AGENDA RENDERING =====
function renderAgenda() {
    eventData.agenda.forEach((day, index) => {
        const scheduleContainer = document.getElementById(`day${index + 1}-schedule`);
        if (!scheduleContainer) return;
        
        const sessionsHtml = day.sessions.map(session => `
            <div class="agenda-item">
                <div class="agenda-time">
                    <div class="agenda-time-primary">${session.time}</div>
                    ${session.duration ? `<div class="agenda-time-duration">${session.duration}</div>` : ''}
                </div>
                <div class="agenda-details">
                    <h3 class="agenda-title">${session.title}</h3>
                    <div class="agenda-meta">
                        ${session.speaker ? `
                            <span class="agenda-speaker">
                                <i class="fas fa-user"></i>
                                ${session.speaker}
                            </span>
                        ` : ''}
                        ${session.location ? `
                            <span class="agenda-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${session.location}
                            </span>
                        ` : ''}
                        ${session.tag ? `
                            <span class="agenda-tag">${session.tag}</span>
                        ` : ''}
                    </div>
                    ${session.description ? `
                        <p class="agenda-description">${session.description}</p>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        scheduleContainer.innerHTML = sessionsHtml;
    });
    
    // Initialize tab functionality
    initAgendaTabs();
}

function initAgendaTabs() {
    const tabs = document.querySelectorAll('.agenda-tab');
    const panels = document.querySelectorAll('.agenda-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchAgendaTab(tab, tabs, panels);
        });
        
        // Keyboard navigation
        tab.addEventListener('keydown', (e) => {
            handleAgendaKeyboard(e, tab, tabs);
        });
    });
}

function switchAgendaTab(selectedTab, allTabs, allPanels) {
    const targetPanel = selectedTab.getAttribute('aria-controls');
    
    // Deactivate all tabs and panels
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    allPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('hidden', '');
    });
    
    // Activate selected tab and panel
    selectedTab.classList.add('active');
    selectedTab.setAttribute('aria-selected', 'true');
    
    const panel = document.getElementById(targetPanel);
    if (panel) {
        panel.classList.add('active');
        panel.removeAttribute('hidden');
    }
}

function handleAgendaKeyboard(e, currentTab, allTabs) {
    let newIndex = -1;
    const currentIndex = Array.from(allTabs).indexOf(currentTab);
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = currentIndex + 1;
        if (newIndex >= allTabs.length) newIndex = 0;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = allTabs.length - 1;
    } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
    } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = allTabs.length - 1;
    }
    
    if (newIndex !== -1) {
        allTabs[newIndex].focus();
        allTabs[newIndex].click();
    }
}

// ===== TICKETS RENDERING =====
// Tickets section is now static HTML - no JavaScript rendering needed

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
            
            <a href="https://www.marriott.com/search/findHotels.mi?pageType=advanced&searchType=InCity&destinationAddress.latitude=28.360086&destinationAddress.longitude=-81.508582&destinationAddress.destination=Orlando+World+Center+Marriott&nst=paid&cid=PAI_GLB0004YXD_GLE000BIM5_GLF000OETA&ppc=ppc&pId=ustbppc&gclsrc=aw.ds&gad_source=1&gad_campaignid=22339671805&gbraid=0AAAAADilnicXeEIZps0ez0MvrbgUtEEbR" class="btn btn-outline" target="_blank" rel="noopener">
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
                // Remove inline transform after animation completes to allow hover effects
                setTimeout(() => {
                    entry.target.style.transform = '';
                }, 600);
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

// ===== FLOATING CTA FUNCTIONALITY =====
function initFloatingCTA() {
    const floatingCTA = document.querySelector('.floating-cta');
    const floatingBtn = document.querySelector('.floating-cta-btn');
    
    if (!floatingCTA || !floatingBtn) return;
    
    // Hide/show floating CTA based on scroll position
    let lastScrollTop = 0;
    let ticking = false;
    
    function updateFloatingCTA() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Hide when at the very top or bottom of the page
        if (scrollTop < 100 || scrollTop + windowHeight >= documentHeight - 100) {
            floatingCTA.style.opacity = '0.7';
            floatingCTA.style.transform = 'scale(0.9)';
        } else {
            floatingCTA.style.opacity = '1';
            floatingCTA.style.transform = 'scale(1)';
        }
        
        // Add pulse animation when scrolling down
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            floatingBtn.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                floatingBtn.style.animation = '';
            }, 1000);
        }
        
        lastScrollTop = scrollTop;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateFloatingCTA);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Add click tracking (optional - for analytics)
    floatingBtn.addEventListener('click', () => {
        // Track the click event if you have analytics
        console.log('Floating CTA clicked');
    });
    
    // Add keyboard accessibility
    floatingBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            floatingBtn.click();
        }
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCountdown();
    renderSponsors();
    renderPillars();
    renderSpeakers();
    renderAgenda();
    renderVenue();
    renderPresentingSponsors();
    initFAQ();
    initAnimations();
    initAccessibility();
    initPerformance();
    initFuturisticBackground();
    initFloatingCTA();
    initAnimatedCounters();
    
    // Re-render sponsors on resize to adjust visible count for mobile/desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderSponsors();
        }, 250);
    });
});

// ===== UTILITY FUNCTIONS =====
function updateEventData(newData) {
    Object.assign(eventData, newData);
    
    // Re-render affected sections
    renderSponsors();
    renderPillars();
    if (newData.speakers) {
        stopSpeakerRotation();
        renderSpeakers();
    }
    renderVenue();
    renderPresentingSponsors();
    initFAQ();
    initAnimatedCounters();
}

// ===== ANIMATED COUNTERS =====
function animateCounter(element, target, suffix = '', duration = 2000) {
    const startTime = performance.now();
    const startValue = 0;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (target - startValue) * easeOutQuart);
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + suffix;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function initAnimatedCounters() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    
    if (statNumbers.length === 0) return;
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const target = parseInt(element.dataset.target);
                const suffix = element.dataset.suffix || '';
                
                // Start animation
                animateCounter(element, target, suffix);
                
                // Stop observing this element
                observer.unobserve(element);
            }
        });
    }, {
        threshold: 0.5, // Trigger when 50% of the element is visible
        rootMargin: '0px 0px -100px 0px' // Start animation slightly before element is fully visible
    });
    
    // Start observing all stat numbers
    statNumbers.forEach(stat => {
        observer.observe(stat);
    });
}

// Export for external use
window.AscendExpo = {
    eventData,
    updateEventData
};
