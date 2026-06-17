export interface Lesson {
  id?: string;
  title: string;
  slug: string;
  type: string;
  description?: string;
  content?: string;
  isFree?: boolean;
  isRequired?: boolean;
  videoUrl?: string;
  videoDuration?: number;
  fileUrl?: string;
  embedUrl?: string;
  externalUrl?: string;
  scormPackageId?: string;
  sortOrder: number;
}

export interface Section {
  id?: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  sortOrder: number;
}

export interface Module {
  id?: string;
  title: string;
  description?: string;
  sections: Section[];
  sortOrder: number;
}
