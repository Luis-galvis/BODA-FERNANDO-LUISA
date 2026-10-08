import { 
  makeWASocket, 
  useMultiFileAuthState, 
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
import { GUESTS } from '../data/guests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, 'auth_qr_ia');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const PORT = 3006;

// Limpiar sesión anterior para forzar generación de QR limpio
if (fs.existsSync(SESSION_DIR)) {
  fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SESSION_DIR, { recursive: true });

const State = {
  status: 'generando_qr', // generando_qr, qr_listo, conectado, procesando_ia, completado
  qrString: null,
  qrDataUrl: null,
  phone: null,
  logs: [],
  historyCount: 0,
  results: []
};

function addLog(msg) {
  const time = new Date().toLocaleTimeString('es-CO');
  const line = `[${time}] ${msg}`;
  State.logs.unshift(line);
  if (State.logs.length > 200) State.logs.pop();
  console.log(line);
}

const collectedMessages = new Map(); // phone -> array of messages

async function analyzeWithGroqAI(guestName, phone, passes, messagesList) {
  const conversationText = messagesList.map(m => `[${m.time}] ${m.fromMe ? 'Novios' : guestName}: ${m.text}`).join('\n');
  
  const prompt = `Eres el asistente oficial de confirmaciones de la boda de Fernando & Luisa Fernanda.
Analiza la siguiente conversación de WhatsApp con el invitado "${guestName}" (Teléfono: +57 ${phone}, Cupos asignados: ${passes} pases).

Conversación:
"""
${conversationText}
"""

Determina con total certeza si el invitado ha CONFIRMADO su asistencia (por ejemplo dijo que sí asiste, envió felicitaciones con confirmación, confirmó cupos, etc.), si ha DECLINADO (dijo que no puede ir), o si aún está PENDIENTE (solo saludó, preguntó algo sin confirmar, o no hay respuesta clara de asistencia).

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "status": "CONFIRMED" | "DECLINED" | "PENDING",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reason": "Explicación clara de por qué",
  "confirmedPasses": ${passes},
  "guestMessage": "Texto de felicitación o mensaje de confirmación del invitado"
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Eres un clasificador riguroso de confirmaciones de boda.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      return JSON.parse(data.choices[0].message.content);
    }
  } catch (err) {
    console.error(`Error Groq AI para ${guestName}:`, err.message);
  }
  return null;
}

// Servidor Web local en puerto 3006 para ver y escanear el QR cómodamente
const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(State));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Escáner Inteligente con IA • Boda Fernando & Luisa</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f5; color: #2c3821; margin: 0; padding: 24px; display: flex; flex-direction: column; align-items: center; }
    .card { background: #fff; border: 1.5px solid #d4c194; border-radius: 16px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; }
    h1 { color: #3a472c; margin-top: 0; font-size: 1.6rem; }
    p { color: #666; font-size: 0.95rem; line-height: 1.5; }
    .qr-box { background: #fff; padding: 16px; border: 2px dashed #c5a059; border-radius: 12px; display: inline-block; margin: 20px 0; }
    .qr-img { width: 280px; height: 280px; display: block; }
    .status-badge { display: inline-block; padding: 8px 18px; border-radius: 30px; font-weight: bold; font-size: 0.85rem; margin-top: 10px; }
    .st-qr { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
    .st-conn { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .st-ai { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; font-size: 0.85rem; }
    .results-table th, .results-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .results-table th { background: #3a472c; color: #fff; }
    .tag-conf { background: #e8f5e9; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-weight: bold; }
    .tag-decl { background: #ffebee; color: #c62828; padding: 3px 8px; border-radius: 12px; font-weight: bold; }
    .tag-pend { background: #fff3e0; color: #ef6c00; padding: 3px 8px; border-radius: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>💍 Escáner de Confirmaciones con IA</h1>
    <p>Escanea este código QR desde el WhatsApp de los novios (<strong>Ajustes > Dispositivos vinculados</strong>) para que la IA lea y clasifique todo el historial de confirmaciones.</p>
    
    <div id="qrArea">
      <div class="qr-box">
        <img id="qrImg" class="qr-img" src="${State.qrDataUrl || ''}" alt="Código QR WhatsApp">
      </div>
    </div>

    <div id="statusBadge" class="status-badge st-qr">Esperando escaneo QR...</div>
    <div id="resultsArea" style="margin-top: 24px;"></div>
  </div>

  <script>
    setInterval(async () => {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        const badge = document.getElementById('statusBadge');
        const qrArea = document.getElementById('qrArea');
        const qrImg = document.getElementById('qrImg');
        const resultsArea = document.getElementById('resultsArea');

        if (data.status === 'qr_listo' && data.qrDataUrl) {
          qrImg.src = data.qrDataUrl;
          badge.className = 'status-badge st-qr';
          badge.textContent = '📱 Código QR Listo • Escanea ahora con tu WhatsApp';
        } else if (data.status === 'conectado') {
          qrArea.style.display = 'none';
          badge.className = 'status-badge st-conn';
          badge.textContent = '✅ WhatsApp Conectado (+57 ' + (data.phone || '') + ') • Sincronizando historial (' + data.historyCount + ' msgs)...';
        } else if (data.status === 'procesando_ia') {
          qrArea.style.display = 'none';
          badge.className = 'status-badge st-ai';
          badge.textContent = '🧠 Analizando conversaciones con IA de Groq (GPT-OSS-120B)...';
        } else if (data.status === 'completado') {
          qrArea.style.display = 'none';
          badge.className = 'status-badge st-conn';
          badge.textContent = '🎉 ¡Análisis Completo! Confirmaciones procesadas con éxito.';

          if (data.results && data.results.length) {
            let html = '<h3 style="color: #3a472c; margin-bottom: 8px;">Resultados Verificados por IA:</h3>';
            html += '<table class="results-table"><thead><tr><th>Invitado</th><th>Pases</th><th>Estado IA</th><th>Mensaje / Razón</th></tr></thead><tbody>';
            data.results.forEach(r => {
              const tagClass = r.aiStatus === 'CONFIRMED' ? 'tag-conf' : (r.aiStatus === 'DECLINED' ? 'tag-decl' : 'tag-pend');
              html += '<tr><td><strong>' + r.name + '</strong><br><small style="color:#777;">+57 ' + r.phone + '</small></td><td>' + r.passes + '</td><td><span class="' + tagClass + '">' + r.aiStatus + '</span></td><td><em>\"' + (r.guestMessage || r.reason) + '\"</em></td></tr>';
            });
            html += '</tbody></table>';
            resultsArea.innerHTML = html;
          }
        }
      } catch(e) {}
    }, 1500);
  </script>
</body>
</html>
  `);
});

server.listen(PORT, () => {
  addLog(`Servidor web de escaneo QR activo en: http://localhost:${PORT}`);
});

async function runBaileysScanner() {
  addLog('Iniciando sesión limpia de Baileys para emparejamiento nuevo...');

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['Boda Fernando & Luisa AI', 'Chrome', '1.0.0'],
    syncFullHistory: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;

    if (qr) {
      State.status = 'qr_listo';
      State.qrString = qr;
      State.qrDataUrl = await QRCode.toDataURL(qr);
      addLog('====================================================');
      addLog('📲 CÓDIGO QR GENERADO - ESCANEA EN TU CELULAR:');
      addLog('====================================================');
      qrcodeTerminal.generate(qr, { small: true });
      addLog(`👉 También puedes abrir en tu navegador: http://localhost:${PORT}`);
    }

    if (connection === 'open') {
      const myNumber = sock.user.id.split(':')[0];
      State.status = 'conectado';
      State.phone = myNumber;
      addLog(`✅ WhatsApp Vinculado Exitosamente con +57 ${myNumber}!`);
      addLog('📡 Recibiendo sincronización limpia de historial y chats...');
    }
  });

  function extractText(m) {
    return m.conversation || 
           m.extendedTextMessage?.text || 
           m.imageMessage?.caption || 
           m.videoMessage?.caption || 
           m.buttonsResponseMessage?.selectedDisplayText || 
           m.templateButtonReplyMessage?.selectedDisplayText || '';
  }

  function handleMessage(msg) {
    if (!msg.message) return;
    const text = extractText(msg.message);
    if (!text) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid.includes('@g.us') || jid.includes('status@broadcast')) return;

    const rawPhone = jid.replace('@s.whatsapp.net', '').replace(/^57/, '');
    const matchedGuest = GUESTS.find(g => g.phone && g.phone.replace(/\D/g, '') === rawPhone);
    const phoneKey = matchedGuest ? matchedGuest.phone : rawPhone;

    if (!collectedMessages.has(phoneKey)) {
      collectedMessages.set(phoneKey, []);
    }

    const time = new Date((msg.messageTimestamp || Date.now()/1000) * 1000).toLocaleString('es-CO');
    const msgObj = {
      fromMe: Boolean(msg.key.fromMe),
      text: text,
      time: time,
      timestamp: msg.messageTimestamp || Date.now()/1000
    };

    const list = collectedMessages.get(phoneKey);
    const isDup = list.some(x => x.text === text && Math.abs(x.timestamp - msgObj.timestamp) < 5);
    if (!isDup) {
      list.push(msgObj);
      State.historyCount++;
      if (!msgObj.fromMe) {
        addLog(`📩 Mensaje de ${matchedGuest ? matchedGuest.name : phoneKey}: "${text}"`);
      }
    }
  }

  sock.ev.on('messaging-history.set', ({ messages }) => {
    if (messages && messages.length) {
      addLog(`📦 Recibido lote de ${messages.length} mensajes históricos`);
      messages.forEach(handleMessage);
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    if (messages) {
      messages.forEach(handleMessage);
    }
  });

  // Esperar a que se conecte
  while (State.status !== 'conectado') {
    await new Promise(r => setTimeout(r, 1000));
  }

  // Esperar 25 segundos después de conectar para absorber todo el historial de chats
  addLog('⏳ Esperando 25 segundos para completar la sincronización de todos los chats...');
  await new Promise(r => setTimeout(r, 25000));

  State.status = 'procesando_ia';
  addLog('🧠 PROCESANDO CON INTELIGENCIA ARTIFICIAL (GROQ AI - GPT-OSS-120B)...');

  const finalResults = [];
  const autoStatuses = {};
  const autoRsvpConfirmations = [];

  for (const guest of GUESTS) {
    const p = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const msgs = collectedMessages.get(p) || collectedMessages.get(guest.phone) || [];
    const guestIncoming = msgs.filter(m => !m.fromMe);

    if (guestIncoming.length > 0) {
      addLog(`🔍 Analizando conversación con: ${guest.name} (${guest.phone}) - ${guestIncoming.length} mensaje(s)`);
      const aiVerdict = await analyzeWithGroqAI(guest.name, guest.phone, guest.passes, msgs);

      if (aiVerdict) {
        addLog(`   👉 Dictamen: ${aiVerdict.status} (${aiVerdict.confidence}) | ${aiVerdict.reason}`);
        
        finalResults.push({
          guestId: guest.id,
          name: guest.name,
          phone: guest.phone,
          passes: guest.passes,
          aiStatus: aiVerdict.status,
          confidence: aiVerdict.confidence,
          reason: aiVerdict.reason,
          guestMessage: aiVerdict.guestMessage || guestIncoming[guestIncoming.length - 1].text
        });

        if (aiVerdict.status === 'CONFIRMED') {
          autoStatuses[guest.id] = 'confirmed';
          autoRsvpConfirmations.push({
            name: guest.name,
            attendance: 'si',
            statusText: '¡Sí, asistiré con mucha alegría!',
            message: aiVerdict.guestMessage || 'Confirmado por WhatsApp',
            date: new Date().toISOString()
          });
        } else if (aiVerdict.status === 'DECLINED') {
          autoStatuses[guest.id] = 'declined';
          autoRsvpConfirmations.push({
            name: guest.name,
            attendance: 'no',
            statusText: 'Lamentablemente no podré asistir',
            message: aiVerdict.guestMessage || 'Declinó por WhatsApp',
            date: new Date().toISOString()
          });
        }
      }
    }
  }

  State.results = finalResults;
  State.status = 'completado';

  // Guardar archivo de resultados
  fs.writeFileSync(
    path.join(__dirname, 'confirmaciones_ia_verificadas.json'),
    JSON.stringify(finalResults, null, 2),
    'utf-8'
  );

  // Actualizar automáticamente el archivo de respaldo para novios.html
  const backupData = {
    wedding_guest_rsvp_statuses: autoStatuses,
    wedding_rsvp_confirmations: autoRsvpConfirmations,
    exportedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, '../respaldo_confirmaciones_ayer.json'),
    JSON.stringify(backupData, null, 2),
    'utf-8'
  );

  addLog('====================================================');
  addLog(`🎉 ANÁLISIS IA COMPLETADO:`);
  addLog(`✅ Confirmados reales: ${autoRsvpConfirmations.filter(x => x.attendance === 'si').length}`);
  addLog(`❌ Declinados: ${autoRsvpConfirmations.filter(x => x.attendance === 'no').length}`);
  addLog(`💾 Archivo de respaldo actualizado: respaldo_confirmaciones_ayer.json`);
  addLog('====================================================');
}

runBaileysScanner().catch(err => {
  console.error('Error:', err);
});
