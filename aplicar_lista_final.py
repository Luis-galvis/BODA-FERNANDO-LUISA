import json
import os
import unicodedata

ROOT = os.path.dirname(os.path.abspath(__file__))
GUESTS_FILE = os.path.join(ROOT, 'data', 'guests.js')

user_list = [
    ('German y Mary', 2, '3148942664'),
    ('Angela y Gaby', 2, '3102227404'),
    ('Argenis', 1, '3213612986'),
    ('Luis y Sandra', 2, '3006517876'),
    ('Juan y Paola', 2, '3007582252'),
    ('Jorge y Alejandra', 2, '3134750682'),
    ('Enrique y Anita', 2, '3142457298'),
    ('Alejo y Kelly', 2, '3143119452'),
    ('Wilson', 1, '3144262888'),
    ('Ferenc y Diana', 2, '3153148043'),
    ('Daniel', 1, '3163009310'),
    ('Fabian Moreno', 1, '3174409887'),
    ('Johnatan y Natalie', 2, '3183904862'),
    ('Yeisson y Lorena', 2, '3214900317'),
    ('Marcela', 1, '3128813030'),
    ('Katalina', 1, '3161958838'),
    ('Norma', 1, '3053473390'),
    ('Xiomara', 1, '3106959140'),
    ('Andrea', 1, '3148942658'),
    ('Nubia', 1, '3123962885'),
    ('Jairo e Irma', 2, '3155451681'),
    ('Oscar y Lina', 2, '3168258737'),
    ('Martha Diaz', 1, '3216770790'),
    ('Ciro y Adriana', 2, '3162543924'),
    ('Miryam', 1, '3125429353'),
    ('Familia Guzman Moreno', 5, '3176999226'),
    ('Camilo', 1, '3023631131'),
    ('Mayra', 1, '3118965505'),
    ('Leidy', 1, '3115698018'),
    ('Raul y Sandra', 2, '3015092937'),
    ('Liss y Vivi', 2, '3045512639'),
    ('Familia Orozco Moreno', 4, '3046808114'),
    ('Alberto y Edith', 2, '3123633979'),
    ('Jairo y Diana', 2, '3134699155'),
    ('Oscar y Blanca', 2, '3178492983'),
    ('Maria Jose', 1, '3187026437'),
    ('Luis y Julieth', 2, '3204545796'),
    ('Fernando y Alejandra', 2, '3205582770'),
    ('Yesid y Martha', 2, '3205633432'),
    ('Santiago y Valen', 2, '3212082769'),
    ('Camilo y Lina', 2, '3212318833'),
    ('Familia Galindo Moreno', 3, '3213221773'),
    ('Familia Moreno Gonzalez', 4, '3222307829'),
    ('Victor y Xilenia', 2, '3228452238'),
    ('Alexis Rubiano & Sra', 1, '3148942652'),
    ('Javier & Sra', 2, '3045963615'),
    ('Yeison', 1, '3154383970'),
    ('Daniela', 1, '3175844709'),
    ('Juan Pablo', 1, '3178688336'),
    ('Julian y Camila', 2, '3125304333')
]

def make_slug(name):
    s = unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode('utf-8')
    s = s.lower().replace('&', 'y').strip()
    s = ''.join(c if c.isalnum() else '-' for c in s)
    while '--' in s:
        s = s.replace('--', '-')
    return s.strip('-')

final_guests = []
for idx, (name, passes, phone) in enumerate(user_list, 1):
    slug = make_slug(name)
    reserva_text = f"Esta invitación está reservada para {passes} persona" if passes == 1 else f"Esta invitación está reservada para {passes} personas"
    final_guests.append({
        "id": idx,
        "slug": slug,
        "name": name,
        "passes": passes,
        "reservaText": reserva_text,
        "phone": phone
    })

js_content = "// Lista oficial de invitados para la boda\n"
js_content += "// Extraccion definitiva y validada segun lista oficial de novios (50 invitados, 88 pases)\n"
js_content += "export const GUESTS = " + json.dumps(final_guests, indent=2, ensure_ascii=False) + ";\n\n"
js_content += 'if (typeof window !== "undefined") { window.GUESTS = GUESTS; }\n'

with open(GUESTS_FILE, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"data/guests.js actualizado exitosamente con {len(final_guests)} invitados.")
print(f"Total de pases calculados: {sum(g['passes'] for g in final_guests)}.")
