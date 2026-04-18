/**
 * Phone Number Utilities
 * Common functions for formatting and validating phone numbers
 */

export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "233" + cleaned.substring(1);
  } else if (cleaned.startsWith("+233")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 9) {
    cleaned = "233" + cleaned;
  }
  return cleaned;
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = formatPhoneNumber(phone);
  return cleaned.startsWith("233") && cleaned.length === 12;
}

export function normalizePhoneNumber(phone: string): { success: boolean; formatted?: string; error?: string } {
  try {
    if (!phone) {
      return { success: false, error: "Phone number is required" };
    }
    if (!validatePhoneNumber(phone)) {
      return { success: false, error: "Invalid phone number format" };
    }
    return { success: true, formatted: formatPhoneNumber(phone) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Phone format error" };
  }
}
