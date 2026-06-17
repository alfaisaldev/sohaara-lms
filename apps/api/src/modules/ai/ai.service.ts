import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async generateQuizQuestions(topic: string, count: number = 5, type: string = 'multiple_choice') {
    return {
      topic,
      suggestedQuestions: [
        {
          title: `What is the core concept of "${topic}"?`,
          type,
          options: [
            { text: 'Mock option A' },
            { text: 'Mock option B' },
            { text: 'Mock option C' },
            { text: 'Mock option D' },
          ],
          correctAnswer: 'mock-option-a',
        },
      ],
      note: 'AI question generation requires OpenAI/Anthropic API key integration.',
    };
  }

  async generateCertificateContent(template: string, variables: Record<string, string>) {
    return {
      rendered: `Certificate of Completion awarded to ${variables.studentName || '[Student]'} for completing ${variables.courseName || '[Course]'}.`,
      note: 'AI certificate rendering requires a PDF generation service integration.',
    };
  }

  async summarizeContent(content: string, maxLength: number = 200) {
    return {
      summary: content.slice(0, maxLength) + (content.length > maxLength ? '...' : ''),
      note: 'AI summarization requires OpenAI/Anthropic API key integration.',
    };
  }

  async recommendCourses(userId: string, limit: number = 5) {
    return {
      recommendations: [],
      note: 'AI course recommendations require vector embeddings or collaborative filtering integration.',
    };
  }
}
