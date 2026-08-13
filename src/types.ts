export interface LessonPlanRequest {
  age: string;
  field: string;
  activity: string;
  lessonType: string;
  theme: string;
  topic: string;
  integrate: string[];
  extra: string;
  materials?: string;
  adjustRequest?: string;
  lessonSampleName?: string;
  lessonSampleContent?: string;
  attachmentNames?: string[];
  attachmentContent?: string;
}

export interface SavedLessonPlan {
  id: string;
  createdAt: string;
  title: string;
  request: LessonPlanRequest;
  content: string;
}

export interface PresetTopic {
  title: string;
  theme: string;
  topic: string;
  age: string;
  field: string;
  activity: string;
  integrate: string[];
  extra: string;
}
