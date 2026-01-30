import { CONFIG } from './config.js';

// Usamos los datos del llavero
const supabaseUrl = CONFIG.supabaseUrl;
const supabaseKey = CONFIG.supabaseKey;

// Solo aquí se crea el cliente
export const _supabase = supabase.createClient(supabaseUrl, supabaseKey);