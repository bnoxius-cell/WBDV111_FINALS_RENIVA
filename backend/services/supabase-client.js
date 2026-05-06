import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://iliugfdgfksixxnaoigb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaXVnZmRnZmtzaXh4bmFvaWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDExNjEsImV4cCI6MjA5MzYxNzE2MX0.l6lKa8SgmoWFvTWUuO2AyhkCujalcz6ppHHdK9GFiNA';

export const supabase = createClient(supabaseUrl, supabaseKey);