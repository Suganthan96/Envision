export interface Domain {
  id: string
  title: string
  sdgs: number[]
  description: string
  icon:
    | "water-energy"
    | "home"
    | "campus"
    | "city"
    | "agriculture"
    | "health"
    | "waste"
    | "ai-social"
    | "climate"
    | "inclusive"
}

export const DOMAINS: Domain[] = [
  {
    id: "water-clean-energy",
    title: "Smart Water & Clean Energy for a Sustainable Future",
    sdgs: [6, 7, 9, 12, 13, 14],
    description:
      "Water purification, leakage detection, rainwater harvesting, smart irrigation, water-quality monitoring, renewable energy, energy harvesting, smart power management, and energy-efficient technologies.",
    icon: "water-energy",
  },
  {
    id: "smart-home-automation",
    title: "Smart & Sustainable Home Automation",
    sdgs: [6, 7, 11, 12, 13],
    description: "Smart water use, energy saving, waste reduction, sustainable homes/campuses.",
    icon: "home",
  },
  {
    id: "campus-360",
    title: "Campus 360: One Intelligent Ecosystem",
    sdgs: [4, 9, 11, 12, 13],
    description:
      "Unified campus platform, AI/IoT integration, smart classrooms, predictive maintenance, resource optimization, digital services, sustainability tracking, and real-time campus analytics.",
    icon: "campus",
  },
  {
    id: "future-ready-cities",
    title: "Future-Ready Cities & Communities",
    sdgs: [9, 11, 13],
    description:
      "Smart traffic, intelligent parking, public safety, disaster-resilient infrastructure, accessible public spaces.",
    icon: "city",
  },
  {
    id: "smart-agriculture",
    title: "Smart Agriculture & Food Security",
    sdgs: [2, 6, 8, 12, 13, 15],
    description: "Precision farming, crop monitoring, automated irrigation, food storage, agricultural waste utilisation.",
    icon: "agriculture",
  },
  {
    id: "health-wellbeing",
    title: "Health, Well-being & Assistive Technology",
    sdgs: [3, 5, 10],
    description: "Low-cost healthcare devices, assistive technologies, elderly care, accessibility solutions, preventive health.",
    icon: "health",
  },
  {
    id: "waste-to-value",
    title: "Waste to Value",
    sdgs: [9, 11, 12, 13, 14, 15],
    description: "Waste segregation, recycling, upcycling, e-waste management, converting waste into useful products.",
    icon: "waste",
  },
  {
    id: "ai-social-good",
    title: "AI for Social Good",
    sdgs: [4, 5, 8, 10, 11, 16],
    description: "AI/ML solutions for accessibility, education, safety, agriculture, disaster management and public services.",
    icon: "ai-social",
  },
  {
    id: "climate-resilience",
    title: "Climate Resilience & Disaster Management",
    sdgs: [11, 13, 14, 15],
    description: "Flood prediction, early-warning systems, fire detection, heat mitigation, coastal protection, emergency response.",
    icon: "climate",
  },
  {
    id: "inclusive-innovation",
    title: "Inclusive Innovation for a Better Society",
    sdgs: [1, 4, 5, 8, 10, 16, 17],
    description: "Solutions for rural communities, smart education access, livelihoods, gender inclusion and community empowerment.",
    icon: "inclusive",
  },
]
