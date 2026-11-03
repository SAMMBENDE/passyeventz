import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { formatPriceCents } from "@/lib/quote";
import {
  quoteDepositBasisPoints,
  quoteTerms,
  washingPricePerPersonCents,
} from "@/lib/quote-terms";
import { QuoteModel } from "@/models/quote";

const objectIdPattern = /^[\da-f]{24}$/i;
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 44;
const contentBottom = 145;

const colors = {
  black: rgb(0.09, 0.08, 0.07),
  charcoal: rgb(0.16, 0.15, 0.13),
  gold: rgb(0.77, 0.63, 0.35),
  ivory: rgb(0.97, 0.95, 0.91),
  muted: rgb(0.42, 0.4, 0.36),
  line: rgb(0.86, 0.83, 0.77),
  white: rgb(1, 1, 1),
};

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

function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
): string[] {
  const words = safePdfText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
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
        "reference eventType eventDate guestCount cleaningChoice termsAcceptedAt termsVersion customer.email customer.name customer.phone note services lineItems pricing status",
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
    const logo = await document.embedPng(
      await readFile(join(process.cwd(), "public/images/passyeventz-logo.png")),
    );
    const pages: PDFPage[] = [];
    let page = document.addPage([pageWidth, pageHeight]);
    pages.push(page);
    let y = pageHeight - margin;

    const drawText = (
      text: string,
      x: number,
      top: number,
      size = 10,
      font = regular,
      color = colors.charcoal,
    ) => {
      page.drawText(safePdfText(text), { x, y: top - size, size, font, color });
    };

    const drawRule = (top: number, x1 = margin, x2 = pageWidth - margin, color = colors.line) => {
      page.drawLine({
        start: { x: x1, y: top },
        end: { x: x2, y: top },
        thickness: 0.65,
        color,
      });
    };

    const drawPageHeader = (firstPage: boolean) => {
      const bannerHeight = firstPage ? 142 : 74;
      page.drawRectangle({
        x: 0,
        y: pageHeight - bannerHeight,
        width: pageWidth,
        height: bannerHeight,
        color: colors.black,
      });
      page.drawRectangle({
        x: 0,
        y: pageHeight - bannerHeight - 2,
        width: pageWidth,
        height: 2,
        color: colors.gold,
      });

      if (firstPage) {
        const logoDims = logo.scale(0.075);
        page.drawImage(logo, {
          x: margin - 6,
          y: pageHeight - 120,
          width: logoDims.width,
          height: logoDims.height,
        });
        drawText("DEVIS", 385, pageHeight - 43, 24, bold, colors.white);
        drawText(quote.reference, 385, pageHeight - 73, 11, bold, colors.gold);
        drawText("DÉCORATION · ÉVÉNEMENTIEL · LOCATION", 385, pageHeight - 94, 7, regular, colors.white);
        drawText("N° SIRET 10700501900016", 385, pageHeight - 112, 8, regular, colors.white);
        drawText("contact@passyeventz.com  |  +33 (0) 670 256 831", margin, pageHeight - 130, 8, regular, colors.white);
        y = pageHeight - bannerHeight - 26;
      } else {
        drawText("PASSYEVENTZ", margin, pageHeight - 31, 10, bold, colors.gold);
        drawText(`DEVIS ${quote.reference} - SUITE`, pageWidth - margin - 180, pageHeight - 31, 9, bold, colors.white);
        y = pageHeight - bannerHeight - 28;
      }
    };

    const drawFooter = (currentPage: (typeof pages)[number], pageIndex: number) => {
      const top = 120;
      currentPage.drawLine({
        start: { x: margin, y: top + 8 },
        end: { x: pageWidth - margin, y: top + 8 },
        thickness: 0.65,
        color: colors.line,
      });
      currentPage.drawText("CONDITIONS", {
        x: margin,
        y: top - 6,
        size: 6,
        font: bold,
        color: colors.muted,
      });
      let termsY = top - 10;

      for (const term of quoteTerms) {
        const lines = wrapText(`${term.title} : ${term.text}`, pageWidth - margin * 2, regular, 5.2);
        for (const line of lines) {
          currentPage.drawText(line, {
            x: margin,
            y: termsY - 5.2,
            size: 5.2,
            font: regular,
            color: colors.muted,
          });
          termsY -= 7;
        }
      }

      if (quote.termsAcceptedAt) {
        currentPage.drawText(
          safePdfText(`Conditions acceptées le ${formatPdfDate(quote.termsAcceptedAt)}.`),
          { x: margin, y: 38, size: 6, font: regular, color: colors.muted },
        );
      }
      currentPage.drawText(safePdfText(`PassyEventz · SIRET 10700501900016 · ${quote.reference} · ${pageIndex + 1}/${pages.length}`), {
        x: margin,
        y: 25,
        size: 7,
        font: regular,
        color: colors.muted,
      });
    };

    const newPage = () => {
      page = document.addPage([pageWidth, pageHeight]);
      pages.push(page);
      drawPageHeader(false);
    };

    drawPageHeader(true);
    drawText("DEVIS PERSONNALISÉ", margin, y, 8, bold, colors.gold);
    drawText(`Établi le ${formatPdfDate(new Date())}`, margin, y - 16, 9, regular, colors.muted);
    y -= 42;

    page.drawRectangle({
      x: margin,
      y: y - 66,
      width: pageWidth - margin * 2,
      height: 66,
      color: colors.ivory,
    });
    drawText("VOTRE ÉVÉNEMENT", margin + 14, y - 12, 7, bold, colors.muted);
    drawText(quote.eventType, margin + 14, y - 27, 13, bold, colors.black);
    drawText(`Date : ${formatPdfDate(quote.eventDate)}  ·  ${quote.guestCount} invités`, margin + 14, y - 47, 9);
    drawText("VOTRE CONTACT", 330, y - 12, 7, bold, colors.muted);
    drawText(quote.customer.name ?? "Client PassyEventz", 330, y - 27, 10, bold);
    drawText(quote.customer.email, 330, y - 44, 8);
    if (quote.customer.phone) drawText(quote.customer.phone, 330, y - 57, 8);
    y -= 91;

    drawText("DÉTAIL DES PRESTATIONS", margin, y, 9, bold, colors.black);
    drawText("Une proposition imaginée pour votre réception", margin, y - 15, 8, regular, colors.muted);
    y -= 34;

    const drawTableHeader = () => {
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width: pageWidth - margin * 2,
        height: 22,
        color: colors.ivory,
      });
      drawText("DÉSIGNATION", margin + 10, y - 7, 7, bold, colors.muted);
      drawText("QTÉ", 365, y - 7, 7, bold, colors.muted);
      drawText("PRIX UNIT.", 410, y - 7, 7, bold, colors.muted);
      drawText("TOTAL", 493, y - 7, 7, bold, colors.muted);
      y -= 31;
    };

    drawTableHeader();
    for (const [index, item] of quote.lineItems.entries()) {
      if (y < contentBottom + 34) {
        newPage();
        drawTableHeader();
      }
      const label = item.label.length > 50 ? `${item.label.slice(0, 47)}...` : item.label;
      if (index % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - 18,
          width: pageWidth - margin * 2,
          height: 20,
          color: rgb(0.99, 0.985, 0.97),
        });
      }
      drawText(label, margin + 10, y, 8.5);
      drawText(String(item.quantity), 365, y, 8.5);
      drawText(formatPriceCents(item.unitPriceCents), 410, y, 8.5);
      drawText(formatPriceCents(item.quantity * item.unitPriceCents), 493, y, 8.5, bold);
      y -= 22;
    }

    if (y < contentBottom + 180) newPage();
    y -= 8;
    drawRule(y);
    y -= 18;
    const washingLabel =
      quote.cleaningChoice === "passyeventz"
        ? `Lavage (${quote.guestCount} pers. × ${formatPriceCents(washingPricePerPersonCents)})`
        : quote.cleaningChoice === "customer"
          ? "Lavage (réalisé par le client)"
          : "Lavage / nettoyage";
    const totals = [
      ["Sous-total", quote.pricing.subtotalCents],
      ["Livraison", quote.pricing.deliveryCents],
      [washingLabel, quote.pricing.cleaningCents],
      ["TVA", quote.pricing.taxCents],
    ] as const;
    for (const [label, amount] of totals) {
      drawText(label, 365, y, 8.5, regular, colors.muted);
      drawText(formatPriceCents(amount), 485, y, 8.5);
      y -= 16;
    }
    y -= 2;
    drawRule(y);
    y -= 19;

    page.drawRectangle({
      x: 352,
      y: y - 38,
      width: pageWidth - margin - 352,
      height: 40,
      color: colors.black,
    });
    drawText("TOTAL TTC", 363, y - 7, 9, bold, colors.white);
    drawText(formatPriceCents(quote.pricing.totalCents), 465, y - 7, 10, bold, colors.gold);
    y -= 55;
    const depositBasisPoints = quote.pricing.depositBasisPoints ?? quoteDepositBasisPoints;
    drawText(`Acompte à la réservation (${depositBasisPoints / 100} %)`, 365, y, 8.5, regular, colors.muted);
    drawText(formatPriceCents(quote.pricing.depositCents), 485, y, 8.5, bold);
    y -= 16;
    drawText("Solde après acompte", 365, y, 8.5, regular, colors.muted);
    drawText(formatPriceCents(Math.max(quote.pricing.totalCents - quote.pricing.depositCents, 0)), 485, y, 8.5, bold);

    if (quote.services.length > 0) {
      y -= 28;
      if (y < contentBottom + 30) newPage();
      drawText("PRESTATIONS INCLUSES", margin, y, 7, bold, colors.muted);
      y -= 14;
      for (const service of quote.services) {
        const lines = wrapText(`- ${service}`, pageWidth - margin * 2, regular, 8);
        for (const line of lines) {
          if (y < contentBottom + 10) newPage();
          drawText(line, margin, y, 8);
          y -= 12;
        }
      }
    }

    if (quote.note) {
      y -= 9;
      if (y < contentBottom + 30) newPage();
      drawText("VOTRE MESSAGE", margin, y, 7, bold, colors.muted);
      y -= 13;
      for (const line of wrapText(quote.note, pageWidth - margin * 2, regular, 8)) {
        if (y < contentBottom + 10) newPage();
        drawText(line, margin, y, 8);
        y -= 12;
      }
    }

    if (y < contentBottom + 66) newPage();
    y -= 8;
    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: pageWidth - margin * 2,
      height: 48,
      color: colors.ivory,
    });
    drawText("BON POUR ACCORD", margin + 12, y - 9, 7, bold, colors.muted);
    drawText("Date :", margin + 12, y - 25, 7, regular, colors.muted);
    drawRule(y - 36, margin + 42, margin + 170);
    drawText("Signature du client :", margin + 250, y - 25, 7, regular, colors.muted);
    drawRule(y - 36, margin + 340, pageWidth - margin - 12);

    pages.forEach((currentPage, index) => drawFooter(currentPage, index));

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
