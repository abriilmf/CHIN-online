// ================= ELEMENTOS =================
const $ = id => document.getElementById(id);
const pantallaJuego = $("pantallaJuego"), portadaJuego = $("portadaJuego"), zonaJuego = $("zonaJuego");
const mapa = $("mapa"), jugador = $("jugador"), aviso = $("aviso"), pantallaGameOver = $("pantallaGameOver");
const vidaTexto = $("vida"), balasTexto = $("balas"), puntosTexto = $("puntos"), zonaTexto = $("zona");
const pantallaContinuar = $("pantallaContinuar");

// Capas del fondo: [elemento, velocidad relativa a la cámara, ancho del tile]
const capas = [[".capaEstrellas", 0.05, 300], [".capaMontanas", 0.2, 800], [".capaCiudad", 0.45, 500]]
    .map(([sel, factor, tile]) => [document.querySelector(sel), factor, tile]);

// ================= AJUSTES (tocá estos números para cambiar la "sensación") =================
const SUELO = 45;          // alto del suelo en px
const ACEL = 0.7;          // qué tan rápido acelera
const VMAX = 4.5;          // velocidad máxima horizontal
const FRIC_SUELO = 0.78;   // frenado en el suelo (más chico = frena antes)
const FRIC_AIRE = 0.94;    // frenado en el aire
const GRAV = 0.6;          // gravedad
const SALTO = 12.5;        // fuerza del salto
const COYOTE = 6;          // frames de gracia para saltar justo después de dejar una plataforma
const BUFFER = 6;          // frames que se "recuerda" un salto apretado un poco antes de tocar el suelo

// ================= NIVELES =================
// bloques: [x, y, ancho, alto, "p"]  -> y = altura sobre el suelo. Con "p" es plataforma (se atraviesa desde abajo)
// items:   ["b" = balas | "m" = moneda, x, y]
// enemigos: [xMin, xMax] recorrido de cada patrullero
const NIVELES = [
    {
        nombre: "Abandoned City", clase: "zona1", ancho: 1800,
        bloques: [[200, 0, 80, 60], [430, 0, 100, 100], [700, 0, 100, 70],
            [900, 105, 140, 25, "p"], [1080, 55, 120, 25, "p"], [1230, 135, 120, 25, "p"], [1380, 75, 130, 25, "p"], [1510, 155, 120, 25, "p"]],
        items: [["b", 300, 75], ["b", 550, 125], ["b", 800, 75], ["b", 1080, 95], ["b", 1210, 170], ["b", 1370, 115], ["b", 1480, 190],
            ["m", 240, 65], ["m", 480, 105], ["m", 620, 5], ["m", 740, 75], ["m", 880, 5], ["m", 970, 135], ["m", 1140, 85], ["m", 1290, 165], ["m", 1440, 105]],
        enemigos: [[300, 390], [545, 660], [830, 1000], [1100, 1450]],
        jefe: { e: "👹", x: 1650, w: 110, h: 130, vida: 10, min: 1600, max: 1690, vel: 1, cad: 130 }
    },
    {
        nombre: "Energy Factory", clase: "zona2", ancho: 2300,
        bloques: [[260, 0, 70, 50], [430, 0, 80, 90], [1160, 0, 90, 80], [1880, 0, 100, 60],
            [610, 50, 110, 25, "p"], [780, 100, 110, 25, "p"], [960, 60, 110, 25, "p"], [1330, 50, 120, 25, "p"], [1500, 105, 120, 25, "p"], [1680, 60, 120, 25, "p"]],
        items: [["b", 290, 55], ["b", 460, 95], ["b", 650, 80], ["b", 820, 130], ["b", 1000, 90], ["b", 1200, 85], ["b", 1360, 80], ["b", 1540, 135], ["b", 1720, 90],
            ["m", 180, 5], ["m", 380, 5], ["m", 560, 5], ["m", 900, 5], ["m", 1110, 5], ["m", 1420, 5], ["m", 1600, 5], ["m", 1800, 5], ["m", 1930, 65]],
        enemigos: [[345, 395], [540, 900], [1270, 1650]],
        jefe: { e: "👾", x: 2100, w: 110, h: 130, vida: 14, min: 2000, max: 2190, vel: 1.5, cad: 100 }
    },
    {
        nombre: "Nexoria's Core", clase: "zona3", ancho: 2600,
        bloques: [[280, 0, 80, 60], [520, 0, 90, 100], [1020, 0, 90, 90], [1560, 0, 90, 70], [2140, 0, 80, 70],
            [700, 55, 110, 25, "p"], [860, 105, 110, 25, "p"], [1180, 55, 110, 25, "p"], [1330, 105, 110, 25, "p"], [1700, 55, 110, 25, "p"], [1850, 105, 110, 25, "p"], [2000, 55, 100, 25, "p"]],
        items: [["b", 310, 65], ["b", 550, 105], ["b", 730, 80], ["b", 890, 130], ["b", 1050, 95], ["b", 1210, 80], ["b", 1360, 130], ["b", 1590, 75], ["b", 1730, 80], ["b", 1880, 130],
            ["m", 200, 5], ["m", 430, 5], ["m", 660, 5], ["m", 950, 5], ["m", 1140, 5], ["m", 1480, 5], ["m", 1660, 5], ["m", 2030, 80], ["m", 2170, 75]],
        enemigos: [[380, 480], [630, 980], [1120, 1520], [1660, 2100]],
        jefe: { e: "☠️", x: 2380, w: 120, h: 150, vida: 20, min: 2260, max: 2480, vel: 2, cad: 75 }
    }
];

// ================= ESTADO =================
let p, nivel, nivelActual, bloques, items, enemigos, disparos, camX, vistaAncho;
let vida, balas, puntos;
let teclas = {}, juegoActivo = false, enTransicion = false;
let raf, ultimoTiempo, tTransicion, tAviso;

// ================= DIÁLOGOS DE COCARDO (nubecitas de diálogo) =================
const NOMBRE_HEROE = "Cocardo";
const dialogo = $("dialogo"), dialogoTexto = $("dialogoTexto");

// Un jefe por zona: Guardian (0), Mutant (1) y el jefe final "??" (2)
const DIALOGOS = {
    inicio: [
        "Nexoria is burning... and nobody else is left to stand up. Then it's up to me.",
        "Whatever hit this planet, I'm going to find it. And I'm going to end it.",
        "Alright. Weapon ready. Let's take our world back."
    ],
    zonaEntrada: [
        ["These streets used to be full of life. Now there's only silence... and claws.",
         "The beasts took everything. I'm getting it all back."],
        ["The factory that powered all of Nexoria... Without it, the whole planet goes dark.",
         "Something has been changing these creatures. They're stronger than before."],
        ["The Core... the heart of Nexoria. Everything ends here, one way or another.",
         "Nobody has ever seen what waits inside. Time to change that."]
    ],
    jefeAparece: [
        ["So you're the Guardian. The invaders' chief sent you to stop heroes like me.",
         "Many tried before me. I'm not planning to be the last one standing in front of you... I'm planning to be the first one past you."],
        ["Genetically modified to be stronger... They made you into a weapon.",
         "They say no one has ever beaten you. Good. I like a challenge."],
        ["So you're the one behind the invasion. The one they call invincible.",
         "Nobody is invincible. Everything falls... you just haven't met me yet."]
    ],
    jefeFuria: [
        ["He's getting angry! Stay sharp, every bullet counts!", "Come on, show me what else you've got!"],
        ["He's getting angry! Stay sharp, every bullet counts!", "Come on, show me what else you've got!"],
        ["You're angry? Good. That means I'm getting to you!", "I'm not backing down. Not now, not after everything I've been through!"]
    ],
    jefeDerrotado: [
        ["One down. The first zone is free.", "If that was the guard dog, I can't wait to meet the owner."],
        ["They said you were unbeatable. They were wrong.", "The factory is ours again. One more zone to go."],
        ["It's over... Nexoria is safe.",
         "I got the coins back. Every single one. Now my people can finally rebuild.",
         "They said the final boss was invincible. Turns out that was only until a hero showed up."]
    ],
    zonaCompleta: [
        "Zone cleared. Catch your breath... the fight isn't over.",
        "I got stronger in there. Let's keep moving."
    ],
    balas: ["Ammo! Every bullet counts.", "Just what I needed."],
    moneda: ["A Nexoria coin... one step closer to getting them all back.",
             "This belongs to my people. I'll make sure it gets home."],
    sinBalas: "I'm out of ammo! I need to find more.",
    dano: ["Argh! That hurt...", "I've been through worse. Keep going!"],
    pocaVida: "I can't take much more of this... Careful now.",
    enemigoDerrotado: "One less beast in Nexoria.",
    salto: "Here goes nothing!",
    derrota: ["No... I can't fall here... Nexoria is counting on me...",
              "I'll be back. And next time, I won't lose."]
};

let dialogoCola = [], dialogoPrio = 0, dialogoVisible = false, dialogoAncho = 0, dialogoAlto = 0;
let tDialogo, dialogoPendiente = [];
const ultimaVez = {};

const elegir = lista => lista[Math.floor(Math.random() * lista.length)];
const duracionLinea = texto => 1500 + texto.length * 45;     // ms que se queda cada nubecita en pantalla
const citar = lineas => [].concat(lineas).map(l => `“${l}”`).join(" ") + ` — ${NOMBRE_HEROE}`;

// Evita repetir la misma clase de frase muy seguido
function listo(clave, ms) {
    const ahora = performance.now();
    if (ahora - (ultimaVez[clave] || -1e9) < ms) return false;
    ultimaVez[clave] = ahora;
    return true;
}

// Cocardo dice una frase (o varias en fila). Una frase de menor prioridad no pisa a una más importante.
function decir(lineas, prio = 1, retraso = 0) {
    if (prio < dialogoPrio) return;
    clearTimeout(tDialogo);
    dialogoPrio = prio;
    dialogoCola = [].concat(lineas);
    tDialogo = setTimeout(siguienteDialogo, retraso);
}

function siguienteDialogo() {
    const texto = dialogoCola.shift();
    if (!texto) return ocultarDialogo();
    dialogoTexto.textContent = texto;
    dialogo.classList.add("visible");
    dialogoVisible = true;
    dialogoAncho = dialogo.offsetWidth;
    dialogoAlto = dialogo.offsetHeight;
    tDialogo = setTimeout(siguienteDialogo, duracionLinea(texto));
}

function ocultarDialogo() {
    clearTimeout(tDialogo);
    dialogoCola = [];
    dialogoPrio = 0;
    dialogoVisible = false;
    dialogo.classList.remove("visible");
}

// La nubecita sigue a Cocardo y se mantiene dentro de la pantalla
function posicionarDialogo(cx) {
    const mitad = dialogoAncho / 2;
    const centro = p.x + p.w / 2 - cx;
    const izq = Math.max(mitad + 6, Math.min(vistaAncho - mitad - 6, centro));
    const alto = Math.min(SUELO + p.y + p.h + 14, zonaJuego.clientHeight - 40 - dialogoAlto);
    dialogo.style.left = Math.round(izq) + "px";
    dialogo.style.bottom = Math.round(alto) + "px";
    dialogo.style.setProperty("--cola", Math.round(Math.max(16 - mitad, Math.min(mitad - 16, centro - izq))) + "px");
}

// ================= BOTONES =================
$("btnJugar").addEventListener("click", iniciarJuego);
$("btnNavbar").addEventListener("click", iniciarJuego);
$("btnVolver").addEventListener("click", volverAlInicio);
$("btnInicio").addEventListener("click", volverAlInicio);
$("btnComenzar").addEventListener("click", function () {
    portadaJuego.style.display = "none";
    zonaJuego.style.display = "block";
    iniciarPartida();
});
$("btnReintentar").addEventListener("click", function () {
    pantallaGameOver.style.display = "none";
    iniciarPartida();
});

$("btnContinuar").addEventListener("click", function () {
    pantallaContinuar.style.display = "none";
    if (nivelActual === NIVELES.length - 1) return terminar(true);
    cargarNivel(nivelActual + 1);
    arrancar();
});

// Disparar también con el mouse (clic dentro del juego)
zonaJuego.addEventListener("mousedown", () => { if (juegoActivo) teclas.disparar = true; });
window.addEventListener("mouseup", () => { teclas.disparar = false; });

function iniciarJuego() {
    pantallaJuego.style.display = "block";
}

function volverAlInicio() {
    detener();
    pantallaGameOver.style.display = "none";
    zonaJuego.style.display = "none";
    portadaJuego.style.display = "flex";
    pantallaJuego.style.display = "none";
}

// ================= TECLADO =================
// Se usa event.code (posición física de la tecla) para que ande igual con cualquier idioma de teclado
const ACCIONES = {
    KeyA: "izq", ArrowLeft: "izq", KeyD: "der", ArrowRight: "der",
    KeyW: "saltar", ArrowUp: "saltar", Space: "saltar",
    KeyJ: "disparar", KeyK: "disparar", KeyX: "disparar"
};

document.addEventListener("keydown", function (e) {
    const accion = ACCIONES[e.code];
    if (!accion || !juegoActivo) return;
    e.preventDefault();
    teclas[accion] = true;
    if (accion === "saltar" && !e.repeat) p.buffer = BUFFER;
});

document.addEventListener("keyup", function (e) {
    const accion = ACCIONES[e.code];
    if (!accion) return;
    teclas[accion] = false;
    // Salto variable: si soltás la tecla en el aire, el salto se corta
    if (accion === "saltar" && p && p.vy > 4) p.vy *= 0.5;
});

window.addEventListener("blur", () => { teclas = {}; });
window.addEventListener("resize", () => { vistaAncho = zonaJuego.clientWidth || vistaAncho; });

// ================= PARTIDA Y NIVELES =================
function iniciarPartida() {
    detener();
    vida = 3; balas = 0; puntos = 0;
    dialogoPendiente = [];
    Object.keys(ultimaVez).forEach(k => delete ultimaVez[k]);
    p = { w: 28, h: 68, dir: 1, coyote: 0, buffer: 0, cd: 0, flash: 0 };
    cargarNivel(0);
    arrancar();
}

function cargarNivel(i) {
    nivelActual = i;
    nivel = NIVELES[i];
    mapa.querySelectorAll(".dinamico").forEach(el => el.remove());
    mapa.style.width = nivel.ancho + "px";
    zonaJuego.className = nivel.clase;
    zonaTexto.textContent = i + 1;

    crear("suelo", 0, -SUELO, nivel.ancho, SUELO);
    bloques = nivel.bloques.map(([x, y, w, h, t]) => {
        crear(t ? "plataforma" : "bloque", x, y, w, h);
        return { x, y, w, h, unaVia: !!t };
    });
    items = nivel.items.map(([t, x, y]) => ({
        t, x, y, w: 24, h: 24, el: crear("item", x, y, 24, 24, t === "b" ? "🔫" : "🪙")
    }));
    enemigos = nivel.enemigos.map(([min, max]) =>
        nuevoEnemigo({ e: "🤖", x: min, w: 34, h: 34, vida: 2, min, max, vel: 1.1, pts: 20 }));
    enemigos.push(nuevoEnemigo({ ...nivel.jefe, jefe: true, pts: 200 }));
    disparos = [];

    Object.assign(p, { x: 70, y: 0, vx: 0, vy: 0, suelo: true, invul: 0, golpe: 0 });
    if (i > 0) balas += 10;   // ayuda al empezar cada zona nueva
    vistaAncho = zonaJuego.clientWidth;
    camX = 0;
    enTransicion = false;
    actualizarHUD();
    mostrarAviso(`ZONE ${i + 1} · ${nivel.nombre}`, 1800);
    // Cocardo habla al empezar la partida y al entrar a cada zona
    const intro = (i === 0 ? DIALOGOS.inicio : dialogoPendiente).concat(DIALOGOS.zonaEntrada[i]);
    dialogoPendiente = [];
    decir(intro, 2, 700);
    dibujar();
}

// Crea un div dentro del mapa. y = altura sobre el suelo
function crear(clase, x, y, w, h, texto) {
    const el = document.createElement("div");
    el.className = clase + " dinamico";
    if (texto) el.textContent = texto;
    if (w) el.style.width = w + "px";
    if (h) el.style.height = h + "px";
    el.style.left = x + "px";
    el.style.bottom = (SUELO + y) + "px";
    mapa.appendChild(el);
    return el;
}

// Bicho de un solo ojo (el ojo sigue al jugador)
const BICHO = `<svg viewBox="0 0 34 34">
<g fill="none" stroke="#1b1f14" stroke-width="2.2" stroke-linecap="round"><path class="pata" d="M8 24L3 32"/><path class="pata" d="M13 26L11 33"/><path class="pata" d="M21 26L23 33"/><path class="pata" d="M26 24L31 32"/></g>
<path d="M11 8L8 1M23 8L26 1" stroke="#1b1f14" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="8" cy="1.5" r="1.8" fill="#ff4a4a"/><circle cx="26" cy="1.5" r="1.8" fill="#ff4a4a"/>
<path class="cuerpoBicho" d="M2 27C2 13 9 6 17 6S32 13 32 27Z"/>
<circle cx="17" cy="14.5" r="6.8" fill="#fff" stroke="#111" stroke-width="1.3"/>
<g class="pupila"><circle cx="17" cy="14.5" r="4" fill="#c01515"/><circle cx="17" cy="14.5" r="1.8" fill="#000"/></g>
<path d="M8 25L11 22 14 25 17 22 20 25 23 22 26 25" stroke="#111" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
</svg>`;

// Jefe: demonio con cuernos, tres ojos, colmillos y garras
const JEFE = `<svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMax meet"><g class="cuerpoJefe">
<path d="M96 40L114 18 106 54ZM100 64L120 52 108 80ZM96 88L118 86 104 106Z" fill="#2e1522"/>
<path d="M40 98L32 138H58L62 104ZM72 98L76 138H100L92 96Z" fill="#160b12"/>
<path d="M32 138H20L32 128ZM76 138H64L76 128Z" fill="#e8dcc0"/>
<path d="M30 60Q22 100 44 114H90Q112 96 102 56Q90 34 60 36Q38 38 30 60Z" fill="#241019"/>
<path d="M44 70Q62 76 84 68M46 84Q64 90 88 82M50 98Q66 102 88 96" stroke="#5a2236" stroke-width="2.5" fill="none"/>
<g class="brazoJefe"><path d="M34 60L6 84 14 94 40 80Z" fill="#2c1420"/><path d="M6 84L-4 98 8 92 6 104 16 94ZM14 94L8 108 20 98Z" fill="#e8dcc0"/></g>
<path d="M22 26Q22 6 52 6Q82 6 84 28Q84 46 60 50Q28 52 22 26Z" fill="#3a1723"/>
<path d="M30 14Q16 4 14 -8Q28 -6 40 8ZM74 10Q88 2 94 -10Q80 -8 68 6Z" fill="#e8dcc0"/>
<path d="M24 20L48 28 46 20 30 12ZM82 24L62 26 64 18 78 12Z" fill="#12070c"/>
<ellipse class="ojoJefe" cx="38" cy="30" rx="7.5" ry="5"/><ellipse class="ojoJefe" cx="65" cy="29" rx="6.5" ry="4.5"/><circle class="ojoJefe" cx="52" cy="15" r="3"/>
<path d="M37 24v12M64 24.5v10" stroke="#000" stroke-width="2.4"/>
<g class="mandibula"><ellipse cx="54" cy="44" rx="24" ry="9" fill="#0b0508"/><path d="M34 42L38 52 42 43ZM46 44L50 55 54 45ZM58 45L62 54 66 44ZM70 42L74 50 77 40Z" fill="#f4ecd8"/></g>
<path d="M32 40L36 50 40 41ZM48 42L52 52 56 43ZM64 42L68 50 72 41Z" fill="#f4ecd8"/>
</g></svg>`;

function nuevoEnemigo(d) {
    const el = crear("enemigo" + (d.jefe ? " esJefe" : " bicho"), 0, 0, d.w, d.h);
    el.innerHTML = d.jefe ? JEFE + '<div class="barraJefe"><i></i></div>' : BICHO;
    return { ...d, y: 0, dir: 1, vidaMax: d.vida, estado: "activo", t: d.cad || 0, el, barra: el.querySelector("i") };
}

function completarZona() {
    enTransicion = true;
    disparos.forEach(d => d.el.remove());
    disparos = [];
    temblor();
    // Cocardo comenta la victoria; el resto de sus frases sale en la pantalla de continuar y en la zona siguiente
    const lineas = DIALOGOS.jefeDerrotado[nivelActual];
    if (nivelActual < NIVELES.length - 1) dialogoPendiente = lineas.slice(1);
    decir(lineas[0], 4);
    tTransicion = setTimeout(mostrarContinuar, Math.max(1200, duracionLinea(lineas[0]) + 200));   // deja ver cómo cae el jefe
}

// Pausa el juego y muestra el botón para pasar a la siguiente zona
function mostrarContinuar() {
    const esUltima = nivelActual === NIVELES.length - 1;
    ocultarDialogo();
    $("continuarTitulo").textContent = esUltima ? "NEXORIA IS SAFE!" : `ZONE ${nivelActual + 1} COMPLETE`;
    $("continuarTexto").textContent = `Score: ${puntos} · Ammo: ${balas}` +
        (esUltima ? "" : ` · Next zone: ${NIVELES[nivelActual + 1].nombre}`);
    $("continuarDialogo").textContent = citar(esUltima ? DIALOGOS.jefeDerrotado[2][1] : elegir(DIALOGOS.zonaCompleta));
    $("btnContinuar").textContent = esUltima ? "SEE RESULTS ▶" : "CONTINUE ▶";
    pantallaContinuar.style.display = "flex";
    $("btnContinuar").focus();
    juegoActivo = false;
    cancelAnimationFrame(raf);
    teclas = {};
}

function terminar(gano) {
    detener();
    let record = puntos;
    try {
        record = Math.max(puntos, Number(localStorage.getItem("nexoriaRecord")) || 0);
        localStorage.setItem("nexoriaRecord", record);
    } catch (err) { /* sin localStorage: se ignora */ }
    $("gameOverTitulo").textContent = gano ? "VICTORY!" : "GAME OVER";
    $("gameOverTexto").textContent = (gano ? "You recovered Nexoria's coins!" : "You have been defeated.") +
        ` Score: ${puntos} · Best: ${record}`;
    $("gameOverDialogo").textContent = citar(gano ? DIALOGOS.jefeDerrotado[2][2] : DIALOGOS.derrota);
    pantallaGameOver.style.display = "flex";
}

// ================= BUCLE PRINCIPAL =================
// dt = 1 equivale a un frame a 60 FPS, así el juego va igual en monitores de 60, 120 o 144 Hz
function bucle(t) {
    if (!juegoActivo) return;
    const dt = Math.max(0, Math.min((t - ultimoTiempo) / 16.667, 2.5));
    ultimoTiempo = t;
    actualizar(dt);
    dibujar();
    raf = requestAnimationFrame(bucle);
}

function arrancar() {
    cancelAnimationFrame(raf);   // evita bucles duplicados
    juegoActivo = true;
    ultimoTiempo = performance.now();
    raf = requestAnimationFrame(bucle);
}

function detener() {
    juegoActivo = false;
    cancelAnimationFrame(raf);
    clearTimeout(tTransicion);
    clearTimeout(tAviso);
    aviso.classList.remove("visible");
    ocultarDialogo();
    teclas = {};
    pantallaContinuar.style.display = "none";
}

function actualizar(dt) {
    moverJugador(dt);
    moverEnemigos(dt);
    moverDisparos(dt);
    recogerItems();
    for (const e of enemigos) {
        if (solapa(p, e)) { danar(p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1); break; }
    }
    // Cocardo reacciona cuando se acerca a un jefe por primera vez
    for (const e of enemigos) {
        if (e.jefe && !e.visto && Math.abs(p.x - e.x) < 450) {
            e.visto = true;
            decir(DIALOGOS.jefeAparece[nivelActual], 3);
        }
    }
    // Cámara suave, con un poco de adelanto hacia donde mirás
    const objetivo = p.x - vistaAncho * 0.4 + p.dir * 40;
    const limite = Math.max(0, nivel.ancho - vistaAncho);
    const meta = Math.max(0, Math.min(limite, objetivo));
    camX += (meta - camX) * (1 - Math.pow(0.88, dt));
}

// ================= JUGADOR =================
function moverJugador(dt) {
    p.golpe -= dt; p.invul -= dt; p.cd -= dt; p.flash -= dt; p.buffer -= dt;

    // Horizontal con aceleración y fricción (sin input durante el golpe)
    const dir = p.golpe > 0 ? 0 : (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
    if (dir) {
        p.dir = dir;
        p.vx += dir * ACEL * dt * (p.vx * dir < 0 ? 2 : 1);   // doble aceleración al girar
        p.vx = Math.max(-VMAX, Math.min(VMAX, p.vx));
    } else {
        p.vx *= Math.pow(p.suelo ? FRIC_SUELO : FRIC_AIRE, dt);
        if (Math.abs(p.vx) < 0.05) p.vx = 0;
    }

    // Salto con coyote time + buffer
    p.coyote = p.suelo ? COYOTE : p.coyote - dt;
    if (p.buffer > 0 && p.coyote > 0) {
        p.vy = SALTO; p.coyote = 0; p.buffer = 0; p.suelo = false;
        if (Math.random() < 0.25 && listo("salto", 30000)) decir(DIALOGOS.salto, 1);
    }

    // Eje X: se mueve y se resuelve contra bloques sólidos
    p.x += p.vx * dt;
    for (const b of bloques) {
        if (b.unaVia || !solapa(p, b)) continue;
        p.x = p.vx > 0 ? b.x - p.w : b.x + b.w;
        p.vx = 0;
    }
    p.x = Math.max(0, Math.min(nivel.ancho - p.w, p.x));

    // Eje Y: gravedad y aterrizaje
    const yAntes = p.y;
    p.vy = Math.max(p.vy - GRAV * dt, -14);
    p.y += p.vy * dt;
    p.suelo = false;
    for (const b of bloques) {
        if (!solapa(p, b)) continue;
        if (p.vy <= 0 && yAntes >= b.y + b.h - 0.01) {          // cae encima
            p.y = b.y + b.h; p.vy = 0; p.suelo = true;
        } else if (!b.unaVia && p.vy > 0) {                     // se golpea la cabeza
            p.y = b.y - p.h; p.vy = 0;
        }
    }
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.suelo = true; }

    // Disparo (mantener apretado = ráfaga)
    if (teclas.disparar && p.cd <= 0 && balas > 0 && !enTransicion) {
        balas--; p.cd = 14; p.flash = 6;
        lanzar(p.dir > 0 ? p.x + p.w : p.x - 16, p.y + 20, p.dir * 9, false);
        actualizarHUD();
    } else if (teclas.disparar && balas <= 0 && !enTransicion && listo("sinBalas", 6000)) {
        decir(DIALOGOS.sinBalas, 1);
    }
}

function danar(lado) {
    if (p.invul > 0 || enTransicion) return;
    vida--;
    p.invul = 90; p.golpe = 12; p.vx = lado * 7; p.vy = 6; p.suelo = false;
    actualizarHUD();
    if (vida <= 0) return terminar(false);
    if (vida === 1) decir(DIALOGOS.pocaVida, 2);
    else if (listo("dano", 4000)) decir(elegir(DIALOGOS.dano), 1);
}

// ================= ENEMIGOS Y DISPAROS =================
function moverEnemigos(dt) {
    for (const e of enemigos) {
        e.el.classList.toggle("der", p.x > e.x);   // miran hacia el jugador
        if (e.jefe) { moverJefe(e, dt); continue; }
        e.x += e.dir * e.vel * dt;
        if (e.x <= e.min) { e.x = e.min; e.dir = 1; }
        else if (e.x >= e.max) { e.x = e.max; e.dir = -1; }
    }
}

// Jefe: persigue -> avisa (tiembla y abre la boca) -> ataca con embestida o bolas de fuego -> se recupera
function moverJefe(e, dt) {
    e.t -= dt;
    const haciaJugador = p.x > e.x ? 1 : -1;
    if (e.estado === "activo") {
        const lejos = Math.abs(p.x - e.x) > 700;
        const meta = Math.max(e.min, Math.min(e.max, p.x + p.w / 2 - e.w / 2));
        if (!lejos && Math.abs(meta - e.x) > 2) e.x += Math.sign(meta - e.x) * e.vel * dt;
        if (e.t <= 0 && !lejos) {
            e.ataque = Math.random() < 0.5 ? "embestida" : "fuego";
            cambiarEstado(e, "aviso", 38);
        }
    } else if (e.estado === "aviso") {
        if (e.t <= 0) {
            if (e.ataque === "fuego") {
                [[25, 4], [55, 5], [85, 6]].forEach(([y, v]) =>
                    lanzar(haciaJugador < 0 ? e.x - 18 : e.x + e.w, y, v * haciaJugador, true));
                cambiarEstado(e, "recupera", 40);
            } else {
                e.dir = haciaJugador;
                temblor();
                cambiarEstado(e, "embestida", 45);
            }
        }
    } else if (e.estado === "embestida") {
        e.x += e.dir * e.vel * 4 * dt;
        if (e.x <= e.min || e.x >= e.max || e.t <= 0) {
            e.x = Math.max(e.min, Math.min(e.max, e.x));
            cambiarEstado(e, "recupera", 50);
        }
    } else if (e.t <= 0) {
        cambiarEstado(e, "activo", e.cad);
    }
}

function cambiarEstado(e, estado, t) {
    e.estado = estado;
    e.t = t;
    e.el.dataset.estado = estado;
}

function temblor() {
    zonaJuego.classList.remove("tiembla");
    void zonaJuego.offsetWidth;   // reinicia la animación
    zonaJuego.classList.add("tiembla");
}

function lanzar(x, y, vx, hostil) {
    const w = hostil ? 18 : 16, h = hostil ? 18 : 6;
    disparos.push({ x, y, vx, w, h, hostil, el: crear(hostil ? "disparo enemigoDisparo" : "disparo", 0, 0, w, h) });
}

function moverDisparos(dt) {
    for (let i = disparos.length - 1; i >= 0; i--) {
        const d = disparos[i];
        d.x += d.vx * dt;
        let borrar = d.x < 0 || d.x > nivel.ancho || bloques.some(b => !b.unaVia && solapa(d, b));
        if (!borrar && d.hostil && solapa(d, p)) { danar(d.vx > 0 ? 1 : -1); borrar = true; }
        if (!borrar && !d.hostil) {
            const e = enemigos.find(en => solapa(d, en));
            if (e) { golpear(e); borrar = true; }
        }
        if (borrar) { d.el.remove(); disparos.splice(i, 1); }
    }
}

function golpear(e) {
    e.vida--;
    e.el.classList.add("golpeado");
    setTimeout(() => e.el.classList.remove("golpeado"), 90);
    if (e.jefe) {
        e.barra.style.width = Math.max(0, e.vida / e.vidaMax * 100) + "%";
        if (!e.furia && e.vida > 0 && e.vida <= e.vidaMax / 2) {   // a mitad de vida se enfurece
            e.furia = true; e.vel *= 1.3; e.cad *= 0.7;
            e.el.classList.add("furia");
            mostrarAviso("THE BOSS IS ENRAGED!", 1400);
            decir(elegir(DIALOGOS.jefeFuria[nivelActual]), 3);
        }
    }
    if (e.vida > 0) return;

    enemigos.splice(enemigos.indexOf(e), 1);
    puntos += e.pts;
    if (!e.jefe) balas += 2;
    actualizarHUD();
    if (e.jefe) {
        e.el.classList.add("muere");
        setTimeout(() => e.el.remove(), 1000);
        completarZona();
    } else {
        e.el.remove();
        if (listo("bestia", 9000)) decir(DIALOGOS.enemigoDerrotado, 1);
    }
}

function recogerItems() {
    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (!solapa(p, it)) continue;
        if (it.t === "b") { balas += 5; puntos += 10; } else { puntos += 25; }
        it.el.remove();
        items.splice(i, 1);
        actualizarHUD();
        if (listo("item", 6000)) decir(elegir(it.t === "b" ? DIALOGOS.balas : DIALOGOS.moneda), 1);
    }
}

// ================= UTILIDADES Y DIBUJO =================
function solapa(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function actualizarHUD() {
    vidaTexto.textContent = Math.max(vida, 0);
    balasTexto.textContent = balas;
    puntosTexto.textContent = puntos;
}

function mostrarAviso(texto, ms) {
    clearTimeout(tAviso);
    aviso.textContent = texto;
    aviso.classList.add("visible");
    tAviso = setTimeout(() => aviso.classList.remove("visible"), ms);
}

function poner(el, x, y) {
    el.style.transform = `translate3d(${Math.round(x)}px, ${-Math.round(y)}px, 0)`;
}

function dibujar() {
    poner(jugador, p.x, p.y);
    jugador.classList.toggle("corriendo", p.suelo && Math.abs(p.vx) > 0.8);
    jugador.classList.toggle("aire", !p.suelo);
    jugador.classList.toggle("mirandoIzq", p.dir < 0);
    jugador.classList.toggle("disparando", p.flash > 0);
    jugador.classList.toggle("herido", p.invul > 0);
    enemigos.forEach(e => poner(e.el, e.x, e.y));
    disparos.forEach(d => poner(d.el, d.x, d.y));

    const cx = Math.round(camX);
    mapa.style.transform = `translate3d(${-cx}px, 0, 0)`;
    if (dialogoVisible) posicionarDialogo(cx);
    // Parallax: cada capa se mueve a una fracción de la cámara y se repite en bucle
    capas.forEach(([el, factor, tile]) => {
        el.style.transform = `translate3d(${-((camX * factor) % tile)}px, 0, 0)`;
    });
}
