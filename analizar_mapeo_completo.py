import openpyxl
import json
from collections import defaultdict
import unicodedata

def norm(s):
    if not s: return ""
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode('utf-8')
    return s.lower().replace('&', 'y').replace('.', '').strip()

wb = openpyxl.load_workbook(r'C:\Users\lgalv\Downloads\lista_invitados_boda (1).xlsx')
ws_inv = wb['Invitados']

tarjetas_inv = defaultdict(list)
for r in range(11, ws_inv.max_row + 1):
    vinculo = ws_inv.cell(row=r, column=1).value
    cedula = ws_inv.cell(row=r, column=3).value
    nombre = ws_inv.cell(row=r, column=4).value
    t_id = ws_inv.cell(row=r, column=5).value
    if nombre:
        clean = nombre.strip().rstrip('1').strip()
        tarjetas_inv[t_id].append({
            'nombre': clean,
            'cedula': cedula,
            'vinculo': vinculo
        })

with open('data/guests.js', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('[')
end = text.rfind(']') + 1
guests_actual = json.loads(text[start:end])

# Tabla manual / semántica de mapeo de las 41 tarjetas de la hoja Invitados
# hacia los nombres coloquiales de la tarjeta de bodas
mapeo_tarjetas = {
    1: "Marcela",                             # CLAUDIA MARCELA ACOSTA RIOS
    2: "Katalina",                            # JENNY KATALINA NIETO POLANCO
    3: "Norma",                               # NORMA LILIANA HERRERA SAAVEDRA
    4: "Liss y Vivi",                         # LISSETH MINNELLI HORTA MONTEALEGRE
    5: "Xiomara",                             # LEIDY XIOMARA CAMACHO HERRERA + LEIDY VIVIANA DIAZ PINZON
    6: "Liss y Vivi",                         # JESSICA LIZETH GARCIA ESPINOSA (amiga de Liss/Vivi)
    7: "German y Mary",                       # MARY MARCELA MOTTA + GERMAN DARIO OLAYA
    8: "Andrea",                              # ANDREA CONSUELO BECERRA INFANTE
    9: "Angela y Gaby",                       # FLOR ANGELA BELTRAN + GABRIELA RODRIGUEZ
    10: "Familia Galindo Moreno / Nubia",     # NUBIA SANDRA DIAZ + MAYRA + SEBASTIAN CAMILO GALINDO + DULCE MARIA
    11: "Familia Moreno Gonzalez",            # JOSE YESID MORENO + MARIA CAMILA GONZALEZ + ISABEL + LIAM
    12: "Luis y Julieth",                     # LUIS FERNANDO GALVIS MORENO + JULIETH ANYELINA HERRERA
    13: "Yesid y Martha",                     # MARTHA CECILIA GUZMAN + YESID MORENO GUZMAN
    14: "Santiago y Valen",                   # YESSICA VALENTINA MORENO + JIMMY SANTIAGO ARRUNATEGUI
    15: "Familia Orozco Moreno",              # JENNIFER CAROLINA MORENO + MAURICIO OROZCO + ANNIE + SARA
    16: "Jairo e Irma",                       # IRMA CONSUELO IDARRAGA + JAIRO GALINDO OYUELA
    17: "Luis y Sandra",                      # SANDRA MILENA GALEANO + LUIS EDUARDO CUELLAR
    18: "Juan y Paola",                       # JENNY PAOLA RIVERA + JUAN FERNANDO GUZMAN
    19: "Oscar y Lina",                       # OSCAR JAVIER VALLEJO + LINA MARIA RAMIREZ
    20: "Johnatan y Natalie",                 # JOHNATHAN ANDRES RODRIGUEZ MORENO
    21: "Raul y Sandra",                      # SANDRA MILENA RODRIGUEZ + RAUL ANTONIO GARCIA
    22: "Fabian Moreno",                      # FABIAN ALEXANDER MORENO RODRIGUEZ
    23: "Enrique y Anita",                    # ANA MARIA RODRIGUEZ + ENRIQUE MORENO GUZMAN
    24: "Alejo y Kelly",                      # KELLY MARIA LOMBO + LUIS ALEJANDRO GARCIA
    25: "Yeisson y Lorena",                   # LORENA ALEJANDRA LOMBO + YEYSSON VALBUENA
    26: "Jorge y Alejandra",                  # ANDREA ALEJANDRA GRANADOS + JORGE LOMBO
    27: "Martha Diaz",                        # MARTHA LILIANA DIAZ RODRIGUEZ
    28: "Ciro y Adriana",                     # CIRO ANTONIO JIMENEZ + ADRIANA GALVIS
    29: "Ferenc y Diana",                     # DIANA FAISURRI TRIANA + FERENC ALFONSO RODRIGUEZ
    30: "Miryam",                             # MIRYAM MORENO GUZMAN
    31: "Familia Guzman Moreno",              # FEDERICO GUZMAN + OLGA PATRICIA + CRISTIAN + JOAN SEBASTIAN
    33: "Jairo y Diana",                      # JAIRO ALBERTO OSPINA + DIANA ROCIO RODRIGUEZ
    34: "Alberto y Edith",                    # LUIS ALBERTO SANCHEZ + MARIA EDITH GALVIS
    35: "Camilo y Lina",                      # JUAN CAMILO CASTILLO + LINA MARIA JUYO
    36: "Oscar y Blanca",                     # BLANCA EUNICE GALVIS + OSCAR MAURICIO ORTIZ + JERONIMO
    37: "Maria Jose",                         # MARIA JOSE GALVIS MOGOLLON
    38: "Jose Luis Moreno Guzman",            # JOSE LUIS MORENO GUZMAN (Familia Novia)
    39: "Camilo",                             # CRISTIAN CAMILO AGUILERA
    40: "Alexis Rubiano & Sra",               # FREUD ALEXIS RUBIANO
    41: "Argenis",                            # ARGENIS BELTRAN CASTRO
    42: "Mayra",                              # MAYRA ALEJANDRA HEREDIA
}

print("Analisis completado con exito.")
