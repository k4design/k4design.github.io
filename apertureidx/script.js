// Aperture Global Website JavaScript
// IDX MLS Feed Integration and Interactive Features

class ApertureWebsite {
    constructor() {
        this.currentPage = 1;
        this.propertiesPerPage = 12;
        this.allProperties = [];
        this.filteredProperties = [];
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialProperties();
        this.setupSmoothScrolling();
        this.setupMobileMenu();
        this.initCarousel();
    }

    setupEventListeners() {
        // Search and filter functionality
        const searchBtn = document.getElementById('search-btn');
        const loadMoreBtn = document.getElementById('load-more');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreProperties());
        }

        // Filter change events
        const filters = ['country-filter', 'location-filter', 'price-filter', 'type-filter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.handleSearch());
            }
        });

        // CTA button interactions
        const ctaButtons = document.querySelectorAll('.cta-button');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleCTAClick(e));
        });
    }

    setupSmoothScrolling() {
        // Smooth scrolling for navigation links
        const navLinks = document.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupMobileMenu() {
        // Mobile menu toggle (if needed for responsive design)
        const navMenu = document.querySelector('.nav-menu');
        const navContainer = document.querySelector('.nav-container');
        
        // Add mobile menu button if screen is small
        if (window.innerWidth <= 768) {
            this.createMobileMenuButton();
        }
    }

    createMobileMenuButton() {
        const navContainer = document.querySelector('.nav-container');
        const navMenu = document.querySelector('.nav-menu');
        
        if (!document.querySelector('.mobile-menu-btn')) {
            const mobileBtn = document.createElement('button');
            mobileBtn.className = 'mobile-menu-btn';
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            mobileBtn.style.cssText = `
                display: none;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #333;
                cursor: pointer;
            `;
            
            if (window.innerWidth <= 768) {
                mobileBtn.style.display = 'block';
            }
            
            mobileBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
            
            navContainer.appendChild(mobileBtn);
        }
    }

    // IDX MLS Feed Integration
    async loadInitialProperties() {
        this.showLoading();
        
        try {
            // Simulate MLS API call - Replace with actual IDX integration
            const properties = await this.fetchMLSProperties();
            this.allProperties = properties;
            this.filteredProperties = [...properties];
            this.displayProperties();
        } catch (error) {
            console.error('Error loading properties:', error);
            this.showError('Failed to load properties. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchMLSProperties() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // International MLS data - Replace with actual IDX API integration
        return [
            // United States Properties
            {
                id: 1,
                address: "123 Ocean Drive, Miami Beach, FL 33139",
                price: 8950000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 4500,
                propertyType: "condo",
                status: "active",
                image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop",
                description: "Luxury oceanfront condo with panoramic views",
                location: "miami",
                country: "usa"
            },
            {
                id: 2,
                address: "789 Hutchinson Island, FL 34949",
                price: 30000000,
                bedrooms: 8,
                bathrooms: 10,
                squareFeet: 12000,
                propertyType: "estate",
                status: "active",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
                description: "Estate with private beach access and tennis court",
                location: "hutchinson",
                country: "usa"
            },
            {
                id: 3,
                address: "321 Reunion Resort, Reunion, FL 34747",
                price: 14500000,
                bedrooms: 6,
                bathrooms: 7,
                squareFeet: 6500,
                propertyType: "single-family",
                status: "active",
                image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
                description: "Golf course estate with resort amenities",
                location: "reunion",
                country: "usa"
            },
            {
                id: 4,
                address: "555 Brickell Avenue, Miami, FL 33131",
                price: 12500000,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 4200,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Penthouse with city and bay views",
                location: "miami",
                country: "usa"
            },
            {
                id: 5,
                address: "777 Key Biscayne, Miami, FL 33149",
                price: 18500000,
                bedrooms: 7,
                bathrooms: 8,
                squareFeet: 8500,
                propertyType: "mansion",
                status: "active",
                image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
                description: "Waterfront estate with private dock",
                location: "miami",
                country: "usa"
            },
            {
                id: 6,
                address: "1 Central Park West, New York, NY 10023",
                price: 45000000,
                bedrooms: 6,
                bathrooms: 7,
                squareFeet: 8000,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Iconic penthouse overlooking Central Park",
                location: "new-york",
                country: "usa"
            },
            {
                id: 7,
                address: "123 Beverly Hills Drive, Beverly Hills, CA 90210",
                price: 25000000,
                bedrooms: 8,
                bathrooms: 12,
                squareFeet: 15000,
                propertyType: "mansion",
                status: "active",
                image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
                description: "Hollywood Hills mansion with infinity pool",
                location: "beverly-hills",
                country: "usa"
            },
            {
                id: 8,
                address: "456 Ocean Road, The Hamptons, NY 11968",
                price: 35000000,
                bedrooms: 10,
                bathrooms: 14,
                squareFeet: 18000,
                propertyType: "estate",
                status: "active",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
                description: "Oceanfront Hamptons estate with private beach",
                location: "hamptons",
                country: "usa"
            },

            // Caribbean Properties
            {
                id: 9,
                address: "456 Sunset Boulevard, Sint Maarten",
                price: 3249800,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 3800,
                propertyType: "villa",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Stunning beachfront villa with private pool",
                location: "sint-maarten",
                country: "caribbean"
            },
            {
                id: 10,
                address: "789 St. Jean Bay, St. Barts 97133",
                price: 8500000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 5500,
                propertyType: "villa",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Exclusive St. Barts villa with panoramic ocean views",
                location: "st-barts",
                country: "caribbean"
            },
            {
                id: 11,
                address: "123 Sandy Lane, Barbados BB24000",
                price: 12000000,
                bedrooms: 6,
                bathrooms: 8,
                squareFeet: 8000,
                propertyType: "estate",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Luxury beachfront estate on Sandy Lane",
                location: "barbados",
                country: "caribbean"
            },
            {
                id: 12,
                address: "456 Seven Mile Beach, Grand Cayman KY1-1200",
                price: 6500000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 6000,
                propertyType: "villa",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Cayman Islands beachfront villa with private dock",
                location: "cayman-islands",
                country: "caribbean"
            },

            // European Properties
            {
                id: 13,
                address: "1 Hyde Park Corner, London SW1X 7TA, UK",
                price: 25000000,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 4500,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Hyde Park penthouse with royal park views",
                location: "london",
                country: "europe"
            },
            {
                id: 14,
                address: "123 Avenue des Champs-Élysées, 75008 Paris, France",
                price: 18000000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 5000,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Champs-Élysées penthouse with Eiffel Tower views",
                location: "paris",
                country: "europe"
            },
            {
                id: 15,
                address: "456 Monte Carlo, Monaco 98000",
                price: 35000000,
                bedrooms: 6,
                bathrooms: 8,
                squareFeet: 7000,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Monaco penthouse overlooking the Mediterranean",
                location: "monaco",
                country: "europe"
            },
            {
                id: 16,
                address: "789 Lake Geneva, Switzerland 1820",
                price: 22000000,
                bedrooms: 8,
                bathrooms: 10,
                squareFeet: 12000,
                propertyType: "mansion",
                status: "active",
                image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
                description: "Swiss lakeside mansion with mountain views",
                location: "switzerland",
                country: "europe"
            },
            {
                id: 17,
                address: "321 Avenida da Liberdade, Lisbon 1250-096, Portugal",
                price: 8500000,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 4000,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Lisbon penthouse with Tagus River views",
                location: "lisbon",
                country: "europe"
            },
            {
                id: 18,
                address: "654 Boulevard de la Croisette, Cannes 06400, France",
                price: 15000000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 5500,
                propertyType: "villa",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Cannes beachfront villa on the Croisette",
                location: "cannes",
                country: "europe"
            },

            // Asian Properties
            {
                id: 19,
                address: "1 Marina Bay Sands, Singapore 018956",
                price: 28000000,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 4200,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Marina Bay Sands penthouse with city skyline views",
                location: "singapore",
                country: "asia"
            },
            {
                id: 20,
                address: "123 The Peak, Hong Kong",
                price: 45000000,
                bedrooms: 5,
                bathrooms: 6,
                squareFeet: 6000,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "The Peak penthouse with Victoria Harbour views",
                location: "hong-kong",
                country: "asia"
            },
            {
                id: 21,
                address: "456 Roppongi Hills, Tokyo 106-0032, Japan",
                price: 18000000,
                bedrooms: 4,
                bathrooms: 5,
                squareFeet: 3800,
                propertyType: "penthouse",
                status: "active",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
                description: "Tokyo penthouse with city and Mount Fuji views",
                location: "tokyo",
                country: "asia"
            },
            {
                id: 22,
                address: "789 Palm Jumeirah, Dubai, UAE",
                price: 32000000,
                bedrooms: 6,
                bathrooms: 8,
                squareFeet: 8000,
                propertyType: "villa",
                status: "active",
                image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
                description: "Palm Jumeirah villa with private beach access",
                location: "dubai",
                country: "middle-east"
            }
        ];
    }

    handleSearch() {
        const countryFilter = document.getElementById('country-filter').value;
        const locationFilter = document.getElementById('location-filter').value;
        const priceFilter = document.getElementById('price-filter').value;
        const typeFilter = document.getElementById('type-filter').value;

        this.filteredProperties = this.allProperties.filter(property => {
            let matches = true;

            // Country filter
            if (countryFilter && property.country !== countryFilter) {
                matches = false;
            }

            // Location filter
            if (locationFilter && property.location !== locationFilter) {
                matches = false;
            }

            // Price filter
            if (priceFilter && matches) {
                const [min, max] = priceFilter.split('-').map(p => 
                    p === '+' ? Infinity : parseInt(p)
                );
                if (property.price < min || (max !== Infinity && property.price > max)) {
                    matches = false;
                }
            }

            // Type filter
            if (typeFilter && property.propertyType !== typeFilter) {
                matches = false;
            }

            return matches;
        });

        this.currentPage = 1;
        this.displayProperties();
    }

    displayProperties() {
        const container = document.getElementById('mls-properties');
        if (!container) return;

        const startIndex = 0;
        const endIndex = this.currentPage * this.propertiesPerPage;
        const propertiesToShow = this.filteredProperties.slice(startIndex, endIndex);

        if (this.currentPage === 1) {
            container.innerHTML = '';
        }

        if (propertiesToShow.length === 0) {
            container.innerHTML = '<div class="no-properties">No properties found matching your criteria.</div>';
            return;
        }

        propertiesToShow.forEach(property => {
            const propertyCard = this.createPropertyCard(property);
            container.appendChild(propertyCard);
        });

        this.updateLoadMoreButton();
    }

    createPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'mls-property-card';
        
        // Get country display name
        const countryNames = {
            'usa': 'United States',
            'caribbean': 'Caribbean',
            'europe': 'Europe',
            'asia': 'Asia',
            'middle-east': 'Middle East',
            'south-america': 'South America'
        };
        
        const countryName = countryNames[property.country] || property.country;
        
        card.innerHTML = `
            <div class="mls-property-image">
                <img src="${property.image}" alt="${property.address}" loading="lazy">
                <div class="property-price">$${this.formatPrice(property.price)}</div>
                <div class="property-status status-${property.status}">${property.status}</div>
                <div class="property-country">${countryName}</div>
            </div>
            <div class="mls-property-info">
                <h3>${property.address}</h3>
                <div class="property-details">
                    <div class="property-detail">
                        <i class="fas fa-bed"></i>
                        <span>${property.bedrooms} beds</span>
                    </div>
                    <div class="property-detail">
                        <i class="fas fa-bath"></i>
                        <span>${property.bathrooms} baths</span>
                    </div>
                    <div class="property-detail">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${property.squareFeet.toLocaleString()} sq ft</span>
                    </div>
                </div>
                <button class="view-details-btn" onclick="apertureWebsite.viewPropertyDetails(${property.id})">
                    View Details
                </button>
            </div>
        `;
        return card;
    }

    formatPrice(price) {
        if (price >= 1000000) {
            return (price / 1000000).toFixed(1) + 'M';
        } else if (price >= 1000) {
            return (price / 1000).toFixed(0) + 'K';
        }
        return price.toLocaleString();
    }

    loadMoreProperties() {
        if (this.isLoading) return;
        
        this.currentPage++;
        this.displayProperties();
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more');
        const totalShown = this.currentPage * this.propertiesPerPage;
        
        if (loadMoreBtn) {
            if (totalShown >= this.filteredProperties.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        }
    }

    viewPropertyDetails(propertyId) {
        const property = this.allProperties.find(p => p.id === propertyId);
        if (property) {
            // Redirect to appropriate property page based on property ID
            const propertyPages = {
                1: 'property-manhattan-penthouse.html',
                2: 'property-beverly-hills-estate.html',
                3: 'property-monaco-villa.html',
                4: 'property-london-mansion.html'
            };
            
            const pageUrl = propertyPages[propertyId];
            if (pageUrl) {
                window.location.href = pageUrl;
            } else {
                // Fallback to modal for properties without dedicated pages
                this.showPropertyModal(property);
            }
        }
    }

    showPropertyModal(property) {
        // Create and show property details modal
        const modal = document.createElement('div');
        modal.className = 'property-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="this.closest('.property-modal').remove()">&times;</button>
                    <div class="modal-image">
                        <img src="${property.image}" alt="${property.address}">
                    </div>
                    <div class="modal-info">
                        <h2>${property.address}</h2>
                        <div class="modal-price">$${this.formatPrice(property.price)}</div>
                        <div class="modal-details">
                            <div class="detail-item">
                                <i class="fas fa-bed"></i>
                                <span>${property.bedrooms} Bedrooms</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-bath"></i>
                                <span>${property.bathrooms} Bathrooms</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-ruler-combined"></i>
                                <span>${property.squareFeet.toLocaleString()} Square Feet</span>
                            </div>
                        </div>
                        <p class="modal-description">${property.description}</p>
                        <div class="modal-actions">
                            <button class="cta-button" onclick="apertureWebsite.contactAboutProperty(${property.id})">
                                Contact About This Property
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .property-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            .modal-overlay {
                background: rgba(0, 0, 0, 0.8);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .modal-content {
                background: white;
                border-radius: 10px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            .modal-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 0, 0, 0.5);
                color: white;
                border: none;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                z-index: 1;
            }
            .modal-image {
                height: 300px;
                overflow: hidden;
            }
            .modal-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .modal-info {
                padding: 2rem;
            }
            .modal-price {
                font-size: 2rem;
                font-weight: 700;
                color: #8B4513;
                margin: 1rem 0;
            }
            .modal-details {
                display: flex;
                gap: 2rem;
                margin: 1.5rem 0;
            }
            .detail-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .detail-item i {
                color: #8B4513;
            }
            .modal-description {
                margin: 1.5rem 0;
                line-height: 1.6;
            }
            .modal-actions {
                margin-top: 2rem;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    contactAboutProperty(propertyId) {
        const property = this.allProperties.find(p => p.id === propertyId);
        if (property) {
            // Open contact form or redirect to contact page
            window.location.href = `#contact`;
            // You could also open a contact modal here
        }
    }

    handleCTAClick(event) {
        const button = event.target;
        const text = button.textContent.toLowerCase();
        
        if (text.includes('learn more')) {
            document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
        } else if (text.includes('buyers') || text.includes('sellers')) {
            document.querySelector('#properties').scrollIntoView({ behavior: 'smooth' });
        } else if (text.includes('agent')) {
            // Open agent application form or redirect
            alert('Agent application form would open here');
        }
    }

    showLoading() {
        const container = document.getElementById('mls-properties');
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
    }

    hideLoading() {
        // Loading will be replaced by properties
    }

    showError(message) {
        const container = document.getElementById('mls-properties');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }


    // Carousel Functionality
    initCarousel() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.carousel-slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.autoplayInterval = null;
        this.autoplayDelay = 6000; // 6 seconds
        this.isAutoplayActive = true;

        // Setup carousel controls
        this.setupCarouselControls();
        
        // Start autoplay
        this.startAutoplay();
        
        // Update counter
        this.updateCounter();
        
        // Setup hover pause
        this.pauseAutoplayOnHover();
    }

    setupCarouselControls() {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const autoplayBtn = document.getElementById('autoplay-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousSlide());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => this.toggleAutoplay());
        }

        // Indicators
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.toggleAutoplay();
            }
        });

        // Touch/swipe support
        this.setupTouchSupport();
    }

    setupTouchSupport() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;

        const carousel = document.querySelector('.carousel-container');

        if (carousel) {
            carousel.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });

            carousel.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX;
                endY = e.changedTouches[0].clientY;
                this.handleSwipe(startX, startY, endX, endY);
            });
        }
    }

    handleSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;

        // Check if horizontal swipe is more significant than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                this.previousSlide();
            } else {
                this.nextSlide();
            }
        }
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.updateSlide();
    }

    previousSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.updateSlide();
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateSlide();
    }

    updateSlide() {
        // Update slides
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentSlide);
        });

        // Update indicators
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });

        // Update counter
        this.updateCounter();

        // Reset autoplay
        if (this.isAutoplayActive) {
            this.resetAutoplay();
        }
    }

    updateCounter() {
        const currentSlideElement = document.getElementById('current-slide');
        const totalSlidesElement = document.getElementById('total-slides');

        if (currentSlideElement) {
            currentSlideElement.textContent = this.currentSlide + 1;
        }

        if (totalSlidesElement) {
            totalSlidesElement.textContent = this.totalSlides;
        }
    }

    startAutoplay() {
        if (this.isAutoplayActive) {
            this.autoplayInterval = setInterval(() => {
                this.nextSlide();
            }, this.autoplayDelay);
        }
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

    resetAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }

    toggleAutoplay() {
        this.isAutoplayActive = !this.isAutoplayActive;
        const autoplayBtn = document.getElementById('autoplay-btn');
        const icon = autoplayBtn?.querySelector('i');

        if (this.isAutoplayActive) {
            this.startAutoplay();
            if (icon) {
                icon.className = 'fas fa-pause';
            }
        } else {
            this.stopAutoplay();
            if (icon) {
                icon.className = 'fas fa-play';
            }
        }
    }

    // Pause autoplay on hover
    pauseAutoplayOnHover() {
        const carousel = document.querySelector('.carousel-container');
        
        if (carousel) {
            carousel.addEventListener('mouseenter', () => {
                if (this.isAutoplayActive) {
                    this.stopAutoplay();
                }
            });

            carousel.addEventListener('mouseleave', () => {
                if (this.isAutoplayActive) {
                    this.startAutoplay();
                }
            });
        }
    }
}

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.apertureWebsite = new ApertureWebsite();
});

// Handle window resize for mobile menu and parallax
window.addEventListener('resize', () => {
    if (window.apertureWebsite) {
        window.apertureWebsite.setupMobileMenu();
        window.apertureWebsite.disableParallaxOnMobile();
    }
});

// Add CSS for mobile menu
const mobileMenuCSS = `
    @media (max-width: 768px) {
        .nav-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: white;
            flex-direction: column;
            padding: 1rem;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        .nav-menu.active {
            display: flex;
        }
        .mobile-menu-btn {
            display: block !important;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mobileMenuCSS;
document.head.appendChild(styleSheet);
