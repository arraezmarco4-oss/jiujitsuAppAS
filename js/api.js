// api.js

// Usamos valores por defecto vacíos para que no lance SyntaxError en Netlify
let supabaseUrl = '';
let supabaseKey = '';

try {
    // Intentamos cargar tu configuración local
    const { CONFIG } = await import('./config.js');
    supabaseUrl = CONFIG.supabaseUrl;
    supabaseKey = CONFIG.supabaseKey;
} catch (e) {
    // Si estamos en Netlify, el archivo no existe, así que usamos las variables del sistema
    // o las que ya tenías configuradas en el panel de Netlify
    supabaseUrl = window.SUPABASE_URL || ''; 
    supabaseKey = window.SUPABASE_KEY || '';
}

export const _supabase = supabase.createClient(supabaseUrl, supabaseKey);
