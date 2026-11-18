import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { eventConfig } from "./config";

export type InvitationData = {
  fullName: string;
  invitationId: string;
};

export async function generateInvitationPdf(data: InvitationData) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([1024, 765]);
  const { width, height } = page.getSize();

  const fontPath = path.join(process.cwd(), "public/fonts/LiberationSerif-Italic.ttf");
  const fontBytes = await readFile(fontPath);
  const serifItalic = await pdf.embedFont(fontBytes);
  const gold = rgb(0.88, 0.62, 0.16);

  const cardPath = path.join(process.cwd(), "public/assets/enspec-invitation-card.png");
  const cardBytes = await readFile(cardPath);
  const card = await pdf.embedPng(cardBytes);
  page.drawImage(card, { x: 0, y: 0, width, height });

  const nameSize =
    data.fullName.length > 34 ? 32 :
    data.fullName.length > 24 ? 38 :
    46;
  const nameWidth = serifItalic.widthOfTextAtSize(data.fullName, nameSize);
  const nameX = Math.max(74, (width - nameWidth) / 2 - 7);
  page.drawText(data.fullName, {
    x: nameX,
    y: 430,
    size: nameSize,
    font: serifItalic,
    color: gold,
  });
  const lineWidth = Math.min(440, nameWidth + 90);
  page.drawLine({
    start: { x: (width - lineWidth) / 2 - 7, y: 405 },
    end: { x: (width + lineWidth) / 2 - 7, y: 405 },
    thickness: 1.2,
    color: gold,
  });

  // Keep the card fully personalized without adding extra visible text.
  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject(eventConfig.displayName);
  return pdf.save();
}
