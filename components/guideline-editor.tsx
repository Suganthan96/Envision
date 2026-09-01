"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, ArrowDown, Trash2, Plus, ImageIcon, FileText, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resizeImageFile } from "@/lib/resize-image"
import type { GuidelineSlide, ProjectGuideline } from "@/lib/project-guideline"

const SLIDE_IMAGE_MAX_DIMENSION = 1600

function newId() {
  return `slide-${Math.random().toString(36).slice(2, 9)}`
}

function SlideEditor({
  slide,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  slide: GuidelineSlide
  index: number
  total: number
  onChange: (next: GuidelineSlide) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [imageError, setImageError] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError("That image is too large. Please choose one under 8MB.")
      return
    }

    setImageError("")
    setProcessingImage(true)
    try {
      const dataUrl = await resizeImageFile(file, SLIDE_IMAGE_MAX_DIMENSION, 0.85)
      onChange({ ...slide, imageUrl: dataUrl })
    } catch {
      setImageError("Unable to process that image. Please try another.")
    } finally {
      setProcessingImage(false)
    }
  }

  return (
    <div className="p-4 border border-border bg-background/40 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-primary text-xs uppercase tracking-wider">Slide {index + 1}</p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={onMoveUp}
            className="border-border text-foreground h-7 w-7 p-0 bg-transparent"
            aria-label="Move slide up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="border-border text-foreground h-7 w-7 p-0 bg-transparent"
            aria-label="Move slide down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 w-7 p-0 bg-transparent"
            aria-label="Delete slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_140px] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Title</Label>
          <Input
            value={slide.title}
            onChange={(e) => onChange({ ...slide, title: e.target.value })}
            placeholder="Slide title"
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Type</Label>
          <Select
            value={slide.kind}
            onValueChange={(v) => onChange({ ...slide, kind: v as "text" | "image" })}
          >
            <SelectTrigger className="bg-card border-border text-foreground h-9 text-sm w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Text
                </span>
              </SelectItem>
              <SelectItem value="image">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Image
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {slide.kind === "text" ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Content</Label>
          <Textarea
            value={slide.body ?? ""}
            onChange={(e) => onChange({ ...slide, body: e.target.value })}
            placeholder="What should this slide say?"
            className="bg-card border-border text-foreground text-sm min-h-40 font-mono"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Slide Image</Label>
          {slide.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageUrl}
              alt={slide.title || "Slide"}
              className="w-full max-h-64 object-contain border border-border bg-card"
            />
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={processingImage}
              onClick={() => fileInputRef.current?.click()}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-8 bg-transparent"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {processingImage ? "Processing..." : slide.imageUrl ? "Replace Image" : "Upload Image"}
            </Button>
          </div>
          {imageError && <p className="text-destructive text-xs">{imageError}</p>}
        </div>
      )}
    </div>
  )
}

function GuidelineFileEditor({ currentFileName }: { currentFileName: string | null }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error("Unable to read that file."))
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setError("Please choose a .pptx file.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is too large. Please choose one under 10MB.")
      return
    }

    setError("")
    setUploading(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      const res = await fetch("/api/admin/guidelines/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileData: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to upload the file.")
        return
      }
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const removeFile = async () => {
    setError("")
    setUploading(true)
    try {
      const res = await fetch("/api/admin/guidelines/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to remove the file.")
        return
      }
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border border-border bg-card/40 p-4 flex flex-col gap-3">
      <p className="text-primary text-xs uppercase tracking-wider">Downloadable PPTX</p>
      <p className="text-muted-foreground text-sm">
        Attach the original slide deck so students and mentors can download it. This uploads instantly — it&apos;s
        separate from the Save button below.
      </p>
      {currentFileName && (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="text-foreground truncate">{currentFileName}</span>
          <button
            type="button"
            onClick={removeFile}
            disabled={uploading}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".pptx" className="hidden" onChange={handleFileChange} />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-9 bg-transparent self-start"
      >
        <Upload className="w-4 h-4 mr-1.5" />
        {uploading ? "Uploading..." : currentFileName ? "Replace PPTX" : "Upload PPTX"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}

export function GuidelineEditor({ initialGuideline }: { initialGuideline: ProjectGuideline }) {
  const router = useRouter()
  const [title, setTitle] = useState(initialGuideline.title)
  const [slides, setSlides] = useState<GuidelineSlide[]>(initialGuideline.slides)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState("")
  const bulkImageInputRef = useRef<HTMLInputElement>(null)
  const [addingImages, setAddingImages] = useState(false)

  const updateSlide = (index: number, next: GuidelineSlide) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? next : s)))
  }

  const moveSlide = (index: number, direction: -1 | 1) => {
    setSlides((prev) => {
      const next = prev.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const deleteSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index))
  }

  const addSlide = () => {
    setSlides((prev) => [...prev, { id: newId(), kind: "text", title: "", body: "", imageUrl: null }])
  }

  // Bulk add: turn a set of exported slide images (e.g. each PowerPoint
  // slide saved as a PNG/JPG) into one image slide per file, in the order
  // they were selected — the fast path for "I have a pptx, show it here
  // slide by slide" without a per-slide-conversion pipeline.
  const addImageSlides = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return

    setError("")
    setAddingImages(true)
    try {
      const newSlides: GuidelineSlide[] = []
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue
        if (file.size > 8 * 1024 * 1024) {
          setError(`"${file.name}" is too large (over 8MB) and was skipped.`)
          continue
        }
        const dataUrl = await resizeImageFile(file, SLIDE_IMAGE_MAX_DIMENSION, 0.85)
        newSlides.push({
          id: newId(),
          kind: "image",
          title: file.name.replace(/\.[^.]+$/, ""),
          body: null,
          imageUrl: dataUrl,
        })
      }
      setSlides((prev) => [...prev, ...newSlides])
    } catch {
      setError("Unable to process one or more images. Please try again.")
    } finally {
      setAddingImages(false)
    }
  }

  const save = async () => {
    if (!title.trim()) {
      setStatus("error")
      setError("A title is required.")
      return
    }

    setSaving(true)
    setStatus("idle")
    setError("")

    try {
      const res = await fetch("/api/admin/guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slides }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setError(data.error ?? "Unable to save the guideline.")
        return
      }

      setStatus("saved")
      router.refresh()
      setTimeout(() => setStatus("idle"), 2500)
    } catch {
      setStatus("error")
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 max-w-xl">
        <Label htmlFor="guideline-title" className="text-primary tracking-[0.1em] uppercase text-[10px]">
          Guideline Title
        </Label>
        <Input
          id="guideline-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Phase 1 Pitch Deck Guideline"
          className="bg-card border-border text-foreground h-10"
        />
        <p className="text-muted-foreground text-xs">
          Shown as the heading on this page and on the student/mentor guideline pages.
        </p>
      </div>

      <GuidelineFileEditor currentFileName={initialGuideline.fileName} />

      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -my-3">
        <p className="text-muted-foreground text-sm">
          Edit, reorder, add, or remove slides below, then save. Nothing is applied until you click Save.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-10"
          >
            {saving ? "Saving..." : status === "saved" ? "Saved ✓" : "Save Guideline"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {slides.length === 0 ? (
          <p className="text-muted-foreground text-sm">No slides yet — add one below.</p>
        ) : (
          slides.map((slide, i) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={i}
              total={slides.length}
              onChange={(next) => updateSlide(i, next)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, 1)}
              onDelete={() => deleteSlide(i)}
            />
          ))
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={addSlide}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary text-xs uppercase tracking-wider h-10 bg-transparent"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Slide
        </Button>

        <input
          ref={bulkImageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={addImageSlides}
        />
        <Button
          type="button"
          variant="outline"
          disabled={addingImages}
          onClick={() => bulkImageInputRef.current?.click()}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary text-xs uppercase tracking-wider h-10 bg-transparent"
        >
          <ImageIcon className="w-4 h-4 mr-1.5" />
          {addingImages ? "Adding..." : "Add Image Slides"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Export each slide from your PPTX as an image, then select them all here — one slide is added per image, in
          the order selected.
        </p>
      </div>
    </div>
  )
}
