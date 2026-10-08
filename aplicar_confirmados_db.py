import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
GUESTS_FILE = os.path.join(ROOT, 'data', 'guests.js')
BACKUP_FILE = os.path.join(ROOT, 'respaldo_usuario.json')

with open(GUESTS_FILE, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
    backup = json.load(f)

statuses = backup.get('wedding_guest_rsvp_statuses', {})

for g in guests:
    st = statuses.get(str(g['id']), 'pending')
    g['status'] = st

confirmed_count = sum(1 for g in guests if g['status'] == 'confirmed')
confirmed_passes = sum(g['passes'] for g in guests if g['status'] == 'confirmed')
pending_count = sum(1 for g in guests if g['status'] == 'pending')
pending_passes = sum(g['passes'] for g in guests if g['status'] == 'pending')

js_content = "// Lista oficial de invitados para la boda\n"
js_content += f"// Total: {len(guests)} invitaciones | Confirmados: {confirmed_count} ({confirmed_passes} pases) | Pendientes: {pending_count} ({pending_passes} pases)\n"
js_content += "export const GUESTS = " + json.dumps(guests, indent=2, ensure_ascii=False) + ";\n\n"
js_content += 'if (typeof window !== "undefined") { window.GUESTS = GUESTS; }\n'

with open(GUESTS_FILE, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"data/guests.js actualizado exitosamente:")
print(f"- Total Invitados: {len(guests)}")
print(f"- Confirmados: {confirmed_count} ({confirmed_passes} pases)")
print(f"- Pendientes: {pending_count} ({pending_passes} pases)")
