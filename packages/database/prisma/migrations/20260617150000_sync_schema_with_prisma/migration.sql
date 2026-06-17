-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DropForeignKey
ALTER TABLE "certificate_templates" DROP CONSTRAINT "certificate_templates_organizationId_fkey";

-- AlterTable
ALTER TABLE "certificate_templates" ADD COLUMN     "backgroundImageUrl" TEXT,
ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "releasedById" UUID,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isMandatory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetAudience" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "scormPackageId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "scorm_packages" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "version" VARCHAR(10) NOT NULL DEFAULT '1.2',
    "identifier" VARCHAR(255),
    "entryUrl" TEXT NOT NULL,
    "packagePath" TEXT NOT NULL,
    "manifest" JSONB,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorm_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_courses" (
    "id" UUID NOT NULL,
    "learningPathId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_assignments" (
    "id" UUID NOT NULL,
    "learningPathId" UUID NOT NULL,
    "assigneeType" VARCHAR(20) NOT NULL,
    "assigneeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_progress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "learningPathId" UUID NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedCourses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_path_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_join_requests" (
    "id" UUID NOT NULL,
    "learningPathId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_path_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_logos" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 200,
    "height" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_logos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scorm_packages_courseId_idx" ON "scorm_packages"("courseId");

-- CreateIndex
CREATE INDEX "learning_path_courses_learningPathId_idx" ON "learning_path_courses"("learningPathId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_courses_learningPathId_courseId_key" ON "learning_path_courses"("learningPathId", "courseId");

-- CreateIndex
CREATE INDEX "learning_path_assignments_learningPathId_idx" ON "learning_path_assignments"("learningPathId");

-- CreateIndex
CREATE INDEX "learning_path_assignments_assigneeType_assigneeId_idx" ON "learning_path_assignments"("assigneeType", "assigneeId");

-- CreateIndex
CREATE INDEX "learning_path_progress_userId_idx" ON "learning_path_progress"("userId");

-- CreateIndex
CREATE INDEX "learning_path_progress_learningPathId_idx" ON "learning_path_progress"("learningPathId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_progress_userId_learningPathId_key" ON "learning_path_progress"("userId", "learningPathId");

-- CreateIndex
CREATE INDEX "learning_path_join_requests_status_idx" ON "learning_path_join_requests"("status");

-- CreateIndex
CREATE INDEX "learning_path_join_requests_learningPathId_idx" ON "learning_path_join_requests"("learningPathId");

-- CreateIndex
CREATE INDEX "learning_path_join_requests_userId_idx" ON "learning_path_join_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_join_requests_learningPathId_userId_key" ON "learning_path_join_requests"("learningPathId", "userId");

-- CreateIndex
CREATE INDEX "certificate_logos_organizationId_idx" ON "certificate_logos"("organizationId");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_scormPackageId_fkey" FOREIGN KEY ("scormPackageId") REFERENCES "scorm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorm_packages" ADD CONSTRAINT "scorm_packages_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_assignments" ADD CONSTRAINT "learning_path_assignments_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_progress" ADD CONSTRAINT "learning_path_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_progress" ADD CONSTRAINT "learning_path_progress_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_join_requests" ADD CONSTRAINT "learning_path_join_requests_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_join_requests" ADD CONSTRAINT "learning_path_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_join_requests" ADD CONSTRAINT "learning_path_join_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_logos" ADD CONSTRAINT "certificate_logos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

