export function extractJsonFromMarkdown(response: string): string {
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  }
  return jsonStr;
}
