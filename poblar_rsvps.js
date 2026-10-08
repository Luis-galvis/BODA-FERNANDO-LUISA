import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://tapusiqdotxhtnyxavta.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHVzaXFkb3R4aHRueXhhdnRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ1MDg1MSwiZXhwIjoyMTA0MDI2ODUxfQ.2UWWE50nkAojGIihFZRJOD6N7RZ3gkT6t1FqqM3eLF0';

async function seedRSVPs() {
  const backup = JSON.parse(fs.readFileSync(path.join(__dirname, 'respaldo_usuario.json'), 'utf-8'));
  const rsvps = backup.wedding_rsvp_confirmations || [];

  console.log(`Sembrando ${rsvps.length} confirmaciones iniciales en wedding_rsvps...`);

  const records = rsvps.map(r => ({
    name: r.name,
    attendance: r.attendance || 'si',
    status_text: r.statusText || '¡Sí, asistiré con mucha alegría!',
    message: r.message || '',
    created_at: r.date || new Date().toISOString()
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/wedding_rsvps`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(records)
  });

  if (res.ok) {
    console.log('✅ Confirmaciones RSVP guardadas en Supabase exitosamente.');
  } else {
    console.log('Respuesta:', res.status, await res.text());
  }
}

seedRSVPs().catch(console.error);
