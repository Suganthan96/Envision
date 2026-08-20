const MENTOR_ID_PATTERN = /^3111\d{8}$/

export const MENTOR_ID_ERROR = "Registration number must be exactly 12 digits starting with 3111."

export function looksLikeMentorId(loginId: string) {
  return loginId.startsWith("3111")
}

export function isValidMentorId(loginId: string) {
  return MENTOR_ID_PATTERN.test(loginId)
}
