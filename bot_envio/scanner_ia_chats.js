import { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GUESTS } from '../data/guests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, 'auth_baileys');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const collectedMessages = new Map(); // phone -> array of messages

async function analyzeWithGroqAI(guestName, phone, passes, messagesList) {
  const conversationText = messagesList.map(m => `[${m.time}] ${m.fromMe ? 'Novios' : guestName}: ${m.text}`).join('\n');
  
  const prompt = `Eres el asistente de confirmaciones de la boda de Fernando & Luisa Fernanda.
Analiza la siguiente conversación de WhatsApp con el invitado "${guestName}" (Teléfono: +57 ${phone}, Cupos asignados: ${passes} pases).

Conversación:
"""
${conversationText}
"""

Determina con precisión si el invitado ha CONFIRMADO su asistencia, ha DECLINADO (no asiste), o si aún está PENDIENTE/solo saludó/hizo una pregunta sin confirmar explícitamente.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "status": "CONFIRMED" | "DECLINED" | "PENDING",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reason": "Explicación breve de por qué",
  "confirmedPasses": ${passes},
  "guestMessage": "Texto de felicitación o respuesta más representativo del invitado"
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
          { role: 'system', content: 'Eres un analizador riguroso de confirmaciones de eventos.' },
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

async function startScanner() {
  console.log('🤖 Iniciando Escáner Inteligente con Baileys + Groq AI...');

  if (!fs.existsSync(SESSION_DIR)) {
    console.error('❌ No se encontró la carpeta de sesión auth_baileys');
    process.exit(1);
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
    syncFullHistory: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'open') {
      console.log('✅ Conexión establecida con WhatsApp (+57 ' + sock.user.id.split(':')[0] + ')');
      console.log('📡 Escaneando mensajes e historial de chats recibidos...');
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
      if (!msgObj.fromMe) {
        console.log(`📩 Mensaje recibido de ${matchedGuest ? matchedGuest.name : phoneKey}: "${text}"`);
      }
    }
  }

  sock.ev.on('messaging-history.set', ({ messages }) => {
    if (messages && messages.length) {
      console.log(`📦 Sincronizados ${messages.length} mensajes históricos de WhatsApp`);
      messages.forEach(handleMessage);
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    if (messages) {
      messages.forEach(handleMessage);
    }
  });

  // Esperar 20 segundos para recibir toda la sincronización
  console.log('⏳ Esperando 20 segundos para recibir todos los chats...');
  await new Promise(r => setTimeout(r, 20000));

  console.log('\n' + '='.repeat(70));
  console.log(`🧠 PROCESANDO CON INTELIGENCIA ARTIFICIAL (GROQ AI - GPT-OSS-120B)...`);
  console.log('='.repeat(70));

  const results = [];

  for (const guest of GUESTS) {
    const p = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const msgs = collectedMessages.get(p) || collectedMessages.get(guest.phone) || [];
    
    // Filtrar solo si hay mensajes entrantes de este invitado
    const guestIncoming = msgs.filter(m => !m.fromMe);

    if (guestIncoming.length > 0) {
      console.log(`\n🔍 Analizando con IA a: ${guest.name} (${guest.phone}) - ${guestIncoming.length} mensaje(s)`);
      const aiVerdict = await analyzeWithGroqAI(guest.name, guest.phone, guest.passes, msgs);
      
      if (aiVerdict) {
        console.log(`   👉 Dictamen IA: ${aiVerdict.status} (${aiVerdict.confidence}) - Razón: ${aiVerdict.reason}`);
        results.push({
          guestId: guest.id,
          name: guest.name,
          phone: guest.phone,
          passes: guest.passes,
          aiStatus: aiVerdict.status,
          confidence: aiVerdict.confidence,
          reason: aiVerdict.reason,
          confirmedPasses: aiVerdict.status === 'CONFIRMED' ? guest.passes : 0,
          guestMessage: aiVerdict.guestMessage || guestIncoming[guestIncoming.length - 1].text,
          rawMessages: msgs
        });
      }
    }
  }

  const confirmedList = results.filter(r => r.aiStatus === 'CONFIRMED');
  const declinedList = results.filter(r => r.aiStatus === 'DECLINED');

  console.log('\n' + '='.repeat(70));
  console.log(`📊 REPORTE FINAL DE IA DE CONFIRMACIONES DE WHATSAPP`);
  console.log('='.repeat(70));
  console.log(`✅ TOTAL CONFIRMADOS POR IA: ${confirmedList.length}`);
  confirmedList.forEach(c => console.log(`  - [ID ${c.guestId}] ${c.name} (${c.passes} pases): "${c.guestMessage}" (${c.reason})`));

  console.log(`\n❌ TOTAL DECLINADOS: ${declinedList.length}`);
  declinedList.forEach(d => console.log(`  - [ID ${d.guestId}] ${d.name}: "${d.guestMessage}"`));

  fs.writeFileSync(
    path.join(__dirname, 'analisis_ia_whatsapp.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log('\n💾 Resultados guardados en bot_envio/analisis_ia_whatsapp.json');
  process.exit(0);
}

startScanner().catch(err => {
  console.error('Error en escáner IA:', err);
  process.exit(1);
});
