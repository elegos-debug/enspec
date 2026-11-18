import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { eventConfig } from "./config";

export type InvitationData = {
  fullName: string;
  invitationId: string;
};

export async function generateInvitationPdf(data: InvitationData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.035, 0.055, 0.125);
  const gold = rgb(0.72, 0.49, 0.12);
  const cream = rgb(0.98, 0.965, 0.91);
  const white = rgb(1, 1, 1);
  const slate = rgb(0.68, 0.70, 0.75);

  page.drawRectangle({ x: 0, y: 0, width, height, color: navy });
  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: gold, borderWidth: 1.5 });
  page.drawRectangle({ x: 42, y: 42, width: width - 84, height: height - 84, borderColor: rgb(0.38, 0.29, 0.12), borderWidth: 0.7 });

  // ADE — ENSET — ENSPEC wordmarks, matching the reference's left / center / right hierarchy.
  page.drawText("ADE", { x: 68, y: height - 103, size: 26, font: sansBold, color: white });
  page.drawText("ENSET", { x: 242, y: height - 103, size: 24, font: sansBold, color: white });
  page.drawText("ENSPEC", { x: 430, y: height - 103, size: 20, font: sansBold, color: gold });
  page.drawLine({ start: { x: 68, y: height - 122 }, end: { x: width - 68, y: height - 122 }, thickness: 1, color: gold });

  page.drawText("YOU'RE INVITED", { x: 68, y: height - 205, size: 15, font: sansBold, color: gold });
  page.drawText("KICK-OFF", { x: 68, y: height - 258, size: 64, font: serifBold, color: cream });
  page.drawText("EVENT", { x: 68, y: height - 318, size: 64, font: serifBold, color: gold });

  page.drawText("English Speakers Community", { x: 68, y: height - 370, size: 20, font: serif, color: white });
  page.drawText("Let’s English Together!", { x: 68, y: height - 398, size: 18, font: serif, color: gold });

  page.drawText("Dear", { x: 68, y: 365, size: 13, font: sans, color: slate });
  const nameSize = data.fullName.length > 38 ? 22 : 28;
  page.drawText(data.fullName, { x: 68, y: 328, size: nameSize, font: serifBold, color: cream });

  const welcome =
    "We are delighted to welcome you to the ENSPEC community. Join us as we celebrate the beginning of a new journey of communication, creativity, and connection.";
  const words = welcome.split(" ");
  let line = "";
  let y = 286;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (sans.widthOfTextAtSize(candidate, 11) > 430) {
      page.drawText(line, { x: 68, y, size: 11, font: sans, color: white });
      y -= 18;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) page.drawText(line, { x: 68, y, size: 11, font: sans, color: white });

  page.drawRectangle({ x: 68, y: 120, width: 459, height: 92, borderColor: gold, borderWidth: 1, color: rgb(0.075, 0.09, 0.16) });
  page.drawText("DATE", { x: 88, y: 183, size: 9, font: sansBold, color: gold });
  page.drawText(eventConfig.dateLabel, { x: 88, y: 162, size: 13, font: sansBold, color: cream });
  page.drawText("TIME", { x: 88, y: 139, size: 9, font: sansBold, color: gold });
  page.drawText(eventConfig.timeLabel, { x: 145, y: 139, size: 12, font: sansBold, color: cream });
  page.drawText("LOCATION", { x: 310, y: 139, size: 9, font: sansBold, color: gold });
  page.drawText("Salle 10 — ENSET Mohammedia", { x: 310, y: 162, size: 11, font: sansBold, color: cream });

  page.drawText(`Registration ID  ${data.invitationId}`, { x: 68, y: 72, size: 10, font: sansBold, color: gold });
  page.drawText("ENGLISH SPEAKERS COMMUNITY", { x: 329, y: 72, size: 8, font: sansBold, color: slate });

  pdf.setTitle(`ENSPEC Invitation - ${data.invitationId}`);
  pdf.setAuthor("ENSPEC English Speakers Community");
  pdf.setSubject("ENSPEC Club Kickoff Invitation");
  return pdf.save();
}
