import type { Course, Grade } from '@/types';

/** grade rows for the dashboards' grade cards; an unknown course gets '-' for its term, never an invented one */
export const gradesForCard = (studentGrades: Grade[], courses: Course[]) =>
  studentGrades.map((grade) => {
    const course = courses.find((c) => c.id === grade.courseId);
    return {
      courseId: grade.courseId,
      courseCode: course?.code || '',
      courseName: course?.nameThai || course?.name || '',
      credits: course?.credits || 0,
      // an ungraded course is shown as '-', never as an 'I' (incomplete) grade
      letterGrade: grade.letterGrade || '-',
      semester: course ? `${course.semester}/${course.academicYear}` : '-',
      total: grade.total,
    };
  });
