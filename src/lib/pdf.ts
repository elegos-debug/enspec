import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { eventConfig } from "./config";

export type InvitationData = {
  fullName: string;
  invitationId: string;
};

export async function generateInvitationPdf(data: InvitationData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([534, 414]);
  const { width, height } = page.getSize();

  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const navy = rgb(0.035, 0.055, 0.125);

  const cardPath = path.join(process.cwd(), "public/assets/enspec-invitation-card.png");
  const cardBytes = await readFile(cardPath);
  const card = await pdf.embedPng(cardBytes);
  page.drawImage(card, { x: 0, y: 0, width, height });

  // Remove the original golden card title, and place only the attendee name
  // in that position. The invitation artwork otherwise remains unchanged.
  page.drawRectangle({ x: 35, y: 224, width: 430, height: 58, color: navy });

  const nameSize =
    data.fullName.length > 34 ? 16 :
    data.fullName.length > 24 ? 20 :
    24;
  const nameWidth = serifItalic.widthOfTextAtSize(data.fullName, nameSize);
  const nameX = Math.max(35, (width - nameWidth) / 2);
  page.drawText(data.fullName, {
    x: nameX,
    y: 241,
    size: nameSize,
    font: serifItalic,
    color: rgb(0.98, 0.965, 0.91),
  });

  // Keep the card fully personalized without adding extra visible text.
  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject(eventConfig.displayName);
  return pdf.save();
}
