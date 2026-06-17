-- CreateTable
CREATE TABLE "app_logs" (
    "id" UUID NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "context" VARCHAR(100),
    "method" VARCHAR(10),
    "path" VARCHAR(1000),
    "queryString" TEXT,
    "statusCode" INTEGER,
    "duration" INTEGER,
    "errorCode" VARCHAR(50),
    "errorName" VARCHAR(100),
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "requestHeaders" JSONB NOT NULL DEFAULT '{}',
    "requestBody" JSONB NOT NULL DEFAULT '{}',
    "responseBody" JSONB NOT NULL DEFAULT '{}',
    "responseHeaders" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "userId" UUID,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "nodeVersion" VARCHAR(20),
    "environment" VARCHAR(20),
    "hostname" VARCHAR(255),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_level_idx" ON "app_logs"("level");
CREATE INDEX "app_logs_context_idx" ON "app_logs"("context");
CREATE INDEX "app_logs_method_idx" ON "app_logs"("method");
CREATE INDEX "app_logs_path_idx" ON "app_logs"("path");
CREATE INDEX "app_logs_statusCode_idx" ON "app_logs"("statusCode");
CREATE INDEX "app_logs_errorCode_idx" ON "app_logs"("errorCode");
CREATE INDEX "app_logs_timestamp_idx" ON "app_logs"("timestamp");
CREATE INDEX "app_logs_userId_idx" ON "app_logs"("userId");
CREATE INDEX "app_logs_duration_idx" ON "app_logs"("duration");

-- AddForeignKey
ALTER TABLE "app_logs" ADD CONSTRAINT "app_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
