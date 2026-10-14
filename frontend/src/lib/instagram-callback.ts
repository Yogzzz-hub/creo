/** Meta can return either OAuth's `error` or its `error_code`/`error_message` pair. */
export function parseInstagramCallback(search: string) {
  const params = new URLSearchParams(search);
  const errorKeys = ["error", "error_code", "error_message", "error_description", "error_reason"];
  const hasError = errorKeys.some(key => params.has(key));
  const details = errorKeys.map(key => params.get(key) || "").join(" ");
  let error: string | null = null;
  if (hasError) {
    if (/invalid\s+scopes?/i.test(details)) {
      error = "Meta rejected Creo's app permissions. Your agency needs to finish the Instagram connection setup in Meta before you can connect. Your questionnaire answers are saved.";
    } else if (/access_denied|user_denied|user_cancelled|user_canceled/i.test(details)) {
      error = "Meta authorization was canceled. Your existing connection and saved questionnaire answers are unchanged.";
    } else {
      error = "Meta could not authorize this connection. Try again or contact your agency. Your saved questionnaire answers are unchanged.";
    }
  }
  return {
    hasResponse: params.has("code") || hasError,
    code: params.get("code"),
    state: params.get("state"),
    error,
  };
}
