import { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore,
  Browsers 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GUESTS } from '../data/guests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, 'auth_code_ia');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const PHONE_NUMBER = process.argv[2] || '573159649395';

if (fs.existsSync(SESSION_DIR)) {
  fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SESSION_DIR, { recursive: true });

const collectedMessages = new Map();

async function analyzeWithGroqAI(guestName, phone, passes, messagesList) {
  const conversationText = messagesList.map(m => `[${m.time}] ${m.fromMe ? 'Novios' : guestName}: ${m.text}`).join('\n');
  
  const prompt = `Eres el asistente oficial de confirmaciones de la boda de Fernando & Luisa Fernanda.
Analiza la siguiente conversación de WhatsApp con el invitado "${guestName}" (Teléfono: +57 ${phone}, Cupos asignados: ${passes} pases).

Conversación:
"""
${conversationText}
"""

Determina con total certeza si el invitado ha CONFIRMADO su asistencia, si ha DECLINADO (no asiste), o si aún está PENDIENTE (solo saludó, preguntó algo sin confirmar, o no hay confirmación explícita).

Responde ÚNICAMENTE en formato JSON:
{
  "status": "CONFIRMED" | "DECLINED" | "PENDING",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reason": "Explicación breve",
  "confirmedPasses": ${passes},
  "guestMessage": "Texto de felicitación o respuesta del invitado"
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

async function main() {
  console.log(`Iniciando vinculación por código para el número: +${PHONE_NUMBER}...`);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  let connected = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    if (connection === 'open') {
      connected = true;
      console.log(`\n🎉 ¡CONEXIÓN EXITOSA CON WHATSAPP! (+${sock.user.id.split(':')[0]})`);
      console.log('📡 Sincronizando historial de mensajes desde el celular...');
    }
  });

  function extractText(m) {
    return m.conversation || 
           m.extendedTextMessage?.text || 
           m.imageMessage?.caption || 
           m.videoMessage?.caption || '';
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
      if (!msgObj.fromMe) {
        console.log(`📩 Mensaje de ${matchedGuest ? matchedGuest.name : phoneKey}: "${text}"`);
      }
    }
  }

  sock.ev.on('messaging-history.set', ({ messages }) => {
    if (messages && messages.length) {
      console.log(`📦 Recibido lote de ${messages.length} mensajes históricos`);
      messages.forEach(handleMessage);
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    if (messages) {
      messages.forEach(handleMessage);
    }
  });

  // Pedir código de emparejamiento
  await new Promise(r => setTimeout(r, 2000));
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log('\n' + '='.repeat(50));
      console.log(`🔑 CÓDIGO DE EMPAREJAMIENTO DE WHATSAPP:`);
      console.log(`👉  ${code.slice(0, 4)}-${code.slice(4)}  👈`);
      console.log('='.repeat(50));
      console.log('Instrucciones en el celular:');
      console.log('1. Abre WhatsApp > Ajustes > Dispositivos vinculados');
      console.log('2. Toca "Vincular un dispositivo"');
      console.log('3. Toca abajo "Vincular con el número de teléfono"');
      console.log(`4. Escribe este código: ${code.slice(0, 4)}-${code.slice(4)}\n`);
    } catch (err) {
      console.error('Error al pedir pairing code:', err);
    }
  }

  // Esperar a que se conecte
  while (!connected) {
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('⏳ Esperando 25 segundos para recibir todo el historial de chats...');
  await new Promise(r => setTimeout(r, 25000));

  console.log('\n' + '='.repeat(70));
  console.log('🧠 PROCESANDO HISTORIAL CON INTELIGENCIA ARTIFICIAL (GROQ AI)...');
  console.log('='.repeat(70));

  const finalResults = [];
  const autoStatuses = {};
  const autoRsvpConfirmations = [];

  for (const guest of GUESTS) {
    const p = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const msgs = collectedMessages.get(p) || collectedMessages.get(guest.phone) || [];
    const guestIncoming = msgs.filter(m => !m.fromMe);

    if (guestIncoming.length > 0) {
      console.log(`🔍 Analizando: ${guest.name} (${guest.phone}) - ${guestIncoming.length} mensaje(s)`);
      const aiVerdict = await analyzeWithGroqAI(guest.name, guest.phone, guest.passes, msgs);

      if (aiVerdict) {
        console.log(`   👉 Dictamen: ${aiVerdict.status} (${aiVerdict.confidence}) | ${aiVerdict.reason}`);
        
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

  fs.writeFileSync(
    path.join(__dirname, 'confirmaciones_ia_verificadas.json'),
    JSON.stringify(finalResults, null, 2),
    'utf-8'
  );

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

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 ANÁLISIS IA COMPLETADO:`);
  console.log(`✅ Confirmados reales: ${autoRsvpConfirmations.filter(x => x.attendance === 'si').length}`);
  console.log(`❌ Declinados: ${autoRsvpConfirmations.filter(x => x.attendance === 'no').length}`);
  console.log(`💾 Guardado en respaldo_confirmaciones_ayer.json`);
  console.log('='.repeat(70));

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
