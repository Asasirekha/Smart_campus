import { createClient } from '@supabase/supabase-js';

// For Vite/CRA with Vite - use import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For traditional Create React App - use process.env (if you're using CRA)
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Key available:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!');
  console.log('Make sure you have .env.local file with:');
  console.log('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create and export the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Test function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing connection to:', supabaseUrl);
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        return { success: false, message: 'Tables not created yet' };
      }
      throw error;
    }
    
    console.log('✅ Supabase connected!');
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return { success: false, error: error.message };
  }
};