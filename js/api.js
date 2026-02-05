// 1. Importación directa (Como lo tienes en config.js)
import { supabaseUrl, supabaseKey } from './config.js';

// 2. COMENTA ESTAS LÍNEAS (Son las que causan el "ReferenceError" o "SyntaxError")
// const _supabaseUrl = CONFIG.supabaseUrl; 
// const _supabaseKey = CONFIG.supabaseKey;

// 3. Usa las variables directamente en la creación del cliente
// Nota: He usado los nombres que vienen del import de la línea 1
export const _supabase = supabase.createClient(supabaseUrl, supabaseKey);
