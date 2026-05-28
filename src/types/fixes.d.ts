// Type fixes for offline mode

declare module "@/lib/localApi" {
  export interface Q {
    id: number;
    question: string;
    options: string[];
    correct: number[];
    chapterId: number;
    chapterName: string;
    explanation?: string;
    enQuestion?: string;
    enOptions?: string[];
    tcQuestion?: string;
    tcOptions?: string[];
  }

  export interface Bank {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    color: string | null;
    questions: Q[];
    chapters: { chapterId: number; chapterName: string; questionCount: number }[];
    progress?: number;
  }

  export interface User {
    id: number;
    username: string;
    name: string;
    role?: string;
    email?: string;
    avatar?: string;
    createdAt?: string | Date;
  }
}
