import { Role } from "@prisma/client";
import { randomBytes } from "node:crypto";
import type { Response } from "express";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import {
  buildCooperationSummaryPdf,
  buildInternshipCertificatePdf,
  buildTranscriptPdf,
  type PdfVerification,
} from "../services/pdf.service";
import { assertCanViewStudentRecord } from "../services/access-policy";
import { thaiDay } from "../services/attendance";
import { getStudentProfileByAnyId, getStudentProfileByUserId } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { certificateHours } from "../services/internship-hours";
import { requireUser } from "../utils/user";



const writePdfResponse = (res: Response, filename: string, buffer: Buffer) =>
  res
    .setHeader("Content-Type", "application/pdf")
    .setHeader("Content-Disposition", `inline; filename="${filename}"`)
    .send(buffer);

// the (Gregorian) year in Bangkok time, so a document issued at 01:00 on 1 Jan Bangkok is not dated last year
const referenceOf = (issued: { id: number; issuedAt: Date }) =>
  `SHOWPRO-${thaiDay(issued.issuedAt).getUTCFullYear()}-${String(issued.id).padStart(6, "0")}`;

const REFERENCE_PATTERN = /^SHOWPRO-\d{4}-(\d{6,10})$/;
const MAX_INT4 = 2_147_483_647;

const maskStudentId = (studentId: string) => `•••••${studentId.slice(-3)}`;

const issueVerification = async (kind: string, subjectId: string, issuedById: string): Promise<PdfVerification> => {
  const token = randomBytes(24).toString("base64url");
  const issued = await prisma.issuedDocument.create({ data: { kind, subjectId, issuedById, token } });
  const baseUrl = env.FRONTEND_URL ?? "http://localhost:8080";
  return {
    reference: referenceOf(issued),
    issuedAt: issued.issuedAt,
    url: `${baseUrl.replace(/\/$/, "")}/verify/${token}`,
  };
};

const describeIssued = async (issued: { id: number; kind: string; subjectId: string; issuedAt: Date; revokedAt: Date | null }) => {
  // cooperation summaries are about a company, not a student: no ID to show
  const student = issued.kind === "cooperation-summary"
    ? null
    : await prisma.studentProfile.findUnique({ where: { id: issued.subjectId }, select: { studentId: true } });
  return {
    reference: referenceOf(issued),
    kind: issued.kind,
    issuedAt: issued.issuedAt,
    valid: issued.revokedAt === null,
    studentIdMasked: student ? maskStudentId(student.studentId) : null,
  };
};

export const verifyDocument = asyncHandler(async (req, res) => {
  const issued = await prisma.issuedDocument.findUnique({ where: { token: String(req.params.token) } });
  if (!issued) throw new AppError(404, "Document not found");
  res.json({ success: true, document: await describeIssued(issued) });
});

export const revokeDocument = asyncHandler(async (req, res) => {
  const match = REFERENCE_PATTERN.exec(String(req.body.reference ?? "").trim());
  if (!match) throw new AppError(400, "Reference must look like SHOWPRO-2026-000001");
  const id = Number(match[1]);
  const issued = id <= MAX_INT4 ? await prisma.issuedDocument.findUnique({ where: { id } }) : null;
  if (!issued || referenceOf(issued) !== match[0]) throw new AppError(404, "Document not found");
  const revoked = issued.revokedAt
    ? issued
    : await prisma.issuedDocument.update({ where: { id: issued.id }, data: { revokedAt: new Date() } });
  res.json({ success: true, document: await describeIssued(revoked) });
});

export const getTranscript = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : req.query.studentId
        ? await getStudentProfileByAnyId(String(req.query.studentId))
        : null;

  if (!student) {
    throw new AppError(400, "studentId query is required for non-student roles");
  }
  await assertCanViewStudentRecord(currentUser, student);

  const transcript = await prisma.enrollment.findMany({
    where: { studentId: student.id, status: { not: "dropped" } },
    include: {
      course: true,
    },
    orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
  });

  const verification = await issueVerification("transcript", student.id, currentUser.id);

  const pdf = await buildTranscriptPdf(
    {
      name: student.user.name,
      studentId: student.studentId,
      gpax: student.gpax,
      earnedCredits: student.earnedCredits,
      requiredCredits: student.requiredCredits,
    },
    transcript,
    verification,
  );

  return writePdfResponse(res, `transcript-${student.studentId}.pdf`, pdf);
});

export const getInternshipCertificate = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByAnyId(currentUser.id)
      : req.query.studentId
        ? await getStudentProfileByAnyId(String(req.query.studentId))
        : null;

  if (!student?.internship) {
    throw new AppError(404, "Internship record not found");
  }

  await assertCanViewStudentRecord(currentUser, student);
  if (student.internship.status !== "completed") {
    throw new AppError(409, "The internship is not marked completed yet");
  }

  if (!student.internship.companyId) {
    throw new AppError(409, "The internship has no company");
  }
  // owner decision 9/10/69: approved diary hours only, inside the internship's days, at most 8 a day
  const totalHours = certificateHours(student.internship.logs, { startMonth: student.internship.startMonth, today: new Date() });
  const verification = await issueVerification("internship-certificate", student.id, currentUser.id);
  const pdf = await buildInternshipCertificatePdf({
    studentName: student.user.name,
    studentId: student.studentId,
    companyName: student.internship.companyName ?? student.internship.company?.companyName ?? "-",
    position: student.internship.position ?? "-",
    totalHours,
    status: student.internship.status,
  }, verification);

  return writePdfResponse(
    res,
    `internship-certificate-${student.studentId}.pdf`,
    pdf,
  );
});

export const getCooperationSummary = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const cooperation = await prisma.cooperationRecord.findUnique({
    where: { id: String(req.params.id) },
    include: {
      company: true,
    },
  });

  if (!cooperation) {
    throw new AppError(404, "Cooperation record not found");
  }

  if (currentUser.role === Role.COMPANY) {
    const company = await prisma.companyProfile.findUnique({
      where: { userId: currentUser.id },
    });

    if (!company || company.id !== cooperation.companyId) {
      throw new AppError(403, "You can only access your own cooperation summary");
    }
  }

  const verification = await issueVerification("cooperation-summary", cooperation.id, currentUser.id);

  const pdf = await buildCooperationSummaryPdf({
    title: cooperation.title,
    type: cooperation.type,
    companyName: cooperation.company.companyName,
    status: cooperation.status,
    expiryDate: cooperation.expiryDate,
    details: cooperation.details,
  }, verification);

  return writePdfResponse(
    res,
    `cooperation-summary-${cooperation.id}.pdf`,
    pdf,
  );
});
