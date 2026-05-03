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

/**
 * Dynamically updates the header navigation based on login status.
 */
const updateNavigation = () => {
    const currentUsername = sessionStorage.getItem('currentUser');
    const currentRole = sessionStorage.getItem('currentRole');
    const navActions = document.getElementById('nav-actions');
    
    if (currentUsername && navActions) {
        let dashboardLink = '../user/dashboard.html';
        if (currentRole === 'admin') dashboardLink = '../admin/dashboard.html';
        if (currentRole === 'superadmin') dashboardLink = '../superAdmin/dashboard.html';
        
        navActions.innerHTML = `
            <a href="${dashboardLink}" class="btn btn-primary btn-glow" style="background: var(--accent-cyan); color: #000;">Dashboard</a>
            <button onclick="logout()" class="btn btn-outline" style="margin-left: 10px; color: var(--accent-crimson); border-color: var(--accent-crimson);">Logout</button>
        `;
    }
};

const logout = () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentRole');
    window.location.href = '../general/index.html';
};

// Expose for components loaded dynamically (like the header)
window.updateNavigation = updateNavigation;
window.applyRoleVisibility = applyRoleVisibility;