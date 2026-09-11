-- Expand Bese26 into a general marketplace without changing the listing form.
-- Existing category rows are preserved; these rows add missing global inventory types.

INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Arduino & IoT', 'arduino-iot', 'cpu', 25),
  ('Computers & Accessories', 'computers-accessories', 'laptop', 27),
  ('Cameras & Photography', 'cameras-photography', 'camera', 29),
  ('Industrial & Scientific', 'industrial-scientific', 'factory', 115),
  ('Construction & Building', 'construction-building', 'hard-hat', 117),
  ('Renewable Energy', 'renewable-energy', 'sun', 119),
  ('Office & Stationery', 'office-stationery', 'briefcase', 145),
  ('Digital Products', 'digital-products', 'globe', 147),
  ('Travel & Luggage', 'travel-luggage', 'luggage', 149),
  ('Events & Entertainment', 'events-entertainment', 'ticket', 151),
  ('Services', 'services', 'wrench', 153),
  ('Other', 'other', 'package', 999)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.categories (parent_id, name, slug, icon, sort_order)
SELECT c.id, x.name, x.slug, x.icon, x.sort_order
FROM public.categories c
JOIN (VALUES
  ('arduino-iot', 'Arduino boards', 'cpu', 'arduino-boards', 10),
  ('arduino-iot', 'ESP32', 'cpu', 'esp32', 20),
  ('arduino-iot', 'ESP8266', 'cpu', 'esp8266', 30),
  ('arduino-iot', 'Raspberry Pi', 'cpu', 'raspberry-pi', 40),
  ('arduino-iot', 'Microcontrollers', 'cpu', 'microcontrollers', 50),
  ('arduino-iot', 'Sensors', 'activity', 'sensors', 60),
  ('arduino-iot', 'Modules', 'layers', 'modules', 70),
  ('arduino-iot', 'Electronic components', 'zap', 'electronic-components', 80),
  ('arduino-iot', 'Development boards', 'circuit-board', 'development-boards', 90),
  ('arduino-iot', 'Robotics', 'bot', 'robotics', 100),
  ('arduino-iot', 'Drones', 'plane', 'drones', 110),
  ('arduino-iot', 'IoT kits', 'wifi', 'iot-kits', 120),
  ('arduino-iot', 'Automation', 'settings', 'automation', 130),
  ('arduino-iot', '3D printing', 'printer', '3d-printing', 140),
  ('arduino-iot', 'Soldering & tools', 'wrench', 'soldering-tools', 150),
  ('arduino-iot', 'Cables & connectors', 'cable', 'cables-connectors', 160),
  ('computers-accessories', 'Desktops', 'monitor', 'desktops', 10),
  ('computers-accessories', 'Laptops', 'laptop', 'laptops', 20),
  ('computers-accessories', 'Monitors', 'monitor', 'monitors', 30),
  ('computers-accessories', 'Keyboards', 'keyboard', 'keyboards', 40),
  ('computers-accessories', 'Mice', 'mouse', 'mice', 50),
  ('computers-accessories', 'Hard drives', 'hard-drive', 'hard-drives', 60),
  ('computers-accessories', 'SSD', 'hard-drive', 'ssd', 70),
  ('computers-accessories', 'RAM', 'memory-stick', 'ram', 80),
  ('computers-accessories', 'Graphics cards', 'gpu', 'graphics-cards', 90),
  ('cameras-photography', 'Digital cameras', 'camera', 'digital-cameras', 10),
  ('cameras-photography', 'Lenses', 'camera', 'lenses', 20),
  ('cameras-photography', 'Tripods', 'camera', 'tripods', 30),
  ('cameras-photography', 'Lighting', 'sun', 'lighting', 40),
  ('cameras-photography', 'Camcorders', 'video', 'camcorders', 50),
  ('industrial-scientific', 'Laboratory equipment', 'flask', 'laboratory-equipment', 10),
  ('industrial-scientific', 'Measuring instruments', 'ruler', 'measuring-instruments', 20),
  ('industrial-scientific', 'Safety equipment', 'shield', 'safety-equipment', 30),
  ('industrial-scientific', 'Electrical equipment', 'zap', 'electrical-equipment', 40),
  ('construction-building', 'Building materials', 'brick-wall', 'building-materials', 10),
  ('construction-building', 'Plumbing', 'droplets', 'plumbing', 20),
  ('construction-building', 'Electrical supplies', 'zap', 'electrical-supplies', 30),
  ('construction-building', 'Power tools', 'wrench', 'power-tools', 40),
  ('renewable-energy', 'Solar panels', 'sun', 'solar-panels', 10),
  ('renewable-energy', 'Inverters', 'zap', 'inverters', 20),
  ('renewable-energy', 'Batteries', 'battery', 'batteries', 30),
  ('renewable-energy', 'Charge controllers', 'battery-charging', 'charge-controllers', 40),
  ('office-stationery', 'Office furniture', 'armchair', 'office-furniture', 10),
  ('office-stationery', 'Stationery', 'pencil', 'stationery', 20),
  ('office-stationery', 'Printers & scanners', 'printer', 'printers-scanners', 30),
  ('digital-products', 'Software', 'code', 'software', 10),
  ('digital-products', 'Templates', 'file', 'templates', 20),
  ('digital-products', 'Digital courses', 'book-open', 'digital-courses', 30),
  ('travel-luggage', 'Luggage', 'luggage', 'luggage', 10),
  ('travel-luggage', 'Travel bags', 'briefcase', 'travel-bags', 20),
  ('travel-luggage', 'Camping equipment', 'tent', 'camping-equipment', 30),
  ('events-entertainment', 'Event equipment', 'calendar', 'event-equipment', 10),
  ('events-entertainment', 'Party supplies', 'sparkles', 'party-supplies', 20),
  ('events-entertainment', 'Music & DJ', 'music', 'music-dj', 30),
  ('services', 'Repairs', 'wrench', 'repairs', 10),
  ('services', 'Installation', 'settings', 'installation', 20),
  ('services', 'Delivery', 'truck', 'delivery', 30),
  ('services', 'Cleaning', 'spray-can', 'cleaning', 40),
  ('services', 'Design', 'pen-tool', 'design', 50),
  ('services', 'Consulting', 'messages-square', 'consulting', 60),
  ('services', 'Other services', 'package', 'other-services', 99),
  ('other', 'Other products', 'package', 'other-products', 10),
  ('other', 'Other services', 'wrench', 'other-services-global', 20)
) AS x(parent_slug, name, icon, slug, sort_order) ON c.slug = x.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Fields needed for hardware listings; all are optional so existing flows remain unchanged.
INSERT INTO public.category_fields (category_id, field_key, label, field_type, options, sort_order)
SELECT c.id, x.field_key, x.label, x.field_type, x.options::jsonb, x.sort_order
FROM public.categories c
JOIN (VALUES
  ('arduino-iot', 'board_type', 'Board / device', 'text', '[]', 10),
  ('arduino-iot', 'chip', 'Chip / module', 'text', '[]', 20),
  ('arduino-iot', 'voltage', 'Voltage', 'text', '[]', 30),
  ('arduino-iot', 'connectivity', 'Connectivity', 'select', '["Wi-Fi","Bluetooth","LoRa","GSM","USB","None"]', 40),
  ('computers-accessories', 'brand', 'Brand', 'text', '[]', 10),
  ('computers-accessories', 'model', 'Model', 'text', '[]', 20),
  ('computers-accessories', 'processor', 'Processor', 'text', '[]', 30),
  ('computers-accessories', 'ram', 'RAM', 'text', '[]', 40),
  ('computers-accessories', 'storage', 'Storage', 'text', '[]', 50),
  ('cameras-photography', 'brand', 'Brand', 'text', '[]', 10),
  ('cameras-photography', 'model', 'Model', 'text', '[]', 20),
  ('cameras-photography', 'resolution', 'Resolution', 'text', '[]', 30)
) AS x(category_slug, field_key, label, field_type, options, sort_order) ON c.slug = x.category_slug
ON CONFLICT (category_id, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
