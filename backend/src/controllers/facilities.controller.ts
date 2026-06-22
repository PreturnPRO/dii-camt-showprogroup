
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/async-handler";



export const getFacilities = asyncHandler(async (_req, res) => {
  const facilities = await prisma.facility.findMany({
    include: {
      sections: {
        include: {
          course: true,
        },
      },
    },
    orderBy: [{ building: "asc" }, { room: "asc" }],
  });

  res.json({
    success: true,
    facilities,
  });
});

export const createFacility = asyncHandler(async (req, res) => {
  const facility = await prisma.facility.create({
    data: req.body,
  });

  res.status(201).json({
    success: true,
    facility,
  });
});

export const updateFacility = asyncHandler(async (req, res) => {
  const facility = await prisma.facility.update({
    where: { id: String(req.params.id) },
    data: req.body,
  });

  res.json({
    success: true,
    facility,
  });
});

export const deleteFacility = asyncHandler(async (req, res) => {
  const sectionCount = await prisma.section.count({
    where: { facilityId: String(req.params.id) },
  });

  if (sectionCount > 0) {
    const facility = await prisma.facility.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: "Facility has linked sections and was deactivated instead of deleted.",
      facility,
    });
  }

  const facility = await prisma.facility.delete({
    where: { id: String(req.params.id) },
  });

  return res.json({
    success: true,
    facility,
  });
});
