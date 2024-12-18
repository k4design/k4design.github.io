document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("navbar");

    if (navbar) {
        // Add the scroll event listener
        window.addEventListener("scroll", () => {
            if (window.scrollY > 50) {
                navbar.classList.add("scrolled");
            } else {
                navbar.classList.remove("scrolled");
            }
        });
    } else {
        console.error("Navbar element with ID 'navbar' not found.");
    }
});