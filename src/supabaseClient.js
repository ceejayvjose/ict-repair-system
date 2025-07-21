// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pzjljnsjbspoislrtqoi.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amxqbnNqYnNwb2lzbHJ0cW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTAwMDksImV4cCI6MjA2ODY2NjAwOX0._rz0zLig0hERIB2R_axlTVo3-_zBpHlNdKcdYiq6V7E'; // Replace with your Anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);