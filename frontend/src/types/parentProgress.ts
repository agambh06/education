export interface ParentLinkedChild {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ParentTopicProgress {
  id: string;
  title: string;
  practiceCount: number;
  needsReview: boolean;
}

export interface ParentExamProgress {
  id: string;
  subject: string;
  title: string;
  scheduledAt: string;
  topics: ParentTopicProgress[];
}

export interface ParentLearningProgress {
  childId: string;
  activity: {
    sessionCount: number;
    questionCount: number;
    practiceMinutes: number;
    lastPracticedAt: string | null;
  };
  exams: ParentExamProgress[];
}
