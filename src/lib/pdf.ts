import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { eventConfig } from "./config";

export type InvitationData = {
  fullName: string;
  invitationId: string;
};

const W = 1024;
const H = 765;
const GOLD = rgb(0.86, 0.62, 0.2);
const GOLD_LIGHT = rgb(0.85, 0.68, 0.36);
const WHITE = rgb(1, 1, 1);

function safe(font: PDFFont, text: string) {
  const characters = new Set(font.getCharacterSet());
  return [...text].filter((character) => characters.has(character.codePointAt(0)!)).join("");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateInvitationPdf(data: InvitationData) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [cardBytes, scriptBytes, poppinsMediumBytes, poppinsBoldBytes] = await Promise.all([
    readFile(path.join(process.cwd(), "public/assets/enspec-invitation-card.png")),
    readFile(path.join(process.cwd(), "public/fonts/yellowtail-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "public/fonts/poppins-latin-500-normal.woff")),
    readFile(path.join(process.cwd(), "public/fonts/poppins-latin-600-normal.woff")),
  ]);
  const [script, poppinsMedium, poppinsBold] = await Promise.all(
    [scriptBytes, poppinsMediumBytes, poppinsBoldBytes].map((bytes) => pdf.embedFont(bytes, { subset: true })),
  );
  const card = await pdf.embedPng(cardBytes);
  const page = pdf.addPage([W, H]);
  const y = (top: number) => H - top;
  page.drawImage(card, { x: 0, y: 0, width: W, height: H });

  const name = safe(script, data.fullName);
  const centerX = 410;
  const maxWidth = 640;
  let size = 58;
  while (size > 34 && script.widthOfTextAtSize(name, size) > maxWidth) size -= 1;
  const lines = script.widthOfTextAtSize(name, size) > maxWidth
    ? wrap(name, script, 34, maxWidth).slice(0, 2)
    : [name];
  const lineGap = lines.length > 1 ? 32 : 0;
  const firstTop = lines.length > 1 ? 312 : 335;
  lines.forEach((line, index) => {
    const lineSize = lines.length > 1 ? 34 : size;
    const width = script.widthOfTextAtSize(line, lineSize);
    page.drawText(line, {
      x: centerX - width / 2,
      y: y(firstTop + index * lineGap),
      size: lineSize,
      font: script,
      color: GOLD,
    });
  });
  const underlineTop = firstTop + (lines.length - 1) * lineGap + (lines.length > 1 ? 10 : 14);
  const longest = Math.max(...lines.map((line) => script.widthOfTextAtSize(line, lines.length > 1 ? 34 : size)));
  const lineWidth = Math.min(maxWidth, longest + 60);
  page.drawLine({
    start: { x: centerX - lineWidth / 2, y: y(underlineTop) },
    end: { x: centerX + lineWidth / 2, y: y(underlineTop) },
    thickness: 1.2,
    color: GOLD,
    opacity: 0.8,
  });

  const infoX = 490;
  page.drawText("TIME:", { x: infoX, y: y(597), size: 19, font: poppinsBold, color: GOLD_LIGHT });
  const timeLabel = safe(poppinsMedium, eventConfig.timeLabel);
  page.drawText(timeLabel, {
    x: infoX + poppinsBold.widthOfTextAtSize("TIME:", 19) + 8,
    y: y(597),
    size: 19,
    font: poppinsMedium,
    color: WHITE,
  });
  page.drawLine({ start: { x: infoX, y: y(622) }, end: { x: infoX + 250, y: y(622) }, thickness: 0.8, color: GOLD, opacity: 0.45 });
  page.drawText("INVITATION ID", { x: infoX, y: y(652), size: 13, font: poppinsBold, color: GOLD_LIGHT });
  page.drawText(data.invitationId, { x: infoX, y: y(680), size: 22, font: poppinsBold, color: GOLD });

  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject(eventConfig.displayName);
  return pdf.save();
}
