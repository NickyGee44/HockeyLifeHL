export function formatScheduleAssistantError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return `Sorry, I ran into an issue: ${message.trim()}`;
}
