import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore 
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Cargar lista oficial de invitados
import { GUESTS } from '../data/guests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3005;
const SESSION_DIR = path.join(__dirname, 'auth_baileys');
const ENVIADOS_FILE = path.join(__dirname, 'enviados.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Estado global del bot
const BotState = {
  sock: null,
  status: 'disconnected', // 'qr', 'connected', 'disconnected'
  qrString: null,
  qrDataUrl: null,
  myPhone: null,
  isSendingAll: false,
  shouldStop: false,
  logs: []
};

function addLog(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('es-CO');
  const entry = `[${time}] ${msg}`;
  BotState.logs.unshift(entry);
  if (BotState.logs.length > 200) BotState.logs.pop();
  console.log(entry);
}

// Persistencia de enviados
function getEnviados() {
  try {
    if (fs.existsSync(ENVIADOS_FILE)) {
      return JSON.parse(fs.readFileSync(ENVIADOS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error leyendo enviados.json:', e);
  }
  return [];
}

function saveEnviado(id, name, phone) {
  try {
    const list = getEnviados();
    if (!list.includes(id)) {
      list.push(id);
      fs.writeFileSync(ENVIADOS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Error guardando enviado:', e);
  }
}

function buildMessage(guestName, passes = 1, slug = '') {
  const numPasses = parseInt(passes, 10) || 1;
  const passesText = numPasses > 1 
    ? `(tu invitación está reservada para *${numPasses} personas*)` 
    : `(tu invitación está reservada para *1 persona*)`;
  
  const cardLink = slug 
    ? `https://boda-fernando-luisa.vercel.app/index.html?invitado=${slug}`
    : `https://boda-fernando-luisa.vercel.app/`;

  return `¡Hola *${guestName}*!\n\n` +
    `Estamos muy emocionados de compartir este día tan especial contigo. Queremos asegurarnos de que tu lugar esté reservado ${passesText}, así que nos encantaría saber si podrías acompañarnos.\n\n` +
    `¿Podrías confirmar tu asistencia antes del 13 de Octubre? Tu presencia hará que este día sea aún más especial.\n\n` +
    `Puedes conocer todos los detalles de la boda y confirmar aquí en tu tarjeta interactiva:\n` +
    `${cardLink}\n\n` +
    `Con todo nuestro cariño,\n` +
    `— *Fernando & Luisa Fernanda*`;
}

function formatJid(phone) {
  if (!phone) return null;
  const clean = phone.toString().replace(/\D/g, '');
  if (!clean) return null;
  const intl = clean.startsWith('57') ? clean : `57${clean}`;
  return `${intl}@s.whatsapp.net`;
}

// Iniciar conexión con Baileys
async function initBaileys() {
  addLog('Iniciando cliente de WhatsApp Baileys...');
  
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['Boda Fernando & Luisa', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    logger: pino({ level: 'silent' }),
  });

  BotState.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      BotState.status = 'qr';
      BotState.qrString = qr;
      BotState.myPhone = null;
      try {
        BotState.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
      } catch (err) {
        console.error('Error generando QR DataURL:', err);
      }

      addLog('📲 Nuevo código QR generado. Escanéalo en pantalla o en el navegador.');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      BotState.status = 'disconnected';
      BotState.qrDataUrl = null;
      BotState.myPhone = null;
      addLog(`⚠️ Conexión cerrada (Código: ${statusCode}). Reconectando: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(initBaileys, 3000);
      } else {
        addLog('❌ Sesión cerrada desde WhatsApp. Se requiere nuevo escaneo.');
        try {
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        } catch (_) {}
        setTimeout(initBaileys, 3000);
      }
    } else if (connection === 'open') {
      const rawId = sock.user.id.split(':')[0];
      BotState.status = 'connected';
      BotState.qrString = null;
      BotState.qrDataUrl = null;
      BotState.myPhone = rawId;
      addLog(`✅ ¡WHATSAPP VINCULADO EXITOSAMENTE! Número conectado: +${rawId}`);
    }
  });
}

// Función de envío individual
async function sendMessageToJid(jid, text) {
  if (!BotState.sock || BotState.status !== 'connected') {
    throw new Error('WhatsApp no está conectado todavía. Por favor escanea el código QR.');
  }

  // 1. Simular presencia escribiendo (humanizado anti-bloqueo)
  try {
    await BotState.sock.sendPresenceUpdate('composing', jid);
    await sleep(2200);
    await BotState.sock.sendPresenceUpdate('paused', jid);
  } catch (_) {}

  // 2. Enviar mensaje
  await BotState.sock.sendMessage(jid, { text });
}

// Bucle de envío masivo
async function runBulkSender() {
  if (BotState.isSendingAll) return;
  BotState.isSendingAll = true;
  BotState.shouldStop = false;

  const enviados = getEnviados();
  const pending = GUESTS.filter(g => g.phone && g.phone.trim().length > 0 && !enviados.includes(g.id));

  addLog(`🚀 INICIANDO DIFUSIÓN: ${pending.length} invitados pendientes por enviar.`);

  let count = 0;

  for (let i = 0; i < pending.length; i++) {
    if (BotState.shouldStop) {
      addLog('⏸️ Envío masivo pausado por el usuario.');
      break;
    }

    const guest = pending[i];
    const jid = formatJid(guest.phone);

    if (!jid) {
      addLog(`⚠️ Saltando a ${guest.name}: número inválido (${guest.phone})`);
      continue;
    }

    addLog(`💌 [${i + 1}/${pending.length}] Enviando a ${guest.name} (+${jid.replace('@s.whatsapp.net', '')})...`);
    const message = buildMessage(guest.name, guest.passes, guest.slug);

    try {
      await sendMessageToJid(jid, message);
      saveEnviado(guest.id, guest.name, guest.phone);
      count++;
      addLog(`✅ [${i + 1}/${pending.length}] ¡Enviado con éxito a ${guest.name}!`);

      if (i < pending.length - 1 && !BotState.shouldStop) {
        const delay = Math.floor(8 + Math.random() * 5); // 8 a 13 segundos
        addLog(`⏳ Esperando ${delay} segundos antes del siguiente envío (protección anti-spam)...`);
        await sleep(delay * 1000);
      }
    } catch (err) {
      addLog(`❌ Error enviando a ${guest.name}: ${err?.message || err}`);
      await sleep(4000);
    }
  }

  BotState.isSendingAll = false;
  addLog(`🎉 Proceso masivo terminado. Se enviaron ${count} invitaciones en esta tanda.`);
}

// Servidor Web para Interfaz Gráfica
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Endpoint: Estado
  if (url.pathname === '/api/status') {
    const enviados = getEnviados();
    const withPhone = GUESTS.filter(g => g.phone && g.phone.trim().length > 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: BotState.status,
      qrDataUrl: BotState.qrDataUrl,
      myPhone: BotState.myPhone,
      isSendingAll: BotState.isSendingAll,
      totalGuests: GUESTS.length,
      totalWithPhone: withPhone.length,
      sentCount: enviados.length,
      pendingCount: withPhone.length - enviados.filter(id => withPhone.some(g => g.id === id)).length,
      logs: BotState.logs.slice(0, 50)
    }));
  }

  // Endpoint: Lista de invitados
  if (url.pathname === '/api/guests') {
    const enviados = getEnviados();
    const list = GUESTS.map(g => ({
      ...g,
      sent: enviados.includes(g.id),
      sampleMessage: buildMessage(g.name, g.passes, g.slug)
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // Endpoint: Envío de prueba
  if (url.pathname === '/api/send-test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const targetPhone = data.phone || BotState.myPhone;
        const guestName = data.name || 'Invitado de Prueba';
        const passes = data.passes || 2;
        const slug = data.slug || 'prueba';

        const jid = formatJid(targetPhone);
        if (!jid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Número de teléfono inválido' }));
        }

        const msg = buildMessage(guestName, passes, slug);
        addLog(`🧪 Enviando prueba a ${guestName} (+${jid.replace('@s.whatsapp.net', '')})...`);
        await sendMessageToJid(jid, msg);
        addLog(`✅ ¡Prueba enviada con éxito a +${jid.replace('@s.whatsapp.net', '')}!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Mensaje de prueba enviado exitosamente' }));
      } catch (err) {
        addLog(`❌ Error en envío de prueba: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Endpoint: Iniciar masivo
  if (url.pathname === '/api/start-bulk' && req.method === 'POST') {
    if (BotState.status !== 'connected') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'WhatsApp no está conectado aún' }));
    }
    runBulkSender();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // Endpoint: Pausar masivo
  if (url.pathname === '/api/stop-bulk' && req.method === 'POST') {
    BotState.shouldStop = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // Endpoint: Resetear lista de enviados
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    if (fs.existsSync(ENVIADOS_FILE)) {
      fs.unlinkSync(ENVIADOS_FILE);
    }
    addLog('🔄 Historial de enviados restablecido a cero.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // Servir Interfaz Gráfica HTML
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderHtml());
  }

  res.writeHead(404);
  res.end('Not found');
});

function renderHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel de Envío de Invitaciones • Baileys</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --olive-dark: #2c3821;
      --olive-primary: #4b5e39;
      --gold: #c5a059;
      --bg: #f5f4ef;
      --card: #ffffff;
      --border: #e3decb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', sans-serif; background: var(--bg); color: #2d3128; padding: 24px 16px; }
    .container { max-width: 980px; margin: 0 auto; }
    
    header { text-align: center; margin-bottom: 24px; padding: 20px; background: var(--olive-dark); color: #fff; border-radius: 14px; border-bottom: 4px solid var(--gold); }
    header h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; color: #fff; }
    header p { font-size: 0.95rem; color: #dbe4d4; margin-top: 6px; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media(max-width: 768px) { .grid { grid-template-columns: 1fr; } }

    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px; box-shadow: 0 4px 14px rgba(0,0,0,0.04); margin-bottom: 20px; }
    .card-title { font-size: 1.15rem; font-weight: 700; color: var(--olive-dark); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f0ecdf; padding-bottom: 10px; }

    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .badge-yellow { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .badge-green { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .badge-red { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

    .qr-box { text-align: center; padding: 15px; }
    .qr-box img { max-width: 250px; border: 3px solid var(--gold); border-radius: 12px; }

    .form-group { margin-bottom: 14px; }
    label { display: block; font-size: 0.82rem; font-weight: 600; color: #495057; margin-bottom: 5px; }
    input, select { width: 100%; padding: 10px 12px; border: 1px solid #ced4da; border-radius: 8px; font-size: 0.9rem; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 8px; border: none; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: 0.2s; }
    .btn-primary { background: var(--olive-primary); color: #fff; }
    .btn-primary:hover { background: var(--olive-dark); }
    .btn-gold { background: var(--gold); color: #fff; }
    .btn-danger { background: #dc3545; color: #fff; }

    .preview-bubble { background: #eef5e8; border: 1px solid #cce1bf; border-radius: 10px; padding: 14px; font-size: 0.82rem; line-height: 1.45; white-space: pre-wrap; color: #1e3314; margin-top: 10px; }

    .stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat-box { flex: 1; background: #faf9f5; border: 1px solid var(--border); border-radius: 8px; padding: 12px; text-align: center; }
    .stat-num { font-size: 1.5rem; font-weight: 700; color: var(--olive-dark); }
    .stat-label { font-size: 0.75rem; color: #6c757d; }

    .terminal-box { background: #1a1e16; color: #a3e635; font-family: monospace; font-size: 0.78rem; padding: 14px; border-radius: 10px; max-height: 220px; overflow-y: auto; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>💍 Bot de Envío de Invitaciones de Boda</h1>
      <p>Envío automático y seguro vía WhatsApp • Fernando & Luisa Fernanda</p>
    </header>

    <div class="grid">
      <!-- Tarjeta 1: Conexión con WhatsApp -->
      <div class="card">
        <div class="card-title">📱 1. Conexión de tu WhatsApp</div>
        <div id="connStatusArea" style="text-align: center;">
          <p style="color: #666; font-size: 0.9rem;">Cargando estado...</p>
        </div>

        <div id="qrArea" class="qr-box" style="display: none;">
          <p style="font-size: 0.85rem; color: #555; margin-bottom: 12px;">
            Abre WhatsApp en tu celular (<strong>315 9649395</strong>) &gt; Dispositivos vinculados &gt; Vincular un dispositivo y escanea este código:
          </p>
          <img id="qrImage" src="" alt="Código QR WhatsApp">
          <p style="font-size: 0.75rem; color: #888; margin-top: 8px;">El código se actualiza automáticamente.</p>
        </div>

        <div id="connectedArea" style="display: none; text-align: center; padding: 16px;">
          <div class="badge badge-green" style="font-size: 1rem; padding: 10px 18px; margin-bottom: 10px;">
            ✅ VINCULADO CORRECTAMENTE
          </div>
          <p style="font-size: 0.9rem; color: #333;">
            Conectado desde el número: <strong id="lblPhone">+57 ...</strong>
          </p>
          <p style="font-size: 0.78rem; color: #666; margin-top: 6px;">
            Los mensajes de la boda se enviarán directamente desde este número.
          </p>
        </div>
      </div>

      <!-- Tarjeta 2: Prueba de Envío -->
      <div class="card">
        <div class="card-title">🧪 2. Prueba de Envío (1 Mensaje)</div>
        <p style="font-size: 0.8rem; color: #666; margin-bottom: 12px;">
          Envía una invitación de prueba a cualquier número (por ejemplo, a tu propio celular) para que confirmes que llega perfecta.
        </p>

        <div class="form-group">
          <label>Número de WhatsApp para la prueba (con o sin 57):</label>
          <input type="text" id="testPhone" value="3159649395" placeholder="Ej: 3159649395">
        </div>

        <div class="form-group">
          <label>Nombre ficticio para la prueba:</label>
          <input type="text" id="testName" value="Familia de Prueba">
        </div>

        <div class="form-group">
          <label>Pases para la prueba:</label>
          <select id="testPasses">
            <option value="2">2 personas</option>
            <option value="1">1 persona</option>
            <option value="3">3 personas</option>
            <option value="4">4 personas</option>
          </select>
        </div>

        <button class="btn btn-gold" onclick="sendTestMessage()" id="btnSendTest">
          🚀 Enviar Mensaje de Prueba
        </button>
      </div>
    </div>

    <!-- Tarjeta 3: Envío Masivo a Todos los Invitados -->
    <div class="card">
      <div class="card-title">🚀 3. Envío Masivo a los 52 Invitados</div>
      
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-num" id="statTotal">52</div>
          <div class="stat-label">Total Invitados</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" id="statWithPhone">--</div>
          <div class="stat-label">Con Teléfono</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" id="statSent" style="color: #2e7d32;">0</div>
          <div class="stat-label">Enviados</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" id="statPending" style="color: #d97706;">0</div>
          <div class="stat-label">Pendientes</div>
        </div>
      </div>

      <p style="font-size: 0.8rem; color: #666; margin-bottom: 14px;">
        💡 El bot envía con pausas inteligentes de <strong>8 a 13 segundos</strong> entre invitado e invitado para proteger tu número contra bloqueos de WhatsApp.
      </p>

      <div style="display: flex; gap: 12px;">
        <button class="btn btn-primary" id="btnStartBulk" onclick="startBulk()">
          💌 Iniciar Envío a Todos los Pendientes
        </button>
        <button class="btn btn-danger" id="btnStopBulk" onclick="stopBulk()" style="display: none; width: 180px;">
          ⏸️ Pausar
        </button>
        <button class="btn" style="width: 180px; background: #e2e8f0; color: #333;" onclick="resetList()">
          🔄 Reiniciar Lista
        </button>
      </div>
    </div>

    <!-- Tarjeta 4: Registro en Vivo -->
    <div class="card">
      <div class="card-title">📋 Registro de Actividad en Vivo</div>
      <div class="terminal-box" id="terminalLogs">
        Esperando actividad...
      </div>
    </div>
  </div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        const qrArea = document.getElementById('qrArea');
        const connectedArea = document.getElementById('connectedArea');
        const connStatusArea = document.getElementById('connStatusArea');
        const btnStartBulk = document.getElementById('btnStartBulk');
        const btnStopBulk = document.getElementById('btnStopBulk');

        document.getElementById('statTotal').textContent = data.totalGuests;
        document.getElementById('statWithPhone').textContent = data.totalWithPhone;
        document.getElementById('statSent').textContent = data.sentCount;
        document.getElementById('statPending').textContent = data.pendingCount;

        if (data.status === 'connected') {
          connStatusArea.style.display = 'none';
          qrArea.style.display = 'none';
          connectedArea.style.display = 'block';
          document.getElementById('lblPhone').textContent = '+' + data.myPhone;
          if (!document.getElementById('testPhone').dataset.userEdited) {
            document.getElementById('testPhone').value = data.myPhone;
          }
        } else if (data.status === 'qr' && data.qrDataUrl) {
          connStatusArea.style.display = 'none';
          connectedArea.style.display = 'none';
          qrArea.style.display = 'block';
          document.getElementById('qrImage').src = data.qrDataUrl;
        } else {
          qrArea.style.display = 'none';
          connectedArea.style.display = 'none';
          connStatusArea.style.display = 'block';
          connStatusArea.innerHTML = '<span class="badge badge-yellow">Generando código QR...</span>';
        }

        if (data.isSendingAll) {
          btnStartBulk.disabled = true;
          btnStartBulk.textContent = '⏳ Enviando masivo en progreso...';
          btnStopBulk.style.display = 'inline-flex';
        } else {
          btnStartBulk.disabled = (data.status !== 'connected');
          btnStartBulk.textContent = '💌 Iniciar Envío a Todos los Pendientes';
          btnStopBulk.style.display = 'none';
        }

        if (data.logs && data.logs.length > 0) {
          document.getElementById('terminalLogs').innerHTML = data.logs.join('<br>');
        }
      } catch (err) {
        console.warn('Error fetching status:', err);
      }
    }

    document.getElementById('testPhone').addEventListener('input', () => {
      document.getElementById('testPhone').dataset.userEdited = 'true';
    });

    async function sendTestMessage() {
      const phone = document.getElementById('testPhone').value.trim();
      const name = document.getElementById('testName').value.trim();
      const passes = document.getElementById('testPasses').value;

      if (!phone) { alert('Ingresa un número de WhatsApp para la prueba'); return; }

      const btn = document.getElementById('btnSendTest');
      btn.disabled = true;
      btn.textContent = 'Enviando prueba...';

      try {
        const res = await fetch('/api/send-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, passes, slug: 'prueba' })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ¡Mensaje de prueba enviado exitosamente a ' + phone + '! Revisa tu WhatsApp.');
        } else {
          alert('❌ Error: ' + (data.error || 'No se pudo enviar'));
        }
      } catch (e) {
        alert('Error de conexión: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Enviar Mensaje de Prueba';
      }
    }

    async function startBulk() {
      if (!confirm('¿Estás seguro de iniciar el envío masivo de invitaciones a todos los invitados pendientes?')) return;
      await fetch('/api/start-bulk', { method: 'POST' });
      updateStatus();
    }

    async function stopBulk() {
      await fetch('/api/stop-bulk', { method: 'POST' });
      updateStatus();
    }

    async function resetList() {
      if (!confirm('¿Quieres reiniciar la lista de enviados? Esto permitirá volver a enviar a todos los invitados.')) return;
      await fetch('/api/reset', { method: 'POST' });
      updateStatus();
    }

    setInterval(updateStatus, 2000);
    updateStatus();
  </script>
</body>
</html>`;
}

// Iniciar servidor web y bot
server.listen(PORT, () => {
  addLog(`🌐 Panel gráfico abierto en: http://localhost:${PORT}`);
  
  // Abrir automáticamente el navegador en Windows
  exec(`start http://localhost:${PORT}`);
  
  // Iniciar conexión Baileys
  initBaileys().catch(err => {
    addLog(`Error fatal iniciando Baileys: ${err.message}`, 'error');
  });
});
