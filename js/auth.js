import { _supabase } from './api.js';

// Esta variable guardará el nombre del usuario mientras la app esté abierta
export let USUARIO_IDENTIFICADO = null;

/**
 * Función para verificar credenciales en Supabase
 * @param {string} user - Nombre de usuario
 * @param {string} pass - Contraseña
 */
export async function validarLogin(user, pass) {
    try {
        // 1. Intentamos entrar con el sistema de seguridad oficial
        // Importante: le añadimos el @academia.com porque así los creó el admin
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: `${user.toLowerCase().trim()}@academia.com`,
            password: pass,
        });

        if (error) throw error;

        // 2. Si es exitoso, guardamos el ID único del usuario
        USUARIO_IDENTIFICADO = data.user.id; 
        return data.user; 

    } catch (err) {
        // Si hay error (clave mal, usuario no existe), lanzamos el mensaje
        throw new Error("Usuario o clave incorrectos");
    }
}

export function limpiarSesion() {
    _supabase.auth.signOut(); // Esto cierra la sesión oficial en Supabase
    USUARIO_IDENTIFICADO = null;
}


// Nueva función de seguridad en script.js o auth.js
export async function obtenerRol() {
    const { data } = await _supabase
        .from('perfiles')
        .select('rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .single();
    return data?.rol; // Retornará 'admin', 'instructor' o 'alumno'
}

// Ejemplo de uso para proteger botones
export async function verificarPermisosInstructor() {
    const rol = await obtenerRol();
    return rol === 'admin' || rol === 'instructor';
}
window.obtenerRol = obtenerRol;
