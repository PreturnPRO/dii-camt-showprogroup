import { useParams } from 'react-router-dom';

export default function CourseGradingSettings() {
  const { courseId } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Course Grading Settings
      </h1>
      <p className="text-slate-500 dark:text-slate-400">
        Configure grading criteria for course {courseId}.
      </p>
    </div>
  );
}
