import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "envision_session"

export type Role = "member" | "mentor" | "admin"

export type SessionPayload = {
  userId: string
  loginId: string
  role: Role
  mustChangePassword: boolean
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable")
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return {
      userId: payload.userId as string,
      loginId: payload.loginId as string,
      role: payload.role as Role,
      mustChangePassword: payload.mustChangePassword as boolean,
    }
  } catch {
    return null
  }
}

export function roleHome(role: Role) {
  if (role === "admin") return "/admin"
  if (role === "mentor") return "/mentor"
  return "/member"
}
