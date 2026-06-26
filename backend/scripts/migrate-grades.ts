import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration for grading system...');

  // Get all courses that have enrollments with some grades
  const coursesWithGrades = await prisma.course.findMany({
    where: {
      enrollments: {
        some: {
          OR: [
            { midterm: { not: null } },
            { final: { not: null } },
            { assignments: { not: null } },
            { participation: { not: null } },
            { project: { not: null } },
          ],
        },
      },
    },
    include: {
      enrollments: true,
      gradingCriteria: true,
    },
  });

  let migratedCourses = 0;
  let migratedScores = 0;

  for (const course of coursesWithGrades) {
    console.log(`Processing course ${course.code}...`);
    
    // Create default criteria if they don't exist
    const defaultCriteria = [
      { name: 'Midterm', weightPercentage: 30, maxScore: 100 },
      { name: 'Final', weightPercentage: 40, maxScore: 100 },
      { name: 'Assignments', weightPercentage: 10, maxScore: 100 },
      { name: 'Participation', weightPercentage: 10, maxScore: 100 },
      { name: 'Project', weightPercentage: 10, maxScore: 100 },
    ];

    const criteriaMap = new Map<string, string>(); // name to id

    for (const dc of defaultCriteria) {
      let criteria = course.gradingCriteria.find((c) => c.name === dc.name);
      if (!criteria) {
        criteria = await prisma.courseGradingCriteria.create({
          data: {
            courseId: course.id,
            name: dc.name,
            weightPercentage: dc.weightPercentage,
            maxScore: dc.maxScore,
          },
        });
      }
      criteriaMap.set(dc.name, criteria.id);
    }

    // Migrate scores for each enrollment
    for (const enrollment of course.enrollments) {
      const scoresToMigrate = [
        { name: 'Midterm', value: enrollment.midterm },
        { name: 'Final', value: enrollment.final },
        { name: 'Assignments', value: enrollment.assignments },
        { name: 'Participation', value: enrollment.participation },
        { name: 'Project', value: enrollment.project },
      ];

      for (const item of scoresToMigrate) {
        if (item.value !== null && item.value !== undefined) {
          const criteriaId = criteriaMap.get(item.name);
          if (criteriaId) {
            await prisma.enrollmentScore.upsert({
              where: {
                enrollmentId_criteriaId: {
                  enrollmentId: enrollment.id,
                  criteriaId: criteriaId,
                },
              },
              update: {
                score: item.value,
              },
              create: {
                enrollmentId: enrollment.id,
                criteriaId: criteriaId,
                score: item.value,
              },
            });
            migratedScores++;
          }
        }
      }
    }
    migratedCourses++;
  }

  console.log(`Migration completed successfully.`);
  console.log(`Migrated ${migratedScores} scores across ${migratedCourses} courses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
