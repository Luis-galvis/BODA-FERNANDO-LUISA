import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
GUESTS_FILE = os.path.join(ROOT, 'data', 'guests.js')

with open(GUESTS_FILE, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

print(f"Total antes: {len(guests)}")

# Eliminar ID 15 (Johnatan y Natalie duplicado)
cleaned = []
for g in guests:
    if g['slug'] == 'johnatan-y-natalie-2' or (g['id'] == 15 and 'natalie' in g['slug']):
        print(f"Eliminando duplicado: ID {g['id']} - {g['name']} ({g.get('phone')})")
        continue
    cleaned.append(g)

# Re-enumerar IDs secuencialmente
for idx, g in enumerate(cleaned, 1):
    g['id'] = idx

print(f"Total despues: {len(cleaned)}")

out_content = "// Lista oficial de invitados para la boda\n"
out_content += "// Extraccion automatica y normalizada desde lista_invitados_boda.xlsx\n"
out_content += "export const GUESTS = " + json.dumps(cleaned, indent=2, ensure_ascii=False) + ";\n\n"
out_content += 'if (typeof window !== "undefined") { window.GUESTS = GUESTS; }\n'

with open(GUESTS_FILE, 'w', encoding='utf-8') as f:
    f.write(out_content)

print("data/guests.js actualizado exitosamente.")
