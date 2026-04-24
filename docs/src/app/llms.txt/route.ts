import { getLLMSIndex, llmTextHeaders } from '@/lib/source';

export const revalidate = false;

export function GET() {
  return new Response(getLLMSIndex(), {
    headers: llmTextHeaders,
  });
}
