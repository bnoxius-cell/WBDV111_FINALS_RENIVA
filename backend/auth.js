/**
 * Checks localStorage for the current user's role and redirects them
 * to the index page if they don't have the required permissions.
 * 
 * @param {string} requiredRole - The role needed to view the page ('guest', 'user', 'admin', 'superadmin')
 */
const checkAccess = (requiredRole) => {
    const currentRole = sessionStorage.getItem('currentRole') || 'guest';
    
    const roleHierarchy = { 'guest': 0, 'user': 1, 'admin': 2, 'superadmin': 3 };
    const userLevel = roleHierarchy[currentRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    // If the user's role level is lower than the required level, kick them out
    if (userLevel < requiredLevel) {
        if (currentRole === 'guest') {
            window.location.href = '../general/auth.html';
        } else {
            window.location.href = '../general/index.html';
        }
    }
};

/**
 * Automatically enforces route protection based on URL.
 */
const enforceRouteAccess = () => {
    const path = window.location.pathname;
    if (path.includes('/admin/')) checkAccess('admin');
    else if (path.includes('/superAdmin/')) checkAccess('superadmin');
    else if (path.includes('/user/') || path.includes('checkout.html')) checkAccess('user');
};

/**
 * Iterates over DOM elements with the 'data-require-role' attribute and
 * shows/hides them dynamically based on the current user's role hierarchy.
 */
const applyRoleVisibility = () => {
    const currentRole = sessionStorage.getItem('currentRole') || 'guest';
    const roleHierarchy = { 'guest': 0, 'user': 1, 'admin': 2, 'superadmin': 3 };
    const userLevel = roleHierarchy[currentRole] || 0;

    document.querySelectorAll('[data-require-role]').forEach(el => {
        const requiredRole = el.getAttribute('data-require-role');
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        if (userLevel < requiredLevel) {
            el.style.display = 'none';
        } else {
            el.style.display = ''; // Reverts to default display state
        }
    });
};

const redirectToDashboard = () => {
    const currentRole = sessionStorage.getItem('currentRole') || 'user';
    if (currentRole === 'superadmin') window.location.href = '../superAdmin/dashboard.html';
    else if (currentRole === 'admin') window.location.href = '../admin/dashboard.html';
    else window.location.href = '../user/dashboard.html';
};

/**
 * Dynamically updates the header navigation based on login status.
 */
const updateNavigation = () => {
    const currentUsername = sessionStorage.getItem('currentUser');
    const currentRole = sessionStorage.getItem('currentRole');
    const navActions = document.getElementById('nav-actions');
    
    if (currentUsername && navActions) {
        navActions.innerHTML = `
            <button id="nav-dash-btn" class="btn btn-primary btn-glow">Dashboard</button>
            <button id="nav-logout-btn" class="btn btn-outline btn-danger ml-2">Logout</button>
        `;
        document.getElementById('nav-dash-btn').addEventListener('click', redirectToDashboard);
        document.getElementById('nav-logout-btn').addEventListener('click', logout);
    }
};

const logout = () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentRole');
    window.location.href = '../general/auth.html';
};

// Expose for components loaded dynamically (like the header)
window.updateNavigation = updateNavigation;
window.applyRoleVisibility = applyRoleVisibility;
window.redirectToDashboard = redirectToDashboard;
window.logout = logout;

enforceRouteAccess();