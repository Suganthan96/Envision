"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary tracking-wider uppercase text-xs"
    >
      Sign Out
    </Button>
  )
}
