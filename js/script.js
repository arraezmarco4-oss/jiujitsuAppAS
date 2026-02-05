// 1. IMPORTACIONES
import { _supabase } from './api.js';
import { USUARIO_IDENTIFICADO, validarLogin, limpiarSesion } from './auth.js';
import { 
    cambiarSeccion, 
    mostrarFormulario, 
    toggleMenu, 
    filtrarTabla,
    dibujarCalendarioYProgreso,
    actualizarGradosCinta,
    verTablaAlumnos,
    cargarSelectTecnicas
} from './ui.js';




// 3. LÓGICA DE LOGIN
async function ejecutarLogin() {
    const user = document.getElementById("usuario").value.toLowerCase().trim();
    const pass = document.getElementById("clave").value;
    try {
        const data = await validarLogin(user, pass);
        if (data) {
            document.getElementById("pantalla-login").style.display = "none";
            document.getElementById("pantalla-app").style.display = "block";
            cambiarSeccion('perfil');
        }
    } catch (err) {
        alert(err.message);
    }
}

async function registrarPago() {
    // 1. VERIFICACIÓN DE SEGURIDAD
    const { data: perfilLogueado } = await _supabase
        .from('perfiles')
        .select('rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    const rolActual = perfilLogueado?.rol?.toLowerCase().trim();
    const rolesAutorizados = ['admin', 'instructor'];

    if (!rolesAutorizados.includes(rolActual)) {
        return alert("⛔ Acceso denegado: Solo Admin o Instructor pueden registrar pagos.");
    }

    // 2. CAPTURA DE DATOS
    const nombreAlumno = document.getElementById("alumno-asistencia").value.trim();
    if (!nombreAlumno) return alert("⚠️ Ingresa el nombre del alumno.");

    try {
        // A. Obtener datos del alumno
        const { data: alumnoData, error: fetchError } = await _supabase
            .from('perfiles')
            .select('id, fecha_vencimiento')
            .eq('nombre_usuario', nombreAlumno)
            .maybeSingle();

        if (fetchError || !alumnoData) throw new Error("Alumno no encontrado.");
        
        // B. Lógica de Fecha Inteligente (Sumar 30 días)
        let fechaBase = new Date();
        const vencimientoActual = new Date(alumnoData.fecha_vencimiento);
        if (vencimientoActual > fechaBase) fechaBase = vencimientoActual;

        fechaBase.setDate(fechaBase.getDate() + 30);
        const nuevaFechaISO = fechaBase.toISOString().split('T')[0];

        // C. Ejecutar las dos operaciones en paralelo
        const updatePromise = _supabase
            .from('perfiles')
            .update({ fecha_vencimiento: nuevaFechaISO })
            .eq('id', alumnoData.id);

        const insertPromise = _supabase
            .from('registros_pagos')
            .insert([{
                alumno_id: alumnoData.id,
                monto: 40.00, 
                fecha_pago: new Date().toISOString().split('T')[0],
                duracion_dias: 30
            }]);

        const [{ error: updateError }, { error: insertError }] = await Promise.all([updatePromise, insertPromise]);

        if (updateError || insertError) throw new Error(updateError?.message || insertError?.message);

        alert(`✅ Pago registrado para ${nombreAlumno}. Nueva fecha: ${nuevaFechaISO}`);
        
        if (typeof verTablaAlumnos === 'function') verTablaAlumnos();

    } catch (err) {
        alert("❌ Error en el proceso de pago: " + err.message);
    }
}



async function pagoRapido(nombre) {
    // 1. VERIFICACIÓN DE SEGURIDAD
    const { data: perfilLogueado } = await _supabase
        .from('perfiles')
        .select('rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    const rolActual = perfilLogueado?.rol?.toLowerCase().trim();
    if (!['admin', 'instructor'].includes(rolActual)) {
        return alert("⛔ Acceso denegado.");
    }

    // 2. LÓGICA DE PAGO
    if (!confirm(`¿Registrar pago de 30 días para ${nombre.toUpperCase()}?`)) return;

    try {
        const { data: alumno, error: fError } = await _supabase
            .from('perfiles')
            .select('id, fecha_vencimiento')
            .eq('nombre_usuario', nombre)
            .maybeSingle();

        if (fError || !alumno) throw new Error("Alumno no encontrado.");

        let f = new Date();
        const vActual = new Date(alumno.fecha_vencimiento);
        if (vActual > f) f = vActual;
        f.setDate(f.getDate() + 30);
        const nuevaF = f.toISOString().split('T')[0];

        const up = _supabase.from('perfiles').update({ fecha_vencimiento: nuevaF }).eq('id', alumno.id);
        const ins = _supabase.from('registros_pagos').insert([{
            alumno_id: alumno.id,
            monto: 40.00,
            fecha_pago: new Date().toISOString().split('T')[0],
            duracion_dias: 30
        }]);

        await Promise.all([up, ins]);
        alert("✅ Pago rápido completado");
        if (typeof verTablaAlumnos === 'function') verTablaAlumnos();

    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}




async function registrarPagoDesdeNombre() {
    const nom = document.getElementById("alumno-pago-nombre").value.trim();
    if (!nom) return alert("Escribe el nombre del alumno.");

    // Simplemente llamamos a pagoRapido para no repetir el mismo código dos veces
    // Esto es "Refactorización DRY" (Don't Repeat Yourself)
    await pagoRapido(nom);
    document.getElementById("alumno-pago-nombre").value = ""; 
}

// Nota: Puedes eliminar la línea que sincronizaba el input de asistencia, ya no es necesaria.


// 5. FUNCIÓN EXCEL (CORREGIDA 2025)
async function prepararExcel() {
    try {
        // Validación de librería
        if (typeof XLSX === 'undefined') {
            throw new Error("La librería de Excel no está cargada en el HTML.");
        }

        // Obtener datos
        const { data: perfiles, error: errP } = await _supabase.from('perfiles').select('nombre_usuario, fecha_vencimiento');
        const { data: asistencias, error: errA } = await _supabase.from('progreso_alumnos').select('usuario');

        if (errP || errA) throw new Error("Error al obtener datos de la base de datos.");

        // Formatear reporte
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const reporte = perfiles
            .filter(p => p.nombre_usuario !== 'admin')
            .map(p => {
                const numAsistencias = asistencias ? asistencias.filter(a => a.usuario === p.nombre_usuario).length : 0;
                // Ajuste de fecha para evitar desfase horario
                const fechaVenc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T23:59:59') : null;
                const esActivo = fechaVenc && fechaVenc >= hoy;

                return {
                    "ALUMNO": p.nombre_usuario.toUpperCase(),
                    "TOTAL ASISTENCIAS": numAsistencias,
                    "ESTADO PAGO": esActivo ? 'ACTIVO ✅' : 'VENCIDO ❌',
                    "FECHA VENCIMIENTO": p.fecha_vencimiento || 'N/A'
                };
            });

        // Crear y descargar archivo
        const hoja = XLSX.utils.json_to_sheet(reporte);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Reporte 2025");
        XLSX.writeFile(libro, "Reporte_Academia_BJJ.xlsx");

    } catch (error) {
        console.error("Detalle del error:", error);
        alert("Fallo al generar reporte: " + error.message);
    }
}

// 6. SOPORTE DE SESIÓN
function cerrarSesion() { 
    limpiarSesion();
    location.reload(); 
}

window.onbeforeunload = function() { 
    if (USUARIO_IDENTIFICADO) return "¿Seguro que quieres salir?"; 
};

async function registrarNuevoAlumno() {
    // 1. VERIFICACIÓN DE SEGURIDAD (ADMIN/INSTRUCTOR)
    const { data: perfilLogueado } = await _supabase
        .from('perfiles')
        .select('rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    const rolActual = perfilLogueado?.rol?.toLowerCase().trim();
    const rolesAutorizados = ['admin', 'instructor'];

    if (!rolesAutorizados.includes(rolActual)) {
        return alert("⛔ Acceso denegado: No tienes permisos suficientes.");
    }

    const user = document.getElementById("reg-usuario").value.toLowerCase().trim();
    const pass = document.getElementById("reg-clave").value;
    
    // CAPTURA DE CINTA + GRADOS
    const selectorCinta = document.getElementById("reg-cinta-inicial");
    const selectorGrados = document.getElementById("reg-grados-inicial");
    
    // Obtenemos el texto del cinturón (ej: "Azul") para guardarlo como palabra
    const nombreCinturon = selectorCinta ? selectorCinta.options[selectorCinta.selectedIndex].text.split(' ')[0] : "Blanco";
    
    const cintaBaseVal = selectorCinta ? parseInt(selectorCinta.value) : 0;
    const gradosExtraVal = selectorGrados ? parseInt(selectorGrados.value) : 0;

    const totalClasesBase = cintaBaseVal + gradosExtraVal;

    if (!user || !pass) return alert("Por favor completa todos los campos");

    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 30);
    const fechaConMesPagado = hoy.toISOString().split('T')[0]; 

    try {
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: `${user}@academia.com`,
            password: pass
        });

        if (authError) throw authError;

        if (authData.user) {
            // INSERTAMOS AMBOS CAMPOS: clases_base (número) y cinturon (texto)
            const { error: dbError } = await _supabase.from('perfiles').insert([
                {
                    id: authData.user.id, 
                    nombre_usuario: user,
                    fecha_vencimiento: fechaConMesPagado,
                    clases_base: totalClasesBase, // Para el cálculo de progreso
                    cinturon: nombreCinturon,     // Para el color visual y texto
                    rol: 'alumno'
                }
            ]);

            if (dbError) throw dbError;

            alert(`✅ Alumno ${user} creado como Cinturón ${nombreCinturon}.`);
            
            // Limpiar campos
            document.getElementById("reg-usuario").value = "";
            document.getElementById("reg-clave").value = "";
            if (selectorCinta) selectorCinta.value = "0";
            if (selectorGrados) selectorGrados.value = "0";
            
            verTablaAlumnos(); 
        }

    } catch (err) {
        alert("Error al crear: " + err.message);
    }
}


async function eliminarAlumno(usuario) {
    // 1. Buscamos el ROL del usuario que intenta borrar
    const { data: perfilLogueado } = await _supabase
        .from('perfiles')
        .select('rol') // <--- Cambiado de nombre_usuario a rol
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    // 2. BLOQUEO: Solo permitimos el paso si el rol es exactamente 'admin'
    // Los 'instructor' y 'usuario' serán rechazados aquí
    if (!perfilLogueado || perfilLogueado.rol !== 'admin') {
        return alert("⛔ Acceso denegado: Solo el Administrador principal puede eliminar alumnos.");
    }

    // 3. Si pasó la seguridad (es admin), pedimos confirmación
    if (!confirm(`¿Seguro que quieres eliminar a ${usuario.toUpperCase()}?\nEsta acción no se puede deshacer.`)) return;

    try {
        const { error } = await _supabase
            .from('perfiles')
            .delete()
            .eq('nombre_usuario', usuario);

        if (error) throw error;

        alert("✅ Alumno eliminado correctamente");
        verTablaAlumnos(); 
    } catch (err) {
        alert("❌ Error: " + err.message);
    } 
}

    
  //  FUNCIÓN PARA DESPLEGAR/OCULTAR SECCIONES (ACORDEÓN)
function toggleAcordeon(id) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    // Si está oculto, lo muestra. Si se ve, lo oculta.
    if (elemento.style.display === "none" || elemento.style.display === "") {
        elemento.style.display = "block";
    } else {
        elemento.style.display = "none";
    }
}

// EXPONER A WINDOW (Agrégala donde tienes las otras exposiciones globales en la sección 2)
window.toggleAcordeon = toggleAcordeon;
// LÓGICA DE MENSAJERÍA (Al final de js/script.js)
async function enviarMensajeDesdeAdmin() {
    // 1. SEGURIDAD: Verificar que sea Admin o Instructor
    const { data: miPerfil } = await _supabase
        .from('perfiles')
        .select('nombre_usuario, rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    const rolLimpio = miPerfil?.rol?.toLowerCase().trim();
    if (!['admin', 'instructor'].includes(rolLimpio)) {
        return alert("⛔ Acceso denegado.");
    }

    const destNombre = document.getElementById("msg-destinatario").value.toLowerCase().trim();
    const texto = document.getElementById("msg-contenido").value.trim();

    if (!destNombre || !texto) return alert("⚠️ Indica el destinatario y el mensaje.");

    try {
        // 2. BUSCAR ALUMNO: Traducir nombre a ID
        const { data: alumno, error: errBusqueda } = await _supabase
            .from('perfiles')
            .select('id')
            .eq('nombre_usuario', destNombre)
            .maybeSingle();

        if (errBusqueda || !alumno) throw new Error("Alumno no encontrado.");

        // 3. ENVIAR: Guardamos el ID del alumno y tu NOMBRE real
        const { error: errInsert } = await _supabase.from('mensajes').insert([
            { 
                remitente:  'admin', // <--- Ahora guarda tu nombre (ej: "carlos_instructor")
                destinatario: alumno.id, 
                contenido: texto 
            }
        ]);

        if (errInsert) throw errInsert;

        alert(`✅ Mensaje enviado con éxito a ${destNombre.toUpperCase()}`);
        document.getElementById("msg-destinatario").value = "";
        document.getElementById("msg-contenido").value = "";

    } catch (err) {
        alert("Fallo al enviar: " + err.message);
    }
}


async function guardarNuevaTecnicaMaestra() {
    try {
        // 1. Verificación de seguridad (Admin e Instructores permitidos)
        const { data: perfilLogueado } = await _supabase
            .from('perfiles')
            .select('rol')
            .eq('id', USUARIO_IDENTIFICADO)
            .maybeSingle();

        // Definimos quiénes pueden añadir técnicas
        const rolesAutorizados = ['admin', 'instructor'];

        if (!perfilLogueado || !rolesAutorizados.includes(perfilLogueado.rol)) {
            return alert("⛔ No autorizado: Solo administradores o instructores pueden añadir técnicas.");
        }

        // 2. Captura de datos
        const nombreTec = document.getElementById("nueva-tecnica-nombre").value.trim();
        if (!nombreTec) return alert("⚠️ Escribe el nombre de la técnica.");

        // 3. Inserción en la base de datos
        const { error } = await _supabase
            .from('tecnicas_maestras')
            .insert([{ nombre: nombreTec }]);

        if (error) throw error;

        // 4. Éxito y Limpieza
        alert(`✅ "${nombreTec}" añadida correctamente.`);
        document.getElementById("nueva-tecnica-nombre").value = "";
        
        // Actualizar el selector de asistencias
        if (typeof cargarSelectTecnicas === 'function') {
            cargarSelectTecnicas(); 
        }

    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

window.cambiarRolAlumno = async (id, nuevoRol) => {
    // 1. Verificamos quién intenta hacer el cambio
    const { data: adminCheck } = await _supabase
        .from('perfiles')
        .select('rol')
        .eq('id', USUARIO_IDENTIFICADO)
        .maybeSingle();

    // 2. Bloqueo de seguridad: Solo el rol 'admin' puede ejecutar esto
    if (!adminCheck || adminCheck.rol !== 'admin') {
        return alert("⛔ Acceso denegado: Solo el Administrador puede cambiar rangos de poder.");
    }

    // 3. Si es admin, ejecutamos el cambio
    const { error } = await _supabase
        .from('perfiles')
        .update({ rol: nuevoRol })
        .eq('id', id);

    if (error) {
        alert("❌ Error: " + error.message);
    } else { 
        alert("✅ Rol actualizado a " + nuevoRol + " con éxito."); 
        if (typeof verTablaAlumnos === 'function') verTablaAlumnos(); 
    }
};

async function asignarExamen() {
    // 1. Capturamos los IDs de los selectores
    const evaluadorId = document.getElementById("evaluador-examen-select").value;
    const alumnoId = document.getElementById("alumno-examen-select").value;

    // 2. Validaciones básicas
    if (!evaluadorId || !alumnoId) {
        return alert("⚠️ Debes seleccionar tanto al evaluador como al alumno.");
    }

    if (evaluadorId === alumnoId) {
        return alert("❌ Un instructor no puede evaluarse a sí mismo.");
    }

    try {
        // 3. Insertamos el examen pendiente en Supabase
        const { data, error } = await _supabase.from('examenes').insert([
            {
                id_alumno: alumnoId,
                id_evaluador: evaluadorId,
                id_admin: USUARIO_IDENTIFICADO, // ID del que está asignando
                estado: 'pendiente'
            }
        ]);

        if (error) throw error;

        // 4. Mensaje de éxito y limpieza
        alert("✅ Examen habilitado con éxito. El instructor ya puede verlo en su panel.");
        
        document.getElementById("evaluador-examen-select").value = "";
        document.getElementById("alumno-examen-select").value = "";

    } catch (err) {
        console.error("Error al asignar examen:", err);
        alert("Fallo al asignar examen: " + err.message);
    }
}

// 5. IMPORTANTE: Exponer la función globalmente para que el botón del HTML la encuentre
window.asignarExamen = asignarExamen;
// ==========================================
// 7. FUNCIONALIDADES DE REPORTE MENSUAL 2026
// ==========================================




async function consultarHistorialPagos() {
    const contenedor = document.getElementById("lista-pagos-recientes");
    
    try {
        const { data: pagos, error } = await _supabase
            .from('registros_pagos')
            .select(`
                monto,
                fecha_pago,
                perfiles ( nombre_usuario )
            `)
            .order('fecha_pago', { ascending: false })
            .limit(50); // Aumentamos a 50 para un reporte más completo

        if (error) throw error;

        if (!pagos || pagos.length === 0) {
            contenedor.innerHTML = "<p style='color:gray;'>No hay pagos registrados aún.</p>";
            return;
        }

        // --- 1. CÁLCULO DEL TOTAL ---
        // Sumamos todos los montos convirtiéndolos a número por seguridad
        const totalSuma = pagos.reduce((acc, pago) => acc + (Number(pago.monto) || 0), 0);

        // --- 2. DISEÑO DEL ENCABEZADO CON EL TOTAL ---
        let html = `
            <div style="background:#1a1a1a; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #333; text-align:center;">
                <span style="color:gray; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Recaudación Total (Visible)</span>
                <div style="color:#2ecc71; font-size:1.8rem; font-weight:bold; margin-top:5px;">$${totalSuma.toFixed(2)}</div>
            </div>
        `;

        // --- 3. CONSTRUCCIÓN DE LA TABLA ---
        html += '<table style="width:100%; color:white; font-size:0.8rem; border-collapse:collapse;">';
        html += '<tr style="border-bottom:1px solid #333; color:gray;"><th style="text-align:left; padding:8px;">Alumno</th><th style="text-align:left; padding:8px;">Monto</th><th style="text-align:left; padding:8px;">Fecha</th></tr>';
        
        pagos.forEach(pago => {
            html += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:10px;">${pago.perfiles?.nombre_usuario?.toUpperCase() || 'S/N'}</td>
                    <td style="padding:10px; color:#2ecc71; font-weight:bold;">$${Number(pago.monto).toFixed(2)}</td>
                    <td style="padding:10px; color:#888;">${pago.fecha_pago}</td>
                </tr>`;
        });
        
        html += '</table>';
        contenedor.innerHTML = html;

    } catch (err) {
        console.error("Error al consultar pagos:", err);
        contenedor.innerHTML = "<div style='color:#e74c3c; padding:10px;'>Error al cargar: " + err.message + "</div>";
    }
}

// No olvides exponerla al window
/**
 * Llena los selectores del ranking con las técnicas disponibles en Supabase.
 * Se ejecuta al cargar la sección de perfil.
 */
async function cargarSelectoresRanking() {
    // Verificamos que los elementos existan en el DOM antes de proceder
    const s1 = document.getElementById("voto-top1");
    if (!s1) return;

    try {
        const { data: tecnicas, error } = await _supabase
            .from('tecnicas_maestras')
            .select('id, nombre')
            .order('nombre', { ascending: true });

        if (error) throw error;

        // Generamos las opciones (usamos el ID BIGINT como valor)
        const opcionesHTML = tecnicas.map(t => 
            `<option value="${t.id}">${t.nombre.toUpperCase()}</option>`
        ).join('');

        const placeholder = `<option value="">-- Selecciona una técnica --</option>`;

        // Inyectamos en los 3 selectores
        ["voto-top1", "voto-top2", "voto-top3"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = placeholder + opcionesHTML;
        });

    } catch (err) {
        console.error("Error al cargar técnicas para ranking:", err.message);
    }
}

/**
 * Guarda el Top 3 semanal validando duplicados y asignando semana actual.
 */
async function guardarRankingSemanal() {
    const t1 = document.getElementById("voto-top1").value;
    const t2 = document.getElementById("voto-top2").value;
    const t3 = document.getElementById("voto-top3").value;

    // 1. Validación: Campos obligatorios
    if (!t1 || !t2 || !t3) {
        return alert("⚠️ Debes completar los 3 puestos de tu ranking.");
    }

    // 2. Validación: No permitir técnicas repetidas (Refactorización con Set)
    const seleccion = [t1, t2, t3];
    const unicos = new Set(seleccion);
    if (unicos.size !== seleccion.length) {
        return alert("❌ No puedes repetir la misma técnica. ¡Elige 3 diferentes!");
    }

    // 3. Obtener identificador de semana (Ej: "4-2026")
    const hoy = new Date();
    const numSemana = Math.ceil(hoy.getDate() / 7);
    const semanaAnio = `${numSemana}-${hoy.getFullYear()}`;

    try {
        const { error } = await _supabase
            .from('rankings_semanales')
            .insert([{
                alumno_id: USUARIO_IDENTIFICADO,
                semana_anio: semanaAnio,
                tecnica_top1: t1,
                tecnica_top2: t2,
                tecnica_top3: t3
            }]);

        if (error) throw error;

        alert("✅ ¡Ranking enviado! Tus votos (3, 2 y 1 pts) han sido registrados.");
        
        // Refactorización de UI: Bloquear botón tras votar
        const btn = document.querySelector("#contenedor-ranking-alumno button");
        if (btn) {
            btn.disabled = true;
            btn.innerText = "RANKING ENVIADO ✨";
            btn.style.background = "#222";
        }

    } catch (err) {
        console.error("Error al guardar ranking:", err);
        alert("Error técnico: " + err.message);
    }
}

async function actualizarRankingClases() {
    const contenedor = document.getElementById('lista-reporte-clases');
    if (!contenedor) return;

    try {
        // 1. Pedimos a Supabase los datos de asistencia vinculados al nombre del alumno
        const { data, error } = await _supabase
            .from('progreso_alumnos')
            .select('usuario, perfiles(nombre_usuario)');

        if (error) throw error;

        // 2. Contamos cuántas asistencias tiene cada nombre
        const conteo = {};
        data.forEach(reg => {
            const nombre = reg.perfiles?.nombre_usuario || 'Alumno';
            conteo[nombre] = (conteo[nombre] || 0) + 1;
        });

        // 3. Convertimos a lista y ordenamos de mayor a menor
        const rankingSorted = Object.entries(conteo).sort((a, b) => b - a);

        if (rankingSorted.length === 0) {
            contenedor.innerHTML = '<p style="color:gray; font-size:0.8rem; text-align:center;">No hay asistencias registradas aún.</p>';
            return;
        }

        // 4. Dibujamos el ranking en el HTML
        contenedor.innerHTML = rankingSorted.map(([nombre, total], index) => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #222; color:white; font-size:0.85rem;">
                <span>${index + 1}. ${nombre}</span>
                <span style="color:#2ecc71; font-weight:bold;">${total} Clases</span>
            </div>
        `).join('');

    } catch (err) {
        console.error("Error al cargar ranking de clases:", err);
        contenedor.innerHTML = '<p style="color:red; font-size:0.7rem;">Error al cargar el reporte.</p>';
    }
}

// Registro global para que el HTML lo encuentre
window.actualizarRankingClases = actualizarRankingClases;
async function verResultadosVotacion() {
    const contenedor = document.getElementById('lista-votos-tecnicas');
    if (!contenedor) return;

    try {
        // 1. Traemos los votos incluyendo el NOMBRE de la técnica desde la tabla vinculada
        // Nota: Esto asume que tus columnas tecnica_top1, etc., están relacionadas en Supabase
        const { data: votos, error } = await _supabase
            .from('rankings_semanales')
            .select(`
                tecnica_top1_info:tecnicas_maestras!tecnica_top1(nombre),
                tecnica_top2_info:tecnicas_maestras!tecnica_top2(nombre),
                tecnica_top3_info:tecnicas_maestras!tecnica_top3(nombre)
            `);

        if (error) throw error;

        const puntaje = {};

        // 2. Procesamos los puntos usando el nombre de la técnica
        votos.forEach(v => {
            const n1 = v.tecnica_top1_info?.nombre || "Técnica Desconocida";
            const n2 = v.tecnica_top2_info?.nombre || "Técnica Desconocida";
            const n3 = v.tecnica_top3_info?.nombre || "Técnica Desconocida";

            puntaje[n1] = (puntaje[n1] || 0) + 3;
            puntaje[n2] = (puntaje[n2] || 0) + 2;
            puntaje[n3] = (puntaje[n3] || 0) + 1;
        });

        const ranking = Object.entries(puntaje).sort((a, b) => b - a);

        if (ranking.length === 0) {
            contenedor.innerHTML = '<p style="color:gray; font-size:0.8rem;">No hay votos registrados esta semana.</p>';
            return;
        }

        // 3. Renderizamos con iconos de medallas para el Top 3
        contenedor.innerHTML = ranking.map(([nombre, puntos], i) => {
            let medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
            return `
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #222; align-items:center;">
                    <span style="color:white; font-size:0.85rem;">${medalla} ${nombre.toUpperCase()}</span>
                    <span style="color:#f1c40f; font-weight:bold; font-size:0.85rem;">${puntos} pts</span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error al cargar nombres de ranking:", err);
        contenedor.innerHTML = '<p style="color:red; font-size:0.7rem;">Error al procesar nombres de técnicas.</p>';
    }
}

window.verResultadosVotacion = verResultadosVotacion;


// 2. EXPOSICIÓN AL ÁMBITO GLOBAL
window.mostrarFormulario = mostrarFormulario;
window.validarLogin = ejecutarLogin;
window.cambiarSeccion = cambiarSeccion;
window.toggleMenu = toggleMenu;
window.filtrarTabla = filtrarTabla;
window.registrarPago = registrarPago;
window.pagoRapido = pagoRapido;
window.marcarAsistenciaGeneral = marcarAsistenciaGeneral;
window.cerrarSesion = cerrarSesion;
window.verTablaAlumnos = verTablaAlumnos;
window.prepararExcel = prepararExcel; // <--- Aseguramos la exposición aquí
window.registrarNuevoAlumno = registrarNuevoAlumno; 
window.eliminarAlumno = eliminarAlumno;
window.toggleAcordeon = toggleAcordeon; 
window.registrarPagoDesdeNombre = registrarPagoDesdeNombre; 
window.enviarMensajeDesdeAdmin = enviarMensajeDesdeAdmin;
window.guardarNuevaTecnicaMaestra = guardarNuevaTecnicaMaestra;
window.cargarSelectTecnicas = cargarSelectTecnicas;
window.consultarHistorialPagos = consultarHistorialPagos;
window.guardarRankingSemanal = guardarRankingSemanal;
window.cargarSelectoresRanking = cargarSelectoresRanking; // Opcional si solo se usa en ui.js
window.verReporteMensual = verReporteMensual;


async function verReporteMensual() {
    try {
        // 1. SEGURIDAD
        const { data: perfil } = await _supabase
            .from('perfiles')
            .select('rol')
            .eq('id', USUARIO_IDENTIFICADO)
            .maybeSingle();

        const rolActual = perfil?.rol?.toLowerCase().trim();
        if (!['admin', 'instructor'].includes(rolActual)) return; // Salir sin molestar si no es admin

        // 2. RANGO DE FECHAS
        const ahora = new Date();
        const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
        const hoyISO = ahora.toISOString();
        const primerDiaSimple = primerDiaMes.split('T')[0];
        const hoySimple = hoyISO.split('T')[0];

        // 3. CONSULTAS
        const { data: pagos, error: errPagos } = await _supabase
            .from('registros_pagos')
            .select('monto')
            .gte('fecha_pago', primerDiaSimple)
            .lte('fecha_pago', hoySimple);

        const { data: asistencias, error: errAsis } = await _supabase
            .from('progreso_alumnos')
            .select('id')
            .gte('created_at', primerDiaMes); 

        if (errPagos || errAsis) throw new Error("Error en base de datos");

        // 4. CÁLCULOS
        const totalDinero = pagos ? pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0) : 0;
        const totalAsistencias = asistencias ? asistencias.length : 0;
        const nombreMes = ahora.toLocaleString('es-ES', { month: 'long' }).toUpperCase();

        // 5. ACTUALIZAR INTERFAZ (Sin Alert)
        const contenedor = document.getElementById("resultado-reporte-rapido");
        if (contenedor) {
            contenedor.innerHTML = `
                <div style="color: white; font-family: sans-serif; text-align: left;">
                    <p style="margin: 5px 0;">💰 Ingresos: <strong>$${totalDinero.toFixed(2)}</strong></p>
                    <p style="margin: 5px 0;">🥋 Asistencias: <strong>${totalAsistencias}</strong></p>
                    <hr style="border-color: #333; margin: 10px 0;">
                    <small style="color: #888;">Actualizado: ${new Date().toLocaleTimeString()}</small>
                </div>
            `;
        }

        // HE QUITADO EL ALERT DE AQUÍ PARA QUE NO MOLESTE AL ABRIR/CERRAR

    } catch (err) {
        console.error("Error silencioso en reporte:", err);
    }
}

// Lo hacemos disponible para los botones del HTML
window.verReporteMensual = verReporteMensual;
// Asegúrate de que tu cliente Supabase esté inicializado en algún lugar de tu script:
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function abrirFinanzasConClaveSupabase() {
    const idGrupo = 'grupo-finanzas';
    const elemento = document.getElementById(idGrupo);

    if (elemento.style.display === "block") {
        elemento.style.display = "none";
        return;
    }

    const passwordIngresada = prompt("Introduce la clave de acceso financiero:");
    if (!passwordIngresada) return;

    // Usamos _supabase directamente ya que lo tienes importado arriba
    const { data, error } = await _supabase
        .from('configuracion')
        .select('clave_finanzas')
        .single();

    if (error) {
        console.error("Error Supabase:", error);
        alert("Error de conexión");
        return;
    }

    if (passwordIngresada === data.clave_finanzas) {
        elemento.style.display = "block";
        if (typeof toggleAcordeon === 'function') toggleAcordeon('sec-pago');
    } else {
        alert("Clave incorrecta");
    }
}

// IMPORTANTE: Asegúrate de que esta línea esté al final de script.js
window.abrirFinanzasConClaveSupabase = abrirFinanzasConClaveSupabase;

// Variable para rastrear en qué sección estamos
let temaActualId = null;

async function cargarForo(temaId = null, color = '#3b82f6') { // 1. Agregamos parámetro color
    temaActualId = temaId; 
    const contenedor = document.getElementById('contenedor-foro');
    const input = document.getElementById('input-foro');
    const btnEnviar = document.querySelector('button[onclick="enviarMensajeForo()"]');
    
    // --- LÓGICA DE CONTRASTE ---
    const esBlanco = color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' || color.toLowerCase() === '#ebebeb';
    const colorTextoBoton = esBlanco ? '#111' : '#fff';

    if (!contenedor) return;

    // Aplicar color al botón principal si existe
    if (btnEnviar) {
        btnEnviar.style.backgroundColor = color;
        btnEnviar.style.color = colorTextoBoton;
    }

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        let query = _supabase.from('foro_opiniones').select('*');
        
        if (temaId) {
            query = query.eq('tema_id', temaId).order('creado_en', { ascending: true });
            // 2. Botón VOLVER con contraste
            contenedor.innerHTML = `<button onclick="cargarForo(null, '${color}')" style="background:${color}; color:${colorTextoBoton}; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-bottom:15px; font-size:0.8rem; font-weight:bold;">⬅ Volver a todos los temas</button>`;
            if(input) input.placeholder = "Escribe tu respuesta...";
            if(btnEnviar) btnEnviar.innerText = "Responder";
        } else {
            query = query.is('tema_id', null).order('creado_en', { ascending: false });
            contenedor.innerHTML = '<h3 style="color:white; font-size:1rem; margin-bottom:12px;">Temas Recientes</h3>';
            if(input) input.placeholder = "Sugiere un nuevo tema...";
            if(btnEnviar) btnEnviar.innerText = "Crear Tema";
        }

        const { data: mensajes, error } = await query;
        if (error) throw error;

        if (!mensajes || mensajes.length === 0) {
            contenedor.innerHTML += '<p style="color:gray; text-align:center; font-size:0.8rem; margin-top:20px;">No hay nada publicado aquí.</p>';
            return;
        }

        contenedor.innerHTML += mensajes.map(msg => {
            const esMio = user && msg.usuario_id === user.id;
            const esTemaPrincipal = !temaId;

            return `
                <div class="msg-foro" 
                     ${esTemaPrincipal ? `onclick="cargarForo('${msg.id}', '${color}')"` : ''} 
                     style="background:#1a1a1a; padding:12px; margin-bottom:10px; border-radius:8px; 
                            border-left: 4px solid ${esTemaPrincipal ? color : '#444'}; 
                            cursor: ${esTemaPrincipal ? 'pointer' : 'default'};">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <strong style="color:${color}; font-size:0.85rem;">${msg.nombre_usuario}</strong>
                        ${esMio ? `<button onclick="event.stopPropagation(); window.eliminarMensajeForo('${msg.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem;">🗑️</button>` : ''}
                    </div>

                    <p style="margin:8px 0; color:white; font-size:0.9rem; line-height:1.4;">
                        ${esTemaPrincipal ? `<span style="color:${color}; font-weight:bold;">TEMA:</span> ` : ''}${msg.mensaje}
                    </p>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <small style="color:gray; font-size:0.65rem;">${new Date(msg.creado_en).toLocaleString()}</small>
                        ${esTemaPrincipal ? `<span style="color:${color}; font-size:0.7rem; font-weight:bold;">Participar →</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error:", err);
        contenedor.innerHTML = '<p style="color:red;">Error al cargar datos.</p>';
    }
}


async function enviarMensajeForo() {
    const input = document.getElementById('input-foro');
    if (!input || !input.value.trim()) return;

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return alert("Inicia sesión primero.");

        const { data: perfil } = await _supabase.from('perfiles').select('nombre_usuario').eq('id', user.id).maybeSingle();

        const { error } = await _supabase.from('foro_opiniones').insert([
            { 
                usuario_id: user.id, 
                nombre_usuario: perfil?.nombre_usuario || user.email, 
                mensaje: input.value.trim(),
                tema_id: temaActualId // Si es null, crea tema. Si tiene ID, es respuesta.
            }
        ]);

        if (error) throw error;

        input.value = '';
        await cargarForo(temaActualId); 

    } catch (err) {
        console.error(err);
        alert("No se pudo publicar.");
    }
}
// AÑADE ESTA FUNCIÓN QUE FALTA EN TU CÓDIGO:
async function eliminarMensajeForo(msgId) {
    if (!confirm("¿Eliminar este mensaje?")) return;
    
    try {
        const { error } = await _supabase.from('foro_opiniones').delete().eq('id', msgId);
        if (error) throw error;
        
        // Recargar el nivel actual (tema o lista general)
        await cargarForo(temaActualId);
    } catch (err) {
        console.error("Error al borrar:", err);
        alert("No se pudo eliminar el mensaje.");
    }
}
// Registro global
window.cargarForo = cargarForo;
window.enviarMensajeForo = enviarMensajeForo;
window.eliminarMensajeForo = eliminarMensajeForo;

export async function crearNuevaClaseDB(nombre, fecha, hora) {
    const fechaHoraISO = `${fecha}T${hora}:00`; // Formato compatible con Timestamptz

    const { data, error } = await _supabase
        .from('clases')
        .insert([{ 
            nombre_clase: nombre, 
            fecha_hora: fechaHoraISO 
        }]);

    if (error) {
        console.error("Error en Supabase:", error.message);
        throw error;
    }
    return data;
}

// Asegúrate de exponerla si la usas desde el HTML directamente
window.crearNuevaClaseDB = crearNuevaClaseDB;
export async function registrarClaseYAsistencia(datos) {
    const { nombre, fecha, hora, id_tecnica, usuario_alumno, instructor } = datos;
    const fechaHoraISO = `${fecha}T${hora}:00`;

    // 1. Guarda en historial de la academia
    const { data: claseData, error: errorClase } = await _supabase
        .from('clases')
        .insert([{ 
            nombre_clase: nombre, 
            fecha_hora: fechaHoraISO, 
            id_tecnica: id_tecnica,
            registrado_por: instructor
        }]);

    if (errorClase) throw errorClase;

    // 2. Guarda en el progreso del alumno (Tabla que ya tenías)
    const { error: errorProgreso } = await _supabase
        .from('progreso_alumnos')
        .insert([{
            id_tecnica: id_tecnica,
            usuario: usuario_alumno,
            registrado_por: instructor
        }]);

    if (errorProgreso) throw errorProgreso;

    return claseData;
}
window.registrarClaseYAsistencia = registrarClaseYAsistencia;
