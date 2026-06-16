import { Role } from "@prisma/client";
import type { Response } from "express";

import { prisma } from "../lib/prisma";
import {
  buildCooperationSummaryPdf,
  buildInternshipCertificatePdf,
  buildTranscriptPdf,
} from "../services/pdf.service";
import { getStudentProfileByAnyId, getStudentProfileByUserId } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



const writePdfResponse = (res: Response, filename: string, buffer: Buffer) =>
  res
    .setHeader("Content-Type", "application/pdf")
    .setHeader("Content-Disposition", `inline; filename="${filename}"`)
    .send(buffer);

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

  const transcript = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      course: true,
    },
    orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
  });

  const pdf = await buildTranscriptPdf(
    {
      name: student.user.name,
      studentId: student.studentId,
      gpax: student.gpax,
      earnedCredits: student.earnedCredits,
      requiredCredits: student.requiredCredits,
    },
    transcript,
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

  const totalHours = student.internship.logs.reduce((sum, log) => sum + log.hours, 0);
  const pdf = await buildInternshipCertificatePdf({
    studentName: student.user.name,
    studentId: student.studentId,
    companyName: student.internship.companyName ?? student.internship.company?.companyName ?? "-",
    position: student.internship.position ?? "-",
    totalHours,
    status: student.internship.status,
  });

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

  const pdf = await buildCooperationSummaryPdf({
    title: cooperation.title,
    type: cooperation.type,
    companyName: cooperation.company.companyName,
    status: cooperation.status,
    expiryDate: cooperation.expiryDate,
    details: cooperation.details,
  });

  return writePdfResponse(
    res,
    `cooperation-summary-${cooperation.id}.pdf`,
    pdf,
  );
});
