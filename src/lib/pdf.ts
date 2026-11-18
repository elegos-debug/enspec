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
  const page = pdf.addPage([1024, 765]);
  const { width, height } = page.getSize();

  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const cream = rgb(0.98, 0.965, 0.91);

  const cardPath = path.join(process.cwd(), "public/assets/enspec-invitation-card.png");
  const cardBytes = await readFile(cardPath);
  const card = await pdf.embedPng(cardBytes);
  page.drawImage(card, { x: 0, y: 0, width, height });

  const nameSize =
    data.fullName.length > 34 ? 28 :
    data.fullName.length > 24 ? 34 :
    42;
  const nameWidth = serifItalic.widthOfTextAtSize(data.fullName, nameSize);
  const nameX = 82;
  page.drawText(data.fullName, {
    x: nameX,
    y: 430,
    size: nameSize,
    font: serifItalic,
    color: cream,
  });

  // Keep the card fully personalized without adding extra visible text.
  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject(eventConfig.displayName);
  return pdf.save();
}
