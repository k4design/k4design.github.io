// JavaScript Snippet for Lofty.com - News Section Interactivity

// News section functionality
document.addEventListener('DOMContentLoaded', function() {
    initNewsSection();
});

function initNewsSection() {
    // Load images from article URLs first
    loadNewsImages().then(() => {
        // Initialize news cards animations
        initNewsAnimations();
        
        // Initialize news card interactions
        initNewsCardInteractions();
        
        // Initialize news filtering (if needed)
        initNewsFiltering();
        
        // Initialize news pagination (if needed)
        initNewsPagination();
        
        // Initialize news sharing
        initNewsSharing();
    });
}

// Load images from article URLs
async function loadNewsImages() {
    const newsCards = document.querySelectorAll('.news-card');
    
    for (const card of newsCards) {
        const readMoreLink = card.querySelector('.read-more');
        if (!readMoreLink || !readMoreLink.href || readMoreLink.href === '#') {
            continue;
        }
        
        const articleUrl = readMoreLink.href;
        const newsImage = card.querySelector('.news-image');
        
        try {
            // Show loading state
            newsImage.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
            newsImage.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i></div>';
            
            // Fetch image from URL using Open Graph protocol or use a service
            const imageUrl = await getImageFromArticle(articleUrl);
            
            if (imageUrl) {
                // Create img element
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.alt = card.querySelector('h3')?.textContent || 'News article';
                
                // Handle image load errors
                img.onerror = function() {
                    newsImage.classList.add('error');
                    const sourceText = card.querySelector('.news-content > div > span:nth-child(2)')?.textContent || card.querySelector('.news-content').textContent.split('\n')[0] || 'News';
                    newsImage.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;"><div style="text-align: center;"><div style="font-size: 3rem; margin-bottom: 0.5rem;">📰</div><div>' + sourceText + '</div></div></div>';
                };
                
                // Clear existing content and add image
                newsImage.innerHTML = '';
                newsImage.style.background = 'none';
                newsImage.appendChild(img);
            } else {
                // No image found, restore placeholder with source name
                const sourceText = card.querySelector('.news-content > div > span:nth-child(2)')?.textContent || card.querySelector('.news-content').textContent.split('\n')[0] || 'News';
                newsImage.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 1.5rem; font-weight: 600;"><div style="text-align: center;"><div style="font-size: 2rem; margin-bottom: 0.5rem;">📰</div><div>' + sourceText + '</div></div></div>';
            }
        } catch (error) {
            console.error('Error loading image for:', articleUrl, error);
            // Keep the default placeholder if image fails to load
            const sourceText = card.querySelector('.news-content > div > span:nth-child(2)')?.textContent || 'News';
            newsImage.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 1.5rem; font-weight: 600;"><div style="text-align: center;"><div style="font-size: 2rem; margin-bottom: 0.5rem;">📰</div><div>' + sourceText + '</div></div></div>';
        }
    }
}

// Get image from article URL
async function getImageFromArticle(url) {
    try {
        // Use a CORS proxy to fetch the article HTML
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch article');
        }
        
        const html = await response.text();
        
        // Parse HTML to find Open Graph image
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
            return ogImageMatch[1];
        }
        
        // Fallback to twitter:image
        const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
        if (twitterImageMatch && twitterImageMatch[1]) {
            return twitterImageMatch[1];
        }
        
        // Fallback to first large image in article content
        const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        if (imgMatch && imgMatch[1]) {
            // Make sure it's an absolute URL
            if (imgMatch[1].startsWith('http')) {
                return imgMatch[1];
            } else if (imgMatch[1].startsWith('//')) {
                return 'https:' + imgMatch[1];
            } else if (imgMatch[1].startsWith('/')) {
                const urlObj = new URL(url);
                return urlObj.origin + imgMatch[1];
            }
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
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 100); // Stagger animation
            }
        });
    }, observerOptions);
    
    // Observe all news cards
    const newsCards = document.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        observer.observe(card);
    });
}

// News card interactions
function initNewsCardInteractions() {
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-12px) scale(1.02)';
            this.style.boxShadow = '0 25px 80px rgba(0, 146, 255, 0.3)';
            
            // Add glow effect
            this.style.border = '1px solid rgba(0, 146, 255, 0.5)';
            
            // Animate read more link
            const readMore = this.querySelector('.read-more');
            if (readMore) {
                readMore.style.transform = 'translateX(5px)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
            this.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            
            // Reset read more link
            const readMore = this.querySelector('.read-more');
            if (readMore) {
                readMore.style.transform = 'translateX(0)';
            }
        });
        
        // Click handler for news cards
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on read more link
            if (e.target.classList.contains('read-more')) {
                return;
            }
            
            const readMore = this.querySelector('.read-more');
            if (readMore) {
                // Add ripple effect
                createRippleEffect(this, e);
                
                // Navigate to article
                setTimeout(() => {
                    window.open(readMore.href, '_blank');
                }, 300);
            }
        });
        
        // Read more link click handler
        const readMore = card.querySelector('.read-more');
        if (readMore) {
            readMore.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Add click animation
                this.style.transform = 'translateX(8px) scale(1.05)';
                setTimeout(() => {
                    this.style.transform = 'translateX(5px) scale(1)';
                }, 150);
                
                // Track click (analytics)
                trackNewsClick(this.href, this.closest('.news-card').querySelector('h3').textContent);
            });
        }
    });
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

// News filtering functionality
function initNewsFiltering() {
    // Create filter buttons if they don't exist
    const newsSection = document.querySelector('.news');
    if (!newsSection) return;
    
    const container = newsSection.querySelector('.container');
    const newsGrid = newsSection.querySelector('.news-grid');
    
    if (!container || !newsGrid) return;
    
    // Add filter buttons
    const filterButtons = document.createElement('div');
    filterButtons.className = 'news-filters';
    filterButtons.innerHTML = `
        <button class="news-filter-btn active" data-filter="all">All News</button>
        <button class="news-filter-btn" data-filter="launch">Launch</button>
        <button class="news-filter-btn" data-filter="expansion">Expansion</button>
        <button class="news-filter-btn" data-filter="awards">Awards</button>
        <button class="news-filter-btn" data-filter="partnerships">Partnerships</button>
    `;
    
    // Insert filter buttons before news grid
    newsGrid.parentNode.insertBefore(filterButtons, newsGrid);
    
    // Add filter functionality
    const filterBtns = filterButtons.querySelectorAll('.news-filter-btn');
    const newsCards = newsGrid.querySelectorAll('.news-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            
            // Filter news cards
            newsCards.forEach((card, index) => {
                const category = card.dataset.category || 'all';
                
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    card.style.animationDelay = `${index * 0.1}s`;
                    card.classList.add('animate-in');
                } else {
                    card.style.display = 'none';
                    card.classList.remove('animate-in');
                }
            });
        });
    });
}

// News pagination functionality
function initNewsPagination() {
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;
    
    const newsCards = newsGrid.querySelectorAll('.news-card');
    const cardsPerPage = 6;
    const totalPages = Math.ceil(newsCards.length / cardsPerPage);
    
    if (totalPages <= 1) return;
    
    // Create pagination
    const pagination = document.createElement('div');
    pagination.className = 'news-pagination';
    
    // Add pagination buttons
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `news-pagination-btn ${i === 1 ? 'active' : ''}`;
        btn.textContent = i;
        btn.dataset.page = i;
        pagination.appendChild(btn);
    }
    
    // Insert pagination after news grid
    newsGrid.parentNode.appendChild(pagination);
    
    // Add pagination functionality
    const paginationBtns = pagination.querySelectorAll('.news-pagination-btn');
    
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            
            // Update active button
            paginationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide cards based on page
            newsCards.forEach((card, index) => {
                const startIndex = (page - 1) * cardsPerPage;
                const endIndex = startIndex + cardsPerPage;
                
                if (index >= startIndex && index < endIndex) {
                    card.style.display = 'block';
                    card.style.animationDelay = `${(index - startIndex) * 0.1}s`;
                    card.classList.add('animate-in');
                } else {
                    card.style.display = 'none';
                    card.classList.remove('animate-in');
                }
            });
            
            // Scroll to top of news section
            newsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// News sharing functionality
function initNewsSharing() {
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        const readMore = card.querySelector('.read-more');
        if (!readMore) return;
        
        // Add share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'news-share-btn';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
        shareBtn.title = 'Share this article';
        
        // Insert share button after read more
        readMore.parentNode.insertBefore(shareBtn, readMore.nextSibling);
        
        // Add share functionality
        shareBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showShareModal(readMore.href, card.querySelector('h3').textContent);
        });
    });
}

// Share modal
function showShareModal(url, title) {
    const modal = document.createElement('div');
    modal.className = 'news-share-modal-overlay';
    modal.innerHTML = `
        <div class="news-share-modal">
            <div class="news-share-header">
                <h3>Share Article</h3>
                <button class="news-share-close">&times;</button>
            </div>
            <div class="news-share-content">
                <p>Share "${title}"</p>
                <div class="news-share-buttons">
                    <button class="share-btn twitter" data-platform="twitter">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button class="share-btn facebook" data-platform="facebook">
                        <i class="fab fa-facebook"></i> Facebook
                    </button>
                    <button class="share-btn linkedin" data-platform="linkedin">
                        <i class="fab fa-linkedin"></i> LinkedIn
                    </button>
                    <button class="share-btn email" data-platform="email">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                </div>
                <div class="news-share-url">
                    <input type="text" value="${url}" readonly>
                    <button class="copy-url-btn">Copy</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .news-share-modal-overlay {
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
        }
        
        .news-share-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(0, 146, 255, 0.3);
            box-shadow: 0 25px 60px rgba(0, 146, 255, 0.2);
        }
        
        .news-share-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .news-share-header h3 {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: 300;
        }
        
        .news-share-close {
            background: none;
            border: none;
            color: #ffffff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .news-share-content p {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
            font-size: 1rem;
        }
        
        .news-share-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .share-btn {
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
        }
        
        .share-btn:hover {
            background: rgba(0, 146, 255, 0.2);
            border-color: rgba(0, 146, 255, 0.5);
            transform: translateY(-2px);
        }
        
        .news-share-url {
            display: flex;
            gap: 0.5rem;
        }
        
        .news-share-url input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 0.9rem;
        }
        
        .copy-url-btn {
            padding: 10px 16px;
            background: var(--accent-blue);
            color: #000000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .copy-url-btn:hover {
            background: var(--accent-blue-light);
            transform: translateY(-1px);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.news-share-close');
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
    
    // Share button functionality
    const shareBtns = modal.querySelectorAll('.share-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.dataset.platform;
            shareToPlatform(platform, url, title);
        });
    });
    
    // Copy URL functionality
    const copyBtn = modal.querySelector('.copy-url-btn');
    copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(url).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => {
                this.textContent = 'Copy';
            }, 2000);
        });
    });
}

// Share to specific platform
function shareToPlatform(platform, url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    
    let shareUrl = '';
    
    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
            break;
        case 'email':
            shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Track news click (analytics)
function trackNewsClick(url, title) {
    // Add your analytics tracking here
    console.log('News clicked:', { url, title });
    
    // Example: Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'news_click', {
            'event_category': 'engagement',
            'event_label': title,
            'value': 1
        });
    }
}

// Add CSS for animations
document.addEventListener('DOMContentLoaded', function() {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
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
        
        .news-share-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
            margin-left: 0.5rem;
        }
        
        .news-share-btn:hover {
            color: var(--accent-blue);
            background: rgba(0, 146, 255, 0.1);
        }
    `;
    document.head.appendChild(animationStyles);
});
