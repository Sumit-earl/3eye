// Privacy-service result types (platform-neutral, serializable, PII-free).

export interface DataRequestResult {
  status: "logged" | "ignored";
  // 3eye is consent-first and aggregate-only: we hold no customer-identifying personal data.
  holdsPersonalData: false;
  reason?: string;
}

export interface RedactResult {
  status: "redacted" | "ignored";
  ordersDeleted: number;
  sessionsDeleted: number;
  reason?: string;
}

export interface ShopRedactResult {
  status: "erased" | "ignored";
  reason?: string;
}

export interface ForgetVisitResult {
  status: "erased" | "not_found" | "ignored";
  reason?: string;
}
