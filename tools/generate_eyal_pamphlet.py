from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "eyal_organic_oils_pamphlet.pdf"
LOGO = ROOT / "assets" / "eyal-logo-transparent.png"
DL = Path("/Users/hariharan/Downloads")

BRAND_NAME = "Eyal Chekku Oils"
PHONES = ["+91 97863 64331", "+91 98404 45725"]
PHONE_LINE = "  |  ".join(PHONES)
W, H = A4

CREAM = colors.HexColor("#FBF4EA")
PAPER = colors.HexColor("#FFFDF7")
GREEN = colors.HexColor("#0E5C32")
GREEN_DARK = colors.HexColor("#063F23")
GREEN_SOFT = colors.HexColor("#DFF2D2")
GOLD = colors.HexColor("#B27A2D")
GOLD_DARK = colors.HexColor("#8B5A1F")
INK = colors.HexColor("#24140D")
MUTED = colors.HexColor("#6E6458")
LINE = colors.HexColor("#DEC69E")


PRODUCTS_PAGE_2 = [
    {
        "name": "Cold Wood Pressed Coconut Oil",
        "short": "Coconut Oil",
        "tag": "Cold Wood Pressed",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (1).png",
        "crop": (110, 520, 1165, 1188),
        "prices": [("500 ml", "Rs. 200"), ("1 L", "Rs. 400"), ("5 L", "Rs. 1,970")],
    },
    {
        "name": "Cold Wood Pressed Sesame Oil",
        "short": "Sesame Oil",
        "tag": "Cold Wood Pressed",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (2).png",
        "crop": (290, 405, 1170, 1172),
        "prices": [("500 ml", "Rs. 210"), ("1 L", "Rs. 420"), ("5 L", "Rs. 2,050")],
    },
    {
        "name": "Cold Wood Pressed Groundnut Oil",
        "short": "Groundnut Oil",
        "tag": "Cold Wood Pressed",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (3).png",
        "crop": (70, 515, 1178, 1188),
        "prices": [("500 ml", "Rs. 130"), ("1 L", "Rs. 250"), ("5 L", "Rs. 1,220")],
    },
    {
        "name": "Mustard Oil",
        "short": "Mustard Oil",
        "tag": "Natural Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (4).png",
        "crop": (210, 475, 1160, 1190),
        "prices": [("200 ml", "Rs. 60")],
    },
    {
        "name": "Olive Oil",
        "short": "Olive Oil",
        "tag": "Natural Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (5).png",
        "crop": (285, 470, 1168, 1188),
        "prices": [("200 ml", "Rs. 200")],
    },
]

PRODUCTS_PAGE_3 = [
    {
        "name": "Neem Oil",
        "short": "Neem Oil",
        "tag": "Natural Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (6).png",
        "crop": (245, 515, 1184, 1182),
        "prices": [("200 ml", "Rs. 70")],
    },
    {
        "name": "Castor Oil",
        "short": "Castor Oil",
        "tag": "Natural Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_45_24 PM.png",
        "crop": (85, 470, 1170, 1186),
        "prices": [("200 ml", "Rs. 70"), ("500 ml", "Rs. 150")],
    },
    {
        "name": "Deepa Oil",
        "short": "Deepa Oil",
        "tag": "Lamp Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (7).png",
        "crop": (150, 470, 1180, 1188),
        "prices": [("500 ml", "Rs. 110"), ("1 L", "Rs. 210")],
    },
    {
        "name": "Iluppa Oil (Mahua Oil)",
        "short": "Iluppa Oil",
        "tag": "Mahua Oil",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (8).png",
        "crop": (245, 505, 1180, 1188),
        "prices": [("200 ml", "Rs. 60")],
    },
    {
        "name": "Homemade Rosemary Hair Oil",
        "short": "Rosemary Hair Oil",
        "tag": "Homemade",
        "image": DL / "ChatGPT Image Jun 28, 2026, 05_35_39 PM (9).png",
        "crop": (120, 520, 1165, 1184),
        "prices": [("200 ml", "Rs. 200")],
    },
]


def register_fonts():
    fonts = {
        "EyalSans": "/System/Library/Fonts/Supplemental/Arial.ttf",
        "EyalSans-Bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "EyalSerif": "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "EyalSerif-Bold": "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
    }
    for name, path in fonts.items():
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))


def font(family="sans", weight="regular"):
    if family == "serif":
        if weight == "bold" and "EyalSerif-Bold" in pdfmetrics.getRegisteredFontNames():
            return "EyalSerif-Bold"
        if "EyalSerif" in pdfmetrics.getRegisteredFontNames():
            return "EyalSerif"
        return "Times-Bold" if weight == "bold" else "Times-Roman"
    if weight == "bold" and "EyalSans-Bold" in pdfmetrics.getRegisteredFontNames():
        return "EyalSans-Bold"
    if "EyalSans" in pdfmetrics.getRegisteredFontNames():
        return "EyalSans"
    return "Helvetica-Bold" if weight == "bold" else "Helvetica"


def wrap_lines(c, text, max_width, font_name, size):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if c.stringWidth(test, font_name, size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def centered_wrapped(c, text, x, y, max_width, font_name, size, leading, color):
    c.setFillColor(color)
    c.setFont(font_name, size)
    lines = wrap_lines(c, text, max_width, font_name, size)
    for idx, line in enumerate(lines):
        c.drawCentredString(x, y - idx * leading, line)
    return y - len(lines) * leading


def draw_background(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.42))
    c.circle(W - 66, H - 88, 118, stroke=0, fill=1)
    c.setFillColor(colors.Color(0.05, 0.36, 0.18, alpha=0.08))
    c.circle(42, 96, 130, stroke=0, fill=1)
    draw_corner_pattern(c, 28, H - 36, 1)
    draw_corner_pattern(c, W - 28, H - 36, -1)
    draw_corner_pattern(c, 28, 78, 1)
    draw_corner_pattern(c, W - 28, 78, -1)


def draw_leaf(c, x, y, size, angle=0, fill=None):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFillColor(fill or GREEN)
    p = c.beginPath()
    p.moveTo(0, 0)
    p.curveTo(size * 0.45, size * 0.2, size * 0.56, size * 0.82, 0, size)
    p.curveTo(-size * 0.56, size * 0.82, -size * 0.45, size * 0.2, 0, 0)
    c.drawPath(p, stroke=0, fill=1)
    c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.5))
    c.setLineWidth(0.55)
    c.line(0, size * 0.18, 0, size * 0.82)
    c.restoreState()


def draw_corner_pattern(c, x, y, direction=1):
    c.saveState()
    c.translate(x, y)
    c.scale(direction, 1)
    c.setStrokeColor(colors.Color(0.7, 0.48, 0.18, alpha=0.55))
    c.setLineWidth(0.7)
    c.line(0, 0, 34, 0)
    c.line(0, 0, 0, -34)
    for i in range(3):
        draw_leaf(c, 12 + i * 9, -11 - i * 7, 8, -35, colors.Color(0.05, 0.36, 0.18, alpha=0.38))
    c.restoreState()


def draw_brand_rule(c, y, label=BRAND_NAME, size=13):
    f = font("serif")
    c.setFont(f, size)
    text_w = c.stringWidth(label, f, size)
    gap = 18
    line_len = 70
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(W / 2 - text_w / 2 - gap - line_len, y, W / 2 - text_w / 2 - gap, y)
    c.line(W / 2 + text_w / 2 + gap, y, W / 2 + text_w / 2 + gap + line_len, y)
    c.setFillColor(INK)
    c.drawCentredString(W / 2, y - size / 3, label)


def draw_image_cover(c, image_reader, x, y, box_w, box_h):
    img_w, img_h = image_reader.getSize()
    scale = max(box_w / img_w, box_h / img_h)
    draw_w = img_w * scale
    draw_h = img_h * scale
    draw_x = x + (box_w - draw_w) / 2
    draw_y = y + (box_h - draw_h) / 2
    c.saveState()
    p = c.beginPath()
    p.rect(x, y, box_w, box_h)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(image_reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
    c.restoreState()


def draw_image_contain(c, image_reader, x, y, box_w, box_h):
    img_w, img_h = image_reader.getSize()
    scale = min(box_w / img_w, box_h / img_h)
    draw_w = img_w * scale
    draw_h = img_h * scale
    draw_x = x + (box_w - draw_w) / 2
    draw_y = y + (box_h - draw_h) / 2
    c.drawImage(image_reader, draw_x, draw_y, draw_w, draw_h, mask="auto")


def product_image_reader(product):
    image = Image.open(product["image"]).convert("RGB")
    return ImageReader(image.crop(product["crop"]))


def draw_logo(c, x, y, w):
    logo = ImageReader(str(LOGO))
    iw, ih = logo.getSize()
    h = w * ih / iw
    c.drawImage(logo, x, y, w, h, preserveAspectRatio=True, mask="auto")
    return h


def draw_footer(c, page_label=None):
    y = 42
    c.setStrokeColor(colors.Color(0.7, 0.48, 0.18, alpha=0.75))
    c.setLineWidth(0.85)
    c.line(58, y + 20, W / 2 - 105, y + 20)
    c.line(W / 2 + 105, y + 20, W - 58, y + 20)
    c.setFillColor(GREEN_DARK)
    c.setFont(font("serif", "bold"), 10.8)
    c.drawCentredString(W / 2, y + 15, PHONE_LINE)
    c.setFillColor(MUTED)
    c.setFont(font("sans"), 7.4)
    text = BRAND_NAME
    if page_label:
        text = f"{text} - {page_label}"
    c.drawCentredString(W / 2, y, text)


def draw_cover(c):
    draw_background(c)
    c.setFillColor(GREEN)
    c.rect(0, H - 118, W, 118, stroke=0, fill=1)
    c.setFillColor(GREEN_SOFT)
    c.circle(W / 2, H - 112, 112, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.circle(W / 2, H - 116, 98, stroke=0, fill=1)

    logo_w = 166
    logo_h = draw_logo(c, (W - logo_w) / 2, H - 167, logo_w)

    c.setFillColor(INK)
    c.setFont(font("serif", "bold"), 29)
    c.drawCentredString(W / 2, H - 284, BRAND_NAME)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.1)
    c.line(W / 2 - 142, H - 302, W / 2 + 142, H - 302)

    c.setFillColor(GREEN_DARK)
    c.setFont(font("serif", "bold"), 42)
    c.drawCentredString(W / 2, H - 360, "Straight From")
    c.drawCentredString(W / 2, H - 410, "The Field")

    body = (
        "Natural oils selected with care, traditionally pressed, and packed for everyday home use. "
        "A calm, honest range for cooking, wellness, hair care and traditional needs."
    )
    centered_wrapped(c, body, W / 2, H - 448, 420, font("sans"), 12.2, 18, MUTED)

    cards = [
        ("Straight From The Field", "Selected ingredients with natural aroma and character."),
        ("Traditional Pressing", "Slow, familiar methods that respect the oil's taste."),
        ("Naturally Packed", "Clean, simple presentation for family use."),
    ]
    card_w = 158
    start_x = (W - card_w * 3 - 18 * 2) / 2
    y = 208
    for idx, (title, desc) in enumerate(cards):
        x = start_x + idx * (card_w + 18)
        c.setFillColor(PAPER)
        c.roundRect(x, y, card_w, 116, 10, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.roundRect(x, y, card_w, 116, 10, stroke=1, fill=0)
        draw_leaf(c, x + card_w / 2, y + 74, 25, -24, GREEN)
        centered_wrapped(c, title, x + card_w / 2, y + 54, card_w - 20, font("sans", "bold"), 10.3, 12, GREEN_DARK)
        centered_wrapped(c, desc, x + card_w / 2, y + 30, card_w - 24, font("sans"), 8.3, 11, MUTED)

    draw_footer(c, "Orders and enquiries")
    c.showPage()


def draw_price_table(c, x, y, w, prices, compact=False):
    row_h = 18 if compact else 19
    h = row_h * len(prices)
    c.setFillColor(colors.HexColor("#FCF7EE"))
    c.roundRect(x, y, w, h, 5, stroke=0, fill=1)
    c.setStrokeColor(colors.Color(0.7, 0.48, 0.18, alpha=0.55))
    c.setLineWidth(0.65)
    c.roundRect(x, y, w, h, 5, stroke=1, fill=0)
    divider_x = x + w * 0.46
    c.line(divider_x, y + 3, divider_x, y + h - 3)
    for idx in range(1, len(prices)):
        yy = y + idx * row_h
        c.line(x + 6, yy, x + w - 6, yy)

    for idx, (unit, price) in enumerate(prices):
        yy = y + h - (idx + 1) * row_h
        is_family = unit == "5 L"
        c.setFillColor(GREEN_DARK if is_family else INK)
        c.setFont(font("sans", "bold"), 7.1 if compact else 7.5)
        c.drawString(x + 9, yy + 5.4, unit)
        c.setFont(font("serif", "bold"), 8 if compact else 8.5)
        c.drawRightString(x + w - 9, yy + 4.7, price)


def draw_castor_placeholder(c, x, y, w, h):
    c.setFillColor(colors.HexColor("#F6E9D5"))
    c.rect(x, y, w, h, stroke=0, fill=1)
    c.setFillColor(colors.Color(0.05, 0.36, 0.18, alpha=0.12))
    c.circle(x + w * 0.74, y + h * 0.72, h * 0.34, stroke=0, fill=1)
    for lx, ly, size, angle in [
        (x + w * 0.22, y + h * 0.72, 24, -30),
        (x + w * 0.82, y + h * 0.26, 20, 26),
        (x + w * 0.44, y + h * 0.24, 18, -8),
    ]:
        draw_leaf(c, lx, ly, size, angle, GREEN)

    bottle_w = w * 0.3
    bottle_h = h * 0.68
    bx = x + w * 0.36
    by = y + h * 0.16
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.12))
    c.ellipse(bx - 8, by - 5, bx + bottle_w + 10, by + 8, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#E2B35D"))
    c.roundRect(bx, by, bottle_w, bottle_h, 10, stroke=0, fill=1)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.45))
    c.roundRect(bx + 6, by + 9, bottle_w * 0.18, bottle_h - 18, 5, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#6E3F18"))
    c.roundRect(bx + bottle_w * 0.28, by + bottle_h - 2, bottle_w * 0.44, h * 0.18, 4, stroke=0, fill=1)
    c.setFillColor(PAPER)
    c.roundRect(bx + bottle_w * 0.14, by + bottle_h * 0.35, bottle_w * 0.72, bottle_h * 0.3, 4, stroke=0, fill=1)
    c.setFillColor(GREEN_DARK)
    c.setFont(font("serif", "bold"), 8.4)
    c.drawCentredString(bx + bottle_w / 2, by + bottle_h * 0.49, "CASTOR")
    c.drawCentredString(bx + bottle_w / 2, by + bottle_h * 0.39, "OIL")


def draw_product_card(c, x, y, w, h, product, compact=False):
    c.setFillColor(PAPER)
    c.roundRect(x, y, w, h, 10, stroke=0, fill=1)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.75)
    c.roundRect(x, y, w, h, 10, stroke=1, fill=0)

    image_h = h * (0.47 if compact else 0.49)
    image_x = x + 10
    image_y = y + h - image_h - 10
    image_w = w - 20
    c.setFillColor(colors.HexColor("#F6E9D5"))
    c.roundRect(image_x, image_y, image_w, image_h, 8, stroke=0, fill=1)
    c.saveState()
    p = c.beginPath()
    p.roundRect(image_x, image_y, image_w, image_h, 8)
    c.clipPath(p, stroke=0, fill=0)
    if product.get("image"):
        draw_image_contain(c, product_image_reader(product), image_x + 3, image_y + 3, image_w - 6, image_h - 6)
    else:
        draw_castor_placeholder(c, image_x, image_y, image_w, image_h)
    c.restoreState()

    badge_w = min(w - 48, 124)
    c.setFillColor(GOLD_DARK)
    c.roundRect(x + (w - badge_w) / 2, image_y - 10, badge_w, 20, 10, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont(font("sans", "bold"), 6.6 if compact else 7.4)
    c.drawCentredString(x + w / 2, image_y - 3, product["tag"].upper())

    name_size = 10.2 if compact else 12.6
    name_y = image_y - 31
    title_bottom = centered_wrapped(
        c,
        product["short"].upper(),
        x + w / 2,
        name_y,
        w - 22,
        font("serif", "bold"),
        name_size,
        name_size + 2,
        GREEN_DARK,
    )

    if len(product["prices"]) <= 2:
        c.setFillColor(MUTED)
        c.setFont(font("sans"), 7.3 if compact else 8)
        c.drawCentredString(x + w / 2, min(title_bottom - 2, y + 66), "Premium natural oil")

    row_w = w - 24
    draw_price_table(c, x + 12, y + 13, row_w, product["prices"], compact=compact)


def draw_products_page(c, title, subtitle, products):
    draw_background(c)
    draw_brand_rule(c, H - 50)
    c.setFillColor(INK)
    c.setFont(font("serif", "bold"), 29)
    c.drawCentredString(W / 2, H - 104, title)
    c.setFillColor(MUTED)
    c.setFont(font("sans"), 10)
    c.drawCentredString(W / 2, H - 126, subtitle)

    top_y = 394
    top_w = 238
    top_h = 292
    draw_product_card(c, 46, top_y, top_w, top_h, products[0])
    draw_product_card(c, W - 46 - top_w, top_y, top_w, top_h, products[1])

    bottom_w = 158
    bottom_h = 238
    bottom_y = 130
    gap = (W - 46 * 2 - bottom_w * 3) / 2
    for idx, product in enumerate(products[2:]):
        draw_product_card(c, 46 + idx * (bottom_w + gap), bottom_y, bottom_w, bottom_h, product, compact=True)

    draw_footer(c, "Orders and enquiries")
    c.showPage()


def validate_assets():
    missing = []
    if not LOGO.exists():
        missing.append(str(LOGO))
    for product in PRODUCTS_PAGE_2 + PRODUCTS_PAGE_3:
        if product.get("image") and not product["image"].exists():
            missing.append(str(product["image"]))
    if missing:
        raise FileNotFoundError("Missing required asset(s): " + ", ".join(missing))


def build():
    validate_assets()
    register_fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle(f"{BRAND_NAME} - 3 Page Brochure")
    c.setAuthor(BRAND_NAME)

    draw_cover(c)
    draw_products_page(c, "Cold Wood Pressed Oils", "Coconut, sesame, groundnut and everyday cooking oils", PRODUCTS_PAGE_2)
    draw_products_page(c, "Natural Oils & Hair Care", "Traditional oils for wellness, lamp use and hair care", PRODUCTS_PAGE_3)

    c.save()
    return OUT


if __name__ == "__main__":
    print(build())
