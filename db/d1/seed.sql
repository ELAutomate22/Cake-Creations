-- Data export from Supabase project cadcntchiszzcipaxoce, 2026-08-20.
-- 2 review(s). customer_email and submitter_hash are NOT included:
-- the anon key is refused those columns by Postgres, so they need a service-role
-- export if you want them carried over.

INSERT INTO cake_reviews (id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response, is_visible) VALUES ('7e95830a-493d-43d4-85ae-8300f7f0a38d', 'Sarah M.', 'Christening cake', 'classic', 'Christening', 5, 'Absolutely beautiful cake for our daughters christening. The piping detail was exquisite and everyone commented on how lovely it looked.', '2026-08-13T17:40:20.497459+00:00', NULL, 1);
INSERT INTO cake_reviews (id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response, is_visible) VALUES ('f632c8e7-3446-42c3-842f-f88e6fa85667', 'Deploy C.', NULL, 'classic', NULL, 5, 'Verifying the review endpoint works on the deployed Netlify site.', '2026-08-16T21:50:07.377501+00:00', NULL, 1);
