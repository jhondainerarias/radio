// script.js

// --- 1. Variables Globales y Selectores DOM ---
// Elementos de audio y video
const mainAudioPlayer = document.getElementById('mainAudioPlayer');
const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
let youtubePlayer; // La instancia del reproductor de YouTube
const adAudioPlayer = new Audio(); // Reproductor dedicado para spots publicitarios

// Botones y controles principales
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const mainStopBtn = document.getElementById('mainStopBtn');
const mainVolumeControl = document.getElementById('mainVolume');
const mainProgressBar = document.getElementById('mainProgressBar');
const nowPlayingDisplay = document.getElementById('nowPlaying');
const duckVolumeBtn = document.getElementById('duckVolumeBtn'); // Botón para el pisador manual

// Controles de lista de reproducción
const localFileInput = document.getElementById('localFileInput');
const addLocalBtn = document.getElementById('addLocalBtn');
const youtubeUrlInput = document.getElementById('youtubeUrlInput');
const addYoutubeBtn = document.getElementById('addYoutubeBtn'); // <-- Corrección aquí, quitado '=' extra
const playlistUl = document.getElementById('playlist');

// Controles de Publicidad (Spots)
const adFileInput = document.getElementById('adFileInput');
const addAdBtn = document.getElementById('addAdBtn');
const playAdBtn = document.getElementById('playAdBtn');
const stopAdBtn = document.getElementById('stopAdBtn');
const adListUl = document.getElementById('adList');
const adIntervalInput = document.getElementById('adInterval');
const toggleAutoAdBtn = document.getElementById('toggleAutoAdBtn');

// Controles de la Hora
const sayTimeBtn = document.getElementById('sayTimeBtn');
const timeIntervalInput = document.getElementById('timeInterval');
const toggleAutoTimeBtn = document.getElementById('toggleAutoTimeBtn');
const currentTimeDisplay = document.getElementById('currentTime');

// Ecualizador
const equalizerControls = document.getElementById('equalizerControls');

// Arrays para gestionar el contenido
let playlist = [];
let ads = [];
let currentTrackIndex = -1; // Índice de la pista actual en la playlist
let currentAdIndex = -1; // Índice del spot actual
let currentPlayingType = null; // 'audio' o 'youtube'

// Variables de estado y temporizadores
let autoAdIntervalId = null; // ID del temporizador para publicidad automática
let autoTimeIntervalId = null; // ID del temporizador para la hora automática
let isDuckingActive = false; // Estado del pisador (manual/automático)
let originalMainVolumeBeforeDuck = 0.5; // Valor por defecto si mainVolumeControl.value no está disponible al inicio
let mainPlayerPausedBeforeDuck = false; // Guarda el estado de reproducción del reproductor principal

// --- NUEVAS VARIABLES GLOBALES PARA LA VOZ DE LA HORA ---
let availableVoices = []; // Para almacenar las voces disponibles
let preferredLatinoVoice = null; // Para guardar la voz latina preferida


// --- 2. Funciones de Ayuda ---

// Actualiza la visualización del tiempo actual
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    currentTimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

// Alterna la clase 'active' para el botón de Play/Pause
function togglePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        playPauseBtn.classList.add('active');
    } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        playPauseBtn.classList.remove('active');
    }
}

// --- 3. Funciones de Control del Reproductor Principal ---

function playTrack(index) {
    if (playlist.length === 0) {
        nowPlayingDisplay.textContent = "Añade pistas a la lista de reproducción.";
        togglePlayPauseButton(false);
        return;
    }

    if (index === undefined) {
        index = currentTrackIndex === -1 ? 0 : currentTrackIndex;
    }

    if (index < 0 || index >= playlist.length) {
        index = 0; // Vuelve al inicio si se pasa del final
    }

    currentTrackIndex = index;
    const track = playlist[currentTrackIndex];

    // Desactivar YouTube o audio si están activos
    if (currentPlayingType === 'youtube' && youtubePlayer) {
        youtubePlayer.stopVideo();
        youtubePlayerContainer.style.width = '0px';
        youtubePlayerContainer.style.height = '0px';
        youtubePlayerContainer.style.visibility = 'hidden';
    }
    // Asegurarse de que el reproductor de audio HTML5 esté visible si se va a usar
    mainAudioPlayer.style.display = 'block';

    if (currentPlayingType === 'audio' && !mainAudioPlayer.paused) {
        mainAudioPlayer.pause();
    }

    // Remover 'active' de todas las pistas y añadirlo a la actual
    Array.from(playlistUl.children).forEach((li, i) => {
        if (li.classList.contains('placeholder-item')) return; // Ignorar el placeholder
        if (i === currentTrackIndex) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });


    nowPlayingDisplay.textContent = `Reproduciendo: ${track.name}`;

    if (track.type === 'local') {
        currentPlayingType = 'audio';
        mainAudioPlayer.src = track.src;
        mainAudioPlayer.play().catch(e => console.error("Error al reproducir audio local:", e));
        togglePlayPauseButton(true);
    } else if (track.type === 'youtube') {
        currentPlayingType = 'youtube';
        mainAudioPlayer.pause(); // Asegúrate de que el audio principal esté pausado
        mainAudioPlayer.style.display = 'none'; // Ocultar el control de audio HTML5
        youtubePlayerContainer.style.width = '100%'; // Mostrar el contenedor de YouTube
        youtubePlayerContainer.style.height = '360px'; // Altura típica de video
        youtubePlayerContainer.style.visibility = 'visible';

        // Inicializar o cargar video de YouTube
        if (!youtubePlayer) {
            loadYoutubePlayer(track.src);
        } else {
            youtubePlayer.loadVideoById(track.src);
            youtubePlayer.playVideo();
        }
        togglePlayPauseButton(true);
    }
}


function togglePlayPause() {
    if (currentPlayingType === 'audio') {
        if (mainAudioPlayer.paused) {
            mainAudioPlayer.play().catch(e => console.error("Error al reanudar audio local:", e));
            togglePlayPauseButton(true);
        } else {
            mainAudioPlayer.pause();
            togglePlayPauseButton(false);
        }
    } else if (currentPlayingType === 'youtube' && youtubePlayer) {
        const playerState = youtubePlayer.getPlayerState();
        if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED || playerState === YT.PlayerState.CUED) {
            youtubePlayer.playVideo();
            togglePlayPauseButton(true);
        } else {
            youtubePlayer.pauseVideo();
            togglePlayPauseButton(false);
        }
    } else {
        // Intenta reproducir la primera pista si no hay nada sonando
        playTrack(currentTrackIndex === -1 ? 0 : currentTrackIndex);
    }
}

function playNextTrack() {
    if (playlist.length === 0) return;
    playTrack((currentTrackIndex + 1) % playlist.length); // Ciclo a la primera pista al llegar al final
}

function playPrevTrack() {
    if (playlist.length === 0) return;
    playTrack((currentTrackIndex - 1 + playlist.length) % playlist.length); // Ciclo a la última pista al llegar al inicio
}

function stopMainPlayer() {
    if (currentPlayingType === 'audio') {
        mainAudioPlayer.pause();
        mainAudioPlayer.currentTime = 0;
    } else if (currentPlayingType === 'youtube' && youtubePlayer) {
        youtubePlayer.stopVideo();
        youtubePlayerContainer.style.width = '0px';
        youtubePlayerContainer.style.height = '0px';
        youtubePlayerContainer.style.visibility = 'hidden';
    }
    mainAudioPlayer.style.display = 'block'; // Asegúrate de que el reproductor de audio HTML5 sea visible al detener
    togglePlayPauseButton(false);
    nowPlayingDisplay.textContent = "Ninguna pista reproduciéndose...";
    currentPlayingType = null;
    currentTrackIndex = -1;
    // Remover 'active' de todas las pistas
    Array.from(playlistUl.children).forEach(li => {
        if (!li.classList.contains('placeholder-item')) {
            li.classList.remove('active');
        }
    });
}

// --- 4. Funciones del Pisador (Ducking) ---

// Función para atenuar el volumen del reproductor principal
function duckMainVolume() {
    if (!isDuckingActive) { // Solo atenúa si no está ya en modo "ducking"
        originalMainVolumeBeforeDuck = mainAudioPlayer.volume; // Guarda el volumen actual
        mainPlayerPausedBeforeDuck = mainAudioPlayer.paused; // Guarda el estado de reproducción

        if (currentPlayingType === 'audio' && !mainAudioPlayer.paused) {
            mainAudioPlayer.volume = 0.2; // Atenúa el volumen
            mainAudioPlayer.play().catch(e => console.error("Error al reanudar audio en ducking:", e)); // Asegura que siga sonando a bajo volumen
        }

        if (currentPlayingType === 'youtube' && youtubePlayer && (youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING || youtubePlayer.getPlayerState() === YT.PlayerState.PAUSED)) {
            youtubePlayer.setVolume(20); // YouTube usa 0-100
            if (youtubePlayer.getPlayerState() === YT.PlayerState.PAUSED) {
                youtubePlayer.playVideo(); // Si estaba pausado, lo reanuda para atenuarlo
            }
        }
        isDuckingActive = true;
        console.log("Volumen principal atenuado.");
    }
    // Actualiza el botón pisador solo si se activó manualmente por el botón
    if (duckVolumeBtn.dataset.manualDuck === 'true') {
        duckVolumeBtn.innerHTML = '<i class="fas fa-volume-up"></i> Restaurar Música';
    }
}

// Función para restaurar el volumen del reproductor principal
function restoreMainVolume() {
    if (isDuckingActive) {
        if (currentPlayingType === 'audio') {
            mainAudioPlayer.volume = originalMainVolumeBeforeDuck; // Restaura el volumen
            if (mainPlayerPausedBeforeDuck) { // Si estaba pausado antes, vuelve a pausarlo
                mainAudioPlayer.pause();
            }
        }

        if (currentPlayingType === 'youtube' && youtubePlayer) {
            youtubePlayer.setVolume(originalMainVolumeBeforeDuck * 100); // Restaura volumen YouTube (0-100)
            if (mainPlayerPausedBeforeDuck) {
                youtubePlayer.pauseVideo();
            }
        }
        isDuckingActive = false;
        console.log("Volumen principal restaurado.");
    }
    // Actualiza el botón pisador
    duckVolumeBtn.innerHTML = '<i class="fas fa-volume-down"></i> Pisador para Locutor';
    duckVolumeBtn.dataset.manualDuck = 'false'; // Resetea el estado manual del botón
}

// Toggle para el botón pisador manual
function toggleDuckVolumeManual() {
    if (!isDuckingActive) {
        duckVolumeBtn.dataset.manualDuck = 'true'; // Marca que fue activado manualmente
        duckMainVolume();
    } else {
        // Si ya está ducking, y fue activado manualmente, lo desactiva.
        // Si está ducking por un spot automático, este botón lo "restaura" temporalmente.
        if (duckVolumeBtn.dataset.manualDuck === 'true') {
            restoreMainVolume();
            duckVolumeBtn.dataset.manualDuck = 'false'; // Resetea
        } else {
            // Este caso es más complejo y podría requerir un estado adicional
            // Por simplicidad, el botón manual SIEMPRE alterna su propio estado.
            restoreMainVolume();
        }
    }
}

// --- 5. Funciones de Lista de Reproducción ---

function addLocalFiles(files) {
    playlistUl.querySelector('.placeholder-item')?.remove(); // Elimina el placeholder
    for (const file of files) {
        const url = URL.createObjectURL(file);
        const li = document.createElement('li');
        li.dataset.src = url;
        li.dataset.type = 'local';
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="remove-item-btn"><i class="fas fa-times"></i></button>
        `;
        playlist.push({ name: file.name, src: url, type: 'local' });
        playlistUl.appendChild(li);
    }
    if (currentTrackIndex === -1 && playlist.length > 0) {
        playTrack(0); // Inicia la reproducción si es la primera pista
    }
}

function addYoutubeVideo(url) {
    const videoId = getYoutubeVideoId(url);
    if (!videoId) {
        alert('URL de YouTube no válida.');
        return;
    }

    playlistUl.querySelector('.placeholder-item')?.remove();

    // Por simplicidad, usaremos el ID como nombre de la pista
    const videoName = `YouTube: ${videoId}`;

    const li = document.createElement('li');
    li.dataset.src = videoId;
    li.dataset.type = 'youtube';
    li.innerHTML = `
        <span>${videoName}</span>
        <button class="remove-item-btn"><i class="fas fa-times"></i></button>
    `;
    playlist.push({ name: videoName, src: videoId, type: 'youtube' });
    playlistUl.appendChild(li);

    youtubeUrlInput.value = ''; // Limpiar el input

    if (currentTrackIndex === -1 && playlist.length > 0) {
        playTrack(0);
    }
}

function removePlaylistItem(targetElement) {
    const li = targetElement.closest('li');
    if (!li) return;

    const index = Array.from(playlistUl.children).indexOf(li);
    if (index > -1) {
        playlist.splice(index, 1);
        li.remove();

        // Si la pista eliminada era la que estaba sonando, detiene la reproducción
        if (index === currentTrackIndex) {
            stopMainPlayer();
        } else if (index < currentTrackIndex) {
            currentTrackIndex--; // Ajusta el índice si se eliminó una pista anterior
        }

        if (playlist.length === 0) {
            playlistUl.innerHTML = '<li class="placeholder-item">Añade música o videos de YouTube para empezar...</li>';
            stopMainPlayer();
        }
    }
}

function getYoutubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|watch\?v=|watch\?.+&v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// --- 6. Funciones de Publicidad (Spots) ---

function addAdFiles(files) {
    adListUl.querySelector('.placeholder-item')?.remove(); // Elimina el placeholder
    for (const file of files) {
        const url = URL.createObjectURL(file);
        const li = document.createElement('li');
        li.dataset.src = url;
        li.dataset.name = file.name; // Guarda el nombre para mostrar
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="remove-item-btn"><i class="fas fa-times"></i></button>
        `;
        ads.push({ name: file.name, src: url });
        adListUl.appendChild(li);
    }
}

function playRandomAd() {
    if (ads.length === 0) {
        console.log("No hay spots publicitarios para reproducir.");
        return;
    }

    currentAdIndex = Math.floor(Math.random() * ads.length);
    const adToPlay = ads[currentAdIndex];

    console.log(`Reproduciendo spot: ${adToPlay.name}`);

    duckMainVolume(); // Atenúa el volumen principal antes de sonar el spot

    adAudioPlayer.src = adToPlay.src;
    adAudioPlayer.play().catch(e => console.error("Error al reproducir spot:", e));

    // Cuando el spot termine, restaurar el volumen principal
    adAudioPlayer.onended = () => {
        console.log("Spot terminado.");
        restoreMainVolume();
    };
    adAudioPlayer.onerror = (e) => {
        console.error("Error al reproducir el spot:", e);
        restoreMainVolume(); // Asegurarse de restaurar el volumen en caso de error
    };
}

function stopAd() {
    adAudioPlayer.pause();
    adAudioPlayer.currentTime = 0;
    restoreMainVolume(); // Asegura que el volumen principal se restaure
    console.log("Spot detenido manualmente.");
}

function removeAdItem(targetElement) {
    const li = targetElement.closest('li'); // <-- Corrección aquí, usaba 'target' en lugar de 'targetElement'
    if (!li) return;

    const index = Array.from(adListUl.children).indexOf(li);
    if (index > -1) {
        ads.splice(index, 1);
        li.remove();

        if (ads.length === 0) {
            adListUl.innerHTML = '<li class="placeholder-item">Carga tus spots publicitarios...</li>';
        }
    }
}

function toggleAutoAd() {
    if (autoAdIntervalId) {
        // Si ya está activo, lo desactiva
        clearInterval(autoAdIntervalId);
        autoAdIntervalId = null;
        toggleAutoAdBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Auto OFF';
        toggleAutoAdBtn.classList.remove('primary');
        toggleAutoAdBtn.classList.add('secondary');
        console.log("Publicidad automática: DESACTIVADA");
    } else {
        // Si está inactivo, lo activa
        const intervalMinutes = parseInt(adIntervalInput.value, 10);
        if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
            alert("Por favor, introduce un intervalo válido para la publicidad automática (mínimo 1 minuto).");
            return;
        }
        autoAdIntervalId = setInterval(playRandomAd, intervalMinutes * 60 * 1000);
        toggleAutoAdBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Auto ON';
        toggleAutoAdBtn.classList.remove('secondary');
        toggleAutoAdBtn.classList.add('primary');
        console.log(`Publicidad automática: ACTIVADA cada ${intervalMinutes} minutos.`);
    }
}

// --- 7. Funciones de la Hora ---

// NUEVA FUNCIÓN: Busca una voz en español con preferencia por variantes latinas
function findPreferredLatinoVoice() {
    // Definimos un orden de preferencia para los códigos de idioma
    // Puedes ajustar este orden o añadir más si conoces códigos específicos (e.g., 'es-PE', 'es-EC')
    const latinoLocales = ['es-MX', 'es-US', 'es-CO', 'es-AR', 'es-CL', 'es-VE', 'es'];

    for (let locale of latinoLocales) {
        // Buscamos una voz que coincida con el idioma y sea un servicio local (generalmente de mejor calidad/sin latencia)
        preferredLatinoVoice = availableVoices.find(voice => voice.lang === locale && voice.localService);
        if (preferredLatinoVoice) {
            console.log(`Voz latina preferida encontrada: ${preferredLatinoVoice.name} (${preferredLatinoVoice.lang})`);
            return; // Si encontramos una, salimos
        }
    }

    // Si no encontramos ninguna voz específica de Latinoamérica, usamos la primera española disponible
    if (!preferredLatinoVoice) {
        preferredLatinoVoice = availableVoices.find(voice => voice.lang.startsWith('es'));
        if (preferredLatinoVoice) {
            console.log(`No se encontró una voz latina específica, usando la primera voz española: ${preferredLatinoVoice.name} (${preferredLatinoVoice.lang})`);
        } else {
            console.warn("No se encontraron voces en español disponibles en este navegador.");
        }
    }
}

function sayCurrentTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let textToSpeak;
    // Adapta la frase para que suene más natural en algunos contextos latinos
    if (minutes === 0) {
        textToSpeak = `Son las ${hours} en punto.`;
    } else if (minutes < 10) {
        textToSpeak = `Son las ${hours} y cero ${minutes}.`;
    } else {
        textToSpeak = `Son las ${hours} y ${minutes}.`;
    }

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // CLAVE: Asignar la voz encontrada con el acento latino
        if (preferredLatinoVoice) {
            utterance.voice = preferredLatinoVoice;
            utterance.lang = preferredLatinoVoice.lang; // Asegurarse de que el idioma coincida con la voz
        } else {
            // Fallback a español de España si no hay otra opción disponible
            utterance.lang = 'es-ES';
        }

        utterance.volume = 1; // Volumen de la voz (0 a 1)
        utterance.rate = 1; // Velocidad de la voz (0.1 a 10)
        utterance.pitch = 1; // Tono de la voz (0 a 2)

        duckMainVolume(); // Atenúa el volumen principal antes de decir la hora

        utterance.onend = () => {
            console.log("Hora dicha.");
            restoreMainVolume(); // Restaura el volumen cuando la voz termine
        };
        utterance.onerror = (e) => {
            console.error("Error al decir la hora:", e);
            restoreMainVolume(); // Asegurarse de restaurar en caso de error
        };
        window.speechSynthesis.speak(utterance);
        console.log("Intentando decir la hora...");
    } else {
        alert("Tu navegador no soporta la API de Síntesis de Voz.");
        console.warn("API de Síntesis de Voz no soportada.");
    }
}

function toggleAutoTime() {
    if (autoTimeIntervalId) {
        clearInterval(autoTimeIntervalId);
        autoTimeIntervalId = null;
        toggleAutoTimeBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Auto OFF';
        toggleAutoTimeBtn.classList.remove('primary');
        toggleAutoTimeBtn.classList.add('secondary');
        console.log("Hora automática: DESACTIVADA");
    } else {
        const intervalMinutes = parseInt(timeIntervalInput.value, 10);
        if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
            alert("Por favor, introduce un intervalo válido para la hora automática (mínimo 1 minuto).");
            return;
        }
        autoTimeIntervalId = setInterval(sayCurrentTime, intervalMinutes * 60 * 1000);
        toggleAutoTimeBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Auto ON';
        toggleAutoTimeBtn.classList.remove('secondary');
        toggleAutoTimeBtn.classList.add('primary');
        console.log(`Hora automática: ACTIVADA cada ${intervalMinutes} minutos.`);
    }
}


// --- 8. Ecualizador (Básico - requiere Web Audio API) ---
let audioContext;
let analyser;
let sourceNode;
let gainNodes = [];
let frequencyBands = [60, 170, 350, 1000, 3500, 10000]; // Bandas de frecuencia en Hz

function setupAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(mainAudioPlayer);

        // Crear nodos de ganancia para cada banda de frecuencia
        frequencyBands.forEach((freq, index) => {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking'; // Filtro de pico
            filter.frequency.value = freq;
            filter.Q.value = 1; // Factor de calidad
            filter.gain.value = 0; // Ganancia inicial de 0 dB

            gainNodes.push(filter);

            // Conectar nodos: source -> filter1 -> filter2 -> ... -> destination
            if (index === 0) {
                sourceNode.connect(filter);
            } else {
                gainNodes[index - 1].connect(filter);
            }

            // Conectar el último filtro al destino del audio
            if (index === frequencyBands.length - 1) {
                filter.connect(audioContext.destination);
            }
        });
        // IMPORTANTE: Asegúrate de que el sourceNode no esté conectado directamente al destino
        // si ya lo estás conectando a través de los filtros.
        // Si el mainAudioPlayer ya estaba conectado al destino, deberías desconectarlo.
        // Por simplicidad en este caso, si ya se conectó a través de los filtros,
        // no debería haber una conexión directa preexistente que interfiera.
    }
}

function createEqualizerControls() {
    equalizerControls.innerHTML = ''; // Limpiar controles existentes
    frequencyBands.forEach((freq, index) => {
        const eqBandDiv = document.createElement('div');
        eqBandDiv.classList.add('eq-band');

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = -15; // dB
        slider.max = 15;  // dB
        slider.value = 0; // dB inicial
        slider.step = 0.5;
        slider.dataset.index = index; // Para identificar qué filtro controlar

        slider.addEventListener('input', (e) => {
            const gainValue = parseFloat(e.target.value);
            if (gainNodes[index]) {
                gainNodes[index].gain.value = gainValue;
            }
        });

        const label = document.createElement('label');
        label.textContent = `${freq >= 1000 ? freq / 1000 + 'K' : freq} Hz`;

        eqBandDiv.appendChild(slider);
        eqBandDiv.appendChild(label);
        equalizerControls.appendChild(eqBandDiv);
    });

    const resetBtn = document.createElement('button');
    resetBtn.classList.add('btn', 'eq-reset-btn');
    resetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset EQ';
    resetBtn.addEventListener('click', resetEqualizer);
    equalizerControls.appendChild(resetBtn);

     // Conectar mainAudioPlayer a la cadena del ecualizador
     // Es mejor llamar a setupAudioContext() en el primer 'play' o cuando el usuario interactúa
     // para cumplir con las políticas de autoplay de los navegadores.
     // Ya lo tienes en DOMContentLoaded, pero es clave que el contexto de audio se reanude en interacción.
     mainAudioPlayer.addEventListener('play', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        setupAudioContext(); // Asegura que el contexto esté configurado al empezar a reproducir
     });
     // mainAudioPlayer.addEventListener('playing', setupAudioContext); // 'playing' también puede disparar setup
}

function resetEqualizer() {
    Array.from(equalizerControls.querySelectorAll('input[type="range"]')).forEach((slider, index) => {
        slider.value = 0;
        if (gainNodes[index]) {
            gainNodes[index].gain.value = 0;
        }
    });
    console.log("Ecualizador reseteado a 0 dB.");
}


// --- 9. Carga del Reproductor de YouTube (API Iframe Player) ---

function createYoutubePlayer(videoId) {
    if (youtubePlayer) {
        youtubePlayer.destroy(); // Destruye la instancia anterior si existe
    }
    youtubePlayer = new YT.Player('youtubePlayerContainer', {
        height: '360',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'autoplay': 1, // Intentar autoplay
            'controls': 1 // Mostrar controles de YouTube
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': (e) => console.error("Error de YouTube Player:", e)
        }
    });
}

function loadYoutubePlayer(videoId) {
    if (typeof YT === 'undefined' || !YT.Player) {
        // La API de YouTube no se ha cargado o no está lista, la cargamos.
        var tag = document.createElement('script');
        // --- CORRECCIÓN CRÍTICA AQUÍ ---
        tag.src = "https://www.youtube.com/iframe_api"; // URL CORRECTA DE LA API DE YOUTUBE
        // --------------------------------
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        createYoutubePlayer(videoId);
    }
}

window.onYouTubeIframeAPIReady = function() {
    // Esta función se llama automáticamente cuando la API de YouTube está lista.
    // Solo creamos el reproductor si hay un video en la playlist para él.
    // Opcionalmente, podemos inicializar un reproductor vacío para que esté listo.
    console.log("API de YouTube IFrame lista.");
    // Si la playlist no está vacía y la primera pista es de YouTube, o si hay alguna
    // pista de YouTube, podemos inicializar con esa.
    if (playlist.length > 0 && playlist[0].type === 'youtube') {
        createYoutubePlayer(playlist[0].src);
    } else if (playlist.some(p => p.type === 'youtube')) {
        createYoutubePlayer(playlist.find(p => p.type === 'youtube').src);
    } else {
        createYoutubePlayer(''); // Crea un reproductor con video vacío por defecto
    }
};


function onPlayerReady(event) {
    console.log("Reproductor de YouTube listo.");
    // Si ya hay una pista de YouTube seleccionada al cargar, la reproduce
    if (currentPlayingType === 'youtube' && currentTrackIndex !== -1) {
        event.target.playVideo();
        togglePlayPauseButton(true);
        youtubePlayerContainer.style.width = '100%';
        youtubePlayerContainer.style.height = '360px';
        youtubePlayerContainer.style.visibility = 'visible';
    }
    // Asegura que el volumen se sincronice con el control principal
    event.target.setVolume(mainVolumeControl.value * 100);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log("Video de YouTube terminado.");
        playNextTrack(); // Pasa a la siguiente pista
    } else if (event.data === YT.PlayerState.PLAYING) {
        togglePlayPauseButton(true);
        // Cuando empieza a sonar YouTube, asegúrate de que el audio principal esté pausado
        mainAudioPlayer.pause();
    } else if (event.data === YT.PlayerState.PAUSED) {
        togglePlayPauseButton(false);
    }
    // Lógica para atenuar/restaurar volumen de YouTube cuando el pisador esté activo
    if (isDuckingActive) {
        if (event.data === YT.PlayerState.PLAYING) {
            youtubePlayer.setVolume(20); // Mantener atenuado si el pisador está activo
        }
    } else {
        if (event.data === YT.PlayerState.PLAYING) {
            youtubePlayer.setVolume(originalMainVolumeBeforeDuck * 100); // Restaurar volumen normal
        }
    }
}


// --- 10. Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    updateCurrentTime(); // Muestra la hora al cargar
    setInterval(updateCurrentTime, 1000); // Actualiza cada segundo
    createEqualizerControls(); // Crea los controles del ecualizador
    // setupAudioContext(); // No es ideal llamarlo aquí si no hay interacción del usuario. Mejor en 'play'

    // Inicializar el valor del volumen
    // Asegura que mainVolumeControl.value tenga un valor antes de asignarlo
    originalMainVolumeBeforeDuck = parseFloat(mainVolumeControl.value) || 0.5; // Valor por defecto 0.5
    mainAudioPlayer.volume = originalMainVolumeBeforeDuck;
    adAudioPlayer.volume = 1; // Los spots deben sonar a volumen completo por defecto

    // Cargar las voces de síntesis de voz (AJUSTE PARA VOZ LATINA)
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            availableVoices = speechSynthesis.getVoices();
            console.log("Voces de síntesis de voz disponibles:", availableVoices);
            findPreferredLatinoVoice();
        };
        // También llamar inmediatamente por si las voces ya están cargadas
        availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            findPreferredLatinoVoice();
        }
    }

    // Manejo de autoplay: Los navegadores bloquean el autoplay con sonido.
    // Mutea y luego intenta reproducir para que el contexto de audio se active.
    // El usuario deberá interactuar para desmutear o reproducir sonido.
    mainAudioPlayer.muted = true;
    mainAudioPlayer.play().then(() => {
        console.log("Autoplay inicial intentado y permitido (mutado).");
        mainAudioPlayer.muted = false; // Desmutea después de la interacción para que el usuario tenga control
    }).catch(e => {
        console.warn("Autoplay bloqueado inicialmente, se requiere interacción del usuario:", e.name);
        mainAudioPlayer.muted = false; // Asegúrate de desmutear para que el control de volumen funcione
    });
});

// Controles del reproductor principal
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);
mainStopBtn.addEventListener('click', stopMainPlayer);
duckVolumeBtn.addEventListener('click', toggleDuckVolumeManual); // Evento para el botón pisador manual

mainVolumeControl.addEventListener('input', (e) => {
    const newVolume = parseFloat(e.target.value);
    mainAudioPlayer.volume = newVolume;
    if (!isDuckingActive) { // Solo guarda el volumen si no estamos en ducking
        originalMainVolumeBeforeDuck = newVolume;
    }
    if (youtubePlayer) {
        youtubePlayer.setVolume(newVolume * 100);
    }
});

mainAudioPlayer.addEventListener('timeupdate', () => {
    const progress = (mainAudioPlayer.currentTime / mainAudioPlayer.duration) * 100;
    if (!isNaN(progress)) { // Asegurarse de que duration no sea 0 o NaN
        mainProgressBar.style.width = `${progress}%`;
    }
});

mainAudioPlayer.addEventListener('ended', playNextTrack);
mainAudioPlayer.addEventListener('error', (e) => console.error("Error en mainAudioPlayer:", e));


// Lista de reproducción
addLocalBtn.addEventListener('click', () => localFileInput.click());
localFileInput.addEventListener('change', (e) => addLocalFiles(e.target.files));

addYoutubeBtn.addEventListener('click', () => addYoutubeVideo(youtubeUrlInput.value));

playlistUl.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
        removePlaylistItem(e.target);
    } else if (e.target.closest('li') && !e.target.classList.contains('placeholder-item')) {
        const listItem = e.target.closest('li');
        const index = Array.from(playlistUl.children).indexOf(listItem);
        if (index > -1) {
            playTrack(index);
        }
    }
});

// Publicidad (Spots)
addAdBtn.addEventListener('click', () => adFileInput.click());
adFileInput.addEventListener('change', (e) => addAdFiles(e.target.files));

playAdBtn.addEventListener('click', playRandomAd);

stopAdBtn.addEventListener('click', stopAd);

toggleAutoAdBtn.addEventListener('click', toggleAutoAd);

adListUl.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
        removeAdItem(e.target);
    }
});

// Hora
sayTimeBtn.addEventListener('click', sayCurrentTime);
toggleAutoTimeBtn.addEventListener('click', toggleAutoTime);
