import { serveUserImage } from "@/lib/image-response"

export async function GET(_request: Request, { params }: { params: Promise<{ loginId: string }> }) {
  const { loginId } = await params
  return serveUserImage("get_team_logo_by_login", loginId)
}
