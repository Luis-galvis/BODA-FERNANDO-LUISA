import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore 
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar la lista oficial de invitados
import { GUESTS } from '../data/guests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(__dirname, 'auth_baileys');
const ENVIADOS_FILE = path.join(__dirname, 'enviados.json');

// Helper para pausas
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cargar IDs de invitados ya enviados
function loadEnviados() {
  try {
    if (fs.existsSync(ENVIADOS_FILE)) {
      const data = fs.readFileSync(ENVIADOS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error leyendo enviados.json:', e);
  }
  return [];
}

// Guardar ID enviado
function saveEnviado(id, name, phone) {
  try {
    const list = loadEnviados();
    if (!list.includes(id)) {
      list.push(id);
      fs.writeFileSync(ENVIADOS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Error guardando en enviados.json:', e);
  }
}

// Construir el mensaje de invitación personalizado
function buildMessage(guest) {
  const passesText = guest.passes > 1 
    ? `(tu invitación está reservada para *${guest.passes} personas*)` 
    : `(tu invitación está reservada para *1 persona*)`;
  
  const cardLink = `https://boda-fernando-luisa.vercel.app/index.html?invitado=${guest.slug}`;

  return `¡Hola *${guest.name}*!\n\n` +
    `Estamos muy emocionados de compartir este día tan especial contigo. Queremos asegurarnos de que tu lugar esté reservado ${passesText}, así que nos encantaría saber si podrías acompañarnos.\n\n` +
    `¿Podrías confirmar tu asistencia antes del 13 de Octubre? Tu presencia hará que este día sea aún más especial.\n\n` +
    `Puedes conocer todos los detalles de la boda y confirmar aquí en tu tarjeta interactiva:\n` +
    `${cardLink}\n\n` +
    `Con todo nuestro cariño,\n` +
    `— *Fernando & Luisa Fernanda*`;
}

// Normalizar número telefónico a formato internacional de WhatsApp
function formatJid(phone) {
  if (!phone) return null;
  const clean = phone.toString().replace(/\D/g, '');
  if (!clean) return null;
  const intl = clean.startsWith('57') ? clean : `57${clean}`;
  return `${intl}@s.whatsapp.net`;
}

// Función principal de conexión y envío
async function startBot() {
  console.log('\n=============================================================');
  console.log('💍 BOT DE ENVÍO DE INVITACIONES DE BODA • BAILEYS');
  console.log('👰🤵 Fernando & Luisa Fernanda');
  console.log(`📋 Total de Invitados en la base de datos: ${GUESTS.length}`);
  console.log('=============================================================\n');

  // Argumentos de línea de comandos
  const isTestMode = process.argv.includes('--test');
  const isResetMode = process.argv.includes('--reset');

  if (isResetMode) {
    if (fs.existsSync(ENVIADOS_FILE)) {
      fs.unlinkSync(ENVIADOS_FILE);
      console.log('🔄 Historial de enviados restablecido (enviados.json eliminado).\n');
    }
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

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📲 ESCANEA ESTE CÓDIGO QR CON EL WHATSAPP DESDE DONDE VAS A ENVIAR LAS INVITACIONES:');
      console.log('(Abre WhatsApp en tu celular -> Dispositivos vinculados -> Vincular un dispositivo)\n');
      qrcode.generate(qr, { small: true });
      console.log('\nEsperando escaneo...');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`\n⚠️ Conexión cerrada (Código: ${statusCode}). Reconectando: ${shouldReconnect}...`);
      if (shouldReconnect) {
        startBot();
      } else {
        console.log('❌ Sesión cerrada por el usuario en WhatsApp. Elimina la carpeta auth_baileys para volver a iniciar.');
      }
    } else if (connection === 'open') {
      const myNumber = sock.user.id.split(':')[0];
      console.log(`\n✅ ¡WHATSAPP CONECTADO EXITOSAMENTE!`);
      console.log(`📱 Conectado como: +${myNumber}\n`);

      // Iniciar proceso de envío
      await processGuestList(sock, isTestMode);
    }
  });
}

async function processGuestList(sock, isTestMode) {
  const enviados = loadEnviados();
  console.log(`📊 Invitados previamente enviados: ${enviados.length}`);

  // Filtrar invitados con teléfono
  const guestsWithPhone = GUESTS.filter(g => g.phone && g.phone.trim().length > 0);
  console.log(`📱 Invitados con número de teléfono disponible: ${guestsWithPhone.length} de ${GUESTS.length}`);

  if (isTestMode) {
    console.log('\n🧪 MODO DE PRUEBA ACTIVADO (--test):');
    console.log('Se enviará una invitación de prueba únicamente al primer invitado pendiente para validar el formato.');
  }

  console.log('\n🚀 Iniciando envío automatizado en 5 segundos...');
  await sleep(5000);

  let sentCount = 0;
  let skipCount = 0;

  for (let i = 0; i < guestsWithPhone.length; i++) {
    const guest = guestsWithPhone[i];
    const jid = formatJid(guest.phone);

    if (!jid) {
      console.log(`⚠️ [${i + 1}/${guestsWithPhone.length}] ${guest.name}: Número inválido (${guest.phone}). Saltando...`);
      continue;
    }

    // Verificar si ya fue enviado
    if (enviados.includes(guest.id)) {
      console.log(`⏭️  [${i + 1}/${guestsWithPhone.length}] ${guest.name} ya fue enviado previamente. Saltando.`);
      skipCount++;
      continue;
    }

    console.log(`\n-------------------------------------------------------------`);
    console.log(`💌 [${i + 1}/${guestsWithPhone.length}] Preparando envío para: *${guest.name}*`);
    console.log(`📱 Destino: +${jid.replace('@s.whatsapp.net', '')} (${guest.passes} ${guest.passes === 1 ? 'pase' : 'pases'})`);

    const messageText = buildMessage(guest);

    try {
      // 1. Simular estado "Escribiendo..." durante 2.5 segundos (comportamiento humano anti-spam)
      await sock.sendPresenceUpdate('composing', jid);
      await sleep(2500);
      await sock.sendPresenceUpdate('paused', jid);

      // 2. Enviar mensaje
      await sock.sendMessage(jid, { text: messageText });
      console.log(`✅ ¡ENVIADO CON ÉXITO a ${guest.name}!`);

      // 3. Registrar como enviado
      saveEnviado(guest.id, guest.name, guest.phone);
      sentCount++;

      // Si es modo prueba, terminar después del primero
      if (isTestMode) {
        console.log('\n🧪 Prueba completada exitosamente. Revisa tu WhatsApp para verificar el mensaje recibido.');
        console.log('Para enviar a TODOS los invitados, ejecuta: npm start\n');
        process.exit(0);
      }

      // 4. Pausa humana aleatoria entre 7 y 12 segundos para proteger el número
      const delaySeconds = Math.floor(7 + Math.random() * 5);
      console.log(`⏳ Esperando ${delaySeconds} segundos antes del siguiente envío (protección anti-bloqueo)...`);
      await sleep(delaySeconds * 1000);

    } catch (err) {
      console.error(`❌ Error enviando a ${guest.name} (${jid}):`, err?.message || err);
      console.log('Continuando con el siguiente invitado en 4 segundos...');
      await sleep(4000);
    }
  }

  console.log('\n=============================================================');
  console.log('🎉 PROCESO DE DIFUSIÓN FINALIZADO');
  console.log(`✅ Mensajes enviados en esta tanda: ${sentCount}`);
  console.log(`⏭️  Invitados omitidos (ya enviados): ${skipCount}`);
  console.log('=============================================================\n');
}

// Iniciar bot
startBot().catch(err => {
  console.error('Error fatal al iniciar el bot:', err);
});
