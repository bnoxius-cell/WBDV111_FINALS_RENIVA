// Logic for common UI patterns like tabs, component loading, and header effects

import { getCurrentUser } from '../services/auth-service.js';

export const showView = (viewId) => {
    document.getElementById('home-view')?.classList.add('hidden');
    document.getElementById('login-view')?.classList.add('hidden');
    document.getElementById('register-view')?.classList.add('hidden');
    document.getElementById('dashboard-view')?.classList.add('hidden');
    document.getElementById('demo-users-view')?.classList.add('hidden');
    document.getElementById(viewId)?.classList.remove('hidden');

    if (viewId === 'login-view') {
        document.getElementById('demo-users-view')?.classList.remove('hidden');
    }
};

export const clearErrors = () => {
    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    const successMsg = document.getElementById('login-success-msg');
    if (loginErr) loginErr.textContent = '';
    if (regErr) regErr.textContent = '';
    if (successMsg) successMsg.style.display = 'none';
};

export const checkAuthStatus = () => {
    const userSession = getCurrentUser();
    const currentUser = userSession ? userSession.username : null;
    const navLoginBtn = document.getElementById('nav-login');

    if (currentUser) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = currentUser;

        // If visiting auth page while logged in, redirect to correct dashboard
        if (window.location.pathname.includes('auth.html')) {
            if (window.redirectToDashboard) window.redirectToDashboard();
            return;
        }

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

    // Apply UI role visibility based on hierarchy
    if (window.applyRoleVisibility) {
        window.applyRoleVisibility();
    }
};

export const initializeHeaderLogic = () => {
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

        // Scroll to Top Button Logic
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        }
    });

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', (e) => {
            const userSession = getCurrentUser();
            const currentUser = userSession ? userSession.username : null;
            
            if (currentUser) {
                e.preventDefault();
                if (window.redirectToDashboard) window.redirectToDashboard();
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

export const loadComponent = async (elementId, componentPath) => {
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
            el.innerHTML = `<p class="error text-center p-3">Failed to load component. Please ensure you are viewing this via a local server (like VS Code Live Server) and not directly via file://.</p>`;
        }
    }
};

export const setupTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId)?.classList.add('active');
            e.currentTarget.classList.add('active');
        });
    });
};