// Mirrors the repeated ```json fence-stripping pattern used throughout
// backend/app/main.py (generate-food-recommendations, fasting/recommend, reminders/smart):
//
//   response_text = response.text.strip()
//   if response_text.startswith('```'):
//       response_text = response_text.split('```')[1]
//       if response_text.startswith('json'):
//           response_text = response_text[4:]
//       response_text = response_text.strip()
export function stripCodeFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    const parts = t.split("```");
    t = parts[1] ?? "";
    if (t.startsWith("json")) {
      t = t.slice(4);
    }
    t = t.trim();
  }
  return t;
}

export function lastPathSegment(req: Request): string | null {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : null;
}
