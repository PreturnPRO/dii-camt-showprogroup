import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "../config/env";
import { thaiDay } from "./attendance";

const commonFontCandidates = () => {
  switch (os.platform()) {
    case "win32":
      return [
        "C:\\Windows\\Fonts\\LeelawUI.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
      ];
    case "darwin":
      return [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
      ];
    default:
      return [
        "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      ];
  }
};

const resolvePdfFontPath = () => {
  const candidates = [env.PDF_FONT_PATH, ...commonFontCandidates()].filter(
    (value): value is string => Boolean(value),
  );

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const createPdfBuffer = async (draw: (doc: PDFKit.PDFDocument) => void) =>
  new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: "A4",
    });
    const buffers: Buffer[] = [];
    const fontPath = resolvePdfFontPath();

    if (fontPath) {
      doc.font(fontPath);
    }

    doc.on("data", (chunk) => {
      buffers.push(Buffer.from(chunk));
    });

    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.on("error", reject);
    draw(doc);
    doc.end();
  });

const drawHeader = (doc: PDFKit.PDFDocument, title: string, subtitle: string) => {
  doc.fontSize(20).text(title, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#475569").text(subtitle);
  doc.fillColor("#0f172a");
  doc.moveDown();
};

const drawLabelValue = (doc: PDFKit.PDFDocument, label: string, value: string) => {
  doc.fontSize(10).fillColor("#64748b").text(label);
  doc.fontSize(12).fillColor("#0f172a").text(value);
  doc.moveDown(0.6);
};

export type PdfVerification = {
  reference: string;
  issuedAt: Date;
  url: string;
};

const qrImage = async (verification: PdfVerification) =>
  Buffer.from((await QRCode.toDataURL(verification.url, { margin: 1, width: 256, errorCorrectionLevel: "M" })).split(",")[1], "base64");

const drawVerification = (doc: PDFKit.PDFDocument, verification: PdfVerification, qr: Buffer) => {
  doc.moveDown(1.2);
  if (doc.y > doc.page.height - doc.page.margins.bottom - 100) doc.addPage();
  const top = doc.y;
  doc.image(qr, 48, top, { width: 82 });
  doc.fontSize(9).fillColor("#475569")
    .text(`Document Ref No: ${verification.reference}`, 142, top + 9)
    .text(`Issued: ${thaiDay(verification.issuedAt).toISOString().slice(0, 10)}`)
    .text("Scan the QR code to verify this document.");
  doc.fillColor("#0f172a");
  doc.y = Math.max(doc.y, top + 90);
};

export const buildTranscriptPdf = async (
  student: {
    name: string;
    studentId: string;
    gpax: number;
    earnedCredits: number;
    requiredCredits: number;
  },
  transcript: Array<{
    course: {
      code: string;
      name: string;
      semester: number;
      academicYear: string;
      credits: number;
    };
    letterGrade: string | null;
    total: number | null;
  }>,
  verification?: PdfVerification,
) => {
  const qr = verification ? await qrImage(verification) : null;
  return createPdfBuffer((doc) => {
    drawHeader(
      doc,
      "Official Transcript Summary",
      "DII-CAMT ShowPro generated academic summary",
    );

    drawLabelValue(doc, "Student", student.name);
    drawLabelValue(doc, "Student ID", student.studentId);
    drawLabelValue(doc, "GPAX", student.gpax.toFixed(2));
    drawLabelValue(
      doc,
      "Credits",
      `${student.earnedCredits} / ${student.requiredCredits}`,
    );

    doc.moveDown();
    doc.fontSize(14).text("Course Results");
    doc.moveDown(0.5);

    transcript.forEach((item, index) => {
      doc
        .fontSize(11)
        .text(
          `${index + 1}. ${item.course.code} - ${item.course.name} (${item.course.credits} credits)`,
        );
      doc
        .fontSize(10)
        .fillColor("#475569")
        .text(
          `Semester ${item.course.semester}/${item.course.academicYear}  Grade: ${
            item.letterGrade ?? "-"
          }  Score: ${typeof item.total === "number" ? item.total.toFixed(2) : "-"}`,
        );
      doc.fillColor("#0f172a").moveDown(0.4);
    });
    if (verification && qr) drawVerification(doc, verification, qr);
  });
};

export const buildInternshipCertificatePdf = async (
  payload: {
    studentName: string;
    studentId: string;
    companyName: string;
    position: string;
    totalHours: number;
    status: string;
  },
  verification?: PdfVerification,
) => {
  const qr = verification ? await qrImage(verification) : null;
  return createPdfBuffer((doc) => {
    drawHeader(
      doc,
      "Internship Completion Certificate",
      "Generated by DII-CAMT ShowPro",
    );

    doc
      .fontSize(12)
      .text(
        `This is to certify that ${payload.studentName} (${payload.studentId}) has completed internship responsibilities with ${payload.companyName}.`,
        {
          lineGap: 4,
        },
      );
    doc.moveDown();
    drawLabelValue(doc, "Position", payload.position);
    drawLabelValue(doc, "Total Logged Hours", `${payload.totalHours} hours`);
    drawLabelValue(doc, "Record Status", payload.status);
    if (verification && qr) drawVerification(doc, verification, qr);
  });
};

export const buildCooperationSummaryPdf = async (
  payload: {
    title: string;
    type: string;
    companyName: string;
    status: string;
    expiryDate?: Date | null;
    details?: string | null;
  },
  verification?: PdfVerification,
) => {
  const qr = verification ? await qrImage(verification) : null;
  return createPdfBuffer((doc) => {
    drawHeader(
      doc,
      "Cooperation Agreement Summary",
      "Generated by DII-CAMT ShowPro",
    );

    drawLabelValue(doc, "Agreement", payload.title);
    drawLabelValue(doc, "Type", payload.type);
    drawLabelValue(doc, "Company", payload.companyName);
    drawLabelValue(doc, "Status", payload.status);
    drawLabelValue(
      doc,
      "Expiry Date",
      payload.expiryDate ? payload.expiryDate.toISOString().slice(0, 10) : "-",
    );

    if (payload.details) {
      doc.moveDown();
      doc.fontSize(12).text("Summary");
      doc.moveDown(0.4);
      doc.fontSize(11).text(payload.details, {
        lineGap: 4,
      });
    }
    if (verification && qr) drawVerification(doc, verification, qr);
  });
};
