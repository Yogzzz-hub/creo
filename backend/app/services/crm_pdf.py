"""PDF from the exact stored pricing snapshot, with escaped user text."""

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def proposal_pdf(proposal):
    output = BytesIO()
    data = proposal.snapshot
    brand = data.get("branding", {})
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(
        output,
        pagesize=(210 * mm, 297 * mm),
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=30 * mm,
        bottomMargin=22 * mm,
    )

    def para(value, style="BodyText"):
        return Paragraph(escape(str(value or "")).replace("\n", "<br/>"), styles[style])

    def money(amount):
        return f"{proposal.currency} {amount / 100:,.2f}"

    def page(canvas, document):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#1B2941"))
        canvas.setFont("Helvetica-Bold", 13)
        canvas.drawString(18 * mm, 281 * mm, brand.get("agency_name", "Creo")[:70])
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(192 * mm, 281 * mm, f"{proposal.number} / v{proposal.version}")
        canvas.line(18 * mm, 276 * mm, 192 * mm, 276 * mm)
        canvas.drawString(18 * mm, 13 * mm, brand.get("footer", "Proposal - confidential")[:100])
        canvas.drawRightString(192 * mm, 13 * mm, str(document.page))
        canvas.restoreState()

    content = [
        para(proposal.title, "Title"),
        Spacer(1, 5 * mm),
        para(data["client"].get("company"), "Heading2"),
        para(data["client"].get("name")),
        para(f"Valid until: {proposal.valid_until:%d %b %Y}"),
        Spacer(1, 5 * mm),
    ]
    for title, value in [
        (
            "Agency",
            "\n".join(
                filter(None, [brand.get("address"), brand.get("contact"), brand.get("tax_id")])
            ),
        ),
        ("Executive summary", data.get("summary")),
        ("Scope and deliverables", data.get("scope")),
    ]:
        if value:
            content.extend([para(title, "Heading2"), para(value), Spacer(1, 3 * mm)])
    for billing, totals in data["totals"].items():
        content.append(para(billing.replace("_", " ").title() + " charges", "Heading2"))
        rows = [[para("Service"), para("Qty"), para("Unit price"), para("Line total")]]
        for line in data["items"]:
            if line["billing"] == billing:
                rows.append(
                    [
                        para(
                            line["title"]
                            + ("\n" + line["description"] if line.get("description") else "")
                        ),
                        para(line["quantity"]),
                        para(money(line["unit_price"])),
                        para(money(line["total"])),
                    ]
                )
        table = Table(rows, colWidths=[86 * mm, 16 * mm, 34 * mm, 38 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E4EBF6")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ]
            )
        )
        content.extend(
            [
                table,
                para(
                    f"Subtotal: {money(totals['subtotal'])} | Discount: {money(totals['discount'])} | Tax: {money(totals['tax'])}"
                ),
                para(f"Total ({billing.replace('_', ' ')}): {money(totals['total'])}", "Heading3"),
            ]
        )
    content.extend([para("Terms and acceptance", "Heading2"), para(data.get("terms", ""))])
    doc.build(content, onFirstPage=page, onLaterPages=page)
    return output.getvalue()
