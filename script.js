// Elementos
const botonJugar = document.getElementById("btnJugar");
const botonNavbar = document.getElementById("btnNavbar");
const pantallaJuego = document.getElementById("pantallaJuego");
const botonVolver = document.getElementById("btnVolver");
const portadaJuego = document.getElementById("portadaJuego");
const botonComenzar = document.getElementById("btnComenzar");
const zonaJuego = document.getElementById("zonaJuego");
const mapa = document.getElementById("mapa");
const jugador = document.getElementById("jugador");
const vidaTexto = document.getElementById("vida");
const balasTexto = document.getElementById("balas");
const puntosTexto = document.getElementById("puntos");
const pantallaGameOver = document.getElementById("pantallaGameOver");
const botonReintentar = document.getElementById("btnReintentar");
const botonInicio = document.getElementById("btnInicio");
const jefeFinal = document.getElementById("jefeFinal");

// Balas
const balasRecolectables = document.querySelectorAll(".bala-recolectable");

// Obstáculos
const obstaculos = document.querySelectorAll(".obstaculo");

// Variables
let jugadorX = 70;
let jugadorY = 0;
let velocidadY = 0;
let enElSuelo = true;
let juegoActivo = false;
let vida = 3;
let balas = 0;
let puntos = 0;
let teclas = {};

// Botones
botonJugar.addEventListener("click", iniciarJuego);
botonNavbar.addEventListener("click", iniciarJuego);
botonVolver.addEventListener("click", cerrarJuego);
botonComenzar.addEventListener("click", comenzarPartida);
botonReintentar.addEventListener("click", reiniciarJuego);
botonInicio.addEventListener("click", volverAlInicio);

// Abrir juego
function iniciarJuego() {
    pantallaJuego.style.display = "block";
}

// Cerrar juego
function cerrarJuego() {
    pantallaJuego.style.display = "none";
    juegoActivo = false;
}

// Comenzar partida
function comenzarPartida() {
    portadaJuego.style.display = "none";
    zonaJuego.style.display = "block";
    reiniciarValores();
    juegoActivo = true;
    actualizarJuego();
}

// Reiniciar valores
function reiniciarValores() {
    vida = 3;
    balas = 0;
    puntos = 0;
    jugadorX = 70;
    jugadorY = 0;
    velocidadY = 0;
    enElSuelo = true;

    mapa.style.left = "0px";
    jugador.style.left = jugadorX + "px";
    jugador.style.bottom = "45px";

    vidaTexto.textContent = vida;
    balasTexto.textContent = balas;
    puntosTexto.textContent = puntos;

    balasRecolectables.forEach(function(bala) {
        bala.style.display = "block";
    });
}

// Teclado
document.addEventListener("keydown", function(evento) {
    const tecla = evento.key.toLowerCase();
    teclas[tecla] = true;

    if (juegoActivo && (tecla === "w" || tecla === "a" || tecla === "s" || tecla === "d")) {
        evento.preventDefault();
    }

    if (tecla === "w" && enElSuelo && juegoActivo) {
        velocidadY = 12;
        enElSuelo = false;
    }
});

document.addEventListener("keyup", function(evento) {
    const tecla = evento.key.toLowerCase();
    teclas[tecla] = false;
});

// Actualizar juego
function actualizarJuego() {
    if (!juegoActivo) {
        return;
    }

    let movimientoX = 0;

    if (teclas["d"]) {
        movimientoX = 4;
    }

    if (teclas["a"]) {
        movimientoX = -4;
    }

    moverHorizontal(movimientoX);

    velocidadY -= 0.6;
    jugadorY += velocidadY;

    comprobarColisionVertical();

    jugador.style.left = jugadorX + "px";
    jugador.style.bottom = (45 + jugadorY) + "px";

    recogerBalas();
    moverCamara();
    comprobarJefe();

    requestAnimationFrame(actualizarJuego);
}

// Movimiento
function moverHorizontal(movimientoX) {
    if (movimientoX === 0) {
        return;
    }

    let nuevaX = jugadorX + movimientoX;
    const jugadorIzquierda = nuevaX;
    const jugadorDerecha = nuevaX + jugador.offsetWidth;

    for (let i = 0; i < obstaculos.length; i++) {
        const obstaculo = obstaculos[i];

        const obstaculoIzquierda = obstaculo.offsetLeft;
        const obstaculoDerecha = obstaculo.offsetLeft + obstaculo.offsetWidth;

        const bottom = parseInt(getComputedStyle(obstaculo).bottom);
        const obstaculoAbajo = bottom;
        const obstaculoArriba = bottom + obstaculo.offsetHeight;

        const jugadorAbajo = 45 + jugadorY;
        const jugadorArriba = jugadorAbajo + jugador.offsetHeight;

        const colisionHorizontal =
            jugadorDerecha > obstaculoIzquierda &&
            jugadorIzquierda < obstaculoDerecha;

        const colisionVertical =
            jugadorArriba > obstaculoAbajo &&
            jugadorAbajo < obstaculoArriba;

        if (colisionHorizontal && colisionVertical) {
            return;
        }
    }

    jugadorX = nuevaX;

    if (jugadorX < 20) {
        jugadorX = 20;
    }

    if (jugadorX > 1710) {
        jugadorX = 1710;
    }
}

// Colisión vertical
function comprobarColisionVertical() {
    const jugadorIzquierda = jugadorX;
    const jugadorDerecha = jugadorX + jugador.offsetWidth;
    const jugadorAbajo = 45 + jugadorY;
    const jugadorArriba = jugadorAbajo + jugador.offsetHeight;

    let estaApoyado = false;

    for (let i = 0; i < obstaculos.length; i++) {
        const obstaculo = obstaculos[i];

        const obstaculoIzquierda = obstaculo.offsetLeft;
        const obstaculoDerecha = obstaculo.offsetLeft + obstaculo.offsetWidth;

        const bottom = parseInt(getComputedStyle(obstaculo).bottom);
        const obstaculoArriba = bottom + obstaculo.offsetHeight;

        const colisionHorizontal =
            jugadorDerecha > obstaculoIzquierda &&
            jugadorIzquierda < obstaculoDerecha;

        if (
            colisionHorizontal &&
            velocidadY <= 0 &&
            jugadorAbajo <= obstaculoArriba &&
            jugadorAbajo >= obstaculoArriba - 20
        ) {
            jugadorY = obstaculoArriba - 45;
            velocidadY = 0;
            enElSuelo = true;
            estaApoyado = true;
            break;
        }
    }

    if (!estaApoyado && jugadorY <= 0) {
        jugadorY = 0;
        velocidadY = 0;
        enElSuelo = true;
    }

    if (!estaApoyado && jugadorY > 0) {
        enElSuelo = false;
    }
}

// Recoger balas
function recogerBalas() {
    balasRecolectables.forEach(function(bala) {
        if (bala.style.display === "none") {
            return;
        }

        const balaX = bala.offsetLeft;
        const balaY = bala.offsetTop;

        const diferenciaX = Math.abs(jugadorX - balaX);
        const posicionJugador = 400 - jugadorY;
        const diferenciaY = Math.abs(posicionJugador - balaY);

        if (diferenciaX < 45 && diferenciaY < 70) {
            bala.style.display = "none";

            balas += 5;
            puntos += 10;

            balasTexto.textContent = balas;
            puntosTexto.textContent = puntos;
        }
    });
}

// Cámara
function moverCamara() {
    const posicionCamara = jugadorX - 200;

    if (posicionCamara > 0) {
        mapa.style.left = -posicionCamara + "px";
    }
}

// Jefe
function comprobarJefe() {
    const distancia = Math.abs(jugadorX - 1650);

    if (distancia < 100) {
        jefeFinal.style.borderColor = "#ffffff";
        jefeFinal.style.transform = "scale(1.05)";
    } else {
        jefeFinal.style.borderColor = "#ff3030";
        jefeFinal.style.transform = "scale(1)";
    }
}

// Reiniciar
function reiniciarJuego() {
    pantallaGameOver.style.display = "none";
    portadaJuego.style.display = "none";
    zonaJuego.style.display = "block";

    reiniciarValores();

    juegoActivo = true;
    actualizarJuego();
}

// Volver al inicio
function volverAlInicio() {
    juegoActivo = false;

    pantallaGameOver.style.display = "none";
    zonaJuego.style.display = "none";
    portadaJuego.style.display = "flex";
    pantallaJuego.style.display = "none";
}
