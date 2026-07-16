/**
 * Custom fetch wrapper that automatically appends the signed session
 * token from localStorage as an Authorization Bearer header.
 *
 * The server verifies this token server-side to extract the user's
 * identity and role — the client never sends raw role strings.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
