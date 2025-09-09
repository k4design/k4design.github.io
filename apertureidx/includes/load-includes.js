// Load Navigation and Footer Includes
document.addEventListener('DOMContentLoaded', function() {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const isRootPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath === '/apertureidx/';
    const includePath = isRootPage ? 'includes/' : '../includes/';
    
    // Load Navigation
    fetch(includePath + 'nav.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const navPlaceholder = document.getElementById('nav-placeholder');
            if (navPlaceholder) {
                navPlaceholder.innerHTML = data;
                // Set correct paths for navigation
                setNavigationPaths(isRootPage);
                // Set active navigation item
                setActiveNavItem();
                // Initialize mobile navigation after nav is loaded
                initMobileNavigation();
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
            // Fallback: show error message
            const navPlaceholder = document.getElementById('nav-placeholder');
            if (navPlaceholder) {
                navPlaceholder.innerHTML = '<nav class="navbar"><div class="nav-container"><div class="nav-logo"><img src="' + (isRootPage ? 'img/' : '../img/') + 'apertureglobal_logo-white.png" alt="Aperture Global" class="logo-image"></div><ul class="nav-menu"><li><a href="' + (isRootPage ? 'index.html' : '../index.html') + '">Home</a></li><li><a href="' + (isRootPage ? 'about.html' : '../about.html') + '">About</a></li><li><a href="' + (isRootPage ? 'agents.html' : '../agents.html') + '">Agents</a></li></ul></div></nav>';
            }
        });

    // Load Footer
    fetch(includePath + 'footer.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
                // Set correct paths for footer
                setFooterPaths(isRootPage);
            }
        })
        .catch(error => {
            console.error('Error loading footer:', error);
            // Fallback: show basic footer
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = '<footer class="footer"><div class="container"><div class="footer-content"><div class="footer-section"><img src="' + (isRootPage ? 'img/' : '../img/') + 'apertureglobal_logo-white.png" alt="Aperture Global" class="footer-logo"><p>Global Luxury Real Estate Brokerage</p></div><div class="footer-section"><h4>Contact</h4><p>info@apertureglobal.com</p><p>1.888.903.9611</p></div></div><div class="footer-bottom"><p>&copy; 2024 Aperture Global. All rights reserved.</p></div></div></footer>';
            }
        });
});

// Mobile Navigation Function
function initMobileNavigation() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
        
        // Close menu when clicking on a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.className = 'fas fa-bars';
            });
        });
    }
}

// Set Navigation Paths
function setNavigationPaths(isRootPage) {
    const imgPath = isRootPage ? 'img/' : '../img/';
    const homePath = isRootPage ? 'index.html' : '../index.html';
    const aboutPath = isRootPage ? 'about.html' : '../about.html';
    const agentsPath = isRootPage ? 'agents.html' : '../agents.html';
    
    // Set logo path
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) {
        navLogo.src = imgPath + 'apertureglobal_logo-white.png';
    }
    
    // Set navigation links
    const navHome = document.getElementById('nav-home');
    if (navHome) navHome.href = homePath;
    
    const navProperties = document.getElementById('nav-properties');
    if (navProperties) navProperties.href = isRootPage ? 'properties.html' : '../properties.html';
    
    const navAbout = document.getElementById('nav-about');
    if (navAbout) navAbout.href = aboutPath;
    
    const navAgents = document.getElementById('nav-agents');
    if (navAgents) navAgents.href = agentsPath;
    
    const navLeadership = document.getElementById('nav-leadership');
    if (navLeadership) navLeadership.href = homePath + '#leadership';
    
    const navNews = document.getElementById('nav-news');
    if (navNews) navNews.href = homePath + '#news';
}

// Set Footer Paths
function setFooterPaths(isRootPage) {
    const imgPath = isRootPage ? 'img/' : '../img/';
    
    // Set footer logo path
    const footerLogo = document.getElementById('footer-logo');
    if (footerLogo) {
        footerLogo.src = imgPath + 'apertureglobal_logo-white.png';
    }
}

// Set Active Navigation Item
function setActiveNavItem() {
    const currentPage = document.body.getAttribute('data-page');
    if (currentPage) {
        const activeLink = document.querySelector(`[data-page="${currentPage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}
