-- Keep the Sell form's marketplace taxonomy aligned with the categories offered in the UI.
-- Existing category slugs are preserved; missing parents and children are added idempotently.

insert into public.categories (name, slug, icon, sort_order) values
  ('Babies & Kids', 'babies-kids', 'baby', 100),
  ('Sports & Fitness', 'sports-fitness', 'dumbbell', 110),
  ('Books & Education', 'books-education', 'book-open', 120),
  ('Pets & Animals', 'pets-animals', 'paw-print', 130),
  ('Hobbies & Collectibles', 'hobbies-collectibles', 'sparkles', 140),
  ('Business & Industrial', 'business-industrial', 'briefcase-business', 150),
  ('Food & Beverages', 'food-beverages', 'utensils', 160),
  ('Other', 'other', 'package', 170)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;

insert into public.categories (parent_id, name, slug, icon, sort_order)
select c.id, x.name, x.slug, x.icon, x.sort_order
from public.categories c
join (values
  ('babies-kids', 'Baby clothing', 'baby-clothing', 'shirt', 10),
  ('babies-kids', 'Toys', 'toys', 'toy-brick', 20),
  ('babies-kids', 'Strollers', 'strollers', 'baby', 30),
  ('babies-kids', 'School items', 'school-items', 'book-open', 40),
  ('sports-fitness', 'Gym equipment', 'gym-equipment', 'dumbbell', 10),
  ('sports-fitness', 'Sportswear', 'sportswear', 'shirt', 20),
  ('sports-fitness', 'Outdoor gear', 'outdoor-gear', 'tent', 30),
  ('books-education', 'Books', 'books', 'book-open', 10),
  ('books-education', 'Courses', 'courses', 'graduation-cap', 20),
  ('books-education', 'School supplies', 'school-supplies', 'pencil', 30),
  ('pets-animals', 'Pets', 'pets', 'paw-print', 10),
  ('pets-animals', 'Pet supplies', 'pet-supplies', 'package', 20),
  ('pets-animals', 'Animal care', 'animal-care', 'heart-pulse', 30),
  ('hobbies-collectibles', 'Collectibles', 'collectibles', 'sparkles', 10),
  ('hobbies-collectibles', 'Musical instruments', 'musical-instruments', 'music', 20),
  ('hobbies-collectibles', 'Arts & crafts', 'arts-crafts', 'palette', 30),
  ('business-industrial', 'Machinery', 'machinery', 'cog', 10),
  ('business-industrial', 'Manufacturing equipment', 'manufacturing-equipment', 'factory', 20),
  ('business-industrial', 'Office equipment', 'office-equipment', 'briefcase', 30),
  ('business-industrial', 'Restaurant equipment', 'restaurant-equipment', 'utensils', 40),
  ('business-industrial', 'Wholesale goods', 'wholesale-goods', 'shopping-basket', 50),
  ('business-industrial', 'Industrial supplies', 'industrial-supplies', 'package', 60),
  ('food-beverages', 'Food', 'food', 'utensils', 10),
  ('food-beverages', 'Grains', 'grains', 'wheat', 20),
  ('food-beverages', 'Fresh produce', 'fresh-produce', 'sprout', 30),
  ('food-beverages', 'Processed food', 'processed-food', 'package', 40),
  ('food-beverages', 'Bakery', 'bakery', 'cake', 50),
  ('food-beverages', 'Catering', 'catering', 'utensils', 60),
  ('other', 'Other products', 'other-products', 'package', 10),
  ('other', 'Other services', 'other-services', 'wrench', 20)
) as x(parent_slug, name, slug, icon, sort_order) on c.slug = x.parent_slug
on conflict (slug) do update set parent_id = excluded.parent_id, name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;
