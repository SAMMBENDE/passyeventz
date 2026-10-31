import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { formatPriceCents } from "@/lib/quote";
import { QuoteModel } from "@/models/quote";

const objectIdPattern = /^[\da-f]{24}$/i;
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;

function safePdfText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\u0020-\u00ff\u0152\u0153€]/g, "?");
}

function formatPdfDate(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ quoteId: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous." }, { status: 401 });
  }

  const { quoteId } = await context.params;
  if (!objectIdPattern.test(quoteId)) {
    return NextResponse.json({ error: "Identifiant de devis invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const quote = await QuoteModel.findById(quoteId)
      .select(
        "reference eventType eventDate guestCount customer.email customer.name customer.phone note services lineItems pricing status",
      )
      .lean();

    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }
    if (!quote.pricing || quote.lineItems.length === 0) {
      return NextResponse.json(
        { error: "Ajoutez les lignes et le tarif du devis avant de générer le PDF." },
        { status: 409 },
      );
    }

    const document = await PDFDocument.create();
    document.setTitle(`Devis ${quote.reference} - PassyEventz`);
    document.setAuthor("PassyEventz");
    document.setSubject(`Devis pour ${quote.eventType}`);

    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const pages = [];
    let page = document.addPage([pageWidth, pageHeight]);
    pages.push(page);
    let y = pageHeight - margin;

    const drawText = (
      text: string,
      x: number,
      top: number,
      size = 10,
      font = regular,
      color = rgb(0.13, 0.12, 0.1),
    ) => {
      page.drawText(safePdfText(text), { x, y: top - size, size, font, color });
    };

    const drawRule = (top: number) => {
      page.drawLine({
        start: { x: margin, y: top },
        end: { x: pageWidth - margin, y: top },
        thickness: 0.7,
        color: rgb(0.85, 0.81, 0.73),
      });
    };

    const newPage = () => {
      page = document.addPage([pageWidth, pageHeight]);
      pages.push(page);
      y = pageHeight - margin;
    };

    drawText("PASSYEVENTZ", margin, y, 13, bold, rgb(0.62, 0.43, 0.14));
    drawText("contact@passyeventz.com  |  +33 (0) 670 256 831", margin, y - 22, 9);
    drawText("www.passyeventz.com", margin, y - 37, 9);
    drawText("DEVIS", pageWidth - margin - 95, y - 6, 18, bold);
    y -= 62;
    drawRule(y);
    y -= 28;

    drawText(quote.reference, margin, y, 12, bold);
    drawText(`Établi le ${formatPdfDate(new Date())}`, margin, y - 18, 9);
    y -= 56;

    drawText("ÉVÉNEMENT", margin, y, 8, bold, rgb(0.42, 0.4, 0.36));
    drawText(quote.eventType, margin, y - 15, 13, bold);
    drawText(`Date : ${formatPdfDate(quote.eventDate)}`, margin, y - 36, 10);
    drawText(`Nombre d'invités : ${quote.guestCount}`, margin, y - 52, 10);

    drawText("CLIENT", 330, y, 8, bold, rgb(0.42, 0.4, 0.36));
    drawText(quote.customer.name ?? "Client PassyEventz", 330, y - 15, 11, bold);
    drawText(quote.customer.email, 330, y - 33, 9);
    if (quote.customer.phone) drawText(quote.customer.phone, 330, y - 48, 9);
    y -= 82;
    drawRule(y);
    y -= 24;

    drawText("DÉSIGNATION", margin, y, 8, bold, rgb(0.42, 0.4, 0.36));
    drawText("QTÉ", 380, y, 8, bold, rgb(0.42, 0.4, 0.36));
    drawText("PRIX UNIT.", 425, y, 8, bold, rgb(0.42, 0.4, 0.36));
    drawText("TOTAL", 500, y, 8, bold, rgb(0.42, 0.4, 0.36));
    y -= 12;
    drawRule(y);
    y -= 21;

    for (const item of quote.lineItems) {
      if (y < 105) {
        newPage();
        drawText("DÉSIGNATION", margin, y, 8, bold, rgb(0.42, 0.4, 0.36));
        drawText("QTÉ", 380, y, 8, bold, rgb(0.42, 0.4, 0.36));
        drawText("PRIX UNIT.", 425, y, 8, bold, rgb(0.42, 0.4, 0.36));
        drawText("TOTAL", 500, y, 8, bold, rgb(0.42, 0.4, 0.36));
        y -= 12;
        drawRule(y);
        y -= 21;
      }

      const label = item.label.length > 44 ? `${item.label.slice(0, 41)}...` : item.label;
      drawText(label, margin, y, 9);
      drawText(String(item.quantity), 380, y, 9);
      drawText(formatPriceCents(item.unitPriceCents), 425, y, 9);
      drawText(formatPriceCents(item.quantity * item.unitPriceCents), 500, y, 9);
      y -= 23;
    }

    if (y < 220) {
      newPage();
      drawText("RÉCAPITULATIF DU DEVIS", margin, y, 10, bold);
      y -= 24;
    }
    y -= 2;
    drawRule(y);
    y -= 22;
    const totals = [
      ["Sous-total", quote.pricing.subtotalCents],
      ["Livraison", quote.pricing.deliveryCents],
      ["Nettoyage", quote.pricing.cleaningCents],
      ["TVA", quote.pricing.taxCents],
    ] as const;
    for (const [label, amount] of totals) {
      drawText(label, 365, y, 9);
      drawText(formatPriceCents(amount), 475, y, 9);
      y -= 17;
    }
    drawRule(y);
    y -= 21;
    drawText("TOTAL TTC", 365, y, 11, bold);
    drawText(formatPriceCents(quote.pricing.totalCents), 475, y, 11, bold);
    y -= 23;
    drawText("Acompte demandé", 365, y, 9);
    drawText(formatPriceCents(quote.pricing.depositCents), 475, y, 9);
    y -= 17;
    drawText("Solde après avance", 365, y, 9);
    drawText(formatPriceCents(quote.pricing.balanceDueCents), 475, y, 9);

    if (quote.services.length > 0) {
      y -= 37;
      if (y < 80) newPage();
      drawText("PRESTATIONS", margin, y, 8, bold, rgb(0.42, 0.4, 0.36));
      y -= 18;
      for (const service of quote.services) {
        drawText(`- ${service}`, margin, y, 9);
        y -= 15;
      }
    }

    if (quote.note) {
      y -= 12;
      if (y < 80) newPage();
      drawText("VOTRE MESSAGE", margin, y, 8, bold, rgb(0.42, 0.4, 0.36));
      y -= 17;
      const note = quote.note.length > 500 ? `${quote.note.slice(0, 497)}...` : quote.note;
      for (let index = 0; index < note.length; index += 90) {
        if (y < 65) newPage();
        drawText(note.slice(index, index + 90), margin, y, 9);
        y -= 14;
      }
    }

    pages.forEach((currentPage, index) => {
      currentPage.drawText(
        safePdfText(`PassyEventz - ${quote.reference} - ${index + 1}/${pages.length}`),
        {
          x: margin,
          y: 28,
          size: 8,
          font: regular,
          color: rgb(0.45, 0.43, 0.4),
        },
      );
    });

    const bytes = await document.save();
    const filename = quote.reference.replace(/[^a-z\d_-]/gi, "_");
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}.pdf"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "Failed to generate quote PDF:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de générer le PDF pour le moment." },
      { status: 503 },
    );
  }
}
