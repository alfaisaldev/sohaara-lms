export interface Media {
  id: string;
  organizationId?: string;
  userId: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  tags: string[];
  alt?: string;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFolder {
  id: string;
  organizationId?: string;
  name: string;
  parentId?: string;
  children?: MediaFolder[];
  media?: Media[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadMediaInput {
  name: string;
  folderId?: string;
  alt?: string;
  tags?: string[];
}

export interface UpdateMediaInput {
  name?: string;
  alt?: string;
  tags?: string[];
  folderId?: string;
}
