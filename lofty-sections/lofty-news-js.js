// JavaScript Snippet for Lofty.com - News Section Infinite Carousel

document.addEventListener('DOMContentLoaded', function() {
    initNewsCarousel();
    initNewsImages();
    initNewsLoadMore();
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
    
    // Auto-scroll variables
    let autoScrollAnimationId = null;
    let autoScrollTimeout = null;
    let isAutoScrolling = false;
    const autoScrollSpeed = 0.25; // pixels per frame (slower, smoother)
    const autoScrollDelay = 3000; // 3 seconds delay after user stops
    
    // Set initial position
    track.style.transform = `translateX(-${currentPosition}px)`;
    
    // Smooth drag tracking variables
    let targetDragPosition = currentPosition;
    let dragAnimationId = null;
    
    // Auto-scroll functions
    function stopAutoScroll() {
        if (autoScrollTimeout) {
            clearTimeout(autoScrollTimeout);
            autoScrollTimeout = null;
        }
        
        if (autoScrollAnimationId) {
            cancelAnimationFrame(autoScrollAnimationId);
            autoScrollAnimationId = null;
        }
        
        isAutoScrolling = false;
        track.style.transition = 'transform 0.3s ease-out';
    }
    
    function startAutoScroll() {
        // Clear any existing auto-scroll
        stopAutoScroll();
        
        // Wait 3 seconds before starting
        autoScrollTimeout = setTimeout(() => {
            if (isDragging || isTouching) return;
            
            isAutoScrolling = true;
            track.style.transition = 'none';
            
            function autoScroll() {
                if (isDragging || isTouching || !isAutoScrolling) {
                    stopAutoScroll();
                    return;
                }
                
                // Smooth continuous scrolling
                currentPosition += autoScrollSpeed;
                track.style.transform = `translateX(-${currentPosition}px)`;
                
                // Check and handle infinite loop
                checkAndLoop();
                
                // Continue animation
                autoScrollAnimationId = requestAnimationFrame(autoScroll);
            }
            
            autoScroll();
        }, autoScrollDelay);
    }
    
    // Smooth drag position update function
    function updateDragPosition() {
        if (!isDragging && !isTouching) {
            dragAnimationId = null;
            return;
        }
        
        // Smooth interpolation towards target position
        const smoothingFactor = 0.25; // Higher = smoother but more lag, lower = more responsive
        const diff = targetDragPosition - currentPosition;
        currentPosition += diff * smoothingFactor;
        
        track.style.transform = `translateX(-${currentPosition}px)`;
        
        // Calculate velocity for momentum scrolling
        const now = Date.now();
        const timeDelta = now - lastTime;
        if (timeDelta > 0) {
            velocity = (currentPosition - lastPosition) / timeDelta;
            lastPosition = currentPosition;
            lastTime = now;
        }
        
        // Continue smoothing animation
        if (isDragging || isTouching) {
            dragAnimationId = requestAnimationFrame(updateDragPosition);
        }
    }
    
    // Mouse drag handlers
    wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        
        stopAutoScroll(); // Stop auto-scroll when user interacts
        
        // Cancel any existing drag animation
        if (dragAnimationId) {
            cancelAnimationFrame(dragAnimationId);
            dragAnimationId = null;
        }
        
        isDragging = true;
        wrapper.style.cursor = 'grabbing';
        track.classList.add('dragging');
        startX = e.clientX;
        lastPosition = currentPosition;
        targetDragPosition = currentPosition;
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
        
        // Apply damping factor for less sensitive movement (0.55 = 55% of mouse movement)
        const dragSensitivity = 0.55;
        const dampedDelta = deltaX * dragSensitivity;
        
        // Update target position (will be smoothly interpolated)
        targetDragPosition = lastPosition - dampedDelta;
        
        // Start smooth animation loop if not already running
        if (!dragAnimationId) {
            dragAnimationId = requestAnimationFrame(updateDragPosition);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        wrapper.style.cursor = 'grab';
        track.classList.remove('dragging');
        
        // Stop drag animation
        if (dragAnimationId) {
            cancelAnimationFrame(dragAnimationId);
            dragAnimationId = null;
        }
        
        // Update lastPosition to current smoothed position
        lastPosition = currentPosition;
        
        // Apply momentum scrolling
        if (Math.abs(velocity) > 0.5) {
            applyMomentum(velocity);
            // Restart auto-scroll after momentum ends
            setTimeout(() => {
                startAutoScroll();
            }, 500);
        } else {
            snapToNearestCard();
            // Restart auto-scroll after snap completes
            setTimeout(() => {
                startAutoScroll();
            }, 300);
        }
    });
    
    // Touch swipe handlers
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let isTouching = false;
    
    wrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        
        stopAutoScroll(); // Stop auto-scroll when user interacts
        
        // Cancel any existing drag animation
        if (dragAnimationId) {
            cancelAnimationFrame(dragAnimationId);
            dragAnimationId = null;
        }
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
        lastPosition = currentPosition;
        targetDragPosition = currentPosition;
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
            
            // Apply damping factor for less sensitive movement (0.55 = 55% of touch movement)
            const dragSensitivity = 0.55;
            const dampedDelta = deltaX * dragSensitivity;
            
            // Update target position (will be smoothly interpolated)
            targetDragPosition = lastPosition - dampedDelta;
            
            track.style.transition = 'none';
            
            // Start smooth animation loop if not already running
            if (!dragAnimationId) {
                dragAnimationId = requestAnimationFrame(updateDragPosition);
            }
            
            e.preventDefault();
        }
    }, { passive: false });
    
    wrapper.addEventListener('touchend', () => {
        if (!isTouching) return;
        
        isTouching = false;
        track.style.transition = 'transform 0.3s ease-out';
        
        // Stop drag animation
        if (dragAnimationId) {
            cancelAnimationFrame(dragAnimationId);
            dragAnimationId = null;
        }
        
        // Update lastPosition to current smoothed position
        lastPosition = currentPosition;
        
        // Apply momentum scrolling
        if (Math.abs(velocity) > 0.5) {
            applyMomentum(velocity);
            // Restart auto-scroll after momentum ends
            setTimeout(() => {
                startAutoScroll();
            }, 500);
        } else {
            snapToNearestCard();
            // Restart auto-scroll after snap completes
            setTimeout(() => {
                startAutoScroll();
            }, 300);
        }
    });
    
    // Momentum scrolling function
    function applyMomentum(initialVelocity) {
        stopAutoScroll(); // Stop auto-scroll during momentum
        
        let currentVelocity = initialVelocity;
        const friction = 0.96; // Increased friction for slower, smoother deceleration
        const minVelocity = 0.3; // Lower threshold for smoother stopping
        
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
        stopAutoScroll(); // Stop auto-scroll during snap
        
        const totalCardWidth = cardWidthWithGap;
        const snappedPosition = Math.round(currentPosition / totalCardWidth) * totalCardWidth;
        
        currentPosition = snappedPosition;
        track.style.transition = 'transform 0.5s ease-out'; // Slower, smoother transition
        track.style.transform = `translateX(-${currentPosition}px)`;
        
        // Check and loop after transition
        setTimeout(() => {
            checkAndLoop();
        }, 500);
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
        stopAutoScroll(); // Stop auto-scroll during resize
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
            
            // Restart auto-scroll after resize
            startAutoScroll();
        }, 250);
    });
    
    // Start auto-scroll when page loads
    startAutoScroll();
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

// Load More functionality
function initNewsLoadMore() {
    const loadMoreBtn = document.getElementById('newsLoadMoreBtn');
    const newsCards = document.querySelectorAll('.news-card');
    const articlesPerLoad = 6;
    let currentlyVisible = 6;

    if (!loadMoreBtn) {
        return;
    }

    // Hide button if there are 6 or fewer articles
    if (newsCards.length <= currentlyVisible) {
        loadMoreBtn.classList.add('hidden');
        return;
    }

    loadMoreBtn.addEventListener('click', function() {
        const nextBatch = currentlyVisible + articlesPerLoad;
        
        // Show next 6 articles
        for (let i = currentlyVisible; i < nextBatch && i < newsCards.length; i++) {
            newsCards[i].style.display = 'block';
            // Reset animation state for newly revealed cards
            newsCards[i].classList.remove('animate-in');
            newsCards[i].style.opacity = '0';
            newsCards[i].style.transform = 'translateY(30px)';
        }

        currentlyVisible = Math.min(nextBatch, newsCards.length);

        // Hide button if all articles are shown
        if (currentlyVisible >= newsCards.length) {
            loadMoreBtn.classList.add('hidden');
        }

        // Trigger animations for newly revealed cards
        setTimeout(() => {
            initNewsAnimations();
        }, 50);
    });
}

// News card animations
function initNewsAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all visible news cards (not hidden)
    const newsCards = document.querySelectorAll('.news-card:not([style*="display: none"])');
    newsCards.forEach((card, index) => {
        // Only add delay if card doesn't already have one
        if (!card.style.transitionDelay) {
            card.style.transitionDelay = `${(index % 6) * 0.1}s`;
        }
        // Only observe if not already animated
        if (!card.classList.contains('animate-in')) {
            observer.observe(card);
        }
    });
    
    // Also observe the CTA section
    const ctaSection = document.querySelector('.news-cta-section');
    if (ctaSection && !ctaSection.classList.contains('animate-in')) {
        observer.observe(ctaSection);
    }
}
