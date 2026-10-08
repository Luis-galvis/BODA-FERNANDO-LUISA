import os
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, 'data', 'guests.js'), 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

auth_dir = os.path.join(ROOT, 'bot_envio', 'auth_baileys')
files = os.listdir(auth_dir)

incoming_phones = set()
for f in files:
    if f.startswith('session-57') and not f.endswith('.0.json'):
        phone = f.split('.')[0].replace('session-57', '')
        incoming_phones.add(phone)

print("=== INVITADOS CON ACTIVIDAD / MENSAJES DE WHATSAPP EN SESIÓN ===")
matched = []
for g in guests:
    p = g.get('phone', '')
    if p in incoming_phones:
        matched.append(g)
        print(f"ID {g['id']:2d} | {g['name']:<30} | {g['passes']} pases | Cel: {g['phone']}")

print("="*65)
print(f"Total de invitados con interacciones en WhatsApp: {len(matched)}")
print(f"Total de pases de estos invitados: {sum(g['passes'] for g in matched)}")
