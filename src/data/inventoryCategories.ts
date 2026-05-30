/** Standard pharmacy inventory categories (aligned with seed data). */
export const INVENTORY_CATEGORIES = [
  "Antibiotics",
  "Anti-Glaucoma",
  "Lubricants",
  "Mydriatics",
  "NSAIDs",
  "Steroids",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const MEDICATION_ROUTES = ["Topical", "Oral"] as const;
export type MedicationRoute = (typeof MEDICATION_ROUTES)[number];
