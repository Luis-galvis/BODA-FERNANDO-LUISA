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

async function main() {
  console.log('Conectando a WhatsApp para leer historial de confirmaciones...');

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['Boda Fernando & Luisa Reader', 'Chrome', '1.0.0'],
    syncFullHistory: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  let historyReceived = false;
  const foundConfirmations = [];

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ Conexión establecida con WhatsApp (+57 ' + sock.user.id.split(':')[0] + ')');
      console.log('Esperando sincronización de chats y mensajes...');
    }
  });

  sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => {
    console.log(`📥 Historial recibido: ${messages.length} mensajes, ${chats.length} chats.`);
    historyReceived = true;

    for (const msg of messages) {
      processMessage(msg);
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    for (const msg of messages) {
      processMessage(msg);
    }
  });

  function processMessage(msg) {
    if (!msg.message) return;
    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 msg.message.imageMessage?.caption || '';
    
    if (!text) return;

    const from = msg.key.remoteJid;
    if (!from || from.includes('@g.us') || msg.key.fromMe) return;

    const phone = from.replace('@s.whatsapp.net', '').replace(/^57/, '');
    const matchedGuest = GUESTS.find(g => g.phone && g.phone.replace(/\D/g, '') === phone);

    const isRSVP = text.toLowerCase().includes('confirmaci') || 
                   text.toLowerCase().includes('asistir') || 
                   text.toLowerCase().includes('asistencia') || 
                   text.toLowerCase().includes('boda') ||
                   text.toLowerCase().includes('felicidades') ||
                   text.toLowerCase().includes('gracias') ||
                   text.toLowerCase().includes('bendic') ||
                   text.toLowerCase().includes('acompañar');

    if (matchedGuest || isRSVP) {
      const entry = {
        name: matchedGuest ? matchedGuest.name : 'Desconocido',
        phone: phone,
        guestId: matchedGuest ? matchedGuest.id : null,
        passes: matchedGuest ? matchedGuest.passes : null,
        text: text,
        timestamp: new Date((msg.messageTimestamp || Date.now()/1000) * 1000).toISOString()
      };

      const exists = foundConfirmations.some(x => x.phone === entry.phone && x.text === entry.text);
      if (!exists) {
        foundConfirmations.push(entry);
        console.log(`\n💬 MENSAJE DE: ${entry.name} (${entry.phone})`);
        console.log(`📅 Fecha: ${entry.timestamp}`);
        console.log(`📝 Texto: ${entry.text}`);
      }
    }
  }

  // Esperar 15 segundos para recibir todo
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL DE MENSAJES/RESPUESTAS DETECTADAS: ${foundConfirmations.length}`);
  console.log('='.repeat(60));

  fs.writeFileSync(
    path.join(__dirname, 'mensajes_whatsapp_extraidos.json'), 
    JSON.stringify(foundConfirmations, null, 2), 
    'utf-8'
  );

  console.log('Archivo guardado en bot_envio/mensajes_whatsapp_extraidos.json');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
