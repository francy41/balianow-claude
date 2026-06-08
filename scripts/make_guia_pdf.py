# -*- coding: utf-8 -*-
"""Genera la guía de grabación de vídeos para bailarines de BailaNow (1 página)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

PINK = colors.HexColor("#ff3e6c")
ORANGE = colors.HexColor("#ff8c42")
DARK = colors.HexColor("#1a0033")
GREY = colors.HexColor("#555555")

OUT = "public/guia-grabacion-bailanow.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=16 * mm, rightMargin=16 * mm,
    topMargin=14 * mm, bottomMargin=12 * mm,
    title="Guía de grabación · BailaNow",
    author="BailaNow",
)

styles = getSampleStyleSheet()
h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=22, textColor=PINK, spaceAfter=2, leading=24)
sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10, textColor=GREY, spaceAfter=8)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12.5, textColor=DARK, spaceBefore=8, spaceAfter=3)
body = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, leading=13, textColor=colors.HexColor("#222222"))
small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, leading=10, textColor=GREY)
cell = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8.8, leading=11)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold")

story = []

story.append(Paragraph("BailaNow · Guía de grabación de vídeos", h1))
story.append(Paragraph("Cómo grabar los pasos para que sincronicen con el sistema de IA (sincronía exacta del alumno con tu baile).", sub))
story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=8))

# Reglas clave (tabla)
story.append(Paragraph("1 · Reglas clave de grabación", h2))
data = [
    [Paragraph("Cámara", cellb), Paragraph("Fija y frontal, a la altura del pecho. Nada de movimiento de cámara ni zoom.", cell)],
    [Paragraph("Encuadre", cellb), Paragraph("Cuerpo entero: de la cabeza a los pies, con un poco de aire arriba y abajo.", cell)],
    [Paragraph("Personas", cellb), Paragraph("1 solo bailarín por vídeo de paso (el sistema sigue a una persona).", cell)],
    [Paragraph("Fondo / luz", cellb), Paragraph("Fondo liso y buena luz frontal (sin contraluz). Ropa que contraste con el fondo.", cell)],
    [Paragraph("Duración", cellb), Paragraph("8 a 15 segundos, en BUCLE perfecto: la pose final debe ser igual que la inicial.", cell)],
    [Paragraph("Velocidad", cellb), Paragraph("Ritmo de aprendizaje (un punto más lento que en fiesta), movimiento claro.", cell)],
]
t = Table(data, colWidths=[28 * mm, 150 * mm])
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fff0f4")),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#eecdd6")),
    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f2dde3")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)

# Tempo
story.append(Paragraph("2 · Conteo y tempo (que coincida con el cuerpo)", h2))
story.append(Paragraph(
    "Graba a velocidad de aprendizaje y marca bien el conteo del género. El bucle del vídeo debe empezar y acabar en el \"1\" del compás. "
    "Ejemplos de conteo: <b>Bachata</b> = 1,2,3 - pausa - 5,6,7 - pausa &nbsp;|&nbsp; <b>Salsa</b> = 1,2,3 - 5,6,7 &nbsp;|&nbsp; <b>Merengue</b> = 1-2-1-2.",
    body))

# Estructura
story.append(Paragraph("3 · Estructura de la clase (módulos 1 → 10)", h2))
story.append(Paragraph(
    "Cada paso = <b>un movimiento claro</b> (no encadenes varias figuras). Numera los pasos del <b>1 al 10</b>, de lo simple a lo complejo: "
    "con 10 pasos se completa una clase. Mantén el <b>mismo encuadre y distancia</b> en los 10 vídeos. Al terminar, empieza otra serie "
    "(otro nivel o coreografía) de nuevo en el paso 1.",
    body))

# Subida
story.append(Paragraph("4 · Subida y prueba", h2))
story.append(Paragraph(
    "Formato: <b>MP4 (H.264)</b>, vertical 1080×1920 o 16:9 1920×1080. En el panel de administración → Coreógrafos → Pasos/Lecciones: "
    "sube el vídeo y rellena nº, nombre, género, nivel y el <b>conteo</b>. Entra a la clase y prueba: en \"Mírame\" debe verse el cuerpo entero; "
    "al bailar debe aparecer el indicador <b>MATCH %</b>. Si no aparece, revisa que sea MP4 (no enlace de YouTube) y que se vea todo el cuerpo.",
    body))

story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd"), spaceAfter=6))
story.append(Paragraph(
    "Regla de oro: <b>mismo encuadre · cuerpo entero · bucle limpio · conteo que coincida con el cuerpo.</b> "
    "Con eso el sistema sincroniza al alumno con tu baile de forma natural. &nbsp;— bailanow.com",
    small))

doc.build(story)
print("PDF generado:", OUT)
