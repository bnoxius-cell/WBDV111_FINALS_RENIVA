import { fetchInitialData, getBookings, saveBooking, initProperties, getProperties, syncProperties } from './services/storage.js';
import { performSearch } from './features/search.js';
import { loginUser, registerUser, logoutUser, getCurrentUser } from './services/auth-service.js';
import { initSteppers, initCustomSelects, initCustomCalendars } from './ui/forms.js';
import { showLoginPromptModal, showTermsModal, showCancelModal, initPropertyModalUI, openPropertyModal, showCustomAlert, showCustomConfirm } from './ui/modals.js';
import { setupBookingButtons, renderUserBookings, renderAdminBookings, initReviewLogic, initCheckout } from './features/booking.js';
import { showView, clearErrors, loadComponent, checkAuthStatus, setupTabs, enforceRouteAccess, redirectToDashboard } from './ui/components.js';
import { updateRecentTicker, renderTrendingDestinations, renderAllProperties, renderAdminProperties } from './features/listings.js';

enforceRouteAccess(); // Run route protection immediately

// DOM Elements
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const searchForm = document.getElementById('search-form');

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

// Search Bar Logic
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
    });
}

// Register
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const errorElement = document.getElementById('register-error');

        const result = await registerUser(username, password);
        if (!result.success) {
            errorElement.textContent = result.error;
            return;
        }

        registerForm.reset();
        clearErrors();
        showView('login-view');
        
        const successMsg = document.getElementById('login-success-msg');
        if (successMsg) {
            successMsg.textContent = 'Registration successful! Please login.';
            successMsg.classList.remove('hidden');
        }
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');

        const result = await loginUser(username, password);

        if (result.success) {
            loginForm.reset();
            clearErrors();
            
            redirectToDashboard();
        } else {
            errorElement.textContent = result.error;
        }
    });
}

// Logout
document.querySelectorAll('#logout-btn, .sidebar-logout-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logoutUser();
        window.location.href = '../general/auth.html';
    });
});

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await fetchInitialData();
    await initProperties();
    syncProperties();
    initPropertyModalUI();
    initSteppers();
    initCustomCalendars();
    initCustomSelects();
    loadComponent('header-placeholder', '../components/header.html');
    loadComponent('footer-placeholder', '../components/footer.html');
    checkAuthStatus();

    // Admin: Add Property Form Logic
    const addPropertyForm = document.getElementById('add-property-form');
    if (addPropertyForm) {
        addPropertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addPropertyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publishing...';

            const { saveProperty } = await import('./services/storage.js');
            const newProp = {
                id: 'PROP-' + Date.now().toString(),
                name: document.getElementById('prop-name').value.trim(),
                location: document.getElementById('prop-location').value.trim(),
                price: parseFloat(document.getElementById('prop-price').value),
                type: document.getElementById('prop-type').value,
                rating: 0,
                reviews: 0,
                imageClass: document.getElementById('prop-image').value,
                images: [document.getElementById('prop-image').value, 'img-room1', 'img-view', 'img-bathroom'],
                availableStart: '2024-01-01',
                availableEnd: '2099-12-31',
                guests: parseInt(document.getElementById('prop-guests').value),
                beds: document.getElementById('prop-beds').value.trim() || '1 Bedroom'
            };

            const result = await saveProperty(newProp);

            if (result && !result.success) {
                await showCustomAlert('Publish Failed', 'Failed to publish property: ' + result.error, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            await showCustomAlert('Property Published', 'Property published successfully! It is now live for users.', 'success');
            addPropertyForm.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            renderAdminProperties(); // Instantly refresh the admin list
        });
    }

    // Populate Demo Users
    const demoUsersList = document.getElementById('demo-users-list');
    if (demoUsersList) {
        const demoAccounts = [
            { role: 'superadmin', username: 'superadmin', password: 'password' },
            { role: 'admin', username: 'admin', password: 'password' },
            { role: 'user', username: 'user', password: 'password' }
        ];
        demoUsersList.innerHTML = demoAccounts.map(u => `
            <div class="demo-user-card">
                <div class="demo-user-card-header">${u.role} Role</div>
                <div class="demo-user-card-body">
                    <div><strong>Username:</strong> ${u.username}</div>
                    <div><strong>Password:</strong> ${u.password}</div>
                </div>
            </div>
        `).join('');
    }

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

    // Setup booking buttons
    setupBookingButtons();

    initCheckout();
    
    const displayDash = document.getElementById('user-display-dash');
    if (displayDash) {
        const username = sessionStorage.getItem('currentUser');
        if (username) displayDash.textContent = username;
    }
    const profileUsername = document.getElementById('profile-username-display');
    if (profileUsername) {
        const username = sessionStorage.getItem('currentUser');
        if (username) profileUsername.textContent = username;
    }

    setupTabs();
    initReviewLogic();
    renderUserBookings();
    renderAdminBookings();
    renderTrendingDestinations();
    renderAllProperties();
    renderAdminProperties();
    updateRecentTicker();

    // Scroll to top button click event
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            document.documentElement.style.scrollBehavior = 'auto'; // Temporarily force instant scroll
            window.scrollTo(0, 0); // Jump to top
            document.documentElement.style.scrollBehavior = ''; // Restore CSS smooth scroll
        });
    }

    // Admin Delete Property Logic
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-property-btn')) {
            const confirmed = await showCustomConfirm("Delete Property", "Are you sure you want to permanently delete this property?");
            if (confirmed) {
                const propId = e.target.getAttribute('data-id');
                const { deleteProperty } = await import('./services/storage.js');
                await deleteProperty(propId);
                renderAdminProperties();
            }
        }
    });

    // Auto-fill and perform search if URL parameters are present (from index page)
    if (searchForm) {
        const urlParams = new URLSearchParams(window.location.search);
        let hasParams = false;

        // Handle standard text/number/select inputs
        ['location', 'guests', 'max-price', 'property-type'].forEach(param => {
            if (urlParams.has(param) && urlParams.get(param)) {
                const inputElement = document.getElementById(param);
                if (inputElement) {
                    inputElement.value = urlParams.get(param);
                    hasParams = true;
                    
                    // If it's the custom select, visually update it
                    if (param === 'property-type') {
                        const wrapper = document.getElementById('res-type-wrapper');
                        if (wrapper) {
                            const option = wrapper.querySelector(`.custom-select-option[data-value="${urlParams.get(param)}"]`);
                            if (option) {
                                wrapper.querySelector('.custom-select-trigger span').textContent = option.textContent;
                                wrapper.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                                option.classList.add('selected');
                            }
                        }
                    }
                }
            }
        });

        // Handle custom date picker inputs
        const checkinVal = urlParams.get('checkin');
        const checkoutVal = urlParams.get('checkout');
        if (checkinVal && checkoutVal) {
            const checkinInput = document.getElementById('checkin');
            const checkoutInput = document.getElementById('checkout');
            const dateTrigger = document.getElementById('res-date-trigger');

            if (checkinInput && checkoutInput && dateTrigger) {
                checkinInput.value = checkinVal;
                checkoutInput.value = checkoutVal;

                const startDate = new Date(checkinVal + 'T00:00:00');
                const endDate = new Date(checkoutVal + 'T00:00:00');
                const s = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const e = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                dateTrigger.innerHTML = `<span class="text-primary font-bold">${s} - ${e}</span>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
                hasParams = true;
            }
        }

        if (hasParams) {
            performSearch();
        }
    }
});