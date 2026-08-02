/** A review as the public is allowed to see it. No email, ever. */
export type PublicReview = {
  id: string;
  customer_name: string;
  cake_type: string;
  cake_style: string;
  occasion: string | null;
  rating: number;
  review_text: string;
  created_at: string;
  owner_response: string | null;
  /** True only for the clearly-labelled demonstration entries. */
  is_sample?: boolean;
};

/** A review as the authenticated owner sees it, including private fields. */
export type OwnerReview = PublicReview & {
  customer_email: string;
  is_visible: boolean;
  owner_response_at: string | null;
};

/** Average and count, derived from visible reviews only. */
export type ReviewSummary = {
  average: number;
  total: number;
};

/** The columns the public role is permitted to select. */
export const PUBLIC_REVIEW_COLUMNS =
  "id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response";

/** How many reviews are shown before "Load more". */
export const REVIEWS_PER_PAGE = 6;
