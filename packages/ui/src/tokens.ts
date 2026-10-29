/**
 * Brand tokens.
 *
 * The visual identity is still an open decision (docs/project-contract.md §10.1-10.2).
 * These are neutral placeholders: change them here and every consumer updates.
 */
export const brandTokens = {
  name: "KidsToys",
  /** Placeholder wordmark until the owner supplies a logo. */
  logoText: "KidsToys",
  /** Fallback accent used for playful highlights on the storefront. */
  accentFallback: "var(--chart-4)",
} as const;

export const orderStatusTone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "outline",
  delivered: "default",
  cancelled: "destructive",
};

export const purchaseStatusTone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  ordered: "outline",
  received: "default",
  cancelled: "destructive",
};
