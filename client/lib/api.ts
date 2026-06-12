/**
 * Custom fetch wrapper that automatically appends auth headers based on
 * the active session stored in localStorage under 'auth_user'.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const storedUser = localStorage.getItem("auth_user");
  const headers = new Headers(options.headers);
  
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.role) {
        headers.set("x-user-role", user.role);
      }
      if (user.email) {
        headers.set("x-user-email", user.email);
      }
      if (user.id) {
        headers.set("x-user-id", user.id);
      }
    } catch (e) {
      console.error("Error parsing auth user from storage", e);
    }
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
