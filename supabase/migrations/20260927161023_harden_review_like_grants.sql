-- Raw liker identities must never be directly selectable by anonymous users.
revoke all on table public.review_likes, public.review_comment_likes from public, anon, authenticated;
grant select, insert, delete on table public.review_likes, public.review_comment_likes to authenticated;
