// ==========================================================================
// TARJETA DE BODA DIGITAL - EDGAR FERNANDO & LUISA FERNANDA
// Lógica de Personalización, Animación 3D, Audio Web & Panel de Novios
// ==========================================================================

import { GUESTS } from './data/guests.js';

// Estado global de la aplicación
const AppState = {
  currentGuest: null,
  isEnvelopeOpen: false,
  isMusicPlaying: false,
  weddingSettings: {
    groom: 'Edgar Fernando',
    bride: 'Luisa Fernanda',
    monogram: 'F & L',
    weddingDate: '2026-11-14T17:30',
    couplePhone: '573204545796',
    ceremonyPlace: 'Parroquia Nuestra Señora Del Carmen',
    ceremonyAddress: 'Cra. 5 #18-55, Ibagué, Tolima',
    ceremonyMaps: 'https://www.google.com/maps/search/?api=1&query=Parroquia+Nuestra+Señora+Del+Carmen+Cra+5+18-55+Ibague+Tolima',
    ceremonyWaze: 'https://waze.com/ul?q=Parroquia+Nuestra+Señora+Del+Carmen+Cra+5+18-55+Ibague',
    receptionPlace: 'Centro Vacacional Picaleña de la Policía',
    receptionAddress: 'Av. Picaleña, Ibagué, Tolima',
    receptionMaps: 'https://www.google.com/maps/search/?api=1&query=Centro+Vacacional+Picaleña+de+la+Policía+Ibague+Tolima',
    receptionWaze: 'https://waze.com/ul?q=Centro+Vacacional+Picaleña+Ibague'
  },
  activePassFilter: 'all'
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  resolveActiveGuest();
  initAmbientParticles();
  initCountdown();
  renderHostGuestList();
  setupEventListeners();
});

// Cargar configuración guardada si existe
function loadSavedSettings() {
  try {
    const saved = localStorage.getItem('wedding_custom_settings');
    if (saved) {
      AppState.weddingSettings = { ...AppState.weddingSettings, ...JSON.parse(saved) };
    }
    // Cargar huellitas de mascota personalizada si existe
    const customPaws = localStorage.getItem('wedding_custom_dog_paws');
    if (customPaws) {
      const p1 = document.getElementById('dogPawsImg');
      const p2 = document.getElementById('frontDogPawsImg');
      const p3 = document.querySelector('.door-dog-paws-img');
      if (p1) p1.src = customPaws;
      if (p2) p2.src = customPaws;
      if (p3) p3.src = customPaws;
    }
  } catch (e) {
    console.warn('No se pudo cargar la configuración de localStorage', e);
  }
  applySettingsToUI();
}

// Aplicar configuración a los textos de la interfaz
function applySettingsToUI() {
  const s = AppState.weddingSettings;
  const groomEl = document.getElementById('displayGroom');
  const brideEl = document.getElementById('displayBride');
  const monoEl = document.getElementById('displayMonogram');
  const cerPlaceEl = document.getElementById('locCeremonyPlace');
  const cerAddrEl = document.getElementById('locCeremonyAddress');
  const recPlaceEl = document.getElementById('locReceptionPlace');
  const recAddrEl = document.getElementById('locReceptionAddress');
  const linkCerMaps = document.getElementById('linkCeremonyMaps');
  const linkCerWaze = document.getElementById('linkCeremonyWaze');
  const linkRecMaps = document.getElementById('linkReceptionMaps');
  const linkRecWaze = document.getElementById('linkReceptionWaze');

  if (groomEl) groomEl.textContent = s.groom;
  if (brideEl) brideEl.textContent = s.bride;
  if (monoEl) monoEl.textContent = s.monogram;
  if (cerPlaceEl) cerPlaceEl.textContent = s.ceremonyPlace;
  if (cerAddrEl) cerAddrEl.textContent = s.ceremonyAddress;
  if (recPlaceEl) recPlaceEl.textContent = s.receptionPlace;
  if (recAddrEl) recAddrEl.textContent = s.receptionAddress;
  if (linkCerMaps) linkCerMaps.href = s.ceremonyMaps;
  if (linkCerWaze) linkCerWaze.href = s.ceremonyWaze;
  if (linkRecMaps) linkRecMaps.href = s.receptionMaps;
  if (linkRecWaze) linkRecWaze.href = s.receptionWaze;

  // Llenar inputs en el panel de configuración
  const editGroom = document.getElementById('editGroomName');
  const editBride = document.getElementById('editBrideName');
  const editMono = document.getElementById('editMonogram');
  const editDate = document.getElementById('editWeddingDate');
  const editPhone = document.getElementById('editWeddingPhone');
  const editCer = document.getElementById('editCeremonyPlace');
  const editRec = document.getElementById('editReceptionPlace');

  if (editGroom) editGroom.value = s.groom;
  if (editBride) editBride.value = s.bride;
  if (editMono) editMono.value = s.monogram;
  if (editDate) editDate.value = s.weddingDate;
  if (editPhone) editPhone.value = s.couplePhone;
  if (editCer) editCer.value = s.ceremonyPlace;
  if (editRec) editRec.value = s.receptionPlace;
}

// ==========================================================================
// RESOLUCIÓN DEL INVITADO ACTIVO (DESDE PARÁMETROS URL O MODO GENERAL)
// ==========================================================================
function resolveActiveGuest() {
  const urlParams = new URLSearchParams(window.location.search);
  const invitadoParam = urlParams.get('invitado') || urlParams.get('guest');
  const idParam = urlParams.get('id');
  const customName = urlParams.get('g') || urlParams.get('nombre');
  const customPasses = urlParams.get('p') || urlParams.get('pases');

  let resolvedGuest = null;

  // 1. Si viene por ID numérico (1 - 47)
  if (idParam) {
    const numId = parseInt(idParam, 10);
    resolvedGuest = GUESTS.find(g => g.id === numId);
  }

  // 2. Si viene por slug (ej. ?invitado=german-y-mary)
  if (!resolvedGuest && invitadoParam) {
    const slugNorm = invitadoParam.toLowerCase().trim();
    resolvedGuest = GUESTS.find(g => g.slug === slugNorm || g.name.toLowerCase().includes(slugNorm));
  }

  // 3. Si viene con nombre y pases personalizados en la URL
  if (!resolvedGuest && customName) {
    const passes = parseInt(customPasses, 10) || 2;
    const s_plural = passes > 1 ? 's' : '';
    resolvedGuest = {
      id: 999,
      slug: 'custom',
      name: decodeURIComponent(customName),
      passes: passes,
      reservaText: `Esta invitación está reservada para ${passes} persona${s_plural}`,
      phone: ''
    };
  }

  // 4. Si no coincide ninguno, se activa el MODO GENERAL (sin forzar a German y Mary)
  if (!resolvedGuest) {
    AppState.currentGuest = null;
    applyGeneralInvitationToUI();
    return;
  }

  AppState.currentGuest = resolvedGuest;
  applyGuestToUI(resolvedGuest);
}

// Aplicar vista en Modo General (sin invitado específico)
function applyGeneralInvitationToUI() {
  document.title = "Boda Edgar Fernando & Luisa Fernanda 🌿";

  // 1. Rótulo del Sobre
  const envIntro = document.getElementById('envGuestIntro');
  const envName = document.getElementById('envGuestName');
  const envPasses = document.getElementById('envGuestPasses');
  if (envIntro) envIntro.textContent = "Estás Cordialmente Invitado/a";
  if (envName) envName.textContent = "Boda Edgar Fernando & Luisa Fernanda";
  if (envPasses) envPasses.textContent = "Sábado, 14 de Noviembre de 2026 • Ibagué, Tolima";

  // 2. Sección Principal de la Tarjeta
  const cardPrefix = document.getElementById('cardGuestPrefix');
  const cardName = document.getElementById('cardGuestName');
  const cardReserva = document.getElementById('cardGuestReserva');
  if (cardPrefix) cardPrefix.textContent = "Con la bendición de Dios y nuestras familias";
  if (cardName) cardName.textContent = "¡Nos Casamos!";
  if (cardReserva) cardReserva.textContent = "Tenemos el honor de invitarte a celebrar la unión de nuestras vidas y nuestro amor";

  // 3. Pases de Invitación
  const ticketsWrapper = document.getElementById('ticketsWrapper');
  if (ticketsWrapper) {
    ticketsWrapper.innerHTML = `
      <div class="ticket-pass">
        <div class="ticket-badge-icon">🌿</div>
        <div class="ticket-pass-info">
          <div class="ticket-pass-title">Boleto de Honor</div>
          <div class="ticket-pass-desc">Pase de Invitación Válido</div>
        </div>
      </div>
    `;
  }

  // 4. Formulario RSVP limpio
  const rsvpName = document.getElementById('rsvpInputName');
  if (rsvpName) rsvpName.value = '';

  // 5. Botón Directo WhatsApp General
  const btnRSVP = document.getElementById('btnWhatsAppRSVP');
  if (btnRSVP) {
    const phone = AppState.weddingSettings.couplePhone.replace(/\D/g, '') || '573204545796';
    const groom = AppState.weddingSettings.groom;
    const bride = AppState.weddingSettings.bride;
    const message = `¡Hola ${groom} y ${bride}! 🌿🤍 Confirmo con mucha alegría mi asistencia a su matrimonio. ¡Nos vemos allá para celebrar juntos! ✨🕊️`;
    btnRSVP.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
}

// Actualizar la interfaz con los datos del invitado personalizado
function applyGuestToUI(guest) {
  // 1. Rótulo del Sobre
  const envIntro = document.getElementById('envGuestIntro');
  const envName = document.getElementById('envGuestName');
  const envPasses = document.getElementById('envGuestPasses');
  if (envIntro) envIntro.textContent = "Estás Cordialmente Invitado/a";
  if (envName) envName.textContent = guest.name;
  if (envPasses) envPasses.textContent = guest.reservaText;

  // 2. Sección Principal de la Tarjeta
  const cardPrefix = document.getElementById('cardGuestPrefix');
  const cardName = document.getElementById('cardGuestName');
  const cardReserva = document.getElementById('cardGuestReserva');
  if (cardPrefix) cardPrefix.textContent = "Nos complace invitar a:";
  if (cardName) cardName.textContent = guest.name;
  if (cardReserva) cardReserva.textContent = guest.reservaText;

  // 3. Generación de Pases / Boletos de Honor
  const ticketsWrapper = document.getElementById('ticketsWrapper');
  if (ticketsWrapper) {
    ticketsWrapper.innerHTML = '';
    const numPasses = Math.min(Math.max(guest.passes || 1, 1), 6);
    
    for (let i = 1; i <= numPasses; i++) {
      const ticket = document.createElement('div');
      ticket.className = 'ticket-pass';
      ticket.innerHTML = `
        <div class="ticket-badge-icon">${i}</div>
        <div class="ticket-pass-info">
          <div class="ticket-pass-title">Boleto de Honor</div>
          <div class="ticket-pass-desc">Pase #${i} Válido</div>
        </div>
      `;
      ticketsWrapper.appendChild(ticket);
    }
  }

  // 4. Formulario RSVP - Prellenar valores
  const rsvpName = document.getElementById('rsvpInputName');
  if (rsvpName) rsvpName.value = guest.name;

  // 5. Botón Directo de WhatsApp RSVP
  updateWhatsAppRSVPLink(guest);

  // Actualizar título de la página
  document.title = `Invitación para ${guest.name} • Boda Edgar Fernando & Luisa Fernanda 🌿`;
}

// Actualizar el enlace directo de confirmación por WhatsApp
function updateWhatsAppRSVPLink(guest) {
  const btnRSVP = document.getElementById('btnWhatsAppRSVP');
  if (!btnRSVP) return;

  const phone = AppState.weddingSettings.couplePhone.replace(/\D/g, '') || '573204545796';
  const groom = AppState.weddingSettings.groom;
  const bride = AppState.weddingSettings.bride;
  const passes = guest.passes || 2;
  const s_plural = passes > 1 ? 's' : '';

  const message = `¡Hola ${groom} y ${bride}! 🌿🤍 Confirmo con inmensa alegría la asistencia de *${guest.name}* (${passes} persona${s_plural}) a su matrimonio. ¡Nos vemos allá para celebrar juntos! ✨🕊️`;
  
  btnRSVP.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ==========================================================================
// APERTURA DEL SOBRE 3D (ENVELOPE OPENING ANIMATION)
// ==========================================================================
function setupEventListeners() {
  const waxSealBtn = document.getElementById('waxSealBtn');
  const envelopeWrapper = document.getElementById('envelopeWrapper');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const hostPanelBtn = document.getElementById('hostPanelBtn');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const hostModalOverlay = document.getElementById('hostModalOverlay');
  const btnAddToCalendar = document.getElementById('btnAddToCalendar');

  // Control de Visibilidad del Panel de Novios:
  // NUNCA se muestra a los invitados normales.
  // Solo se muestra si la URL tiene ?admin=true o ?novios=1, o con el atajo Alt+N
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get('admin') === 'true' || urlParams.get('novios') === '1' || urlParams.get('novios') === 'true';

  if (hostPanelBtn) {
    if (isAdmin) {
      hostPanelBtn.style.display = 'flex';
    } else {
      hostPanelBtn.style.display = 'none';
    }
  }

  // Atajo de teclado discreto para los novios: Alt + N
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      if (hostPanelBtn) {
        hostPanelBtn.style.display = hostPanelBtn.style.display === 'none' ? 'flex' : 'none';
        showToast(hostPanelBtn.style.display === 'flex' ? '🌿 Panel de Novios activado' : 'Panel ocultado');
      }
    }
  });

  // Abrir el sobre al tocar el lacre o el sobre
  if (waxSealBtn) {
    waxSealBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEnvelope();
    });
    waxSealBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEnvelope();
      }
    });
  }

  if (envelopeWrapper) {
    envelopeWrapper.addEventListener('click', () => {
      if (!AppState.isEnvelopeOpen) {
        openEnvelope();
      }
    });
  }

  // Toggle de música ambiental
  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', toggleMusic);
  }

  // Botón para abrir el panel de novios
  if (hostPanelBtn) {
    hostPanelBtn.addEventListener('click', openHostDrawer);
  }

  // Cerrar el drawer
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', closeHostDrawer);
  }

  if (hostModalOverlay) {
    hostModalOverlay.addEventListener('click', (e) => {
      if (e.target === hostModalOverlay) {
        closeHostDrawer();
      }
    });
  }

  // Añadir al calendario
  if (btnAddToCalendar) {
    btnAddToCalendar.addEventListener('click', downloadCalendarEvent);
  }
}

// Función principal de apertura (Efecto Gatefold 3D)
function openEnvelope() {
  if (AppState.isEnvelopeOpen) return;
  AppState.isEnvelopeOpen = true;

  const stage = document.getElementById('envelopeStage');
  const waxImg = document.getElementById('waxSealImg');

  // Sonido de apertura y música
  playWaxCrackSound();
  playWeddingMusic();

  // Animación del sello de cera
  if (waxImg) {
    waxImg.style.transform = 'scale(1.3) rotate(15deg)';
    waxImg.style.opacity = '0';
  }

  // Disparar confeti dorado y pétalos
  launchGoldConfetti();

  // Abrir puertas en 3D
  setTimeout(() => {
    if (stage) stage.classList.add('opened');
  }, 200);

  // Completar transición y liberar navegación de la tarjeta
  setTimeout(() => {
    if (stage) stage.classList.add('fully-opened');
  }, 1400);

  // Desplazamiento suave hacia la tarjeta
  setTimeout(() => {
    const card = document.getElementById('weddingCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 850);
}

// Volver a cerrar el sobre
window.resetToEnvelope = function() {
  const stage = document.getElementById('envelopeStage');
  const waxImg = document.getElementById('waxSealImg');
  
  if (stage) {
    stage.classList.remove('fully-opened');
    stage.classList.remove('opened');
  }
  if (waxImg) {
    waxImg.style.transform = 'scale(1) rotate(0deg)';
    waxImg.style.opacity = '1';
  }

  AppState.isEnvelopeOpen = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================================================
// REPRODUCCIÓN DE MÚSICA OFICIAL (FONSECA, JUANES - ANTES QUE EL TIEMPO SE VAYA)
// ==========================================================================
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function getWeddingAudio() {
  return document.getElementById('weddingBgAudio');
}

function playWeddingMusic() {
  const audio = getWeddingAudio();
  if (!audio) return;

  audio.volume = 0.8;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      AppState.isMusicPlaying = true;
      updateMusicUI(true);
    }).catch(err => {
      console.warn('El navegador requiere un clic del usuario para reproducir audio:', err);
      AppState.isMusicPlaying = false;
      updateMusicUI(false);
    });
  }
}

function stopWeddingMusic() {
  const audio = getWeddingAudio();
  if (!audio) return;
  audio.pause();
  AppState.isMusicPlaying = false;
  updateMusicUI(false);
}

function toggleMusic() {
  const audio = getWeddingAudio();
  if (!audio) return;
  if (audio.paused) {
    playWeddingMusic();
  } else {
    stopWeddingMusic();
  }
}

function updateMusicUI(isPlaying) {
  const btn = document.getElementById('musicToggleBtn');
  if (!btn) return;
  if (isPlaying) {
    btn.classList.remove('muted');
    btn.title = 'Pausar música: Fonseca, Juanes - Antes que el tiempo se vaya';
  } else {
    btn.classList.add('muted');
    btn.title = 'Reproducir música: Fonseca, Juanes - Antes que el tiempo se vaya';
  }
}

// Sonido sutil de ruptura de lacre
function playWaxCrackSound() {
  initAudioContext();
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.25);
  
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

// ==========================================================================
// PARTICULAS Y CONFETI DORADO
// ==========================================================================
function initAmbientParticles() {
  const container = document.getElementById('ambient-particles');
  if (!container) return;

  const count = 18;
  for (let i = 0; i < count; i++) {
    createSingleParticle(container);
  }
}

function createSingleParticle(container) {
  const p = document.createElement('div');
  p.className = 'particle';

  const size = Math.random() * 5 + 3;
  p.style.width = `${size}px`;
  p.style.height = `${size}px`;
  p.style.left = `${Math.random() * 100}%`;
  
  // Colores: oro, champagne y salvia
  const colors = [
    'rgba(228, 200, 138, 0.7)',
    'rgba(197, 160, 89, 0.6)',
    'rgba(145, 162, 126, 0.5)',
    'rgba(255, 245, 220, 0.8)'
  ];
  p.style.background = colors[Math.floor(Math.random() * colors.length)];
  p.style.boxShadow = `0 0 8px ${colors[0]}`;
  
  const duration = Math.random() * 9 + 8;
  const delay = Math.random() * 5;
  p.style.animationDuration = `${duration}s`;
  p.style.animationDelay = `${delay}s`;

  container.appendChild(p);
}

function launchGoldConfetti() {
  const colors = ['#c5a059', '#e4c88a', '#91a27e', '#ffffff', '#a44f3b'];
  const confettiCount = 35;
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.45;

  for (let i = 0; i < confettiCount; i++) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.width = `${Math.random() * 8 + 6}px`;
    el.style.height = `${Math.random() * 12 + 6}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.zIndex = '999';
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 1.4s cubic-bezier(0.12, 0.8, 0.32, 1)';
    
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / confettiCount;
    const distance = Math.random() * 220 + 80;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 80;
    const rotate = Math.random() * 720 - 360;

    requestAnimationFrame(() => {
      el.style.transform = `translate(${destX}px, ${destY}px) rotate(${rotate}deg)`;
      el.style.opacity = '0';
    });

    setTimeout(() => {
      el.remove();
    }, 1500);
  }
}

// ==========================================================================
// CONTADOR REGRESIVO (COUNTDOWN TIMER)
// ==========================================================================
function initCountdown() {
  function updateTimer() {
    const weddingDateStr = AppState.weddingSettings.weddingDate;
    const targetDate = new Date(weddingDateStr).getTime();
    const now = new Date().getTime();
    const diff = targetDate - now;

    const daysEl = document.getElementById('cdDays');
    const hoursEl = document.getElementById('cdHours');
    const minsEl = document.getElementById('cdMins');
    const secsEl = document.getElementById('cdSecs');

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// Descargar evento .ics para el calendario
function downloadCalendarEvent() {
  const s = AppState.weddingSettings;
  const target = new Date(s.weddingDate);
  
  const formatDateForICS = (d) => {
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const start = formatDateForICS(target);
  const end = formatDateForICS(new Date(target.getTime() + (8 * 60 * 60 * 1000)));

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boda Luis y Julieth//ES',
    'BEGIN:VEVENT',
    `SUMMARY:Boda ${s.groom} & ${s.bride} 🌿`,
    `DESCRIPTION:Celebración del matrimonio de ${s.groom} y ${s.bride}. ¡Esperamos contar con tu presencia!`,
    `LOCATION:${s.ceremonyPlace} - ${s.ceremonyAddress}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `boda_${s.groom}_y_${s.bride}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('📅 ¡Evento guardado en tu calendario!');
}

// ==========================================================================
// FORMULARIO RSVP INTEGRADO
// ==========================================================================
window.handleRSVPSubmit = function(event) {
  event.preventDefault();

  const nameInput = document.getElementById('rsvpInputName');
  const attendanceInput = document.getElementById('rsvpInputAttendance');
  const messageInput = document.getElementById('rsvpInputMessage');

  const name = nameInput ? nameInput.value.trim() : '';
  const attendance = attendanceInput ? attendanceInput.value : 'si';
  const message = messageInput ? messageInput.value.trim() : '';

  if (!name) {
    alert('Por favor escribe tu nombre completo para confirmar.');
    return;
  }

  const phone = AppState.weddingSettings.couplePhone.replace(/\D/g, '') || '573204545796';
  const groom = AppState.weddingSettings.groom;
  const bride = AppState.weddingSettings.bride;

  const statusText = attendance === 'si' ? '¡Sí, asistiré con mucha alegría! 🌿' : 'Lamentablemente no podré asistir 🤍';

  const rsvpText = [
    `¡Hola ${groom} y ${bride}! 🌿🤍`,
    `*Confirmación de Asistencia a la Boda:*`,
    `• *Invitado:* ${name}`,
    `• *Respuesta:* ${statusText}`,
    message ? `• *Mensaje:* "${message}"` : ''
  ].filter(Boolean).join('\n');

  const payload = {
    name,
    attendance,
    statusText,
    message,
    date: new Date().toISOString()
  };

  // 1. Enviar a la nube (ntfy.sh) para sincronización en tiempo real con el Panel de Novios
  fetch('https://ntfy.sh/boda-edgar-fernando-luisa-fernanda-rsvp-2026', {
    method: 'POST',
    headers: {
      'Title': `Confirmación Boda: ${name}`,
      'Priority': 'high',
      'Tags': attendance === 'si' ? 'white_check_mark,ring' : 'x,white_heart'
    },
    body: JSON.stringify(payload)
  }).catch(err => console.warn('Sync cloud error:', err));

  // 2. Guardar en almacenamiento local del dispositivo como respaldo
  try {
    const list = JSON.parse(localStorage.getItem('wedding_rsvp_confirmations') || '[]');
    list.push(payload);
    localStorage.setItem('wedding_rsvp_confirmations', JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }

  showToast('✓ ¡Confirmación registrada con éxito!');

  // 3. Abrir WhatsApp para entrega directa a los novios
  setTimeout(() => {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(rsvpText)}`, '_blank');
  }, 500);
};

// ==========================================================================
// PANEL DE NOVIOS / ANFITRIONES (47 INVITADOS DEL EXCEL)
// ==========================================================================
function openHostDrawer() {
  const modal = document.getElementById('hostModalOverlay');
  if (modal) modal.classList.add('open');
}

function closeHostDrawer() {
  const modal = document.getElementById('hostModalOverlay');
  if (modal) modal.classList.remove('open');
}

window.switchHostTab = function(tabId) {
  const tabs = document.querySelectorAll('.host-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(t => t.classList.remove('active'));
  panes.forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  const selectedBtn = Array.from(tabs).find(t => t.getAttribute('onclick').includes(tabId));
  const selectedPane = document.getElementById(tabId);

  if (selectedBtn) selectedBtn.classList.add('active');
  if (selectedPane) {
    selectedPane.classList.add('active');
    selectedPane.style.display = 'block';
  }
};

window.setPassFilter = function(filterType, btnEl) {
  AppState.activePassFilter = filterType;
  const pills = document.querySelectorAll('.pill-filter');
  pills.forEach(p => p.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderHostGuestList();
};

window.filterGuestList = function() {
  renderHostGuestList();
};

function renderHostGuestList() {
  const listContainer = document.getElementById('hostGuestList');
  const searchInput = document.getElementById('hostSearchInput');
  const badgeCount = document.getElementById('hostBadgeCount');
  if (!listContainer) return;

  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const filter = AppState.activePassFilter;

  let filtered = GUESTS.filter(g => {
    const matchQuery = g.name.toLowerCase().includes(query) || (g.phone && g.phone.includes(query));
    if (!matchQuery) return false;

    if (filter === 'all') return true;
    if (filter === '1') return g.passes === 1;
    if (filter === '2') return g.passes === 2;
    if (filter === 'multi') return g.passes >= 3;
    return true;
  });

  if (badgeCount) badgeCount.textContent = GUESTS.length;

  listContainer.innerHTML = '';

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--color-text-muted); font-size: 0.85rem;">
        No se encontraron invitados con "${query}".
      </div>
    `;
    return;
  }

  const baseUrl = window.location.origin + window.location.pathname;

  filtered.forEach(guest => {
    const item = document.createElement('div');
    item.className = 'guest-admin-item';

    const cardLink = `${baseUrl}?invitado=${guest.slug}`;
    const cleanPhone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const intlPhone = cleanPhone ? (cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`) : '';

    const groom = AppState.weddingSettings.groom;
    const bride = AppState.weddingSettings.bride;
    const s_plural = guest.passes > 1 ? 's' : '';
    
    // Mensaje personalizado de invitación para enviar al WhatsApp del invitado
    const waInviteMessage = `¡Hola ${guest.name}! 🌿🕊️ Tenemos el inmenso honor de invitarte a celebrar nuestro matrimonio. Esta invitación está reservada para *${guest.passes} persona${s_plural}*.\n\nPuedes conocer todos los detalles de la ceremonia, fiesta y confirmar tu asistencia en tu tarjeta digital personalizada aquí:\n${cardLink}\n\n¡Esperamos contar con tu compañía en este día tan especial! 🤍\n— *${groom} & ${bride}*`;

    const waHref = intlPhone 
      ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(waInviteMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(waInviteMessage)}`;

    item.innerHTML = `
      <div class="guest-admin-top">
        <div>
          <div class="guest-admin-name">${guest.name}</div>
          <div class="guest-admin-phone">${guest.phone ? `📱 +57 ${guest.phone}` : 'Sin teléfono en Excel'}</div>
        </div>
        <span class="guest-admin-passes">${guest.passes} ${guest.passes === 1 ? 'Pase' : 'Pases'}</span>
      </div>

      <div class="guest-admin-actions">
        <button class="btn-admin-action btn-action-preview" onclick="selectGuestForPreview(${guest.id})">
          👁️ Ver Tarjeta
        </button>
        <button class="btn-admin-action btn-action-copy" onclick="copyText('${cardLink}', '¡Enlace de ${guest.name.replace(/'/g, "\\'")} copiado!')">
          🔗 Copiar Enlace
        </button>
        <a href="${waHref}" target="_blank" rel="noopener" class="btn-admin-action btn-action-whatsapp">
          💬 Enviar WhatsApp
        </a>
      </div>
    `;

    listContainer.appendChild(item);
  });
}

// Previsualizar la tarjeta de un invitado específico sin recargar la página
window.selectGuestForPreview = function(guestId) {
  const guest = GUESTS.find(g => g.id === guestId);
  if (!guest) return;

  AppState.currentGuest = guest;
  applyGuestToUI(guest);
  
  // Actualizar URL sin recarga
  const newUrl = `${window.location.origin}${window.location.pathname}?invitado=${guest.slug}`;
  window.history.pushState({ path: newUrl }, '', newUrl);

  showToast(`Mostrando tarjeta de: ${guest.name}`);
  closeHostDrawer();
};

// Guardar cambios en los datos de la boda
window.saveWeddingSettings = function(event) {
  event.preventDefault();

  const groom = document.getElementById('editGroomName').value;
  const bride = document.getElementById('editBrideName').value;
  const monogram = document.getElementById('editMonogram').value;
  const date = document.getElementById('editWeddingDate').value;
  const phone = document.getElementById('editWeddingPhone').value;
  const cerPlace = document.getElementById('editCeremonyPlace').value;
  const recPlace = document.getElementById('editReceptionPlace').value;

  AppState.weddingSettings.groom = groom;
  AppState.weddingSettings.bride = bride;
  AppState.weddingSettings.monogram = monogram;
  AppState.weddingSettings.weddingDate = date;
  AppState.weddingSettings.couplePhone = phone;
  AppState.weddingSettings.ceremonyPlace = cerPlace;
  AppState.weddingSettings.receptionPlace = recPlace;

  try {
    localStorage.setItem('wedding_custom_settings', JSON.stringify(AppState.weddingSettings));
  } catch (e) {
    console.error(e);
  }

  applySettingsToUI();
  updateWhatsAppRSVPLink(AppState.currentGuest);
  renderHostGuestList();
  showToast('✓ Datos de la boda guardados con éxito');
};

// Generador de enlaces para nuevos invitados
window.generateCustomLink = function() {
  const nameInput = document.getElementById('customGuestName').value.trim();
  const passesInput = document.getElementById('customGuestPasses').value;
  const phoneInput = document.getElementById('customGuestPhone').value.trim();
  const resultBox = document.getElementById('customLinkResult');
  const urlInput = document.getElementById('customLinkUrl');
  const waBtn = document.getElementById('customLinkWhatsApp');

  if (!nameInput) {
    alert('Por favor ingresa el nombre del invitado.');
    return;
  }

  const baseUrl = window.location.origin + window.location.pathname;
  const link = `${baseUrl}?nombre=${encodeURIComponent(nameInput)}&pases=${passesInput}`;

  urlInput.value = link;
  resultBox.style.display = 'block';

  const cleanPhone = phoneInput.replace(/\D/g, '');
  const intlPhone = cleanPhone ? (cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`) : '';
  const groom = AppState.weddingSettings.groom;
  const bride = AppState.weddingSettings.bride;
  const s_plural = parseInt(passesInput, 10) > 1 ? 's' : '';

  const waMsg = `¡Hola ${nameInput}! 🌿🕊️ Tenemos el inmenso honor de invitarte a celebrar nuestro matrimonio. Esta invitación está reservada para *${passesInput} persona${s_plural}*.\n\nPuedes conocer todos los detalles de la ceremonia, fiesta y confirmar tu asistencia en tu tarjeta digital aquí:\n${link}\n\n¡Esperamos contar con tu compañía! 🤍\n— *${groom} & ${bride}*`;

  waBtn.href = intlPhone 
    ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(waMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  showToast('✓ Enlace personalizado generado');
};

window.copyCustomLink = function() {
  const urlInput = document.getElementById('customLinkUrl');
  if (urlInput) {
    copyText(urlInput.value, '¡Enlace personalizado copiado!');
  }
};

// ==========================================================================
// UTILIDADES: COPIAR AL PORTAPAPELES Y TOAST NOTIFICATIONS
// ==========================================================================
window.copyText = function(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || '¡Copiado con éxito!');
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
};

function fallbackCopy(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMsg || '¡Copiado con éxito!');
  } catch (err) {
    alert('Texto: ' + text);
  }
  document.body.removeChild(textArea);
}

function showToast(message) {
  const toast = document.getElementById('weddingToast');
  const toastMsg = document.getElementById('toastMessage');
  if (!toast) return;

  if (toastMsg) toastMsg.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}
