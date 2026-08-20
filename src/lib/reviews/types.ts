/**
 * Review shapes.
 *
 * There is only one, and it has no email address on it. Nothing on the website
 * reads that column, so it is impossible to hand a component a review that
 * carries one. The address is stored, and readable by the business through the
 * Cloudflare dashboard, but it never travels to a browser.
 */

export type PublicReview = {
  id: string;
  customerName: string;
  cakeType: string | null;
  cakeStyle: string | null;
  occasion: string | null;
  rating: number;
  reviewText: string;
  createdAt: string;
  ownerResponse: string | null;
};

export type ReviewSummary = {
  count: number;
  average: number;
};

/** Row shape as stored, used when mapping query results. */
export type ReviewRow = {
  id: string;
  customer_name: string;
  customer_email?: string;
  cake_type: string | null;
  cake_style: string | null;
  occasion: string | null;
  rating: number;
  review_text: string;
  created_at: string;
  is_visible?: boolean;
  owner_response: string | null;
};

export function toPublicReview(row: ReviewRow): PublicReview {
  return {
    id: row.id,
    customerName: row.customer_name,
    cakeType: row.cake_type,
    cakeStyle: row.cake_style,
    occasion: row.occasion,
    rating: row.rating,
    reviewText: row.review_text,
    createdAt: row.created_at,
    ownerResponse: row.owner_response,
  };
}

export function summarise(reviews: { rating: number }[]): ReviewSummary {
  if (reviews.length === 0) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
  };
}
