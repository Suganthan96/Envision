import { ArtDecoDivider } from "@/components/art-deco-divider"
import { ServiceCard } from "@/components/service-card"
import DomeGallery from "@/components/dome-gallery"
import { PublicNav } from "@/components/public-nav"
import { ScrollDots } from "@/components/scroll-dots"
import { LandingSnapScroll } from "@/components/landing-snap-scroll"
import { SHOWCASE_PHOTOS } from "@/lib/showcase-photos"

export default function Home() {
  return (
    <main className="bg-background overflow-x-clip">
      <LandingSnapScroll />
      <PublicNav />
      <ScrollDots
        sections={[
          { id: "hero", label: "Envision" },
          { id: "philosophy", label: "Objective" },
          { id: "pillars", label: "Pillars" },
          { id: "showcase-gallery", label: "Showcase" },
          { id: "testimonial", label: "Wishes" },
        ]}
      />

      {/* Hero Section — exactly one viewport tall so it lands as a clean
          snap stop instead of leaving a sliver of the next section visible. */}
      <section
        id="hero"
        className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden snap-start scroll-mt-24"
      >
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-px bg-primary" />
              <div className="w-3 h-3 rotate-45 border border-primary" />
              <div className="w-16 h-px bg-primary" />
            </div>
          </div>

          <p className="text-primary tracking-[0.3em] uppercase text-sm mb-6">Est.2021</p>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-foreground mb-6 leading-tight">
            <span className="text-gold-gradient">Envision</span>
          </h1>

          <p className="text-primary tracking-[0.2em] uppercase text-xs mb-4">
            Institution&apos;s Innovation Council &middot; LICET
          </p>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
            An interdepartmental prototype contest where young engineers turn ideas into proof of concept —
            through teamwork, problem solving, and hands-on implementation.
          </p>

          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-primary to-primary" />
              <div className="w-2 h-2 rotate-45 bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section — flex-centered within a fixed viewport height
          instead of content-driven py-24, so it always lands as one screen. */}
      <section id="philosophy" className="h-screen flex items-center px-6 snap-start scroll-mt-24">
        <div className="max-w-6xl mx-auto w-full">
          <ArtDecoDivider variant="stepped" />

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Our Objective</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6 leading-tight text-balance">
                Where Ideas Become Prototypes
              </h2>
            </div>
            <div className="space-y-6">
              <p className="text-muted-foreground leading-relaxed text-lg">
                Envision is an interdepartmental project by the Institution&apos;s Innovation Council of LICET,
                designed to inculcate teamwork, a problem-solving approach, proof of concept, implementation,
                collaborative thinking, communication skills, and continuous learning among young engineers.
              </p>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Interdepartmental teams of six members, each from a different class, come together to take a single
                idea from ideation all the way through to a working prototype.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section id="pillars" className="h-screen flex items-center px-6 bg-card/50 snap-start scroll-mt-24">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-12">
            <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Program Pillars</p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground text-balance">Learn By Building</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ServiceCard
              title="Team Collaboration"
              description="Interdepartmental teams of six, each member from a different class, learning to think, plan, and build together."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
                  <circle cx="8" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M2.5 20c0-3.6 2.9-6.5 5.5-6.5s5.5 2.9 5.5 6.5" />
                  <path d="M14.5 14c2.3.2 4.5 2.4 4.5 5.5" />
                </svg>
              }
            />
            <ServiceCard
              title="Problem Solving & Ideation"
              description="From identifying real problems worth solving to shaping raw ideas into clear, actionable solutions."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
                  <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" />
                </svg>
              }
            />
            <ServiceCard
              title="Proof of Concept"
              description="Turning ideas into working prototypes — implementation, iteration, and hands-on execution."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
                  <path d="M9 3h6M10 3v5.5L5 18a1.8 1.8 0 0 0 1.6 2.6h10.8A1.8 1.8 0 0 0 19 18l-5-9.5V3" />
                  <path d="M7.5 15h9" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Showcase Section — the dome fills the entire viewport-height
          section and the heading floats over it, instead of stacking above
          it, so the section stays exactly one screen tall for a clean snap. */}
      <section id="showcase-gallery" className="relative h-screen overflow-hidden snap-start scroll-mt-24">
        <DomeGallery
          images={SHOWCASE_PHOTOS.map((photo) => ({ src: photo.src, alt: photo.alt }))}
          fit={1.06}
          fitBasis="cover"
          minRadius={600}
          maxVerticalRotationDeg={0}
          segments={34}
          autoRotate
          autoRotateSpeed={3}
          overlayBlurColor="#08080a"
          grayscale={false}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-16 pb-24 bg-gradient-to-b from-background via-background/70 to-transparent">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <ArtDecoDivider variant="chevron" />
            <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Showcase</p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground text-balance">Moments From Envision</h2>
            <p className="text-muted-foreground text-sm mt-4">Drag to explore &middot; tap a photo for a closer look</p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 md:h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Testimonial Section */}
      <section id="testimonial" className="h-screen flex items-center px-6 snap-start scroll-mt-24">
        <div className="max-w-4xl mx-auto w-full">
          <ArtDecoDivider variant="fan" />

          <div className="relative text-center py-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-primary/20 font-serif text-9xl leading-none">
              &ldquo;
            </div>

            <blockquote className="relative z-10">
              <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed italic mb-8">
                Your first step into solving real-world problems. All the best!
                <span className="block mt-3">Let your light shine.</span>
              </p>
              <footer className="text-muted-foreground">
                <span className="text-primary">—</span> Institution&apos;s Innovation Council,{" "}
                <span className="text-primary">LICET</span>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Footer — outside the snap flow; scrolling past the last section
          reaches it normally rather than snapping. */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-primary" />
              <span className="font-serif text-xl text-foreground">Envision</span>
              <div className="w-12 h-px bg-primary" />
            </div>

            <p className="text-muted-foreground text-sm text-center">
              &copy; {new Date().getFullYear()} Envision. An initiative by the Institution&apos;s Innovation Council,
              LICET.
            </p>

            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-1 h-1 bg-primary" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
