export interface ShowcasePhoto {
  id: string
  src: string
  alt: string
  caption: string
}

// Placeholder images for now — swap `src` for real event photos as they
// come in. Keep the id/caption, just replace the file under /public and
// point `src` at it (e.g. "/showcase/day-1.jpg").
export const SHOWCASE_PHOTOS: ShowcasePhoto[] = [
  {
    id: "1",
    src: "/placeholder.jpg",
    alt: "Envision inauguration",
    caption: "Inauguration & Team Formation",
  },
  {
    id: "2",
    src: "/placeholder.jpg",
    alt: "Envision awareness session",
    caption: "Awareness Session",
  },
  {
    id: "3",
    src: "/placeholder.jpg",
    alt: "Envision ideation session",
    caption: "Problem Solving & Ideation",
  },
  {
    id: "4",
    src: "/placeholder.jpg",
    alt: "Envision team collaboration",
    caption: "Team Collaboration",
  },
  {
    id: "5",
    src: "/placeholder.jpg",
    alt: "Envision prototype development",
    caption: "Prototype Development",
  },
  {
    id: "6",
    src: "/placeholder.jpg",
    alt: "Envision pitch day",
    caption: "Pitch Your Idea",
  },
]
