// Utility functions for UI
const showView = (viewId) => {
    document.getElementById('home-view')?.classList.add('hidden');
    document.getElementById('login-view')?.classList.add('hidden');
    document.getElementById('register-view')?.classList.add('hidden');
    document.getElementById('dashboard-view')?.classList.add('hidden');
    document.getElementById(viewId)?.classList.remove('hidden');
};

const clearErrors = () => {
    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    const successMsg = document.getElementById('login-success-msg');
    if (loginErr) loginErr.textContent = '';
    if (regErr) regErr.textContent = '';
    if (successMsg) successMsg.style.display = 'none';
};

// DOM Elements
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const heroBookBtn = document.getElementById('hero-book-btn');
const searchForm = document.getElementById('search-form');

// Component Loader
const loadComponent = async (elementId, componentPath) => {
    const el = document.getElementById(elementId);
    if (el) {
        try {
            const response = await fetch(componentPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            el.innerHTML = await response.text();
            if (elementId === 'header-placeholder') {
                initializeHeaderLogic();
            }
        } catch (error) {
            console.error(`Error loading component ${componentPath}:`, error);
            el.innerHTML = `<p style="color:red; text-align:center; padding: 1rem;">Failed to load component. Please ensure you are viewing this via a local server (like VS Code Live Server) and not directly via file://.</p>`;
        }
    }
};

// Initialize Header Event Listeners
const initializeHeaderLogic = () => {
    const navLoginBtn = document.getElementById('nav-login');

    // Add active class to current page link for visual feedback
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPageFilename = window.location.pathname.split('/').pop();

    navLinks.forEach(link => {
        const linkFilename = link.getAttribute('href').split('/').pop();
        if (currentPageFilename === linkFilename) {
            link.classList.add('active');
        }
    });
    
    // Header Scroll Animation Logic
    const mainHeader = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            mainHeader?.classList.add('scrolled');
        } else {
            mainHeader?.classList.remove('scrolled');
        }
    });

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', (e) => {
            const currentUser = sessionStorage.getItem('currentUser');
            if (currentUser && document.getElementById('dashboard-view')) {
                e.preventDefault();
                showView('dashboard-view');
            } else if (!currentUser && document.getElementById('login-view')) {
                e.preventDefault();
                clearErrors();
                showView('login-view');
            }
        });
    }

    // Update nav text based on auth
    checkAuthStatus();
};

// Event Listeners for Navigation
if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        showView('register-view');
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        showView('login-view');
    });
}

if (heroBookBtn) {
    heroBookBtn.addEventListener('click', (e) => {
        if (document.getElementById('login-view')) {
            e.preventDefault();
            showView('login-view');
        }
    });
}

// Search Bar Logic
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const locationInput = document.getElementById('location').value.toLowerCase().trim();
        const checkinInput = document.getElementById('checkin').value;
        const checkoutInput = document.getElementById('checkout').value;
        const guestsInput = parseInt(document.getElementById('guests').value) || 0;

        const listingCards = document.querySelectorAll('.featured-listings .listing-card');
        let visibleCount = 0;

        listingCards.forEach(card => {
            const cardLocation = card.dataset.location || '';
            const cardGuests = parseInt(card.dataset.guests) || 0;
            const availableStart = card.dataset.availableStart;
            const availableEnd = card.dataset.availableEnd;

            // Check criteria
            let matchLocation = !locationInput || cardLocation.includes(locationInput);
            let matchGuests = !guestsInput || cardGuests >= guestsInput;
            let matchDates = true;

            // Date range validation
            if (checkinInput && checkoutInput) {
                if (checkinInput >= checkoutInput || checkinInput < availableStart || checkoutInput > availableEnd) {
                    matchDates = false;
                }
            } else if (checkinInput && (checkinInput < availableStart || checkinInput > availableEnd)) {
                matchDates = false;
            } else if (checkoutInput && (checkoutInput < availableStart || checkoutInput > availableEnd)) {
                matchDates = false;
            }

            // Show/Hide Card
            if (matchLocation && matchGuests && matchDates) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Optional: you could add an alert here if visibleCount === 0 to say "No properties found"
    });
}

// Authentication Logic using LocalStorage
const getUsers = () => JSON.parse(localStorage.getItem('users')) || [];
const saveUser = (user) => {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
};

// Register
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const errorElement = document.getElementById('register-error');

        const users = getUsers();
        if (users.find(u => u.username === username)) {
            errorElement.textContent = 'Username already exists.';
            return;
        }

        // Note: Storing plaintext passwords is for demonstration only!
        saveUser({ username, password });
        registerForm.reset();
        clearErrors();
        showView('login-view');
        
        const successMsg = document.getElementById('login-success-msg');
        if (successMsg) {
            successMsg.textContent = 'Registration successful! Please login.';
            successMsg.style.display = 'block';
        }
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');

        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            sessionStorage.setItem('currentUser', username);
            loginForm.reset();
            clearErrors();
            checkAuthStatus();
        } else {
            errorElement.textContent = 'Invalid username or password.';
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        checkAuthStatus();
    });
}

// Auth State Check
const checkAuthStatus = () => {
    const currentUser = sessionStorage.getItem('currentUser');
    const navLoginBtn = document.getElementById('nav-login');

    if (currentUser) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = currentUser;
        if (document.getElementById('dashboard-view')) {
            showView('dashboard-view');
        }
        if (navLoginBtn) navLoginBtn.textContent = 'Dashboard';
    } else {
        if (document.getElementById('home-view')) {
            showView('home-view');
        } else if (document.getElementById('login-view')) {
            showView('login-view');
        }
        if (navLoginBtn) navLoginBtn.textContent = 'Login/Register';
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('header-placeholder', '../components/header.html');
    loadComponent('footer-placeholder', '../components/footer.html');
    checkAuthStatus();

    // Auth Page Notification Modal Logic
    const authModal = document.getElementById('auth-notification-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    if (authModal && closeModalBtn) {
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            authModal.classList.remove('hidden');
        }
        closeModalBtn.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }
});