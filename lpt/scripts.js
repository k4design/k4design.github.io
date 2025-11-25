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
})();

