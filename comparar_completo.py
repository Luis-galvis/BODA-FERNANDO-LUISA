import openpyxl
import json
from collections import defaultdict
import unicodedata

def clean_str(s):
    if not s: return ""
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode('utf-8')
    return s.lower().replace('&', 'y').replace('.', '').strip()

wb = openpyxl.load_workbook(r'C:\Users\lgalv\Downloads\lista_invitados_boda (1).xlsx')
ws = wb['Invitados']

personas_inv = []
for r in range(11, ws.max_row + 1):
    vinculo = ws.cell(row=r, column=1).value
    tipo_doc = ws.cell(row=r, column=2).value
    cedula = ws.cell(row=r, column=3).value
    nombre = ws.cell(row=r, column=4).value
    tarjeta = ws.cell(row=r, column=5).value
    if nombre:
        clean_name = nombre.strip().rstrip('1').strip()
        personas_inv.append({
            'fila': r,
            'vinculo': vinculo,
            'cedula': cedula,
            'nombre': clean_name,
            'tarjeta': tarjeta
        })

with open('data/guests.js', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

# Diccionario de equivalencias manuales exactas:
# Cada tarjeta en 'Invitados' con qué ID(s) de nuestra lista corresponde
# Tarjetas en hoja Invitados: 1 a 42 (nota: no existe 32 en hoja Invitados)
map_invitados_to_guests = {
    1: [15],        # CLAUDIA MARCELA ACOSTA RIOS -> Marcela (ID 15)
    2: [16],        # JENNY KATALINA NIETO POLANCO -> Katalina (ID 16)
    3: [17],        # NORMA LILIANA HERRERA SAAVEDRA -> Norma (ID 17)
    4: [31],        # LISSETH MINNELLI HORTA MONTEALEGRE -> Liss y Vivi (ID 31)
    5: [18, 29],    # LEIDY XIOMARA CAMACHO HERRERA (Xiomara ID 18) + LEIDY VIVIANA DIAZ PINZON (Leidy ID 29)
    6: [31],        # JESSICA LIZETH GARCIA ESPINOSA -> (amiga de Liss y Vivi)
    7: [1],         # MARY MARCELA MOTTA + GERMAN DARIO OLAYA -> German y Mary (ID 1)
    8: [19],        # ANDREA CONSUELO BECERRA INFANTE -> Andrea (ID 19)
    9: [2],         # FLOR ANGELA BELTRAN + GABRIELA RODRIGUEZ -> Angela y Gaby (ID 2)
    10: [20, 28, 44], # NUBIA SANDRA DIAZ (ID 20) + MAYRA ALEJANDRA (ID 28) + SEBASTIAN CAMILO GALINDO + DULCE MARIA (Familia Galindo Moreno ID 44)
    11: [45],       # JOSE YESID MORENO + MARIA CAMILA GONZALEZ + ISABEL + LIAM -> Familia Moreno Gonzalez (ID 45)
    12: [39],       # LUIS FERNANDO GALVIS MORENO + JULIETH ANYELINA HERRERA -> Luis y Julieth (ID 39)
    13: [41],       # MARTHA CECILIA GUZMAN + YESID MORENO GUZMAN -> Yesid y Martha (ID 41)
    14: [42],       # YESSICA VALENTINA MORENO + JIMMY SANTIAGO ARRUNATEGUI -> Santiago y Valen (ID 42)
    15: [32],       # JENNIFER CAROLINA MORENO + MAURICIO OROZCO + ANNIE + SARA -> Familia Orozco Moreno (ID 32)
    16: [21],       # IRMA CONSUELO IDARRAGA + JAIRO GALINDO OYUELA -> Jairo e Irma (ID 21)
    17: [4],        # SANDRA MILENA GALEANO + LUIS EDUARDO CUELLAR -> Luis y Sandra (ID 4)
    18: [5],        # JENNY PAOLA RIVERA + JUAN FERNANDO GUZMAN -> Juan y Paola (ID 5)
    19: [22],       # OSCAR JAVIER VALLEJO + LINA MARIA RAMIREZ -> Oscar y Lina (ID 22)
    20: [13],       # JOHNATHAN ANDRES RODRIGUEZ MORENO -> Johnatan y Natalie (ID 13)
    21: [30],       # SANDRA MILENA RODRIGUEZ + RAUL ANTONIO GARCIA -> Raul y Sandra (ID 30)
    22: [12],       # FABIAN ALEXANDER MORENO RODRIGUEZ -> Fabian Moreno (ID 12)
    23: [7],        # ANA MARIA RODRIGUEZ + ENRIQUE MORENO GUZMAN -> Enrique y Anita (ID 7)
    24: [8],        # KELLY MARIA LOMBO + LUIS ALEJANDRO GARCIA -> Alejo y Kelly (ID 8)
    25: [14],       # LORENA ALEJANDRA LOMBO + YEYSSON VALBUENA -> Yeisson y Lorena (ID 14)
    26: [6],        # ANDREA ALEJANDRA GRANADOS + JORGE LOMBO -> Jorge y Alejandra (ID 6)
    27: [23],       # MARTHA LILIANA DIAZ RODRIGUEZ -> Martha Diaz (ID 23)
    28: [24],       # CIRO ANTONIO JIMENEZ + ADRIANA GALVIS -> Ciro y Adriana (ID 24)
    29: [10],       # DIANA FAISURRI TRIANA + FERENC ALFONSO RODRIGUEZ -> Ferenc y Diana (ID 10)
    30: [25],       # MIRYAM MORENO GUZMAN -> Miryam (ID 25)
    31: [26],       # FEDERICO GUZMAN + OLGA PATRICIA + CRISTIAN + JOAN -> Familia Guzman Moreno (ID 26)
    33: [34],       # JAIRO ALBERTO OSPINA + DIANA ROCIO RODRIGUEZ -> Jairo y Diana (ID 34)
    34: [33],       # LUIS ALBERTO SANCHEZ + MARIA EDITH GALVIS -> Alberto y Edith (ID 33)
    35: [43],       # JUAN CAMILO CASTILLO + LINA MARIA JUYO -> Camilo y Lina (ID 43)
    36: [37],       # BLANCA EUNICE GALVIS + OSCAR MAURICIO ORTIZ + JERONIMO -> Oscar y Blanca (ID 37)
    37: [38],       # MARIA JOSE GALVIS MOGOLLON -> Maria Jose (ID 38)
    38: [],         # JOSE LUIS MORENO GUZMAN (Familia Novia) -> NO TIENE TARJETA PROPIA EN NUESTRA LISTA
    39: [27],       # CRISTIAN CAMILO AGUILERA -> Camilo (ID 27)
    40: [47],       # FREUD ALEXIS RUBIANO -> Alexis Rubiano & Sra (ID 47)
    41: [3],        # ARGENIS BELTRAN CASTRO -> Argenis (ID 3)
    42: [28],       # MAYRA ALEJANDRA HEREDIA -> Mayra (ID 28)
}

# Ver qué IDs de nuestra lista quedaron vinculados
ids_vinculados = set()
for ids in map_invitados_to_guests.values():
    ids_vinculados.update(ids)

print("="*75)
print("1. INVITACIONES EN NUESTRA LISTA QUE NO ESTAN EN LA HOJA 'INVITADOS'")
print("="*75)
sobrantes = [g for g in guests if g['id'] not in ids_vinculados]
for g in sobrantes:
    print(f"  - ID {g['id']:2d}: {g['name']:25s} | Cel: {g.get('phone')} | Pases: {g.get('passes')} | Slug: {g['slug']}")

print("\n" + "="*75)
print("2. PERSONAS EN HOJA 'INVITADOS' QUE NO ESTAN EN NUESTRA LISTA")
print("="*75)
for t_id, ids in map_invitados_to_guests.items():
    if not ids:
        p_list = [p['nombre'] for p in personas_inv if p['tarjeta'] == t_id]
        print(f"  - Tarjeta #{t_id}: {', '.join(p_list)}")

print("\n" + "="*75)
print("3. DIFERENCIAS DE PASES O DESGLOSE ENTRE AMBAS LISTAS")
print("="*75)
# Caso tarjeta 10: Nubia + Mayra + Sebastian Camilo + Dulce Maria
# En nuestra lista estan separados como: Nubia (1), Mayra (1), Familia Galindo Moreno (3)
print("  * Tarjeta #10 (4 personas en Excel):")
print("    En hoja Invitados estan juntos: NUBIA SANDRA DIAZ, MAYRA ALEJANDRA MORENO DIAZ, SEBASTIAN CAMILO GALINDO, DULCE MARIA GALINDO (Total: 4 personas)")
print("    En nuestra lista estan separados en 3 invitaciones distintas:")
print("      - ID 20: Nubia (1 pase)")
print("      - ID 28: Mayra (1 pase)")
print("      - ID 44: Familia Galindo Moreno (3 pases)")
print("      => Suman 5 pases en vez de 4.\n")

print("  * Tarjeta #5 vs ID 18 y 29:")
print("    En hoja Invitados la Tarjeta #5 tiene 2 personas juntas: LEIDY XIOMARA CAMACHO HERRERA + LEIDY VIVIANA DIAZ PINZON (2 personas)")
print("    En nuestra lista estan separadas:")
print("      - ID 18: Xiomara (1 pase)")
print("      - ID 29: Leidy (1 pase)\n")

print("  * Tarjeta #36 (Oscar y Blanca):")
print("    En hoja Invitados son 3 personas: BLANCA EUNICE GALVIS, OSCAR MAURICIO ORTIZ, JERONIMO ORTIZ GALVIS (3 personas)")
print("    En nuestra lista: ID 37 'Oscar y Blanca' tiene 2 pases (falta el hijo Jeronimo).\n")

print("  * Tarjeta #38 (JOSE LUIS MORENO GUZMAN):")
print("    Esta en hoja Invitados con cedula 14244083, pero NO esta en nuestra lista de WhatsApp.")
