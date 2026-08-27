export const DEPARTMENTS = ["AI&DS", "CSE A", "CSE B", "ECE", "EEE", "MECH"] as const

export type Department = (typeof DEPARTMENTS)[number]
