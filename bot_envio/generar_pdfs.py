import os
import json
from reportlab.pdfgen import canvas
from reportlab.lib import colors

PDF_DIR = os.path.join(os.path.dirname(__file__), 'pdfs')
GUESTS_FILE = os.path.join(os.path.dirname(__file__), '../data/guests.js')
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '../assets')

os.makedirs(PDF_DIR, exist_ok=True)

def generate_pdf_for_guest(guest):
    slug = guest.get('slug', 'invitado')
    name = guest.get('name', 'Apreciado Invitado')
    passes = guest.get('passes', 1)
    plural = 's' if passes > 1 else ''
    url = f'https://boda-fernando-luisa.vercel.app/index.html?invitado={slug}'
    pdf_path = os.path.join(PDF_DIR, f'Invitacion_Boda_{slug}.pdf')

    w, h = 595.27, 841.89 # A4

    c = canvas.Canvas(pdf_path, pagesize=(w, h))

    # Fondo marfil
    c.setFillColor(colors.HexColor('#faf8f4'))
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Marcos dorados
    c.setStrokeColor(colors.HexColor('#c5a059'))
    c.setLineWidth(3)
    c.rect(22, 22, w-44, h-44, fill=0, stroke=1)
    c.setStrokeColor(colors.HexColor('#e4cca0'))
    c.setLineWidth(1)
    c.rect(28, 28, w-56, h-56, fill=0, stroke=1)
    c.setStrokeColor(colors.HexColor('#c5a059'))
    c.setLineWidth(1.5)
    c.rect(34, 34, w-68, h-68, fill=0, stroke=1)

    # Monograma floral centrado
    mono_path = os.path.join(ASSETS_DIR, 'monograma_boda.jpg')
    if os.path.exists(mono_path):
        c.drawImage(mono_path, (w-250)/2, h-300, width=250, height=250, preserveAspectRatio=True)

    # Título superior
    c.setFillColor(colors.HexColor('#8f6e2b'))
    c.setFont('Helvetica-Bold', 13)
    c.drawCentredString(w/2, h-330, 'N U E S T R A   B O D A')

    c.setStrokeColor(colors.HexColor('#d4c194'))
    c.setLineWidth(1)
    c.line(w/2 - 120, h-342, w/2 + 120, h-342)

    # Nombres de los novios
    c.setFillColor(colors.HexColor('#2c3821'))
    c.setFont('Times-Bold', 32)
    c.drawCentredString(w/2, h-388, 'Fernando & Luisa Fernanda')

    # Divisor
    line_y = h - 418
    c.line(w/2 - 160, line_y, w/2 + 160, line_y)

    # Fecha
    c.setFillColor(colors.HexColor('#4a553f'))
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(w/2, h-455, 'SÁBADO, 14 DE NOVIEMBRE DE 2026')

    # Recuadro personalizado del invitado de gala
    box_w, box_h = 440, 84
    box_x = (w - box_w) / 2
    box_y = h - 565

    c.setFillColor(colors.HexColor('#fcf5e5'))
    c.setStrokeColor(colors.HexColor('#c5a059'))
    c.setLineWidth(1.8)
    c.roundRect(box_x, box_y, box_w, box_h, 14, fill=1, stroke=1)

    c.setFillColor(colors.HexColor('#8f6e2b'))
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(w/2, box_y + 57, 'INVITACIÓN DE HONOR RESERVADA PARA:')

    c.setFillColor(colors.HexColor('#2c3821'))
    c.setFont('Times-BoldItalic', 20)
    c.drawCentredString(w/2, box_y + 31, name)

    c.setFillColor(colors.HexColor('#5c694e'))
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(w/2, box_y + 11, f'{passes} Pase{plural} Reservado{plural}')

    # Botón interactivo de gala (GRANDE Y PROMINENTE)
    btn_w, btn_h = 460, 70
    btn_x = (w - btn_w) / 2
    btn_y = h - 670

    c.setFillColor(colors.HexColor('#3a472c'))
    c.setStrokeColor(colors.HexColor('#c5a059'))
    c.setLineWidth(2.5)
    c.roundRect(btn_x, btn_y, btn_w, btn_h, 35, fill=1, stroke=1)

    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 15)
    c.drawCentredString(w/2, btn_y + 26, '✦   TOCA AQUÍ PARA ABRIR TU TARJETA   ✦')

    # Enlace web nativo clickeable en PDF sobre todo el botón
    c.linkURL(url, (btn_x, btn_y, btn_x + btn_w, btn_y + btn_h), relative=0)

    # Pie de página
    c.setFillColor(colors.HexColor('#777777'))
    c.setFont('Helvetica-Oblique', 10.5)
    c.drawCentredString(w/2, h - 725, 'Por favor confirmar asistencia antes del 13 de Octubre')

    c.setFillColor(colors.HexColor('#8f6e2b'))
    c.setFont('Times-Italic', 12.5)
    c.drawCentredString(w/2, h - 752, '¡Esperamos contar con tu compañía en este día tan especial!')

    c.save()
    return pdf_path

def generate_all_pdfs():
    with open(GUESTS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    start = content.find('[')
    end = content.rfind(']') + 1
    guests = json.loads(content[start:end])

    for g in guests:
        generate_pdf_for_guest(g)

    print(f'Completado: generados {len(guests)} PDFs en {PDF_DIR}')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--single':
        data = json.loads(sys.argv[2])
        p = generate_pdf_for_guest(data)
        print(f'Generado: {p}')
    else:
        generate_all_pdfs()
