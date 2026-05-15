// utils/service.ts
// Two helpers used by almost every screen.

// ── getErrorMessage ────────────────────────────────────────────────────────────
// Converts Firebase/API errors into readable strings for the UI.
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any).code as string | undefined;
    if (__DEV__) {
      console.log("Auth error code:", code, "Message:", (error as any).message);
    }
    switch (code) {
      case "auth/invalid-email":        return "That email address doesn't look right.";
      case "auth/user-not-found":       return "No account found with that email.";
      case "auth/wrong-password":       return "Incorrect password. Please try again.";
      case "auth/invalid-credential":   return "Email or password is incorrect. Please try again.";
      case "auth/invalid-password":     return "Email or password is incorrect. Please try again.";
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/weak-password":        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":    return "Too many attempts. Please wait and try again.";
      case "auth/network-request-failed": return "No internet connection.";
      case "auth/operation-not-allowed": return "Login is currently disabled. Please contact support.";
      default: break;
    }
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}

// ── withServiceFallback ────────────────────────────────────────────────────────
// Tries to call a service function. If it fails, returns fallback data instead
// of crashing the screen. Shows an error message but keeps the app usable.
//
// Usage:
//   const result = await withServiceFallback(fetchMeals, fallbackMeals, "Using sample data");
//   setMeals(result.data);
//   setError(result.error);  // null if service worked, message if it used fallback

export async function withServiceFallback<T>(
  serviceFn: () => Promise<T>,
  fallback: T,
  fallbackMessage?: string
): Promise<{ data: T; error: string | null }> {
  try {
    const data = await serviceFn();
    return { data, error: null };
  } catch {
    return {
      data: fallback,
      error: fallbackMessage ?? "Service unavailable. Showing sample data.",
    };
  }
}
