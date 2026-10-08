import { GUESTS } from './data/guests.js';

const SUPABASE_URL = 'https://tapusiqdotxhtnyxavta.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHVzaXFkb3R4aHRueXhhdnRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ1MDg1MSwiZXhwIjoyMTA0MDI2ODUxfQ.2UWWE50nkAojGIihFZRJOD6N7RZ3gkT6t1FqqM3eLF0';

async function seed() {
  console.log('Sembrando 50 invitados oficiales en Supabase...');

  const records = GUESTS.map(g => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    passes: g.passes,
    phone: g.phone || null,
    status: g.status || 'pending',
    sent: false,
    updated_at: new Date().toISOString()
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/wedding_guests`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(records)
  });

  if (res.ok) {
    console.log('✅ ¡50 Invitados guardados exitosamente en la base de datos Supabase!');
  } else {
    const err = await res.text();
    console.log('ℹ️ Estado respuesta:', res.status, err);
  }
}

seed().catch(console.error);
