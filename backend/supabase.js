// supabase-client.js
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize and export the client to the global window object
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);