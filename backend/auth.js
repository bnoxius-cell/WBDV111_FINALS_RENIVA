/**
 * Checks localStorage for the current user's role and redirects them
 * to the index page if they don't have the required permissions.
 * 
 * @param {string} requiredRole - The role needed to view the page ('user', 'admin', 'superadmin')
 */
const checkAccess = (requiredRole) => {
    const currentUsername = sessionStorage.getItem('currentUser');
    const currentRole = sessionStorage.getItem('currentRole');
    
    if (!currentUsername) {
        // Not logged in at all
        window.location.href = '../general/auth.html';
        return;
    }

    const roleHierarchy = { 'user': 1, 'admin': 2, 'superadmin': 3 };
    const userLevel = roleHierarchy[currentRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    // If the user's role level is lower than the required level, kick them out
    if (userLevel < requiredLevel) {
        window.location.href = '../general/index.html';
    }
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