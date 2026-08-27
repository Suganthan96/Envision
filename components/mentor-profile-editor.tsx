"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const MAX_BIO_LENGTH = 1000
const AVATAR_MAX_DIMENSION = 480

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Unable to read that file."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Unable to read that image."))
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Unable to process that image."))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function MentorProfileEditor({
  currentAvatarUrl,
  currentBio,
  displayName,
}: {
  currentAvatarUrl: string | null
  currentBio: string | null
  displayName: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [bio, setBio] = useState(currentBio ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("That image is too large. Please choose one under 8MB.")
      return
    }

    setError("")
    setProcessingImage(true)
    try {
      const dataUrl = await resizeImageFile(file)
      setAvatarUrl(dataUrl)
    } catch {
      setError("Unable to process that image. Please try another.")
    } finally {
      setProcessingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaved(false)

    const trimmedBio = bio.trim()
    if (trimmedBio.length > MAX_BIO_LENGTH) {
      setError(`Description must be ${MAX_BIO_LENGTH} characters or fewer.`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/mentor-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: avatarUrl ?? "", bio: trimmedBio }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to save your profile.")
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-xl">
      <div className="flex items-center gap-6">
        <Avatar className="size-28 border border-border">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="object-cover" />
          <AvatarFallback className="text-2xl font-serif text-primary bg-card">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingImage}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-9 bg-transparent"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            {processingImage ? "Processing..." : "Change Photo"}
          </Button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              className="text-muted-foreground hover:text-destructive text-xs uppercase tracking-wider text-left"
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mentor-bio" className="text-primary tracking-[0.15em] uppercase text-xs">
          About You
        </Label>
        <Textarea
          id="mentor-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell your team a bit about yourself — your background, interests, and mentoring style."
          maxLength={MAX_BIO_LENGTH}
          className="bg-card border-border text-foreground min-h-32"
        />
        <p className="text-muted-foreground text-xs text-right">
          {bio.length}/{MAX_BIO_LENGTH}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm h-11 self-start px-8"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save Profile"}
      </Button>
    </form>
  )
}
