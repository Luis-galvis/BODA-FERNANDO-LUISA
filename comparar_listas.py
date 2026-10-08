import json
import openpyxl
from collections import defaultdict
import unicodedata

def normalize(text):
    if not text: return ""
    text = unicodedata.normalize('NFD', str(text)).encode('ascii', 'ignore').decode("utf-8")
    return text.lower().replace('&', 'y').strip()

# 1. Cargar hoja 'Invitados' del nuevo Excel
wb_new = openpyxl.load_workbook(r'C:\Users\lgalv\Downloads\lista_invitados_boda (1).xlsx')
ws_inv = wb_new['Invitados']

personas_invitados = []
tarjetas_invitados = defaultdict(list)

for r in range(11, ws_inv.max_row + 1):
    vinculo = ws_inv.cell(row=r, column=1).value
    tipo_doc = ws_inv.cell(row=r, column=2).value
    cedula = ws_inv.cell(row=r, column=3).value
    nombre = ws_inv.cell(row=r, column=4).value
    t_id = ws_inv.cell(row=r, column=5).value
    if nombre:
        clean_name = nombre.strip().rstrip('1').strip()
        item = {
            'fila': r,
            'vinculo': vinculo,
            'cedula': cedula,
            'nombre_completo': clean_name,
            'tarjeta_id': t_id
        }
        personas_invitados.append(item)
        tarjetas_invitados[t_id].append(item)

# 2. Cargar nuestra lista actual (52 invitados de data/guests.js)
with open('data/guests.js', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('[')
end = text.rfind(']') + 1
guests_actual = json.loads(text[start:end])

print(f"=== ESTADÍSTICAS GENERALES ===")
print(f"Hoja 'Invitados' (Descargas): {len(personas_invitados)} personas en {len(tarjetas_invitados)} tarjetas")
print(f"Lista Actual Bot/Web: {len(guests_actual)} invitaciones / {sum(g.get('passes',1) for g in guests_actual)} pases")

print("\n" + "="*70)
print("CRUCE Y COMPARACIÓN DETALLADA:")
print("="*70)

# Ver cómo mapea cada tarjeta de 'Invitados' a nuestra lista actual
mapeados_actual = set()
mapeados_invitados = set()

print("\n--- 1. TARJETAS DE HOJA 'INVITADOS' ENCONTRADAS EN NUESTRA LISTA ---")
for t_id, personas in sorted(tarjetas_invitados.items(), key=lambda x: (x[0] is None, x[0])):
    nombres_personas = [p['nombre_completo'] for p in personas]
    
    # Buscar coincidencia en guests_actual
    match = None
    for g in guests_actual:
        g_name_norm = normalize(g['name'])
        # Chequear si partes del nombre coinciden
        words = [w for w in g_name_norm.split() if w not in ('y', 'familia', 'sra')]
        # Ver si todas las palabras de g están en alguno de los nombres_personas
        hits = 0
        for w in words:
            if any(w in normalize(p) for p in nombres_personas):
                hits += 1
        if words and hits >= min(len(words), 2):
            match = g
            break
        # O si es una sola palabra como 'Marcela' y está en 'Claudia Marcela'
        if len(words) == 1 and any(words[0] in normalize(p) for p in nombres_personas):
            match = g
            break

    if match:
        mapeados_actual.add(match['id'])
        mapeados_invitados.add(t_id)
        pases_inv = len(personas)
        pases_act = match.get('passes', 1)
        diff_pases = f"[DIFERENCIA PASES: Hoja Invitados={pases_inv} vs Lista Actual={pases_act}]" if pases_inv != pases_act else "[Pases coinciden]"
        print(f"Tarjeta #{t_id} ({pases_inv} personas) => ID {match['id']} '{match['name']}' ({pases_act} pases) {diff_pases}")
        print(f"   Personas en hoja: {', '.join(nombres_personas)}")
    else:
        print(f"[NO ENCONTRADA] Tarjeta #{t_id}: {', '.join(nombres_personas)}")

print("\n" + "="*70)
print("--- 2. INVITACIONES EN NUESTRA LISTA ACTUAL QUE NO ESTAN EN HOJA 'INVITADOS' ---")
for g in guests_actual:
    if g['id'] not in mapeados_actual:
        print(f"+ ID {g['id']}: {g['name']} | Cel: {g.get('phone')} | Pases: {g.get('passes')} | Slug: {g['slug']}")

