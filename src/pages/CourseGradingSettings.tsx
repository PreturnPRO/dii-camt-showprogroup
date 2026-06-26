import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { mapCourse } from '@/lib/live-mappers';
import { Course, CourseGradingCriteria, CourseGradeCutoff } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, GripVertical } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CourseGradingSettings() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [course, setCourse] = React.useState<Course | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [criteria, setCriteria] = React.useState<Partial<CourseGradingCriteria>[]>([]);
  const [cutoffs, setCutoffs] = React.useState<Partial<CourseGradeCutoff>[]>([]);

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyListItems = [...criteria];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setCriteria(copyListItems);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  React.useEffect(() => {
    if (!courseId) return;
    
    api.courses.get(courseId)
      .then((res) => {
        const mappedCourse = mapCourse(res.course as any);
        setCourse(mappedCourse);
        
        if (mappedCourse.gradingCriteria && mappedCourse.gradingCriteria.length > 0) {
          setCriteria(mappedCourse.gradingCriteria);
        } else {
          // Default fallback
          setCriteria([
            { name: 'Midterm', weightPercentage: 30, maxScore: 100 },
            { name: 'Final', weightPercentage: 40, maxScore: 100 },
            { name: 'Assignments', weightPercentage: 10, maxScore: 100 },
            { name: 'Participation', weightPercentage: 10, maxScore: 100 },
            { name: 'Project', weightPercentage: 10, maxScore: 100 },
          ]);
        }

        if (mappedCourse.gradeCutoffs && mappedCourse.gradeCutoffs.length > 0) {
          setCutoffs(mappedCourse.gradeCutoffs);
        } else {
          // Default cutoffs
          setCutoffs([
            { grade: 'A', minScore: 80 },
            { grade: 'B+', minScore: 75 },
            { grade: 'B', minScore: 70 },
            { grade: 'C+', minScore: 65 },
            { grade: 'C', minScore: 60 },
            { grade: 'D+', minScore: 55 },
            { grade: 'D', minScore: 50 },
          ]);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load course details');
      })
      .finally(() => setIsLoading(false));
  }, [courseId]);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);

  const handleSave = async () => {
    if (!courseId) return;
    
    if (totalWeight !== 100) {
      toast.error('Total criteria weight must be exactly 100%');
      return;
    }

    try {
      setIsSaving(true);
      await api.courses.update(courseId, {
        gradingCriteria: criteria,
        gradeCutoffs: cutoffs,
      });
      toast.success('Grading settings saved successfully');
      navigate('/courses');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save grading settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addCriteria = () => {
    setCriteria([...criteria, { name: '', weightPercentage: 0, maxScore: 100 }]);
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof CourseGradingCriteria, value: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const updateCutoff = (index: number, value: number) => {
    const newCutoffs = [...cutoffs];
    newCutoffs[index] = { ...newCutoffs[index], minScore: value };
    setCutoffs(newCutoffs);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading...</div>;
  }

  if (!course) {
    return <div className="p-8 flex justify-center">Course not found.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grading Settings</h1>
          <p className="text-muted-foreground">{course.code} - {course.name}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assessment Criteria</CardTitle>
                <CardDescription>Define the scoring topics and their weight percentage. Total must be 100%.</CardDescription>
              </div>
              <Button onClick={addCriteria} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Criteria
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.map((c, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50 hover:border-blue-400 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnter={(e) => handleDragEnter(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="cursor-grab active:cursor-grabbing text-slate-400">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>Topic Name</Label>
                  <Input 
                    value={c.name} 
                    onChange={(e) => updateCriteria(idx, 'name', e.target.value)} 
                    placeholder="e.g. Midterm"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label>Max Score</Label>
                  <Input 
                    type="number" 
                    value={c.maxScore} 
                    onChange={(e) => updateCriteria(idx, 'maxScore', Number(e.target.value))} 
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label>Weight (%)</Label>
                  <Input 
                    type="number" 
                    value={c.weightPercentage} 
                    onChange={(e) => updateCriteria(idx, 'weightPercentage', Number(e.target.value))} 
                  />
                </div>
                <div className="pt-6">
                  <Button variant="ghost" size="icon" onClick={() => removeCriteria(idx)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">Total Weight:</span>
                <span className={`text-lg font-bold ${totalWeight !== 100 ? 'text-red-500' : 'text-green-600'}`}>
                  {totalWeight}%
                </span>
              </div>
            </div>

            {totalWeight !== 100 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Invalid Total Weight</AlertTitle>
                <AlertDescription>The sum of all criteria weights must be exactly 100%.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Cutoffs</CardTitle>
            <CardDescription>Define the minimum total score required to achieve each letter grade.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cutoffs.map((cutoff, idx) => (
                <div key={cutoff.grade} className="space-y-1">
                  <Label>Grade {cutoff.grade} (≥)</Label>
                  <Input 
                    type="number" 
                    value={cutoff.minScore} 
                    onChange={(e) => updateCutoff(idx, Number(e.target.value))} 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate('/courses')}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || totalWeight !== 100}>
            {isSaving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
