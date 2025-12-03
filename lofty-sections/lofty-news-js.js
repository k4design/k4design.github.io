// JavaScript Snippet for Lofty.com - News Section Infinite Carousel

document.addEventListener('DOMContentLoaded', function() {
    initNewsCarousel();
    initNewsImages();
    initNewsAnimations();
});

// Initialize infinite carousel with drag and swipe
function initNewsCarousel() {
    const wrapper = document.querySelector('.news-carousel-wrapper');
    const container = document.querySelector('.news-carousel-container');
    const track = document.querySelector('.news-carousel-track');
    
    if (!wrapper || !track) return;
    
    const cards = Array.from(track.querySelectorAll('.news-card'));
    if (cards.length === 0) return;
    
    // Clone cards for infinite loop
    const clonedCardsStart = cards.slice().map(card => card.cloneNode(true));
    const clonedCardsEnd = cards.slice().map(card => card.cloneNode(true));
    
    clonedCardsStart.forEach(card => {
        card.setAttribute('data-cloned', 'start');
        track.insertBefore(card, track.firstChild);
    });
    
    clonedCardsEnd.forEach(card => {
        card.setAttribute('data-cloned', 'end');
        track.appendChild(card);
    });
    
    // Get card width including gap
    const cardWidth = cards[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(track).gap) || 40;
    const cardWidthWithGap = cardWidth + gap;
    
    // Calculate initial position (center on original cards)
    const originalCardsWidth = cards.length * cardWidthWithGap;
    const startOffset = originalCardsWidth;
    let currentPosition = startOffset;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let animationId = null;
    let velocity = 0;
    let lastPosition = 0;
    let lastTime = Date.now();
    
    // Set initial position
    track.style.transform = `translateX(-${currentPosition}px)`;
    
    // Mouse drag handlers
    wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        
        isDragging = true;
        wrapper.style.cursor = 'grabbing';
        track.classList.add('dragging');
        startX = e.clientX;
        lastPosition = currentPosition;
        lastTime = Date.now();
        velocity = 0;
        
        // Cancel any ongoing animation
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        currentX = deltaX;
        
        // Update position
        currentPosition = lastPosition - deltaX;
        track.style.transform = `translateX(-${currentPosition}px)`;
        
        // Calculate velocity for momentum scrolling
        const now = Date.now();
        const timeDelta = now - lastTime;
        if (timeDelta > 0) {
            velocity = (currentPosition - lastPosition) / timeDelta;
            lastPosition = currentPosition;
            lastTime = now;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        wrapper.style.cursor = 'grab';
        track.classList.remove('dragging');
        
        // Apply momentum scrolling
        if (Math.abs(velocity) > 0.5) {
            applyMomentum(velocity);
        } else {
            snapToNearestCard();
        }
    });
    
    // Touch swipe handlers
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let isTouching = false;
    
    wrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
        lastPosition = currentPosition;
        lastTime = Date.now();
        velocity = 0;
        
        // Cancel any ongoing animation
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        e.preventDefault();
    }, { passive: false });
    
    wrapper.addEventListener('touchmove', (e) => {
        if (!isTouching) return;
        
        const touch = e.touches[0];
        touchCurrentX = touch.clientX;
        
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Only scroll horizontally if horizontal movement is greater
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            currentX = deltaX;
            currentPosition = lastPosition - deltaX;
            track.style.transform = `translateX(-${currentPosition}px)`;
            track.style.transition = 'none';
            
            // Calculate velocity
            const now = Date.now();
            const timeDelta = now - lastTime;
            if (timeDelta > 0) {
                velocity = (currentPosition - lastPosition) / timeDelta;
                lastPosition = currentPosition;
                lastTime = now;
            }
            
            e.preventDefault();
        }
    }, { passive: false });
    
    wrapper.addEventListener('touchend', () => {
        if (!isTouching) return;
        
        isTouching = false;
        track.style.transition = 'transform 0.3s ease-out';
        
        // Apply momentum scrolling
        if (Math.abs(velocity) > 0.5) {
            applyMomentum(velocity);
        } else {
            snapToNearestCard();
        }
    });
    
    // Momentum scrolling function
    function applyMomentum(initialVelocity) {
        let currentVelocity = initialVelocity;
        const friction = 0.95;
        const minVelocity = 0.5;
        
        function animate() {
            if (Math.abs(currentVelocity) < minVelocity) {
                snapToNearestCard();
                return;
            }
            
            currentPosition -= currentVelocity;
            track.style.transform = `translateX(-${currentPosition}px)`;
            currentVelocity *= friction;
            
            // Check boundaries and loop
            checkAndLoop();
            
            animationId = requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    // Snap to nearest card
    function snapToNearestCard() {
        const totalCardWidth = cardWidthWithGap;
        const snappedPosition = Math.round(currentPosition / totalCardWidth) * totalCardWidth;
        
        currentPosition = snappedPosition;
        track.style.transition = 'transform 0.3s ease-out';
        track.style.transform = `translateX(-${currentPosition}px)`;
        
        // Check and loop after transition
        setTimeout(() => {
            checkAndLoop();
        }, 300);
    }
    
    // Infinite loop logic
    function checkAndLoop() {
        const totalCards = cards.length;
        const totalWidth = totalCards * cardWidthWithGap;
        
        // If we've scrolled past the end clones, jump to start
        if (currentPosition >= totalWidth * 2) {
            currentPosition -= totalWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentPosition}px)`;
        }
        // If we've scrolled before the start clones, jump to end
        else if (currentPosition < totalWidth) {
            currentPosition += totalWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentPosition}px)`;
        }
    }
    
    // Prevent clicks during drag
    wrapper.addEventListener('click', (e) => {
        if (Math.abs(currentX) > 10) {
            e.preventDefault();
            e.stopPropagation();
        }
        currentX = 0;
    }, true);
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newCardWidth = cards[0].offsetWidth;
            const newGap = parseFloat(getComputedStyle(track).gap) || 40;
            const newCardWidthWithGap = newCardWidth + newGap;
            const newTotalWidth = cards.length * newCardWidthWithGap;
            
            // Recalculate position
            const cardIndex = Math.round((currentPosition - startOffset) / cardWidthWithGap);
            currentPosition = startOffset + (cardIndex * newCardWidthWithGap);
            
            track.style.transform = `translateX(-${currentPosition}px)`;
        }, 250);
    });
    
    // Auto-play (optional - can be disabled)
    // Uncomment to enable auto-scroll
    /*
    setInterval(() => {
        if (!isDragging && !isTouching) {
            currentPosition += cardWidthWithGap;
            track.style.transition = 'transform 0.5s ease-out';
            track.style.transform = `translateX(-${currentPosition}px)`;
            setTimeout(() => {
                checkAndLoop();
            }, 500);
        }
    }, 5000);
    */
}

// Load images (keep existing functionality)
async function initNewsImages() {
    const newsCards = document.querySelectorAll('.news-card:not([data-cloned])');
    
    for (const card of newsCards) {
        const readMoreLink = card.querySelector('.read-more');
        if (!readMoreLink || !readMoreLink.href || readMoreLink.href === '#') {
            continue;
        }
        
        const articleUrl = readMoreLink.href;
        const newsImage = card.querySelector('.news-image');
        
        if (!newsImage || newsImage.querySelector('img')) {
            continue;
        }
        
        try {
            const imageUrl = await getImageFromArticle(articleUrl);
            
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.alt = card.querySelector('h3')?.textContent || 'News article';
                
                img.onerror = function() {
                    newsImage.classList.add('error');
                    const sourceText = card.querySelector('.news-content > div > span:nth-child(2)')?.textContent || 'News';
                    newsImage.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;"><div style="text-align: center;"><div style="font-size: 3rem; margin-bottom: 0.5rem;">📰</div><div>' + sourceText + '</div></div></div>';
                };
                
                newsImage.innerHTML = '';
                newsImage.style.background = 'none';
                newsImage.appendChild(img);
            }
        } catch (error) {
            console.error('Error loading image for:', articleUrl, error);
        }
    }
}

// Get image from article URL
async function getImageFromArticle(url) {
    try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch article');
        }
        
        const html = await response.text();
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
            return ogImageMatch[1];
        }
        
        const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
        if (twitterImageMatch && twitterImageMatch[1]) {
            return twitterImageMatch[1];
        }
        
        return null;
    } catch (error) {
        console.error('Error getting image from article:', error);
        return null;
    }
}

// News card animations
function initNewsAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    const newsCards = document.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        observer.observe(card);
    });
}
