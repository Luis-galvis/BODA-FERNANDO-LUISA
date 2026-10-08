import json
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.abspath(__file__))
GUESTS_FILE = os.path.join(ROOT, 'data', 'guests.js')
EXCEL_FILE = os.path.join(ROOT, 'Lista_Invitados_y_Pases_Boda.xlsx')

with open(GUESTS_FILE, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Invitados y Pases"

# Asegurar rejilla visible
ws.views.sheetView[0].showGridLines = True

# Paleta de colores de la boda
gold_fill = PatternFill(start_color="3A472C", end_color="3A472C", fill_type="solid") # Verde Olivo
sub_fill = PatternFill(start_color="C5A059", end_color="C5A059", fill_type="solid")  # Dorado
total_fill = PatternFill(start_color="FAF4E6", end_color="FAF4E6", fill_type="solid")
zebra_fill = PatternFill(start_color="F9FAF8", end_color="F9FAF8", fill_type="solid")

conf_fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
pend_fill = PatternFill(start_color="FFF3E0", end_color="FFF3E0", fill_type="solid")

thin_border = Border(
    left=Side(style='thin', color='DDDDDD'),
    right=Side(style='thin', color='DDDDDD'),
    top=Side(style='thin', color='DDDDDD'),
    bottom=Side(style='thin', color='DDDDDD')
)
total_border = Border(
    top=Side(style='thin', color='3A472C'),
    bottom=Side(style='double', color='3A472C')
)

# Título principal
ws.merge_cells("A1:G1")
title_cell = ws["A1"]
title_cell.value = "💍 LISTA OFICIAL DE INVITADOS Y PASES • BODA FERNANDO & LUISA FERNANDA"
title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
title_cell.fill = gold_fill
title_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 36

# Resumen rápido
total_invitaciones = len(guests)
total_pases = sum(g.get("passes", 1) for g in guests)
conf_inv = sum(1 for g in guests if g.get("status") == "confirmed")
conf_pases = sum(g.get("passes", 1) for g in guests if g.get("status") == "confirmed")
pend_inv = sum(1 for g in guests if g.get("status") != "confirmed")
pend_pases = sum(g.get("passes", 1) for g in guests if g.get("status") != "confirmed")

ws.merge_cells("A2:G2")
sub_cell = ws["A2"]
sub_cell.value = f"📊 Total: {total_invitaciones} Inv ({total_pases} pases)   |   ✅ Confirmados: {conf_inv} Inv ({conf_pases} pases)   |   ⏳ Pendientes: {pend_inv} Inv ({pend_pases} pases)"
sub_cell.font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
sub_cell.fill = sub_fill
sub_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[2].height = 24

# Fila en blanco
ws.row_dimensions[3].height = 10

# Cabeceras
headers = [
    "ID",
    "Nombre del Invitado / Familia",
    "Teléfono WhatsApp",
    "Pases (Cupos)",
    "Categoría",
    "Estado RSVP",
    "Enlace Tarjeta Interactiva"
]

header_fill = PatternFill(start_color="2C3821", end_color="2C3821", fill_type="solid")
header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")

for col_idx, header in enumerate(headers, 1):
    cell = ws.cell(row=4, column=col_idx, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[4].height = 28

row_num = 5
for idx, g in enumerate(guests, 1):
    passes = g.get("passes", 1)
    phone = g.get("phone", "")
    slug = g.get("slug", "")
    status = g.get("status", "pending")
    link = f"https://boda-fernando-luisa.vercel.app/index.html?invitado={slug}"

    if passes == 1:
        cat = "Individual"
    elif passes == 2:
        cat = "Pareja"
    elif passes >= 3:
        cat = f"Familia ({passes})"
    else:
        cat = "General"

    st_label = "✅ Confirmado" if status == "confirmed" else "⏳ Pendiente"

    c_id = ws.cell(row=row_num, column=1, value=g.get("id", idx))
    c_name = ws.cell(row=row_num, column=2, value=g.get("name", ""))
    c_phone = ws.cell(row=row_num, column=3, value=phone)
    c_passes = ws.cell(row=row_num, column=4, value=passes)
    c_cat = ws.cell(row=row_num, column=5, value=cat)
    c_status = ws.cell(row=row_num, column=6, value=st_label)
    c_link = ws.cell(row=row_num, column=7, value=link)

    c_id.alignment = Alignment(horizontal="center", vertical="center")
    c_name.alignment = Alignment(horizontal="left", vertical="center")
    c_phone.alignment = Alignment(horizontal="center", vertical="center")
    c_passes.alignment = Alignment(horizontal="center", vertical="center")
    c_cat.alignment = Alignment(horizontal="center", vertical="center")
    c_status.alignment = Alignment(horizontal="center", vertical="center")
    c_link.alignment = Alignment(horizontal="left", vertical="center")

    c_name.font = Font(name="Segoe UI", size=10, bold=True)
    c_passes.font = Font(name="Segoe UI", size=11, bold=True, color="3A472C")
    
    if status == "confirmed":
        c_status.font = Font(name="Segoe UI", size=10, bold=True, color="2E7D32")
        c_status.fill = conf_fill
    else:
        c_status.font = Font(name="Segoe UI", size=10, color="EF6C00")
        c_status.fill = pend_fill

    c_link.font = Font(name="Segoe UI", size=9, color="2E5B82", underline="single")
    c_link.hyperlink = link

    # Alternado de filas
    fill = zebra_fill if idx % 2 == 0 else PatternFill(fill_type=None)
    for col in [1, 2, 3, 4, 5, 7]:
        cell = ws.cell(row=row_num, column=col)
        if fill.fill_type:
            cell.fill = fill
        cell.border = thin_border
    ws.cell(row=row_num, column=6).border = thin_border

    ws.row_dimensions[row_num].height = 20
    row_num += 1

# Fila de Totales
ws.cell(row=row_num, column=1, value="")
c_tot_label = ws.cell(row=row_num, column=2, value="TOTAL GENERAL")
c_tot_label.font = Font(name="Segoe UI", size=11, bold=True, color="2C3821")
c_tot_label.alignment = Alignment(horizontal="right", vertical="center")

ws.cell(row=row_num, column=3, value=f"{total_invitaciones} Números")
ws.cell(row=row_num, column=3).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=row_num, column=3).font = Font(name="Segoe UI", size=10, bold=True)

c_tot_val = ws.cell(row=row_num, column=4, value=f"=SUM(D5:D{row_num-1})")
c_tot_val.font = Font(name="Segoe UI", size=12, bold=True, color="8F6E2B")
c_tot_val.alignment = Alignment(horizontal="center", vertical="center")

ws.cell(row=row_num, column=5, value=f"{total_pases} Personas")
ws.cell(row=row_num, column=5).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=row_num, column=5).font = Font(name="Segoe UI", size=10, bold=True)

ws.cell(row=row_num, column=6, value=f"{conf_inv} Conf / {pend_inv} Pend")
ws.cell(row=row_num, column=6).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=row_num, column=6).font = Font(name="Segoe UI", size=10, bold=True, color="2C3821")

ws.cell(row=row_num, column=7, value="")

for col in range(1, 8):
    cell = ws.cell(row=row_num, column=col)
    cell.fill = total_fill
    cell.border = total_border

ws.row_dimensions[row_num].height = 26

# Auto-ajustar anchos de columna
col_widths = {
    1: 8,
    2: 32,
    3: 20,
    4: 16,
    5: 18,
    6: 18,
    7: 55
}
for col, width in col_widths.items():
    ws.column_dimensions[get_column_letter(col)].width = width

wb.save(EXCEL_FILE)
print(f"Excel guardado exitosamente en: {EXCEL_FILE}")
