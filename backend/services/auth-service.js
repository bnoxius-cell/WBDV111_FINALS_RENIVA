// Handles user authentication: login, registration, and session status

import { getUsers, saveUser } from './storage.js';

export const hardcodedUsers = [
    { username: 'superadmin', password: 'superadmin', role: 'superadmin' },
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'user', password: 'user', role: 'user' }
];

// Designed as async functions to make the future transition to Supabase seamless!
export const loginUser = async (username, password) => {
    const users = getUsers();
    const user = hardcodedUsers.find(u => u.username === username && u.password === password) 
              || users.find(u => u.username === username && u.password === password);

    if (user) {
        const role = user.role || 'user';
        sessionStorage.setItem('currentUser', username);
        sessionStorage.setItem('currentRole', role);
        return { success: true, user: { username, role } };
    }
    return { success: false, error: 'Invalid username or password.' };
};

export const registerUser = async (username, password) => {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, error: 'Username already exists.' };
    }
    saveUser({ username, password });
    return { success: true };
};

export const logoutUser = async () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentRole');
    return { success: true };
};

export const getCurrentUser = () => {
    const username = sessionStorage.getItem('currentUser');
    const role = sessionStorage.getItem('currentRole');
    return username ? { username, role } : null;
};