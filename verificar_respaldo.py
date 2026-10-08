import json

with open('data/guests.js', 'r', encoding='utf-8') as f:
    text = f.read()
guests = json.loads(text[text.find('['):text.rfind(']')+1])
with open('respaldo_usuario.json', 'r', encoding='utf-8') as f:
    backup = json.load(f)

statuses = backup['wedding_guest_rsvp_statuses']
confirmed = [g for g in guests if statuses.get(str(g['id'])) == 'confirmed']
pending = [g for g in guests if statuses.get(str(g['id'])) != 'confirmed']

print(f"Total Invitaciones Confirmadas: {len(confirmed)}")
print(f"Total Personas / Pases Confirmados: {sum(g['passes'] for g in confirmed)}")
print(f"Total Invitaciones Pendientes: {len(pending)}")
print(f"Total Personas / Pases Pendientes: {sum(g['passes'] for g in pending)}")
print("="*60)
for c in confirmed:
    print(f"ID {c['id']:2d} | {c['name']:<30} | {c['passes']} pases | Cel: {c.get('phone')}")
