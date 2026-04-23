// Utility functions for UI
const showView = (viewId) => {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('register-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
};

const clearErrors = () => {
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
};

// DOM Elements
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

// Event Listeners for Navigation
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearErrors();
    showView('register-view');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearErrors();
    showView('login-view');
});

// Authentication Logic using LocalStorage
const getUsers = () => JSON.parse(localStorage.getItem('users')) || [];
const saveUser = (user) => {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
};

// Register
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
    alert('Registration successful! Please login.');
});

// Login
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

// Logout
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    checkAuthStatus();
});

// Auth State Check
const checkAuthStatus = () => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        document.getElementById('user-display').textContent = currentUser;
        showView('dashboard-view');
    } else {
        showView('login-view');
    }
};

// Initialize App
checkAuthStatus();