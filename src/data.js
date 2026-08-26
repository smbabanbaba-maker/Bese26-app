export const categories = [
  { name: 'Phones & Tablets', icon: 'smartphone', tone: 'coral' },
  { name: 'Electronics', icon: 'laptop', tone: 'lavender' },
  { name: 'Vehicles', icon: 'car', tone: 'blue' },
  { name: 'Property', icon: 'house', tone: 'sand' },
  { name: 'Fashion', icon: 'shirt', tone: 'pink' },
  { name: 'Agriculture', icon: 'sprout', tone: 'green' },
  { name: 'Home & Garden', icon: 'sofa', tone: 'peach' },
  { name: 'Services', icon: 'wrench', tone: 'mint' },
  { name: 'Machinery', icon: 'cog', tone: 'slate' },
  { name: 'Beauty', icon: 'sparkles', tone: 'gold' },
  { name: 'Sports', icon: 'dumbbell', tone: 'sky' },
  { name: 'Groceries', icon: 'shopping-basket', tone: 'lime' },
];

export const listings = [
  {
    id: 1,
    title: 'iPhone 13 Pro 256GB',
    price: '₦485,000',
    numericPrice: 485000,
    location: 'Nassarawa, Kano',
    condition: 'Used • Excellent',
    posted: '18 min ago',
    image: '/images/iphone-13-pro.jpg',
    category: 'Phones & Tablets',
    seller: 'Aisha Bello',
    verified: true,
    promoted: true,
    description: 'A clean, carefully used iPhone 13 Pro with 256GB storage. Battery health is strong and the phone comes with the original box and cable.',
  },
  {
    id: 2,
    title: 'MacBook Air M2 13-inch',
    price: '₦1,080,000',
    numericPrice: 1080000,
    location: 'Wuse 2, Abuja',
    condition: 'Used • Like new',
    posted: '42 min ago',
    image: '/images/macbook-air.jpg',
    category: 'Electronics',
    seller: 'Northside Tech',
    verified: true,
    promoted: false,
    description: 'Lightly used MacBook Air with Apple silicon performance, 8GB RAM and 256GB SSD. Available for inspection in Wuse 2.',
  },
  {
    id: 3,
    title: '2018 Toyota Camry XSE',
    price: '₦18,900,000',
    numericPrice: 18900000,
    location: 'GRA, Kaduna',
    condition: 'Foreign used',
    posted: '2 hrs ago',
    image: '/images/toyota-camry.jpg',
    category: 'Vehicles',
    seller: 'Prime Motors',
    verified: true,
    promoted: true,
    description: 'Well-kept 2018 Toyota Camry XSE with a smooth automatic transmission, clean interior and complete documentation.',
  },
  {
    id: 4,
    title: 'Modern Boucle Sofa Set',
    price: '₦620,000',
    numericPrice: 620000,
    location: 'Maitama, Abuja',
    condition: 'New',
    posted: '3 hrs ago',
    image: '/images/sofa-set.jpg',
    category: 'Home & Garden',
    seller: 'Casa Living',
    verified: false,
    promoted: false,
    description: 'A warm, contemporary three-piece boucle sofa set. Locally made, comfortable and ready for delivery within Abuja.',
  },
];

export const sellers = [
  { name: 'Aisha Bello', initials: 'AB', location: 'Kano', rating: '4.9', listings: 42, verified: true, tone: 'rose' },
  { name: 'Northside Tech', initials: 'NT', location: 'Abuja', rating: '4.8', listings: 128, verified: true, tone: 'navy' },
  { name: 'Prime Motors', initials: 'PM', location: 'Kaduna', rating: '4.7', listings: 67, verified: true, tone: 'gold' },
];

export const messages = [
  { id: 1, name: 'Aisha Bello', initials: 'AB', preview: 'Is the price negotiable?', time: '09:42', unread: 2, listing: 'iPhone 13 Pro 256GB', image: '/images/iphone-13-pro.jpg', tone: 'rose' },
  { id: 2, name: 'Northside Tech', initials: 'NT', preview: 'You can inspect it today.', time: 'Yesterday', unread: 0, listing: 'MacBook Air M2', image: '/images/macbook-air.jpg', tone: 'navy' },
  { id: 3, name: 'Prime Motors', initials: 'PM', preview: 'The documents are complete.', time: 'Mon', unread: 0, listing: 'Toyota Camry XSE', image: '/images/toyota-camry.jpg', tone: 'gold' },
];

export const notifications = [
  { icon: 'message-circle', title: 'New message from Aisha Bello', detail: 'Is the price negotiable?', time: '12 min ago', unread: true },
  { icon: 'check-circle-2', title: 'Listing published successfully', detail: 'Your listing is now visible to buyers.', time: '2 hrs ago', unread: true },
  { icon: 'heart', title: 'Someone saved your listing', detail: 'iPhone 13 Pro 256GB received a new save.', time: 'Yesterday', unread: false },
  { icon: 'sparkles', title: 'A recommendation for you', detail: '3 new phones match your saved search.', time: 'Yesterday', unread: false },
];

export const transactions = [
  { label: 'Featured listing boost', date: 'Aug 22, 2026', amount: '-₦3,500', type: 'out' },
  { label: 'Wallet top-up (demo)', date: 'Aug 18, 2026', amount: '+₦50,000', type: 'in' },
  { label: 'Promotional credit', date: 'Aug 10, 2026', amount: '+₦10,000', type: 'in' },
];

export const demoAiReplies = {
  default: 'I found a few strong options near you. Try starting with a budget and a location, and I’ll narrow the list down.',
  phones: 'For phones under ₦300,000 in Kano, I’d start with clean Android flagships and older iPhone models. Want me to show the newest listings first?',
  sell: 'I can help you write a clear listing. Tell me the product name, condition and your expected price, then I’ll suggest a title and description.',
};
