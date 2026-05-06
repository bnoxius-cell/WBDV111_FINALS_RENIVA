// Handles user authentication: login, registration, and session status

import { supabase } from './supabase-client.js';

// Map specific emails to your admin roles
export const hardcodedRoles = {
    'superadmin@cozycorner.com': 'superadmin',
    'admin@cozycorner.com': 'admin'
};

// Helper to allow your existing "username" UI to work with Supabase's email requirement
const formatEmail = (username) => username.includes('@') ? username : `${username.toLowerCase()}@cozycorner.com`;

export const loginUser = async (username, password) => {
    const email = formatEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    if (data.user) {
        // Fetch dynamic role from the profiles table
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        const role = profile?.role || hardcodedRoles[email] || 'user';
        
        // We keep sessionStorage here so your synchronous UI functions don't break!
        sessionStorage.setItem('currentUser', username);
        sessionStorage.setItem('currentRole', role);
        return { success: true, user: { username, role } };
    }
    
    return { success: false, error: 'Unknown error occurred.' };
};

export const registerUser = async (username, password) => {
    const email = formatEmail(username);
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        return { success: false, error: error.message };
    }
    
    // Populate the public profiles table so you can see them in the Table Editor
    if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
            id: data.user.id,
            username: username,
            email: email,
            role: 'user'
        }]);

        if (profileError) {
            console.error("Profile Insert Error:", profileError);
            return { success: false, error: "Auth succeeded, but profile failed: " + profileError.message };
        }
    }

    return { success: true };
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentRole');
    return { success: true };
};

export const getCurrentUser = () => {
    const username = sessionStorage.getItem('currentUser');
    const role = sessionStorage.getItem('currentRole');
    return username ? { username, role } : null;
};

export const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) {
        console.error("Error updating user role:", error);
        return { success: false, error: error.message };
    }
    // Manually update local cache to reflect change immediately without a full refetch
    // This is an optimistic update. A full `fetchInitialData()` is more robust.
    return { success: true };
};