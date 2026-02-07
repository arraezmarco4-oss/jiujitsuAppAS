import { _supabase } from './api.js';
import { USUARIO_IDENTIFICADO } from './auth.js';

// 1. DEFINICIÓN DE NIVELES (Pégalo arriba de todo en ui.js)
const CINTAS = [
    { nombre: "Blanca", color: "#ffffff", clases_inicio: 0, clases_fin: 200 }, // Subimos de 160 a 200
    { nombre: "Verde", color: "#22c55e", clases_inicio: -100, clases_fin: -1 },
    { nombre: "Azul", color: "#0055ff", clases_inicio: 201, clases_fin: 520 }, // Empieza en 201
    { nombre: "Morada", color: "#8b5cf6", clases_inicio: 521, clases_fin: 840 },
    { nombre: "Marrón", color: "#5d4037", clases_inicio: 841, clases_fin: 1240 },
    { nombre: "Negra", color: "#111111", clases_inicio: 1241, clases_fin: 9999 }
];

export async function cambiarSeccion(seccion) {
    const titulo = document.getElementById("titulo-seccion");
    const listaUL = document.getElementById("lista");
    const cinta = document.getElementById("contenedor-cinta");
    const calendario = document.getElementById("calendario-tecnicas");
    const infoAdicional = document.getElementById("info-adicional");
    
    const menu = document.getElementById("dropdown-menu");
    if (menu && menu.classList.contains("show")) toggleMenu(); 
    
    if(listaUL) listaUL.innerHTML = "";
    if(infoAdicional) infoAdicional.innerHTML = "";
    if(calendario) { calendario.innerHTML = ""; calendario.style.display = "none"; }
    if(cinta) cinta.style.display = "none";

    switch(seccion) {
        case 'perfil':
            titulo.innerText = "Mi Progreso";
            cinta.style.display = "block";
            calendario.style.display = "flex"; 
            await dibujarCalendarioYProgreso();
             /*
            // --- NUEVO: BLOQUE DE RANKING SEMANAL ---
            listaUL.innerHTML = `
                <div id="contenedor-ranking-alumno" style="background:#111; padding:20px; border-radius:15px; margin-top:20px; border:1px solid #333; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <h3 style="color:#ffd700; font-size:1rem; margin-bottom:10px; display:flex; align-items:center; gap:10px;">
                        🏆 TOP 3 TÉCNICAS DE LA SEMANA
                    </h3>
                    <p style="color:gray; font-size:0.8rem; margin-bottom:15px;">Selecciona en orden las técnicas que más te gustaron de las clases vistas.</p>
                    
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label style="color:#ffd700; font-size:0.7rem; font-weight:bold;">1er LUGAR (Favorita):</label>
                            <select id="voto-top1" class="modern-input" style="border-left: 4px solid #ffd700;"></select>
                        </div>
                        <div>
                            <label style="color:#c0c0c0; font-size:0.7rem; font-weight:bold;">2do LUGAR:</label>
                            <select id="voto-top2" class="modern-input" style="border-left: 4px solid #c0c0c0;"></select>
                        </div>
                        <div>
                            <label style="color:#cd7f32; font-size:0.7rem; font-weight:bold;">3er LUGAR:</label>
                            <select id="voto-top3" class="modern-input" style="border-left: 4px solid #cd7f32;"></select>
                        </div>
                    </div>

                    <button onclick="guardarRankingSemanal()" style="background:linear-gradient(90deg, #1e40af, #3b82f6); width:100%; margin-top:20px; padding:12px; border-radius:8px; color:white; border:none; font-weight:bold; cursor:pointer; transition: 0.3s;">
                        ENVIAR MI RANKING
                    </button>
                </div>
            `;

            // Llenamos los selectores con las técnicas de la base de datos
            await cargarSelectoresRanking();// ... justo después de `await cargarSelectoresRanking();`
const divForo = document.createElement("div");
divForo.id = "seccion-foro";
divForo.style = "margin-top:25px; padding:20px; background:#0a0a0a; border-radius:15px; border: 1px solid #222;";
divForo.innerHTML = `
    <h3 style="color:white; margin-top:0; font-size:1rem;">💬 DEBATE DE LA ACADEMIA</h3>
    <div style="display:flex; gap:10px; margin-bottom:20px;">
        <input type="text" id="input-foro" placeholder="Escribe un mensaje..." 
               style="flex:1; background:#111; border:1px solid #333; color:white; padding:10px; border-radius:8px;">
        <button onclick="enviarMensajeForo()" 
                style="background:#3b82f6; color:white; border:none; padding:10px 15px; border-radius:8px; font-weight:bold; cursor:pointer;">
            Enviar
        </button>
    </div>
    <div id="contenedor-foro" style="max-height:400px; overflow-y:auto;">
        <p style="color:gray; font-size:0.8rem;">Cargando mensajes...</p>
    </div>
`;
listaUL.appendChild(divForo);

// Y finalmente cargas los mensajes
if (window.cargarForo) window.cargarForo();
 */
            break; 
        case 'tecnicas':
            titulo.innerText = "Biblioteca de Técnicas";
            listaUL.innerHTML = `<div id="tabla-tecnicas-container"></div>`;
            verMisTecnicas(); 
            break; 
 case 'registro':
    const miRolActual = await obtenerRol();

    if (miRolActual === 'admin' || miRolActual === 'instructor') {
        titulo.innerText = "Panel Administrativo";
        listaUL.innerHTML = `
        <style>
            .grupo-maestro { margin-bottom: 15px; border-radius: 12px; overflow: hidden; border: 1px solid #333; }
            .barra-maestra { background: #1a1a1a; padding: 18px; cursor: pointer; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; border-left: 6px solid #ce0000; }
            .barra-maestra:hover { background: #252525; }
            .contenido-grupo { display: none; padding: 10px; background: #000; }
            .barra-admin { background: #222; padding: 12px; border-radius: 8px; margin-top: 8px; cursor: pointer; color: #ccc; font-size: 0.9rem; border-left: 3px solid #444; display: flex; justify-content: space-between; }
            .bloque-admin { display: none; padding: 12px; background: #111; border: 1px solid #222; margin-bottom: 8px; }
            .modern-input { width: 100%; padding: 10px; margin-top: 5px; border-radius: 5px; border: 1px solid #333; background: #000; color: white; box-sizing: border-box; }
            .btn-admin { margin-top:10px; width:100%; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; }
            label { color: gray; font-size: 0.7rem; display: block; margin-top: 10px; }
        </style>

        <!-- 1. GRUPO: GESTIÓN FINANCIERA -->
        <div class="grupo-maestro">
            <div class="barra-maestra" style="border-left-color: #27ae60;" onclick="abrirFinanzasConClaveSupabase()">💰 FINANZAS Y PAGOS <span>▼</span></div>
            <div id="grupo-finanzas" class="contenido-grupo">
                <button onclick="verReporteMensual()" class="btn-admin" style="background:#27ae60; margin-bottom:5px;">📊 VER REPORTE DEL MES</button>
                <div id="resultado-reporte-rapido" style="margin-bottom:15px;"></div>
                
                <div class="barra-admin" onclick="toggleAcordeon('sec-pago')">Registrar Mensualidad +</div>
                <div id="sec-pago" class="bloque-admin">
                    <input type="text" id="alumno-pago-nombre" placeholder="Nombre del alumno" class="modern-input">
                    <button onclick="registrarPagoDesdeNombre()" class="btn-admin" style="background:#059669;">RENOVAR 30 DÍAS</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-historial-pagos'); consultarHistorialPagos();">Historial de Ingresos +</div>
                <div id="sec-historial-pagos" class="bloque-admin">
                    <div id="lista-pagos-recientes"><p style="color:gray; font-size:0.8rem;">Cargando caja...</p></div>
                </div>
            </div>
        </div>

        <!-- 2. GRUPO: CONTROL DE CLASES -->
        <div class="grupo-maestro">
            <div class="barra-maestra" style="border-left-color: #2ecc71;" onclick="toggleAcordeon('grupo-clases')">🥋 CONTROL DE CLASES <span>▼</span></div>
            <div id="grupo-clases" class="contenido-grupo">
                <div class="barra-admin" onclick="toggleAcordeon('sec-asistencia')">Marcar Asistencia +</div>
                <div id="sec-asistencia" class="bloque-admin">
                    <label>Alumno:</label>
                    <select id="alumno-asistencia-select" class="modern-input" multiple></select>
                    <label>Técnica del día:</label>
                    <select id="tecnica-id" class="modern-input"></select>
                    <button onclick="marcarAsistenciaGeneral()" class="btn-admin" style="background:#2ecc71;">CONFIRMAR ASISTENCIA</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-tecnica-maestra')">Crear Técnica +</div>
                <div id="sec-tecnica-maestra" class="bloque-admin">
                    <input type="text" id="nueva-tecnica-nombre" placeholder="Nombre técnica" class="modern-input">
                    <label>Categoría:</label>
                    <select id="nueva-tecnica-categoria" class="modern-input">
                        <option value="Basica">Básica ⚪</option>
                        <option value="Intermedia">Intermedia 🔵🟣</option>
                        <option value="Avanzada">Avanzada 🟤⚫</option>
                    </select>
                    <button onclick="guardarNuevaTecnicaMaestra()" class="btn-admin" style="background:#ff5722;">GUARDAR TÉCNICA</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-reporte-mensual'); actualizarRankingClases();">Ranking Clases +</div>
                <div id="sec-reporte-mensual" class="bloque-admin">
                <div id="lista-reporte-clases">
                   <p style="color:gray; font-size:0.8rem; text-align:center; padding:10px;">Cargando ranking de asistencia...</p>
                </div>
            </div>
            <div class="barra-admin" onclick="toggleAcordeon('sec-tecnicas-favoritas'); verResultadosVotacion();">Ranking Técnicas Favoritas ⭐</div>
<div id="sec-tecnicas-favoritas" class="bloque-admin">
    <div id="lista-votos-tecnicas"><p style="color:gray; font-size:0.8rem;">Cargando votos...</p></div>
</div>

        </div>

        <!-- 3. GRUPO: GESTIÓN DE ALUMNOS -->
        <div class="grupo-maestro">
            <div class="barra-maestra" style="border-left-color: #3b82f6;" onclick="toggleAcordeon('grupo-alumnos')">👥 ALUMNOS <span>▼</span></div>
            <div id="grupo-alumnos" class="contenido-grupo">
                <div class="barra-admin" onclick="toggleAcordeon('sec-crear')">Nuevo Alumno +</div>
                <div id="sec-crear" class="bloque-admin">
                    <input type="text" id="reg-usuario" placeholder="Usuario" class="modern-input">
                    <input type="password" id="reg-clave" placeholder="Contraseña" class="modern-input">
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Cinta:</label>
                            <select id="reg-cinta-inicial" class="modern-input">
                                <option value="0">Blanca</option>
                                <option value="161">Azul</option>
                                <option value="481">Morada</option>
                                <option value="801">Marrón</option>
                                <option value="1201">Negra</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label>Grados:</label>
                            <select id="reg-grados-inicial" class="modern-input">
                                <option value="0">0 Grados</option>
                                <option value="40">1 Grado</option>
                                <option value="80">2 Grados</option>
                                <option value="120">3 Grados</option>
                                <option value="160">4 Grados</option>
                            </select>
                        </div>
                    </div>
                    <button onclick="registrarNuevoAlumno()" class="btn-admin" style="background:#3b82f6;">REGISTRAR ALUMNO</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-tabla-alumnos')">Listado General +</div>
                <div id="sec-tabla-alumnos" class="bloque-admin">
                    <div id="tabla-alumnos-container"><p style="color:gray; font-size:0.8rem;">Cargando...</p></div>
                </div>
            </div>
        </div>
         <!-- 4. GRUPO: REGISTRO DE CLASES Y ASISTENCIA -->
        <div class="grupo-maestro">
            <div class="barra-maestra" style="border-left-color: #f1c40f;" onclick="toggleAcordeon('grupo-calendario')">🥋 REGISTRO DE CLASES <span>▼</span></div>
            <div id="grupo-calendario" class="contenido-grupo">
                
                <div class="barra-admin" onclick="toggleAcordeon('sec-programar-clase')">Nueva Clase +</div>
                <div id="sec-programar-clase" class="bloque-admin">
                    
                    
                    <label>Técnica Vista:</label>
                    <select id="clase-tecnica-id" class="modern-input">
                        <option value="">Seleccione técnica...</option>
                    </select>

                    <label>Alumno que Asistió:</label>
                    <select id="clase-alumno-usuario" class="modern-input">
                        <option value="">Seleccione alumno...</option>
                    </select>
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Fecha:</label>
                            <input type="date" id="clase-fecha" class="modern-input">
                        </div>
                        <div style="flex: 1;">
                            <label>Hora:</label>
                            <input type="time" id="clase-hora" class="modern-input">
                        </div>
                    </div>
                    <button onclick="manejarRegistroClaseCompleto()" class="btn-admin" style="background:#f1c40f; color: black;">CREAR NUEVA CLASE</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-ver-clases'); consultarClasesProgramadas();">Ver Clases Dadas +</div>
                <div id="sec-ver-clases" class="bloque-admin">
                    <div id="lista-clases-calendario">
                        <p style="color:gray; font-size:0.8rem; text-align:center;">Cargando historial...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. GRUPO: EVALUACIÓN Y COMUNICACIÓN -->
        <div class="grupo-maestro">
            <div class="barra-maestra" style="border-left-color: #ffd700;" onclick="toggleAcordeon('grupo-comunicacion')">🎓 EVALUACIÓN Y MSG <span>▼</span></div>
            <div id="grupo-comunicacion" class="contenido-grupo">
                <div class="barra-admin" onclick="toggleAcordeon('sec-examen')">Asignar Examen +</div>
                <div id="sec-examen" class="bloque-admin">
                    <label>Evaluador:</label>
                    <select id="evaluador-examen-select" class="modern-input"></select>
                    <label>Alumno:</label>
                    <select id="alumno-examen-select" class="modern-input"></select>
                    <button onclick="asignarExamen()" class="btn-admin" style="background:#ffd700; color:black;">HABILITAR EXAMEN</button>
                </div>

                <div class="barra-admin" onclick="toggleAcordeon('sec-mensaje')">Mensaje Privado +</div>
                <div id="sec-mensaje" class="bloque-admin">
                    <input type="text" id="msg-destinatario" placeholder="Nombre alumno" class="modern-input">
                    <textarea id="msg-contenido" placeholder="Escribe el mensaje aquí..." class="modern-input" style="height:60px;"></textarea>
                    <button onclick="enviarMensajeDesdeAdmin()" class="btn-admin" style="background:#8b5cf6;">ENVIAR MENSAJE</button>
                </div>
            </div>
        </div>
        `;

        // ... (tus llamadas originales)
        if (typeof cargarSelectTecnicas === 'function') await cargarSelectTecnicas(); 
        if (typeof cargarSelectAlumnosAsistencia === 'function') await cargarSelectAlumnosAsistencia();
        if (typeof verTablaAlumnos === 'function') verTablaAlumnos(); 

        // --- TRUCO DE CLONACIÓN PARA EL CALENDARIO ---
        // Esto copia lo que cargaron tus funciones originales en los nuevos selectores
        const tecOrigen = document.getElementById("tecnica-id");
        const aluOrigen = document.getElementById("alumno-asistencia-select");
        const tecNuevo = document.getElementById("clase-tecnica-id");
        const aluNuevo = document.getElementById("clase-alumno-usuario");

        if (tecOrigen && tecNuevo) tecNuevo.innerHTML = tecOrigen.innerHTML;
        if (aluOrigen && aluNuevo) aluNuevo.innerHTML = aluOrigen.innerHTML;
        // ---------------------------------------------

    } else {
        alert("Acceso denegado.");
        cambiarSeccion('perfil');
    }
    break;


    case 'fechas':
    titulo.innerText = "Horarios de Entrenamiento";
    // IMPORTANTE: Aseguramos que se vea el contenedor de texto
    if(listaUL) {
        listaUL.innerHTML = `
            <div style="padding: 10px; max-width: 500px; margin: 0 auto; color: white;">
                <!-- PRINCIPIANTES -->
                <div style="background: rgba(255, 255, 255, 0.05); border-left: 5px solid #ffffff; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #ffffff; margin: 0 0 5px 0;">🥋 BJJ Principiantes</h3>
                    <p style="margin: 5px 0;">Lunes a Jueves: 17:30 - 18:30</p>
                    <p style="margin: 5px 0; font-size: 0.8rem; color: #aaa;">Viernes (Open Mat): 06:00</p>
                </div>  

                <!-- AVANZADO -->
                <div style="background: rgba(255, 255, 255, 0.05); border-left: 5px solid #0055ff; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #0055ff; margin: 0 0 5px 0;">🥋 BJJ Avanzado</h3>
                    <p style="margin: 5px 0;">Lunes a Jueves: 18:30 - 20:00</p>
                    <p style="margin: 5px 0; font-size: 0.8rem; color: #aaa;">Viernes (Open Mat): 06:00</p>
                </div>

                <!-- KIDS -->
                <div style="background: rgba(255, 255, 255, 0.05); border-left: 5px solid #3b82f6; border-radius: 10px; padding: 15px;">
                    <h3 style="color: #3b82f6; margin: 0 0 5px 0;">👶 BJJ Kids</h3>
                    <p style="margin: 5px 0;">Lunes, Martes y Jueves: 16:30 - 17:30</p>
                </div>
            </div>
        `;
    }

            break;
    }
}

// --- . NAVEGACIÓN SPA ---
export async function dibujarCalendarioYProgreso() {
    if(!USUARIO_IDENTIFICADO) return; 
    
    const calendarioDiv = document.getElementById("calendario-tecnicas");
    const barraProgreso = document.getElementById("progreso-cinta");
    const infoAdicional = document.getElementById("info-adicional");
    const displayNombre = document.getElementById("nombre-usuario-perfil");
  try {
        // 1. OBTENER DATOS
        const { data: userData } = await _supabase.from('perfiles')
            .select('nombre_usuario, fecha_vencimiento, clases_base, cinturon') 
            .eq('id', USUARIO_IDENTIFICADO).maybeSingle();
        
        if (!userData) return;
        if(displayNombre) displayNombre.innerText = userData.nombre_usuario.toUpperCase();

        const { data: examenesPendientes } = await _supabase.from('examenes').select(`id, perfiles!id_alumno(nombre_usuario)`).eq('id_evaluador', USUARIO_IDENTIFICADO).eq('estado', 'pendiente');
        const { data: registros } = await _supabase.from('progreso_alumnos').select('created_at, id_tecnica').eq('usuario', USUARIO_IDENTIFICADO); 
        const { data: todasTecnicas } = await _supabase.from('tecnicas_maestras').select('id, nombre');

          // 2. LÓGICA DE PROGRESO Y CINTA
        const totalClases = (registros ? registros.length : 0) + (userData.clases_base || 0);
        
        let cintaActual;
        let gradosEnCinta;
        let porcentajeVisual;

        if (userData.cinturon === "Verde") {
            // --- LÓGICA PARA CINTURÓN VERDE ---
            cintaActual = CINTAS.find(c => c.nombre === "Verde") || { nombre: "Verde", color: "#22c55e" };
            
            // Cada 40 clases sube un grado (máximo 4)
            gradosEnCinta = Math.min(Math.floor(totalClases / 40), 4);
            
            // El porcentaje visual es el progreso hacia el siguiente grado
            porcentajeVisual = ((totalClases % 40) / 40) * 100;
        } else {
            // --- LÓGICA ORIGINAL PARA ADULTOS ---
            cintaActual = CINTAS.find(c => totalClases >= c.clases_inicio && totalClases <= c.clases_fin) || CINTAS[0];
            const clasesEnCinta = totalClases - cintaActual.clases_inicio;
            gradosEnCinta = Math.min(Math.floor(clasesEnCinta / 40), 4);

            let porcGrado;
            if (clasesEnCinta < 160) {
                porcGrado = ((clasesEnCinta % 40) / 40) * 100;
            } else {
                const metaTotalCinta = cintaActual.clases_fin - cintaActual.clases_inicio;
                const rangoFinal = metaTotalCinta - 160;
                porcGrado = rangoFinal > 0 ? ((clasesEnCinta - 160) / rangoFinal) * 100 : 100;
            }
            porcentajeVisual = Math.min(Math.max(porcGrado, 0), 100);
        }


        // 3. LÓGICA DE RACHA (Mantenemos esta parte para que 'racha' exista)
        let racha = 0;
        if (registros && registros.length > 0) {
            const fechas = [...new Set(registros.map(r => r.created_at.split('T')[0]))].sort().reverse();
            const hoyIso = new Date().toISOString().split('T')[0];
            const ayerIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            if (fechas[0] === hoyIso || fechas[0] === ayerIso) {
                racha = 1;
                for (let i = 0; i < fechas.length - 1; i++) {
                    const d1 = new Date(fechas[i]);
                    const d2 = new Date(fechas[i+1]);
                    const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
                    if (diff === 1) racha++; else break;
                }
            }
        }
        


        // ==========================================
        // CONSTRUCCIÓN DE PIEZAS HTML INDEPENDIENTES
        // ==========================================

        // PIEZA A: PROGRESO AL SIGUIENTE STRIPE (AHORA INDEPENDIENTE Y ARRIBA)
        let htmlBarraStripe = `
            <div style="background: #111; padding: 15px; border-radius: 15px; border: 1px solid #222; margin-top: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: white; font-size: 0.7rem; font-weight: bold;">PROGRESO AL SIGUIENTE STRIPE</span>
                    <span style="color: ${cintaActual.color}; font-size: 0.7rem;">${Math.round(porcentajeVisual)}%</span>
                </div>
                <div style="background: #222; height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${porcentajeVisual}%; background: ${cintaActual.color}; height: 100%; transition: width 1s ease;"></div>
                </div>
            </div>`;

        // PIEZA B: RACHA Y CINTA
        let htmlPrincipal = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: #111; padding: 15px; border-radius: 15px; border: 1px solid ${racha > 2 ? '#ff4d4d' : '#333'}; text-align: center;">
                    <div style="font-size: 1.5rem;">${racha > 2 ? '🔥' : '🧊'}</div>
                    <div style="color: white; font-weight: bold; font-size:0.8rem;">${racha} DÍAS</div>
                </div>
                <div style="background: #111; padding: 15px; border-radius: 15px; border: 1px solid ${cintaActual.color}; text-align: center;">
                    <div style="color: ${cintaActual.color}; font-size: 0.7rem; font-weight: bold;">CINTA ${cintaActual.nombre.toUpperCase()}</div>
                    <div style="color: white; font-size: 0.8rem;">Grado ${gradosEnCinta}</div>
                </div>
            </div>`;


// PIEZA C: RANKING (Sincronizado con el color del cinturón)
const colorManejo = cintaActual.color; 
// Si la cinta es blanca, usamos un gris casi negro (#111) para que resalte
const colorTextoBoton = (cintaActual.nombre === 'Blanco' || colorManejo.toLowerCase() === '#ffffff') ? '#111111' : '#ffffff';

let htmlRanking = `
<div id="contenedor-ranking-alumno" style="background:#111; padding:20px; border-radius:15px; border:1px solid ${colorManejo}66; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
    <h3 style="color:${colorManejo}; font-size:0.9rem; margin-bottom:10px; display:flex; align-items:center; gap:10px;">
        🏆 TOP 3 TÉCNICAS DE LA SEMANA
    </h3>
    <div style="display:flex; flex-direction:column; gap:12px;">
        <div>
            <label style="color:${colorManejo}; font-size:0.7rem; font-weight:bold; display:block; margin-bottom:4px; opacity:1;">🥇 1er LUGAR:</label>
            <select id="voto-top1" class="modern-input" style="border-left: 4px solid ${colorManejo}; background:#000; color:white; width:100%; padding:8px; border-radius:5px; border-top:none; border-right:none; border-bottom:none;"></select>
        </div>
        <div>
            <label style="color:${colorManejo}; font-size:0.7rem; font-weight:bold; display:block; margin-bottom:4px; opacity:0.8;">🥈 2do LUGAR:</label>
            <select id="voto-top2" class="modern-input" style="border-left: 4px solid ${colorManejo}aa; background:#000; color:white; width:100%; padding:8px; border-radius:5px; border-top:none; border-right:none; border-bottom:none;"></select>
        </div>
        <div>
            <label style="color:${colorManejo}; font-size:0.7rem; font-weight:bold; display:block; margin-bottom:4px; opacity:0.6;">🥉 3er LUGAR:</label>
            <select id="voto-top3" class="modern-input" style="border-left: 4px solid ${colorManejo}66; background:#000; color:white; width:100%; padding:8px; border-radius:5px; border-top:none; border-right:none; border-bottom:none;"></select>
        </div>
        <button onclick="guardarRankingSemanal()" style="background:${colorManejo}; width:100%; margin-top:10px; padding:14px; border-radius:8px; color:${colorTextoBoton}; border:none; font-weight:800; cursor:pointer; text-transform: uppercase; transition: 0.3s; font-size:0.85rem; letter-spacing:1px;">
            ENVIAR MI RANKING
        </button>
    </div>
</div>`;

      // pieza D: Foro de debate(sincronizado con el color del cinturon)

let htmlForo = `
    <div id="seccion-foro" style="padding:20px; background:#0a0a0a; border-radius:15px; border: 1px solid ${colorManejo}33; margin-top:20px; max-width: 100%; box-sizing: border-box;">
        <h3 style="color:white; margin:0 0 15px 0; font-size:0.9rem; display:flex; align-items:center; gap:8px;">
            <span style="background:${colorManejo}; width:8px; height:8px; border-radius:50%; box-shadow: 0 0 8px ${colorManejo};"></span>
            💬 DEBATE DE LA ACADEMIA
        </h3>
        
        <div style="display:flex; gap:8px; margin-bottom:15px;">
            <input type="text" id="input-foro" 
                placeholder="Escribe un nuevo tema..." 
                style="flex:1; background:#111; border:1px solid #333; color:white; padding:10px; border-radius:8px; outline:none; font-size:0.9rem; transition: border 0.3s;"
                onfocus="this.style.borderColor='${colorManejo}'" 
                onblur="this.style.borderColor='#333'">
            
            <button id="btn-enviar-foro" onclick="enviarMensajeForo()" 
                style="background:${colorManejo}; color:${colorTextoBoton}; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.85rem; transition: transform 0.2s; text-transform: uppercase;">
                Publicar
            </button>
        </div>

        <!-- Contenedor con scroll -->
        <div id="contenedor-foro" style="max-height: 500px; overflow-y: auto; padding-right: 5px;">
            <!-- Los temas/mensajes se cargan aquí con window.cargarForo() -->
        </div>
    </div>`;

        // PIEZA E: EXÁMENES Y MENSAJES (TU LÓGICA ORIGINAL)
        let htmlExamenes = "";
        if (examenesPendientes && examenesPendientes.length > 0) {
            htmlExamenes = `<div style="background:#ffd700; color:black; padding:12px; border-radius:12px; margin-bottom:15px; font-weight:bold; text-align:center;">⚠️ EVALUACIONES PENDIENTES</div>`;
            examenesPendientes.forEach(ex => {
                const nombreAlumno = ex.perfiles.nombre_usuario.toUpperCase();
                htmlExamenes += `<div style="background:#111; padding:15px; border-radius:12px; border:1px solid #ffd700; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;"><span style="color:white; font-size:0.8rem; font-weight:bold;">EVALUAR A: ${nombreAlumno}</span><button onclick="abrirCuestionarioExamen('${ex.id}', '${nombreAlumno}')" style="background:#ffd700; color:black; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">INICIAR 🥋</button></div>`;
            });
        }

        const { data: mensajes } = await _supabase.from('mensajes').select('*').eq('destinatario', USUARIO_IDENTIFICADO).order('created_at', { ascending: false });
        let htmlMensajes = "";
        if (mensajes && mensajes.length > 0) {
            htmlMensajes = `<h3 style="color:white; font-size:0.8rem; margin: 10px 0 10px 0; border-left: 3px solid #8b5cf6; padding-left: 10px;">MENSAJES</h3>`;
            mensajes.forEach(m => { htmlMensajes += `<div style="background:#111; padding:12px; border-radius:10px; border:1px solid #222; margin-bottom:10px;"><p style="color:white; margin:0; font-size:0.85rem;">${m.contenido}</p></div>`; });
        }

        // --- INYECCIÓN FINAL ORDENADA (CIRUGÍA TERMINADA) ---
        infoAdicional.innerHTML = htmlBarraStripe + htmlExamenes + htmlPrincipal + htmlRanking + htmlMensajes + htmlForo;

        // --- ACTUALIZACIÓN CINTA FÍSICA ---
        if(barraProgreso) { 
            const contenedorCinta = document.querySelector(".cinta-bjj");
            if(contenedorCinta) contenedorCinta.style.backgroundColor = cintaActual.color;
            barraProgreso.style.width = porcentajeVisual + "%"; 
        }

        // --- DIBUJAR CALENDARIO (SIN CAMBIOS) ---
        const historialFechas = {};
        if (registros) {
            registros.forEach(r => {
                const fechaKey = r.created_at.split('T')[0];
                const tObj = todasTecnicas?.find(t => t.id === r.id_tecnica);
                const nombreT = r.id_tecnica === 0 ? "Clase General" : (tObj ? tObj.nombre : "Técnica");
                if (!historialFechas[fechaKey]) historialFechas[fechaKey] = [];
                historialFechas[fechaKey].push(nombreT);
            });
        }

        calendarioDiv.innerHTML = "";
        const hoy = new Date();
        const nombresMeses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        const tituloMes = document.createElement("div");
        tituloMes.style.cssText = "grid-column: 1 / span 7; text-align: center; color: white; font-weight: bold; margin-bottom: 10px; font-family: Kanit;";
        tituloMes.innerText = `${nombresMeses[hoy.getMonth()]} 2026`;
        calendarioDiv.appendChild(tituloMes);

        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        let desfase = primerDiaMes.getDay() === 0 ? 7 : primerDiaMes.getDay();
        for (let e = 1; e < desfase; e++) { calendarioDiv.appendChild(document.createElement("div")); }

        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        for (let dia = 1; dia <= ultimoDiaMes; dia++) {
            const fechaActual = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
            const iso = fechaActual.toISOString().split('T')[0];
            const tecnicasDia = historialFechas[iso];
            const box = document.createElement("div");
            box.className = "cal-box";
             if (dia === hoy.getDate()) box.style.outline = `2px solid ${(cintaActual.nombre === 'Blanco') ? '#000' : '#fff'}`;
            box.style.backgroundColor = tecnicasDia ? (cintaActual.color || '#2ecc71') : '#222';
            if (tecnicasDia) {
                const fechaL = `${dia} DE ${nombresMeses[hoy.getMonth()]}`;
                box.onclick = () => alert(`📅 FECHA: ${fechaL}\n\n🥋 TÉCNICAS:\n• ${tecnicasDia.join("\n• ")}`);
            }
            calendarioDiv.appendChild(box);
        }

            // CARGAR COMPONENTES EXTERNOS
            // Le pasamos el color de la cinta para que el foro sepa cómo pintarse
            if (window.cargarForo) await window.cargarForo(null, cintaActual.color);
            if (window.cargarSelectoresRanking) await window.cargarSelectoresRanking();

    } catch (e) { console.error("Error n perfil:", e); }
}



export async function verTablaAlumnos() {
    const contenedor = document.getElementById("tabla-alumnos-container");
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='color:white; text-align:center;'>Cargando lista de alumnos...</p>";

    try {
        // 1. Obtenemos tu rol real desde la base de datos para habilitar el selector
        const { data: pActual } = await _supabase.from('perfiles').select('rol').eq('id', USUARIO_IDENTIFICADO).single();
        const miRol = pActual?.rol;

        const { data: alumnos, error } = await _supabase
            .from('perfiles')
            .select('*, progreso_alumnos(count)')
            .order('nombre_usuario', { ascending: true });

        if (error) throw error;

        let html = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">`;

        alumnos.forEach(alumno => {
            if (alumno.nombre_usuario === 'admin') return;

            // --- LÓGICA DE CONTEO CORREGIDA 2026 ---
            // 1. Asistencias marcadas en esta academia (nuevas)
            const asistenciasNuevas = alumno.progreso_alumnos?.[0]?.count || 0;
            // 2. Clases totales (Base antigua + Nuevas)
            const clasesTotales = asistenciasNuevas + (alumno.clases_base || 0);
            
            // 3. Solo mostramos "EXAMEN" si ha completado 40 clases NUEVAS en este ciclo
            const necesitaExamen = (asistenciasNuevas > 0 && asistenciasNuevas % 40 === 0);

            const hoy = new Date();
            const vencimiento = new Date(alumno.fecha_vencimiento + 'T23:59:59');
            const estaActivo = vencimiento >= hoy;

            html += `
                <div class="alumno-card" style="background: #222; border-radius: 12px; padding: 15px; border-left: 5px solid ${estaActivo ? '#2ecc71' : '#e74c3c'}; display: flex; justify-content: space-between; align-items: center; margin-bottom:10px;">
                    <div style="flex-grow: 1;">
                        <h4 style="color: white; margin: 0; font-size: 1.1rem; display: flex; align-items: center;">
                            ${alumno.nombre_usuario.toUpperCase()}
                            ${necesitaExamen ? '<span style="background:#ffd700; color:black; padding:2px 8px; border-radius:10px; font-size:0.6rem; margin-left:10px; font-weight:bold; box-shadow: 0 0 8px #ffd700;">⭐ EXAMEN</span>' : ''}
                        </h4>
                        
                        <p style="color: #aaa; margin: 5px 0 0 0; font-size: 0.85rem;">
                            Vence: ${vencimiento.toLocaleDateString()} 
                            <span style="color: ${estaActivo ? '#2ecc71' : '#e74c3c'}; font-weight: bold;">
                                ${estaActivo ? '(ACTIVO)' : '(VENCIDO)'}
                            </span>
                            <br>
                            <strong style="color: #3b82f6;">Ciclo actual: ${asistenciasNuevas} / 40 clases</strong>
                            <br>
                            <span style="color: #666; font-size: 0.75rem;">Historial acumulado: ${clasesTotales} | Rol: ${(alumno.rol || 'alumno').toUpperCase()}</span>
                        </p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                        <!-- SELECTOR DE ROL: Solo se muestra si tu rol en Supabase es 'admin' -->
                        ${miRol === 'admin' ? `
                            <select onchange="cambiarRolAlumno('${alumno.id}', this.value)" style="background:#111; color:#60a5fa; border:1px solid #444; border-radius:5px; font-size:0.7rem; padding:5px;">
                                <option value="alumno" ${alumno.rol === 'alumno' ? 'selected' : ''}>ALUMNO</option>
                                <option value="instructor" ${alumno.rol === 'instructor' ? 'selected' : ''}>INSTRUCTOR</option>
                                <option value="admin" ${alumno.rol === 'admin' ? 'selected' : ''}>ADMIN</option>
                            </select>
                        ` : ''}

                        <div style="display: flex; gap: 10px;">
                            <button onclick="pagoRapido('${alumno.nombre_usuario}')" style="background: #2ecc71; border: none; border-radius: 8px; padding: 8px; cursor: pointer;">💰</button>
                            <button onclick="eliminarAlumno('${alumno.nombre_usuario}')" style="background: #e74c3c; border: none; border-radius: 8px; padding: 8px; cursor: pointer;">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html + `</div>`;
    } catch (err) {
        console.error("Error UI Tabla:", err);
        contenedor.innerHTML = `<p style='color:red; text-align:center;'>Error al cargar datos.</p>`;
    }
}





// --- 3. FUNCIONES AUXILIARES ---

export function filtrarTabla() {
    let filter = document.getElementById("buscador-alumnos").value.toLowerCase();
    let rows = document.getElementById("tabla-maestra").getElementsByTagName("tr");
    for (let i = 1; i < rows.length; i++) {
        let txt = rows[i].cells[0].textContent.toLowerCase();
        rows[i].style.display = txt.includes(filter) ? "" : "none";
    }
}

export function toggleMenu() { 
    document.getElementById("dropdown-menu").classList.toggle("show"); 
}

export function mostrarFormulario() {
    document.getElementById("bienvenida-inicial").style.display = "none";
    document.getElementById("contenedor-formulario").style.display = "block";
}

export function actualizarGradosCinta(n) {
    const cont = document.getElementById("grados-cinta");
    if(!cont) return; cont.innerHTML = "";
    for(let i=0; i<n; i++) {
        let grado = document.createElement("div");
        grado.style.cssText = "width:5px; height:24px; background:white; margin:0 2px; display:inline-block;";
        cont.appendChild(grado);
    }
}

export async function cargarSelectTecnicas() {
    const select = document.getElementById("tecnica-id");
    if(!select) return;
    const { data } = await _supabase.from('tecnicas_maestras').select('id, nombre').order('nombre');
    select.innerHTML = '<option value="0">Clase General</option>';
    data?.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.nombre}</option>`;
    });
}

async function verMisTecnicas() {
    const container = document.getElementById("tabla-tecnicas-container");
    
    // Con el RLS activo, este select SOLO traerá las técnicas que 
    // el alumno ya tiene registradas en su tabla de progreso.
    const { data: tecnicasVistas, error } = await _supabase
        .from('tecnicas_maestras')
        .select('nombre'); 

    if (error) return console.error(error);

    if (!tecnicasVistas || tecnicasVistas.length === 0) {
        container.innerHTML = "<p style='color:gray; padding:10px;'>Aún no has registrado asistencias a técnicas específicas.</p>";
        return;
    }

    let html = `<table style="width:100%; color:white; border-collapse: collapse;">`;
    html += `<thead><tr><th style="text-align:left; padding:10px; border-bottom:2px solid #333;">Técnicas Aprendidas</th></tr></thead>`;
    
    tecnicasVistas.forEach(t => {
        html += `
            <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 10px;">🥋 ${t.nombre}</td>
                <td style="padding: 10px; text-align: right;">✅</td>
            </tr>`;
    });
    
    container.innerHTML = html + "</table>";
}

// EXPOSICIÓN GLOBAL PARA EL HTML
window.verTablaAlumnos = verTablaAlumnos;
window.pagoRapido = (n) => window.pagoRapido(n); // Esta vendrá de script.js
// Esto hace que el HTML pueda "ver" la función aun


export function toggleAcordeon(contentId) {
    const content = document.getElementById(contentId);
    if (!content) return;

    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
    } else {
        content.style.display = "none";
    }
}

export async function cargarSelectAlumnosAsistencia() {
    const select = document.getElementById("alumno-asistencia-select");
    if (!select) return;

    try {
        // 1. Traemos datos de Supabase
        const { data: alumnos, error } = await _supabase
            .from('perfiles')
            .select('id, nombre_usuario')
            .neq('nombre_usuario', 'admin')
            .order('nombre_usuario', { ascending: true });

        if (error) throw error;

        // 2. Limpiamos y llenamos el select nativo
        select.innerHTML = '';
        alumnos.forEach(al => {
            const option = document.createElement('option');
            option.value = al.id;
            option.textContent = al.nombre_usuario.toUpperCase();
            select.appendChild(option);
        });

        // 3. SEGURO DE CARGA PARA EL AWAIT (Promesa de espera)
        if (typeof TomSelect === 'undefined') {
            console.warn("TomSelect no detectado, reintentando...");
            // ESTO es lo que arregla el error del await externo
            return new Promise((resolve) => {
                setTimeout(async () => {
                    await cargarSelectAlumnosAsistencia();
                    resolve(); 
                }, 250);
            });
        }

        // 4. Inicializar o Actualizar Tom Select
        if (select.tomselect) {
            select.tomselect.clearOptions();
            const tsOptions = alumnos.map(al => ({
                value: al.id,
                text: al.nombre_usuario.toUpperCase()
            }));
            select.tomselect.addOptions(tsOptions);
        } else {
            new TomSelect("#alumno-asistencia-select", {
                plugins: ['remove_button'],
                placeholder: "🔍 Seleccionar uno o varios alumnos...",
                maxItems: null,
                hideSelected: true,
                render: {
                    no_results: (data, escape) => `<div class="no-results">No se encontró a "${escape(data.input)}"</div>`
                }
            });
        }

    } catch (error) {
        console.error("Error al cargar alumnos:", error);
    }
}

// Hacerla global
window.cargarSelectAlumnosAsistencia = cargarSelectAlumnosAsistencia;



async function marcarAsistenciaGeneral() {
    try {
        // 1. SEGURIDAD (Admin/Instructor)
        const { data: perfilLogueado } = await _supabase
            .from('perfiles')
            .select('rol')
            .eq('id', USUARIO_IDENTIFICADO)
            .maybeSingle();

        if (!['admin', 'instructor'].includes(perfilLogueado?.rol?.toLowerCase().trim())) {
            return alert("⛔ Solo instructores pueden marcar asistencia.");
        }

        // 2. CAPTURA DE DATOS
        const selectorAlumno = document.getElementById("alumno-asistencia-select");
        // Captura todos los IDs seleccionados como un arreglo
        const alumnosIds = Array.from(selectorAlumno.selectedOptions).map(opt => opt.value);
        const idTecnica = parseInt(document.getElementById("tecnica-id").value);
        
        if (alumnosIds.length === 0 || isNaN(idTecnica)) {
            return alert("Selecciona alumnos y una técnica válida.");
        }

        let resultados = { ok: 0, saltados: 0, error: 0 };

        // 3. PROCESAMIENTO UNO POR UNO
        for (const alumnoId of alumnosIds) {
            // Verificar conteo actual para este alumno y técnica
            const { count, error: errConteo } = await _supabase
                .from('progreso_alumnos')
                .select('*', { count: 'exact', head: true })
                .eq('usuario', alumnoId)
                .eq('id_tecnica', idTecnica);

            if (errConteo) {
                resultados.error++;
                continue;
            }

            // REGLA DE NEGOCIO: No marcar si ya tiene 3 o más
            if (count >= 3) {
                resultados.saltados++;
                continue;
            }

            // Insertar nueva asistencia
            const { error: errInsert } = await _supabase.from('progreso_alumnos').insert([{ 
                usuario: alumnoId, 
                id_tecnica: idTecnica, 
                registrado_por: USUARIO_IDENTIFICADO 
            }]);

            if (errInsert) resultados.error++;
            else resultados.ok++;
        }

        // 4. FEEDBACK VISUAL
        let resumen = `Proceso completado:\n✅ ${resultados.ok} registrados`;
        if (resultados.saltados > 0) resumen += `\n⚠️ ${resultados.saltados} ya tenían el límite de 3`;
        if (resultados.error > 0) resumen += `\n❌ ${resultados.error} errores`;
        
        alert(resumen);

        // 5. REFRESCAR UI
        if (selectorAlumno.tomselect) selectorAlumno.tomselect.clear();
        if (typeof verTablaAlumnos === 'function') verTablaAlumnos(); 

    } catch (err) {
        alert("❌ Error crítico: " + err.message);
    }
}

// Registro global para el botón del HTML
window.marcarAsistenciaGeneral = marcarAsistenciaGeneral;


export async function cargarSelectoresExamen() {
    const selectEvaluador = document.getElementById("evaluador-examen-select");
    const selectAlumno = document.getElementById("alumno-examen-select");
    
    if (!selectEvaluador || !selectAlumno) return;

    // Buscamos a todos los alumnos e instructores
    const { data: usuarios, error } = await _supabase
        .from('perfiles')
        .select('id, nombre_usuario, rol')
        .order('nombre_usuario', { ascending: true });

    if (error) return console.error("Error cargando usuarios para examen:", error);

    selectEvaluador.innerHTML = '<option value="">-- ¿Quién evaluará? --</option>';
    selectAlumno.innerHTML = '<option value="">-- ¿A quién evaluará? --</option>';

    usuarios.forEach(u => {
        const nombre = u.nombre_usuario.toUpperCase();
        // Solo admin e instructores pueden ser evaluadores
        if (u.rol === 'admin' || u.rol === 'instructor') {
            selectEvaluador.innerHTML += `<option value="${u.id}">${nombre} (${u.rol})</option>`;
        }
        // Todos los que no sean admin pueden ser alumnos evaluados
        if (u.nombre_usuario !== 'admin') {
            selectAlumno.innerHTML += `<option value="${u.id}">${nombre}</option>`;
        }
    });
}
// --- FUNCIÓN PARA EL CUESTIONARIO DE EXAMEN ---
window.abrirCuestionarioExamen = async (idExamen, nombreAlumno) => {
    // Definimos las preguntas del examen (puedes cambiarlas luego)
    const preguntas = [
        "¿Domina los escapes básicos de montada?",
        "¿Ejecuta correctamente el Armbar desde guardia?",
        "¿Demuestra buena técnica de derribo?",
        "¿Mantiene el control en la posición de 100 kilos?",
        "¿Conoce las reglas de competición y respeto?"
    ];

    let respuestas = {};
    let comentarios = "";

    // Creamos una interfaz sencilla con prompts para 2026
    // (En el futuro podrías hacer un modal HTML más bonito)
    alert(`🥋 INICIANDO EXAMEN PARA: ${nombreAlumno}\nResponde 'S' para SI o 'N' para NO.`);

    for (let pregunta of preguntas) {
        let res = prompt(`${pregunta}\n(S/N):`);
        respuestas[pregunta] = (res?.toLowerCase() === 's' ? 'Aprobado' : 'Pendiente');
    }

    comentarios = prompt("Añade un comentario final sobre el desempeño:");

    // Confirmación de envío
    if (confirm("¿Deseas finalizar y guardar los resultados del examen?")) {
        try {
            const { error } = await _supabase
                .from('examenes')
                .update({ 
                    respuestas: respuestas, 
                    comentarios: comentarios,
                    estado: 'completado' // Cambiamos el estado para que desaparezca del perfil
                })
                .eq('id', idExamen);

            if (error) throw error;

            alert("✅ Examen guardado con éxito. El resultado ya está en el historial.");
            
            // Refrescamos el perfil para que la notificación desaparezca
            dibujarCalendarioYProgreso(); 

        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    }
};
export async function cargarHistorialExamenes() {
    const contenedor = document.getElementById("lista-historial-examenes");
    if (!contenedor) return;

    const { data, error } = await _supabase
        .from('examenes')
        .select(`
            id, estado, comentarios, respuestas, created_at,
            alumno:perfiles!id_alumno(nombre_usuario),
            evaluador:perfiles!id_evaluador(nombre_usuario)
        `)
        .eq('estado', 'completado')
        .order('created_at', { ascending: false });

    if (error) return contenedor.innerHTML = "Error al cargar.";

    let html = "";
    data.forEach(ex => {
        html += `
            <div style="background:#000; padding:12px; border-radius:10px; border:1px solid #333; margin-bottom:10px; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; color:#60a5fa; font-weight:bold; margin-bottom:5px;">
                    <span>🥋 ${ex.alumno.nombre_usuario.toUpperCase()}</span>
                    <span style="color:#aaa; font-size:0.7rem;">${new Date(ex.created_at).toLocaleDateString()}</span>
                </div>
                <p style="margin:5px 0; color:#eee;"><strong>Evaluador:</strong> ${ex.evaluador.nombre_usuario}</p>
                <p style="margin:5px 0; color:#aaa; font-style:italic;">"${ex.comentarios || 'Sin comentarios'}"</p>
                <button onclick="verDetalleExamen('${ex.id}')" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:0.75rem; padding:0; text-decoration:underline;">Ver respuestas</button>
            </div>`;
    });
    contenedor.innerHTML = html || "<p style='color:gray;'>No hay exámenes completados.</p>";
}
// Llamada al final del case 'registro'
cargarHistorialExamenes();
window.verDetalleExamen = async (id) => {
    const { data } = await _supabase.from('examenes').select('respuestas').eq('id', id).single();
    if (data) {
        let detalle = "DETALLE TÉCNICO:\n\n";
        for (let preg in data.respuestas) {
            detalle += `• ${preg}: ${data.respuestas[preg]}\n`;
        }
        alert(detalle);
    }
};
// --- FUNCIONES DE GESTIÓN DE CLASES ---

// 1. Función para registrar la Clase + Asistencia al alumno (Nombre automático por Técnica)
export async function manejarRegistroClaseCompleto() {
    // Solo necesitamos estos 4 IDs ahora
    const ids = ['clase-tecnica-id', 'clase-alumno-usuario', 'clase-fecha', 'clase-hora'];
    const refs = {};

    // Verificación de seguridad
    for (let id of ids) {
        refs[id] = document.getElementById(id);
        if (!refs[id]) {
            console.error(`Error crítico: No se encontró el elemento con ID: ${id}`);
            return;
        }
    }

    // Validación de campos vacíos (sin nombre manual)
    if (!refs['clase-tecnica-id'].value || !refs['clase-alumno-usuario'].value || !refs['clase-fecha'].value || !refs['clase-hora'].value) {
        alert("⚠️ Por favor, selecciona Técnica, Alumno, Fecha y Hora.");
        return;
    }

    // Capturamos el TEXTO de la técnica seleccionada para usarlo como NOMBRE de la clase
    const selectorTecnica = refs['clase-tecnica-id'];
    const nombreDeLaTecnica = selectorTecnica.options[selectorTecnica.selectedIndex].text;

    const datos = {
        nombre: nombreDeLaTecnica, // Se asigna automáticamente
        id_tecnica: parseInt(refs['clase-tecnica-id'].value),
        usuario_alumno: refs['clase-alumno-usuario'].value,
        fecha: refs['clase-fecha'].value,
        hora: refs['clase-hora'].value,
        instructor: localStorage.getItem('usuario_logueado') || 'Admin'
    };

    try {
        // Llama a la función global en script.js
        await window.registrarClaseYAsistencia(datos);
        alert(`✅ Asistencia marcada: ${nombreDeLaTecnica}`);
        
        // Actualizar la lista visual del historial
        await consultarClasesProgramadas();
    } catch (e) {
        console.error("Error al registrar:", e);
        alert("Error al registrar: " + e.message);
    }
}


// 2. Función para obtener y dibujar el historial de clases dadas
export async function consultarClasesProgramadas() {
    const contenedor = document.getElementById('lista-clases-calendario');
    if (!contenedor) return;

    try {
        // Consultamos a Supabase (orden descendente para ver lo último primero)
        const { data: clases, error } = await _supabase
            .from('clases')
            .select('*')
            .order('fecha_hora', { ascending: false });

        if (error) throw error;

        if (!clases || clases.length === 0) {
            contenedor.innerHTML = "<p style='color:gray; font-size:0.8rem; text-align:center;'>No hay historial de clases.</p>";
            return;
        }

        // Dibujamos las tarjetas de las clases
        contenedor.innerHTML = clases.map(clase => {
            const fechaObj = new Date(clase.fecha_hora);
            return `
                <div style="background:#1a1a1a; padding:12px; border-radius:8px; margin-bottom:8px; border-left:4px solid #f1c40f; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:white; font-weight:bold; font-size:0.9rem;">${clase.nombre_clase}</div>
                        <div style="color:gray; font-size:0.75rem;">
                            📅 ${fechaObj.toLocaleDateString()} | ⏰ ${fechaObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error al cargar clases:", error);
        contenedor.innerHTML = "<p style='color:red; font-size:0.8rem;'>Error al cargar el historial.</p>";
    }
}

// --- EXPOSICIÓN AL ÁMBITO GLOBAL ---
window.manejarRegistroClaseCompleto = manejarRegistroClaseCompleto;
window.consultarClasesProgramadas = consultarClasesProgramadas;

// --- ADAPTADOR PARA EL CALENDARIO ---
export async function cargarDatosCalendario() {
    // 1. Llamamos a tus funciones de siempre para llenar los campos viejos
    await cargarSelectTecnicas(); 
    await cargarSelectAlumnosAsistencia();

    // 2. Copiamos el contenido de los selectores viejos a los nuevos del calendario
    const selTecnicaOriginal = document.getElementById("tecnica-id");
    const selAlumnoOriginal = document.getElementById("alumno-asistencia-select");
    
    const selTecnicaNueva = document.getElementById("clase-tecnica-id");
    const selAlumnoNuevo = document.getElementById("clase-alumno-usuario");

    if (selTecnicaOriginal && selTecnicaNueva) {
        selTecnicaNueva.innerHTML = selTecnicaOriginal.innerHTML;
    }
    if (selAlumnoOriginal && selAlumnoNuevo) {
        selAlumnoNuevo.innerHTML = selAlumnoOriginal.innerHTML;
    }
}
window.cargarDatosCalendario = cargarDatosCalendario;
