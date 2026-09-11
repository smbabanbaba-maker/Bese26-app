import re
from collections import Counter
from pathlib import Path

sql = Path('/home/ubuntu/Bese26-app/supabase/migrations/20260911210000_expand_marketplace_categories.sql').read_text()
# Capture the slug column in the parent VALUES rows and child VALUES rows.
slugs = re.findall(r"\('(?:[^']*)',\s*'([a-z0-9-]+)'(?:,\s*'[^']*')?\s*,?", sql)
for slug, count in sorted(Counter(slugs).items()):
    if count > 1:
        print(slug, count)
