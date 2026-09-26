-- Public listing comments are visible immediately after a successful authenticated post.
alter table public.listing_comments
  alter column status set default 'published';
