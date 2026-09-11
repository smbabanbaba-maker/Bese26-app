-- Add a fallback "Other" subcategory under every top-level category.
-- The global "Other" category remains a top-level catch-all at the end.

insert into public.categories (parent_id, name, slug, icon, sort_order, is_active)
select c.id, 'Other', c.slug || '-other', 'ellipsis', 999, true
from public.categories c
where c.parent_id is null
  and c.slug <> 'other'
on conflict (slug) do update set
  parent_id = excluded.parent_id,
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

update public.categories
set sort_order = 9999, is_active = true
where parent_id is null and slug = 'other';
