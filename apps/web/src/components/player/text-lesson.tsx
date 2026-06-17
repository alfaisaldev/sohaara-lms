'use client';

interface TextLessonProps {
  content: string;
  title: string;
}

export function TextLesson({ content, title }: TextLessonProps) {
  return (
    <div className="prose prose-stone max-w-none">
      <h1 className="text-2xl font-bold text-primary-text mb-6">{title}</h1>
      <div
        className="text-primary-text leading-relaxed space-y-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
