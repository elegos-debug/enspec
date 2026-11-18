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
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.035, 0.055, 0.125);
  const gold = rgb(0.72, 0.49, 0.12);
  const cream = rgb(0.98, 0.965, 0.91);
  const slate = rgb(0.68, 0.70, 0.75);

  const referencePath = path.join(process.cwd(), "public/assets/enspec-invitation-reference.png");
  const referenceBytes = await readFile(referencePath);
  const reference = await pdf.embedPng(referenceBytes);
  page.drawImage(reference, { x: 0, y: 0, width, height });

  // Replace the reference's sample welcome copy with the real attendee name.
  page.drawRectangle({ x: 66, y: 195, width: 380, height: 135, color: navy });
  page.drawText("PERSONALLY INVITED", {
    x: 82,
    y: 292,
    size: 10,
    font: sansBold,
    color: gold,
  });

  const nameSize =
    data.fullName.length > 34 ? 19 :
    data.fullName.length > 24 ? 23 :
    28;
  const nameWidth = serifItalic.widthOfTextAtSize(data.fullName, nameSize);
  const nameX = nameWidth > 330
    ? 82
    : 82 + (330 - nameWidth) / 2;
  page.drawText(data.fullName, {
    x: nameX,
    y: 246,
    size: nameSize,
    font: serifItalic,
    color: cream,
  });
  page.drawLine({ start: { x: 82, y: 228 }, end: { x: 410, y: 228 }, thickness: 1, color: gold });
  page.drawText(`REGISTRATION ID  ${data.invitationId}`, {
    x: 82,
    y: 207,
    size: 8,
    font: sansBold,
    color: slate,
  });

  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject(eventConfig.displayName);
  return pdf.save();
}
