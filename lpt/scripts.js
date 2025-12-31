const navToggle = document.querySelector('.nav-toggle');
const navDrawer = document.querySelector('#nav-drawer');
const navOverlay = document.querySelector('#nav-overlay');

if (navToggle && navDrawer) {
  const navToggleLabel = navToggle.querySelector('.nav-toggle__label');
  const body = document.body;

  const focusFirstLink = () => {
    const firstLink = navDrawer.querySelector('a');
    if (!firstLink) return;
    try {
      firstLink.focus({ preventScroll: true });
    } catch (error) {
      firstLink.focus();
    }
  };

  const setMenuState = (isOpen) => {
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navDrawer.classList.toggle('is-open', isOpen);
    navDrawer.setAttribute('aria-hidden', String(!isOpen));
    if (navOverlay) {
      navOverlay.setAttribute('aria-hidden', String(!isOpen));
    }
    body.classList.toggle('is-locked', isOpen);
    if (navToggleLabel) {
      navToggleLabel.textContent = isOpen ? 'Close' : 'Menu';
    }
  };

  const closeMenu = ({ restoreFocus } = { restoreFocus: false }) => {
    setMenuState(false);
    if (restoreFocus) {
      navToggle.focus();
    }
  };

  const toggleMenu = () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    setMenuState(!isExpanded);
    if (!isExpanded) {
      focusFirstLink();
    }
  };

  navToggle.addEventListener('click', toggleMenu);

  // Close menu when clicking overlay
  if (navOverlay) {
    navOverlay.addEventListener('click', () => closeMenu());
  }

  navDrawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
      // Smooth scroll to anchor if it's a hash link
      if (link.getAttribute('href').startsWith('#')) {
        setTimeout(() => {
          const targetId = link.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    });
  });

  navDrawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu({ restoreFocus: true });
    }
  });

  const mediaQuery = window.matchMedia('(min-width: 1025px)');
  const handleMediaChange = (event) => {
    if (event.matches) {
      setMenuState(false);
    }
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleMediaChange);
  }

  // Initialize default state for accessibility
  setMenuState(false);
}

function bindForm(formId, successId) {
  const form = document.getElementById(formId);
  const success = successId ? document.getElementById(successId) : null;

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let isValid = true;

    form.querySelectorAll('input[required], select[required]').forEach((field) => {
      const error = form.querySelector(`#${field.id}Error`);
      const value = field.type === 'checkbox' ? field.checked : field.value.trim();

      if (!value) {
        isValid = false;
        field.classList.add('has-error');
        if (error) {
          error.style.display = 'block';
        }
      } else {
        field.classList.remove('has-error');
        if (error) {
          error.style.display = 'none';
        }
      }

      if (field.type === 'email' && value) {
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailPattern.test(field.value.trim())) {
          isValid = false;
          if (error) {
            error.textContent = 'Please enter valid email';
            error.style.display = 'block';
          }
        }
      }

      if (field.type === 'tel' && value) {
        const phonePattern = /^[0-9()+\-\s.]{7,}$/;
        if (!phonePattern.test(field.value.trim())) {
          isValid = false;
          if (error) {
            error.textContent = 'Please enter valid phone number';
            error.style.display = 'block';
          }
        }
      }
    });

    if (!form.checkValidity()) {
      isValid = false;
    }

    if (isValid) {
      form.reset();
      if (success) {
        success.classList.remove('hidden');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          success.classList.add('hidden');
        }, 6000);
      }
    }
  });
}

bindForm('hero-form', 'hero-success-message');
bindForm('contact-form', 'contact-success-message');

const chatToggle = document.getElementById('chatlio-button');
const chatForm = document.querySelector('.chat-entry__form');

if (chatToggle && chatForm) {
  chatToggle.addEventListener('click', () => {
    const isHidden = chatForm.classList.toggle('hidden');
    if (!isHidden) {
      chatForm.querySelector('input')?.focus();
    }
  });

  chatForm.classList.add('hidden');
}

document.querySelectorAll('input, select').forEach((field) => {
  field.addEventListener('input', () => {
    field.classList.remove('has-error');
    const error = document.getElementById(`${field.id}Error`);
    if (error) {
      error.style.display = 'none';
    }
  });
});

// Scroll Animation System
(function initScrollAnimations() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    return; // Skip animations if user prefers reduced motion
  }

  // Intersection Observer options
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px', // Trigger when element is 100px from bottom of viewport
    threshold: 0.1
  };

  // Animation observer
  const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        // Unobserve after animation to improve performance
        animationObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Find all elements with scroll-animate classes
  const animatedElements = document.querySelectorAll(
    '.scroll-animate, .scroll-animate--slide-up, .scroll-animate--slide-left, .scroll-animate--slide-right, .scroll-animate--fade, .scroll-animate--scale-up, .scroll-animate-stagger'
  );

  animatedElements.forEach((element) => {
    animationObserver.observe(element);
  });

  // Parallax effect for hero section (subtle)
  let lastScrollY = window.scrollY;
  const heroContent = document.querySelector('.hero__content');
  
  if (heroContent) {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroSection = document.querySelector('.hero');
      
      if (heroSection) {
        const heroHeight = heroSection.offsetHeight;
        const scrollProgress = Math.min(scrollY / heroHeight, 1);
        
        if (scrollProgress < 1) {
          heroContent.style.transform = `translateY(${scrollProgress * 20}px)`;
          heroContent.style.opacity = 1 - scrollProgress * 0.3;
        }
      }
      
      lastScrollY = scrollY;
    };

    // Throttle scroll events
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Parallax effect for dezzy-ai-background
  const dezzyAIBackground = document.querySelector('.dezzy-ai-background');
  const dezzyAISection = document.querySelector('.dezzy-ai-section');
  
  if (dezzyAIBackground && dezzyAISection) {
    const handleDezzyParallax = () => {
      const scrollY = window.scrollY;
      const sectionRect = dezzyAISection.getBoundingClientRect();
      const sectionTop = sectionRect.top + scrollY;
      const sectionHeight = dezzyAISection.offsetHeight;
      
      // Calculate when section enters and exits viewport
      const viewportHeight = window.innerHeight;
      const sectionStart = sectionTop - viewportHeight;
      const sectionEnd = sectionTop + sectionHeight;
      
      // Parallax speed factor (0.3 means background moves at 30% of scroll speed)
      // Negative value makes it move opposite to scroll direction
      const parallaxSpeed = -0.3;
      
      // Calculate parallax offset
      let parallaxOffset = 0;
      if (scrollY >= sectionStart && scrollY <= sectionEnd) {
        // Section is in viewport - apply parallax
        const scrollDistance = scrollY - sectionStart;
        parallaxOffset = scrollDistance * parallaxSpeed;
      } else if (scrollY > sectionEnd) {
        // Section has been scrolled past - keep final position
        const maxScrollDistance = sectionEnd - sectionStart;
        parallaxOffset = maxScrollDistance * parallaxSpeed;
      }
      
      // Apply parallax transform
      dezzyAIBackground.style.transform = `translateY(${parallaxOffset}px)`;
    };

    // Throttle scroll events for parallax
    let parallaxTicking = false;
    window.addEventListener('scroll', () => {
      if (!parallaxTicking) {
        window.requestAnimationFrame(() => {
          handleDezzyParallax();
          parallaxTicking = false;
        });
        parallaxTicking = true;
      }
    }, { passive: true });
    
    // Initial call
    handleDezzyParallax();
  }
})();

// Testimonial Carousel
(function initTestimonialCarousel() {
  const carouselTrack = document.getElementById('testimonial-carousel');
  if (!carouselTrack) return;

  const cards = Array.from(carouselTrack.querySelectorAll('.testimonial-card'));
  if (cards.length === 0) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return; // Don't animate if reduced motion is preferred
  }

  // Calculate card width including gap
  const getCardWidth = () => {
    const container = carouselTrack.parentElement;
    const containerWidth = container.offsetWidth;
    const gap = 32;
    let cardWidth;
    
    if (window.innerWidth <= 768) {
      cardWidth = containerWidth;
    } else if (window.innerWidth <= 1024) {
      cardWidth = (containerWidth - gap) / 2;
    } else {
      cardWidth = (containerWidth - gap * 2) / 3;
    }
    
    return cardWidth + gap;
  };

  let currentIndex = 0;
  let rotationInterval = null;
  let isPaused = false;
  const visibleCards = 3; // Number of cards to show at once

  // Duplicate cards for seamless infinite scroll (both ends)
  const duplicateCards = () => {
    // Clone all cards and prepend to beginning (for backward scrolling)
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('carousel-clone');
      clone.classList.add('carousel-clone-start');
      carouselTrack.insertBefore(clone, carouselTrack.firstChild);
    });
    
    // Clone all cards and append to end (for forward scrolling)
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('carousel-clone');
      clone.classList.add('carousel-clone-end');
      carouselTrack.appendChild(clone);
    });
  };

  duplicateCards();
  
  // Start in the middle of the original cards (after the prepended clones)
  // This ensures cards are visible on both edges from the start
  // We start at cards.length (start of originals) + half the cards to be in the middle
  const startOffset = Math.floor(cards.length / 2);
  currentIndex = cards.length + startOffset;

  // Check if a card is on the left edge (partially visible)
  const isLeftEdgeCard = (card) => {
    const cardRect = card.getBoundingClientRect();
    const containerRect = carouselTrack.parentElement.getBoundingClientRect();
    // Card is on left edge if its left edge is before or at container's left edge
    return cardRect.left <= containerRect.left && cardRect.right > containerRect.left;
  };

  // Check if a card is on the right edge (partially visible)
  const isRightEdgeCard = (card) => {
    const cardRect = card.getBoundingClientRect();
    const containerRect = carouselTrack.parentElement.getBoundingClientRect();
    // Card is on right edge if its right edge is at or after container's right edge
    return cardRect.right >= containerRect.right && cardRect.left < containerRect.right;
  };

  // Function to update card clickability styling
  const updateCardClickability = () => {
    const allCards = carouselTrack.querySelectorAll('.testimonial-card');
    allCards.forEach(card => {
      if (isLeftEdgeCard(card) || isRightEdgeCard(card)) {
        card.style.cursor = 'pointer';
        card.style.opacity = '0.9';
      } else {
        card.style.cursor = 'default';
        card.style.opacity = '1';
      }
    });
  };

  // Get total width of one set of cards
  const getScrollDistance = () => {
    if (cards.length === 0) return 0;
    
    // Try to get width from the first original card (which should be in the DOM)
    const firstCard = cards[0];
    if (!firstCard) return 0;
    
    const cardRect = firstCard.getBoundingClientRect();
    const gap = 32;
    
    // If card width is 0 or invalid, try to get from any visible card
    if (cardRect.width === 0 || isNaN(cardRect.width)) {
      // Try to find any card that has a valid width
      const allCards = carouselTrack.querySelectorAll('.testimonial-card');
      for (let card of allCards) {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && !isNaN(rect.width)) {
          return rect.width + gap;
        }
      }
      // Fallback: use getCardWidth calculation
      return getCardWidth();
    }
    
    return cardRect.width + gap;
  };

  // Set initial transition
  carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';

  // Update carousel position
  const updatePosition = () => {
    const scrollDistance = getScrollDistance();
    if (scrollDistance === 0 || isNaN(scrollDistance)) {
      // Cards not measured yet, skip this update
      return;
    }
    const totalOffset = scrollDistance * currentIndex;
    carouselTrack.style.transform = `translateX(-${totalOffset}px)`;
    // Update clickability after position changes
    setTimeout(updateCardClickability, 50);
  };

  // Move carousel forward (infinite loop)
  const moveCarouselForward = () => {
    if (isPaused) {
      pauseRotation();
    }

    currentIndex++;

    // If we've reached the end clones, seamlessly jump back to equivalent position in originals
    // Structure: [start clones: 0 to cards.length-1] [originals: cards.length to cards.length*2-1] [end clones: cards.length*2 to cards.length*3-1]
    if (currentIndex >= cards.length * 2) {
      // Jump back by cards.length to the equivalent position in originals (seamless loop)
      carouselTrack.style.transition = 'none';
      currentIndex = currentIndex - cards.length;
      updatePosition();
      
      // Re-enable transition after a brief moment
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        });
      });
    } else {
      // Ensure transition is enabled for normal movement
      if (carouselTrack.style.transition === 'none') {
        carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      updatePosition();
    }
  };

  // Move carousel backward (infinite loop)
  const moveCarouselBackward = () => {
    if (isPaused) {
      pauseRotation();
    }

    currentIndex--;

    // If we've reached the start clones, seamlessly jump forward to equivalent position in originals
    if (currentIndex < cards.length) {
      // Jump forward by cards.length to the equivalent position in originals (seamless loop)
      carouselTrack.style.transition = 'none';
      currentIndex = currentIndex + cards.length;
      updatePosition();
      
      // Re-enable transition after a brief moment
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        });
      });
    } else {
      // Ensure transition is enabled for normal movement
      if (carouselTrack.style.transition === 'none') {
        carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      updatePosition();
    }
  };

  // Auto-rotate function (for interval)
  const moveCarousel = () => {
    moveCarouselForward();
  };

  // Start rotation
  const startRotation = () => {
    if (rotationInterval) clearInterval(rotationInterval);
    rotationInterval = setInterval(moveCarousel, 5000);
  };

  // Pause rotation
  const pauseRotation = () => {
    isPaused = true;
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  };

  // Resume rotation
  const resumeRotation = () => {
    isPaused = false;
    startRotation();
  };

  // Initialize
  // Wait for DOM to be fully ready and cards to be measured
  const initializeCarousel = () => {
    // Check if cards are properly measured
    const scrollDistance = getScrollDistance();
    if (scrollDistance === 0 || isNaN(scrollDistance)) {
      // Cards not measured yet, retry after a short delay
      setTimeout(initializeCarousel, 100);
      return;
    }
    
    updatePosition();
    startRotation();
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeCarousel, 200);
    });
  } else {
    // Use setTimeout to ensure cards are measured
    setTimeout(initializeCarousel, 200);
  }
  
  // Also reinitialize on window load to catch any late-loading content
  window.addEventListener('load', () => {
    if (!rotationInterval) {
      setTimeout(initializeCarousel, 100);
    }
  });

  // Add click handlers using event delegation
  carouselTrack.addEventListener('click', (e) => {
    const card = e.target.closest('.testimonial-card');
    if (!card) return;
    
    // Check if this is a left edge card
    if (isLeftEdgeCard(card)) {
      e.preventDefault();
      e.stopPropagation();
      moveCarouselBackward();
      // Reset auto-rotation timer
      pauseRotation();
      setTimeout(() => {
        resumeRotation();
      }, 5000);
      return;
    }
    // Check if this is a right edge card
    if (isRightEdgeCard(card)) {
      e.preventDefault();
      e.stopPropagation();
      moveCarouselForward();
      // Reset auto-rotation timer
      pauseRotation();
      setTimeout(() => {
        resumeRotation();
      }, 5000);
      return;
    }
  });

  // Pause on hover
  carouselTrack.addEventListener('mouseenter', pauseRotation);
  carouselTrack.addEventListener('mouseleave', resumeRotation);

  // Pause when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseRotation();
    } else {
      resumeRotation();
    }
  });

  // Update clickability and position on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updatePosition(); // Recalculate position with new card widths
      updateCardClickability();
    }, 250);
  });

  // Swipe functionality for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let isDragging = false;
  let isHorizontalSwipe = false;
  let startPosition = 0;
  let touchStartTime = 0;
  const swipeThreshold = 50; // Minimum distance in pixels to trigger a swipe
  const swipeVelocityThreshold = 0.5; // Minimum velocity for a fast swipe
  const directionThreshold = 10; // Minimum movement to determine swipe direction

  // Get current transform value
  const getCurrentTransform = () => {
    const transform = carouselTrack.style.transform;
    if (transform && transform !== 'none') {
      const match = transform.match(/translateX\((-?\d+\.?\d*)px\)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return; // Only handle single touch
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isDragging = true;
    isHorizontalSwipe = false; // Reset direction detection
    startPosition = getCurrentTransform();
    touchStartTime = Date.now();
    
    // Don't pause auto-rotation yet - wait to see if it's a horizontal swipe
    // Disable transitions during drag
    carouselTrack.style.transition = 'none';
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchCurrentX = touch.clientX;
    touchCurrentY = touch.clientY;
    
    // Calculate delta
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Determine swipe direction after initial threshold movement
    if (!isHorizontalSwipe && (absDeltaX > directionThreshold || absDeltaY > directionThreshold)) {
      // Once we've moved enough, determine if this is a horizontal swipe
      // Use a ratio to be more lenient - horizontal must be significantly more than vertical
      const horizontalRatio = absDeltaX / Math.max(absDeltaY, 1);
      isHorizontalSwipe = horizontalRatio > 1.5; // Horizontal must be 1.5x more than vertical
      
      if (isHorizontalSwipe) {
        // It's clearly a horizontal swipe - pause rotation and prevent default
        pauseRotation();
        e.preventDefault(); // Prevent page scroll only for horizontal swipes
      } else {
        // It's a vertical scroll or ambiguous - cancel carousel interaction immediately
        isDragging = false;
        isHorizontalSwipe = false;
        carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        // Don't prevent default - allow normal vertical scrolling
        return;
      }
    }
    
    // Re-check direction on continued movement to catch if user switches to vertical
    if (isHorizontalSwipe && absDeltaY > absDeltaX * 1.2) {
      // User switched to vertical scrolling - cancel carousel interaction
      isDragging = false;
      isHorizontalSwipe = false;
      carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      updatePosition(); // Snap back to position
      // Don't prevent default - allow vertical scrolling
      return;
    }
    
    // Only handle horizontal swipes - if we get here, we know it's horizontal
    if (isHorizontalSwipe) {
      e.preventDefault(); // Prevent page scroll for horizontal swipes
      
      // Calculate new position
      const scrollDistance = getScrollDistance();
      const baseOffset = scrollDistance * currentIndex;
      const newOffset = baseOffset - deltaX; // Inverted because we're moving the track left
      
      // Apply transform
      carouselTrack.style.transform = `translateX(-${newOffset}px)`;
    } else {
      // If somehow we're here but not horizontal, don't prevent default
      // This allows vertical scrolling to proceed
      return;
    }
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    const wasHorizontalSwipe = isHorizontalSwipe;
    isDragging = false;
    isHorizontalSwipe = false;
    
    // Only process if it was a horizontal swipe
    if (!wasHorizontalSwipe) {
      // Reset transition
      carouselTrack.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      return;
    }
    
    // Calculate swipe distance and direction
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    const velocity = Math.abs(deltaX) / Math.max(deltaTime, 1);
    
    // Re-enable transitions
    carouselTrack.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Determine if it's a valid swipe
    const isSignificantSwipe = Math.abs(deltaX) > swipeThreshold;
    const isFastSwipe = velocity > swipeVelocityThreshold;
    
    if (isSignificantSwipe || isFastSwipe) {
      // Swipe right (user dragged left, showing previous cards)
      if (deltaX > 0) {
        moveCarouselBackward();
      } 
      // Swipe left (user dragged right, showing next cards)
      else {
        moveCarouselForward();
      }
      
      // Reset auto-rotation timer
      setTimeout(() => {
        resumeRotation();
      }, 5000);
    } else {
      // Snap back to current position if swipe wasn't significant
      updatePosition();
      
      // Resume auto-rotation
      setTimeout(() => {
        resumeRotation();
      }, 1000);
    }
  };

  // Add touch event listeners
  carouselTrack.addEventListener('touchstart', handleTouchStart, { passive: false });
  carouselTrack.addEventListener('touchmove', handleTouchMove, { passive: false });
  carouselTrack.addEventListener('touchend', handleTouchEnd, { passive: true });
  carouselTrack.addEventListener('touchcancel', handleTouchEnd, { passive: true });
})();

// Map SVG Animation - Start when viewport reaches it
(function initMapAnimation() {
  const mapContainer = document.getElementById('map-container');
  const mapWrapper = document.getElementById('usa-map-wrapper');
  if (!mapContainer || !mapWrapper) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // Just load the SVG without animation
    mapWrapper.innerHTML = '<img src="img/usa_map.svg" alt="United States map showing LPT Realty coverage" width="959" height="593" style="width: 100%; height: auto; display: block;" />';
    return;
  }

  // Load the SVG inline and animate states one by one
  const loadSVGAndAnimate = () => {
    fetch('img/usa_map.svg')
      .then(response => response.text())
      .then(svgText => {
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        
        if (!svgElement) return;

        // Remove existing animation styles and set all states to grey initially
        const styleElement = svgDoc.querySelector('style');
        if (styleElement) {
          let styleText = styleElement.textContent;
          
          // Remove the animation from the base state path rule
          styleText = styleText.replace(
            /\.state path \{fill:#D0D0D0; animation: fillColor 0\.15s ease-in-out forwards\}/,
            '.state path {fill:#D0D0D0;}'
          );
          
          // Remove animation from DC circle
          styleText = styleText.replace(
            /circle\.dc \{ fill: #D0D0D0; animation: fillColor 0\.15s ease-in-out forwards; animation-delay: 4\.95s; \}/,
            'circle.dc { fill: #D0D0D0; }'
          );
          
          // Remove all the nth-child animation delays
          styleText = styleText.replace(/\.state path:nth-child\(\d+\) \{ animation-delay: [\d.]+s; \}\s*/g, '');
          
          styleElement.textContent = styleText;
        }
        
        // Add an id to the SVG so we can reference it
        svgElement.setAttribute('id', 'usa-map-svg');

        // Set SVG to be responsive
        svgElement.setAttribute('width', '959');
        svgElement.setAttribute('height', '593');
        svgElement.setAttribute('style', 'width: 100%; height: auto; display: block;');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Import the SVG element into the current document
        const importedSvg = document.importNode(svgElement, true);

        // Insert the modified SVG into the wrapper
        mapWrapper.innerHTML = '';
        mapWrapper.appendChild(importedSvg);
        
        // Get all state elements for reuse
        let allStates = null;
        let animationTimeout = null;
        
        const getStateElements = () => {
          if (allStates) return allStates;
          
          const svg = mapWrapper.querySelector('#usa-map-svg');
          if (!svg) return null;
          
          // Get all state paths and the DC circle
          const statePaths = Array.from(svg.querySelectorAll('.state path'));
          const dcCircle = svg.querySelector('circle.dc');
          
          // Combine all elements to animate
          allStates = [...statePaths];
          if (dcCircle) {
            allStates.push(dcCircle);
          }
          
          return allStates;
        };
        
        // Function to reset states to grey
        const resetStates = () => {
          const states = getStateElements();
          if (!states) return;
          
          states.forEach(state => {
            // Force reset by removing transition temporarily, setting color, then re-adding transition
            const originalTransition = state.style.transition;
            state.style.transition = 'none';
            state.style.fill = '#D0D0D0';
            // Force reflow to ensure the color change is applied
            void state.offsetWidth;
            // Re-apply transition for smooth animation
            state.style.transition = 'fill 0.3s ease-in-out';
          });
        };
        
        // Function to check if fade-up animation has completed
        const waitForFadeUpAnimation = (callback) => {
          // Find the parent element with fade-up class (mission-image)
          const parentElement = mapContainer.closest('.fade-up');
          
          if (!parentElement) {
            // No fade-up parent, proceed immediately
            callback();
            return;
          }
          
          // Check if parent has animate-in class
          const hasAnimateIn = parentElement.classList.contains('animate-in');
          
          if (!hasAnimateIn) {
            // Wait for animate-in class to be added
            const checkInterval = setInterval(() => {
              if (parentElement.classList.contains('animate-in')) {
                clearInterval(checkInterval);
                // Wait for animation to complete (0.1s delay + 0.8s duration = 0.9s)
                setTimeout(callback, 900);
              }
            }, 50);
            
            // Fallback timeout in case animate-in never gets added
            setTimeout(() => {
              clearInterval(checkInterval);
              callback();
            }, 5000);
          } else {
            // Already has animate-in, wait for animation to complete
            // Animation duration is 0.8s with 0.1s delay = 0.9s total
            // Wait the full duration to ensure animation has completed
            setTimeout(callback, 900);
          }
        };
        
        // Function to animate states one by one
        let loopInterval = null;
        let isLooping = false;
        
        const animateStates = (shouldLoop = false, skipFadeUpWait = false) => {
          const states = getStateElements();
          if (!states) return;
          
          // Clear any pending animation timeout
          if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
          }
          
          // Clear any existing loop
          if (loopInterval) {
            clearInterval(loopInterval);
            loopInterval = null;
          }
          
          // Function to start the animation
          const startAnimation = (skipReset = false) => {
            // Reset all states to grey first (before animating) unless we're skipping reset
            if (!skipReset) {
              resetStates();
            }
            // Animate each state with a delay
            const transitionDuration = 300; // 0.3s transition duration
            const delayBetweenStates = 80; // 80ms delay between each state
            const lastStateIndex = states.length - 1;
            
            // Calculate when the last state finishes animating
            // Last state starts at: lastStateIndex * delayBetweenStates
            // Last state finishes at: lastStateIndex * delayBetweenStates + transitionDuration
            const totalAnimationTime = (lastStateIndex * delayBetweenStates) + transitionDuration;
            
            // Animate all states
            states.forEach((state, index) => {
              setTimeout(() => {
                state.style.transition = 'fill 0.3s ease-in-out';
                state.style.fill = '#04b3ff';
              }, index * delayBetweenStates);
            });
            
            // If looping, wait for animation to complete, then wait 2 seconds, then reset and animate again
            if (shouldLoop) {
              const pauseTime = 2000; // Pause for 2 seconds after all states finish animating
              const totalTime = totalAnimationTime + pauseTime;
              
              // Set timeout to loop after animation completes + 2 second pause
              animationTimeout = setTimeout(() => {
                // Reset and animate again (infinite loop)
                animateStates(true, true); // Skip fade-up wait on subsequent loops
              }, totalTime);
            }
          };
          
          // Wait for fade-up animation to complete only on first run
          if (skipFadeUpWait) {
            // Skip fade-up wait on subsequent loops
            // Reset states first, then wait for reset to complete before animating
            resetStates();
            animationTimeout = setTimeout(() => {
              startAnimation(true); // Skip reset since we already did it
            }, 350); // Wait for reset transition to complete (300ms + 50ms buffer)
          } else {
            // Wait for fade-up animation to complete, then delay by 1.5 seconds
            waitForFadeUpAnimation(() => {
              // Additional 1.5 second delay after fade-up completes
              animationTimeout = setTimeout(() => {
                startAnimation();
              }, 1500); // 1.5 second delay after fade-up completes
            });
          }
        };
        
        // Check when map center reaches viewport center using scroll
        let hasAnimated = false;
        let scrollTicking = false;
        
        const checkMapPosition = () => {
          const rect = mapContainer.getBoundingClientRect();
          const viewportCenter = window.innerHeight / 2;
          const mapCenter = rect.top + (rect.height / 2);
          const isInViewport = rect.bottom > 0 && rect.top < window.innerHeight;
          
          // If map is not in viewport, stop looping and reset animation state
          if (!isInViewport) {
            if (hasAnimated) {
              hasAnimated = false;
              isLooping = false;
              if (animationTimeout) {
                clearTimeout(animationTimeout);
                animationTimeout = null;
              }
              if (loopInterval) {
                clearInterval(loopInterval);
                loopInterval = null;
              }
              resetStates();
            }
            return;
          }
          
          // Check if map center has crossed viewport center
          // Trigger when map center is at or past viewport center
          if (!hasAnimated && mapCenter <= viewportCenter) {
            hasAnimated = true;
            isLooping = true;
            animateStates(true); // Start looping animation
          }
        };
        
        const handleScroll = () => {
          if (!scrollTicking) {
            window.requestAnimationFrame(() => {
              checkMapPosition();
              scrollTicking = false;
            });
            scrollTicking = true;
          }
        };
        
        // Check on initial load
        checkMapPosition();
        
        // Listen for scroll events
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Also check on resize
        window.addEventListener('resize', () => {
          checkMapPosition();
        }, { passive: true });
      })
      .catch(error => {
        console.warn('Could not load SVG for animation:', error);
        // Fallback to regular image
        mapWrapper.innerHTML = '<img src="img/usa_map.svg" alt="United States map showing LPT Realty coverage" width="959" height="593" style="width: 100%; height: auto; display: block;" />';
      });
  };

  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSVGAndAnimate);
  } else {
    loadSVGAndAnimate();
  }
})();

