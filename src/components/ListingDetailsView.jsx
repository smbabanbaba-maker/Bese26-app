import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flag,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Tag,
  ThumbsUp,
  UserPlus,
  X,
} from 'lucide-react';
import VerificationBadges from './VerificationBadges';
import { getAvatarUrl } from '../lib/supabase';
import {
  createChatOffer,
  deleteListing,
  fetchListingComments,
  fetchListingContact,
  fetchListingReviews,
  fetchReviewComments,
  fetchReviewSocialStats,
  fetchSellerListings,
  fetchSellerReviews,
  fetchSimilarListings,
  getFollowState,
  getOrCreateConversation,
  recordListingView,
  reportListing,
  setListingStatus,
  submitListingComment,
  submitListingReview,
  submitReviewComment,
  toggleFollow,
  toggleReviewLike,
} from '../lib/marketplace';

function safeGalleryUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function displayName(profile, fallback = 'Bese26 member') {
  return profile?.display_name || profile?.username || fallback;
}

function ReviewFeedbackCard({
  review,
  user,
  likeCount = 0,
  commentCount = 0,
  liked = false,
  onToggleLike,
  onCommentPublished,
  onReport,
  onAuthRequired,
  onNotice,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canInteract = review.status === 'published';
  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
  const reviewer = displayName(review.reviewer, 'Buyer');
  const reviewerAvatar = getAvatarUrl(review.reviewer?.avatar_path);

  useEffect(() => {
    let current = true;
    if (!commentsOpen || commentsLoaded || !canInteract) return undefined;
    setCommentsLoading(true);
    fetchReviewComments(review.id, user?.id || null)
      .then((rows) => {
        if (!current) return;
        setComments(rows || []);
        setCommentsLoaded(true);
      })
      .catch((error) => {
        if (current) onNotice?.(error.message || 'Could not load comments.');
      })
      .finally(() => current && setCommentsLoading(false));
    return () => { current = false; };
  }, [commentsOpen, commentsLoaded, canInteract, review.id, user?.id, onNotice]);

  const postComment = async (event) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body) return;
    if (!user) {
      onAuthRequired?.('Sign in to comment on seller feedback.');
      return;
    }
    setCommentBusy(true);
    try {
      const saved = await submitReviewComment({ reviewId: review.id, userId: user.id, body });
      setComments((current) => [...current, {
        ...saved,
        user: saved.user || { display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You' },
      }]);
      setCommentsLoaded(true);
      setCommentDraft('');
      if (saved.status === 'published') onCommentPublished?.(review.id);
      onNotice?.(saved.status === 'published' ? 'Comment posted.' : 'Your comment is awaiting review.');
    } catch (error) {
      onNotice?.(error.message || 'Could not post this comment.');
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <article className="listing-new-review" aria-label={`Seller feedback by ${reviewer}`}>
      <div className="listing-new-review-top">
        <div className="listing-new-review-avatar">
          {reviewerAvatar ? <img src={reviewerAvatar} alt="" loading="lazy" /> : reviewer.slice(0, 1).toUpperCase()}
        </div>
        <strong>{reviewer}</strong>
        <time>{review.created_at ? new Date(review.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}</time>
        {review.status === 'pending' && review.reviewer_id === user?.id && <span className="listing-review-pending">Pending review</span>}
        <button type="button" className="listing-review-more" aria-label="Review options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
          <MoreVertical size={17} />
        </button>
      </div>
      {menuOpen && <div className="listing-review-menu"><button type="button" onClick={() => { setMenuOpen(false); onReport?.(review); }}><Flag size={14} /> Report feedback</button></div>}
      <div className="listing-new-stars" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => <span className={index < rating ? 'filled' : ''} key={index}>★</span>)}
      </div>
      <p className="listing-review-body">{review.body || 'No written feedback.'}</p>
      {review.listing?.title && <small className="listing-review-listing">About: {review.listing.title}</small>}
      <div className="listing-review-actions">
        <button type="button" className={liked ? 'is-liked' : ''} aria-pressed={liked} disabled={!canInteract} onClick={() => onToggleLike?.(review)}>
          <ThumbsUp size={16} /> Like <span>{likeCount}</span>
        </button>
        <button type="button" aria-expanded={commentsOpen} disabled={!canInteract} onClick={() => setCommentsOpen((value) => !value)}>
          <MessageCircle size={16} /> Comment <span>{commentCount}</span>
        </button>
      </div>
      {commentsOpen && canInteract && <div className="listing-review-comments">
        {commentsLoading ? <div className="listing-review-comments-state">Loading comments…</div>
          : comments.length ? comments.map((comment) => {
            const commenter = displayName(comment.user, comment.user_id === user?.id ? 'You' : 'Bese26 member');
            const avatar = getAvatarUrl(comment.user?.avatar_path);
            return <div className="listing-review-comment" key={comment.id}>
              <div className="listing-review-comment-avatar">{avatar ? <img src={avatar} alt="" loading="lazy" /> : commenter.slice(0, 1).toUpperCase()}</div>
              <div className="listing-review-comment-content">
                <div className="listing-review-comment-meta"><strong>{commenter}</strong><time>{comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : ''}</time></div>
                <p>{comment.body}</p>
                {comment.status === 'pending' && comment.user_id === user?.id && <small>Pending review</small>}
              </div>
            </div>;
          })
            : <div className="listing-review-comments-state">No comments yet. Start a respectful conversation.</div>}
        <form className="listing-review-comment-form" onSubmit={postComment}>
          <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={1000} rows={2} placeholder="Write a comment…" aria-label="Write a comment on this review" />
          <button type="submit" disabled={commentBusy || !commentDraft.trim()} aria-label="Post comment">{commentBusy ? 'Posting…' : <><Send size={15} /> Post</>}</button>
        </form>
      </div>}
    </article>
  );
}

export default function ListingDetailsView({
  listing,
  user,
  onClose,
  isSaved,
  onToggleSave,
  onDemoAction,
  onAuthRequired,
  onStartChat,
  onEditListing,
  onOpenListing,
  onCopyListing,
  savedIds = [],
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState(() => new Set());
  const [zoomed, setZoomed] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewSocials, setReviewSocials] = useState({});
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [sellerListings, setSellerListings] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('scam');
  const [reportDetails, setReportDetails] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [contact, setContact] = useState({ phone: '', whatsapp: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerBusy, setOfferBusy] = useState(false);
  const [followingSeller, setFollowingSeller] = useState(false);
  const [listingStatus, setListingStatusState] = useState(listing?.raw?.status || 'active');
  const [similarVisibleCount, setSimilarVisibleCount] = useState(12);
  const similarSentinelRef = useRef(null);

  const raw = listing?.raw || {};
  const galleryCandidates = [...(Array.isArray(listing?.gallery) ? listing.gallery : []), listing?.image];
  const validImages = useMemo(() => [...new Set(galleryCandidates.map((image) => typeof image === 'string' ? image.trim() : image)
    .filter((image) => safeGalleryUrl(image) && !failedImageUrls.has(image)))], [listing?.id, listing?.gallery, listing?.image, failedImageUrls]);
  const owner = Boolean(user?.id && listing?.sellerId === user.id);
  const description = listing?.description || '';
  const phone = contact.phone || '';
  const whatsapp = contact.whatsapp || '';
  const phoneEnabled = Boolean(String(phone).trim());
  const whatsappEnabled = Boolean(String(whatsapp).trim());
  const categoryText = `${listing?.category || ''} ${listing?.subcategory || ''}`.toLowerCase();
  const categoryFields = categoryText.includes('phone') || categoryText.includes('mobile')
    ? ['brand', 'model', 'condition', 'ram', 'storage', 'colour', 'color']
    : categoryText.includes('car') || categoryText.includes('vehicle')
      ? ['make', 'model', 'year', 'mileage', 'transmission', 'fuel', 'condition']
      : categoryText.includes('property') || categoryText.includes('house') || categoryText.includes('land')
        ? ['property_type', 'bedrooms', 'bathrooms', 'furnishing', 'size', 'condition']
        : categoryText.includes('drone') ? ['brand', 'model', 'condition', 'camera', 'flight_type']
          : categoryText.includes('electronic') ? ['brand', 'model', 'condition', 'type'] : null;
  const specs = Object.entries(listing?.attributes || {})
    .filter(([key, value]) => value !== null && value !== undefined && String(value).trim() !== '' && (!categoryFields || categoryFields.includes(String(key).toLowerCase())))
    .map(([key, value]) => ({ key: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), value: Array.isArray(value) ? value.join(', ') : value }));
  const delivery = Array.isArray(listing?.deliveryOptions) ? listing.deliveryOptions.filter(Boolean) : [];
  const deliveryDetails = delivery.flatMap((item) => {
    if (typeof item === 'object') return [item.label || item.name || item.type, item.fee != null ? `Delivery fee: ${item.fee}` : '', item.location ? `Pickup: ${item.location}` : ''];
    return [String(item).replaceAll('_', ' ')];
  }).filter(Boolean);
  const publishedReviews = reviews.filter((review) => review.status === 'published');
  const reviewAverage = publishedReviews.length
    ? (publishedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / publishedReviews.length).toFixed(1)
    : null;
  const visibleReviews = [...publishedReviews.slice(0, 2), ...reviews.filter((review) => review.status === 'pending' && review.reviewer_id === user?.id)];
  const canReview = Boolean(user && !owner && ['sold', 'archived'].includes(String(listingStatus || '').toLowerCase()));
  const titleParts = [listing?.category, listing?.subcategory].filter(Boolean).join(' · ');
  const sellerLocation = listing?.location || 'Nigeria';
  const sellerSince = raw.profiles?.created_at
    ? new Date(raw.profiles.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
    : null;
  const primaryImage = validImages[activeImage] || '';
  const priceType = raw.pricing_type === 'negotiable' ? 'Negotiable'
    : raw.pricing_type === 'contact' || raw.price == null ? 'Contact for price'
      : raw.pricing_type === 'on_request' ? 'Price on request' : 'Fixed price';

  useEffect(() => {
    if (!listing) return undefined;
    let current = true;
    setActiveImage(0);
    setFailedImageUrls(new Set());
    setZoomed(false);
    setExpandedDescription(false);
    setReviewOpen(false);
    setReviewsOpen(false);
    setOfferOpen(false);
    setOfferAmount('');
    setReportOpen(false);
    setContact({ phone: '', whatsapp: '' });
    setContactLoading(true);
    setLoadingDetails(true);
    setFollowingSeller(false);
    setSellerListings([]);
    setSimilar([]);
    setSimilarVisibleCount(12);
    setComments([]);
    setReviews([]);
    setReviewSocials({});
    setListingStatusState(listing.raw?.status || 'active');

    Promise.allSettled([
      fetchSellerReviews(listing.sellerId),
      fetchListingReviews(listing.id),
      fetchListingComments(listing.id),
      fetchSimilarListings(listing),
      fetchSellerListings(listing),
      user?.id ? fetchListingContact(listing.id) : Promise.resolve({ phone: '', whatsapp: '' }),
      user?.id && listing.sellerId ? getFollowState(user.id, listing.sellerId) : Promise.resolve({ following: false }),
    ]).then(([sellerReviewResult, listingReviewResult, commentsResult, similarResult, sellerListingsResult, contactResult, followResult]) => {
      if (!current) return;
      const sellerReviews = sellerReviewResult.status === 'fulfilled' ? sellerReviewResult.value || [] : [];
      const listingReviews = listingReviewResult.status === 'fulfilled' ? listingReviewResult.value || [] : [];
      const mergedReviews = [...listingReviews, ...sellerReviews].filter((review, index, rows) => rows.findIndex((candidate) => candidate.id === review.id) === index);
      setReviews(mergedReviews);
      if (mergedReviews.length) {
        fetchReviewSocialStats(mergedReviews.map((review) => review.id), user?.id || null)
          .then((stats) => current && setReviewSocials(stats))
          .catch(() => {});
      }
      if (commentsResult.status === 'fulfilled') setComments(commentsResult.value || []);
      if (similarResult.status === 'fulfilled') setSimilar(similarResult.value || []);
      if (sellerListingsResult.status === 'fulfilled') setSellerListings(sellerListingsResult.value || []);
      if (contactResult.status === 'fulfilled') setContact(contactResult.value || { phone: '', whatsapp: '' });
      if (followResult.status === 'fulfilled') setFollowingSeller(Boolean(followResult.value?.following));
    }).finally(() => {
      if (current) {
        setLoadingDetails(false);
        setContactLoading(false);
      }
    });
    recordListingView(listing.id).catch(() => {});
    return () => { current = false; };
  }, [listing?.id, listing?.sellerId, user?.id]);

  useEffect(() => {
    const node = similarSentinelRef.current;
    if (!node || similarVisibleCount >= similar.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setSimilarVisibleCount((count) => Math.min(count + 12, similar.length));
    }, { rootMargin: '280px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [similar.length, similarVisibleCount]);

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (event) => event.key === 'Escape' && setZoomed(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (!listing) return null;

  const nextImage = () => setActiveImage((current) => validImages.length ? (current + 1) % validImages.length : 0);
  const previousImage = () => setActiveImage((current) => validImages.length ? (current - 1 + validImages.length) % validImages.length : 0);
  const share = async () => {
    const url = `https://www.bese26.shop/listing/${encodeURIComponent(listing.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${listing.title} | Bese26`, text: `${listing.title} · ${listing.price}`, url });
      else { await navigator.clipboard?.writeText(url); onDemoAction?.('Listing link copied.'); }
    } catch (error) {
      if (error.name !== 'AbortError') onDemoAction?.('Could not share this listing.');
    }
  };
  const phoneHref = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    const digits = rawValue.replace(/\D/g, '');
    return digits ? `tel:${rawValue.startsWith('+') ? '+' : ''}${digits}` : '';
  };
  const whatsappHref = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    if (/^https?:\/\//i.test(rawValue)) return rawValue;
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) return '';
    const international = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
    return `https://wa.me/${international}?text=${encodeURIComponent(`Hello, I am interested in ${listing.title}.`)}`;
  };
  const callSeller = () => {
    if (!user) { onAuthRequired?.('Sign in to contact the seller by phone.'); return; }
    const href = phoneHref(phone);
    if (!href) { onDemoAction?.(contactLoading ? 'Loading the seller contact details…' : 'The seller has not enabled phone calls for this listing.'); return; }
    window.location.href = href;
  };
  const openWhatsApp = () => {
    if (!user) { onAuthRequired?.('Sign in to contact the seller on WhatsApp.'); return; }
    const href = whatsappHref(whatsapp);
    if (!href) { onDemoAction?.(contactLoading ? 'Loading the seller contact details…' : 'The seller has not enabled WhatsApp for this listing.'); return; }
    window.location.assign(href);
  };
  const followSeller = async () => {
    if (!user) { onAuthRequired?.('Sign in to follow sellers and receive new listing alerts.'); return; }
    if (owner || !listing.sellerId) return;
    const next = !followingSeller;
    setFollowingSeller(next);
    try {
      await toggleFollow(user.id, listing.sellerId, next);
      onDemoAction?.(next ? 'You are now following this seller.' : 'You unfollowed this seller.');
    } catch (error) {
      setFollowingSeller(!next);
      onDemoAction?.(error.message || 'Could not update your following list.');
    }
  };
  const sendQuickMessage = (event) => {
    event.preventDefault();
    if (!user) { onAuthRequired?.('Sign in to chat with this seller.'); return; }
    const text = quickMessage.trim();
    if (!text) { onDemoAction?.('Choose a quick question or write a message first.'); return; }
    onStartChat?.(listing, 'message', text);
  };
  const submitListingOffer = async (event) => {
    event.preventDefault();
    if (!user) { onAuthRequired?.('Sign in to make an offer.'); return; }
    if (owner) { onDemoAction?.('You cannot make an offer on your own listing.'); return; }
    const amount = Number(offerAmount);
    if (!Number.isFinite(amount) || amount <= 0) { onDemoAction?.('Enter a valid positive offer amount.'); return; }
    setOfferBusy(true);
    try {
      const conversation = await getOrCreateConversation({ listingId: listing.id, buyerId: user.id, sellerId: listing.sellerId });
      await createChatOffer({ conversationId: conversation.id, listingId: listing.id, buyerId: user.id, sellerId: listing.sellerId, amount });
      setOfferOpen(false);
      setOfferAmount('');
      onDemoAction?.('Offer sent securely to the seller.');
      onStartChat?.(listing, 'message', `I sent an offer of NGN ${amount.toLocaleString('en-NG')} for this listing.`);
    } catch (error) {
      onDemoAction?.(error.message || 'Could not send this offer.');
    } finally {
      setOfferBusy(false);
    }
  };
  const submitReport = async (event) => {
    event.preventDefault();
    if (!user) { onAuthRequired?.('Sign in to report a listing.'); return; }
    setActionBusy(true);
    try {
      await reportListing({ listingId: listing.id, reporterId: user.id, reason: reportReason, details: reportDetails.trim() || null });
      setReportOpen(false);
      setReportDetails('');
      onDemoAction?.('Report submitted to Bese26 moderation.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not submit the report.');
    } finally {
      setActionBusy(false);
    }
  };
  const reportReview = async (review) => {
    if (!user) { onAuthRequired?.('Sign in to report feedback.'); return; }
    try {
      await reportListing({ listingId: review.listing_id || listing.id, reporterId: user.id, reason: 'other', details: `Report review ${review.id}: please review this seller feedback.` });
      onDemoAction?.('Feedback report submitted to moderation.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not report this feedback.');
    }
  };
  const toggleLike = async (review) => {
    if (!user) { onAuthRequired?.('Sign in to like seller feedback.'); return; }
    const current = reviewSocials[review.id] || { likeCount: 0, commentCount: 0, liked: false };
    const shouldLike = !current.liked;
    setReviewSocials((value) => ({ ...value, [review.id]: { ...current, liked: shouldLike, likeCount: Math.max(0, current.likeCount + (shouldLike ? 1 : -1)) } }));
    try {
      await toggleReviewLike({ reviewId: review.id, userId: user.id, shouldLike });
    } catch (error) {
      setReviewSocials((value) => ({ ...value, [review.id]: current }));
      onDemoAction?.(error.message || 'Could not update your like.');
    }
  };
  const onCommentPublished = (reviewId) => setReviewSocials((value) => {
    const current = value[reviewId] || { likeCount: 0, commentCount: 0, liked: false };
    return { ...value, [reviewId]: { ...current, commentCount: current.commentCount + 1 } };
  });
  const manage = async (status) => {
    if (!user) return;
    setActionBusy(true);
    try {
      await setListingStatus(listing.id, user.id, status);
      setListingStatusState(status);
      onDemoAction?.(status === 'paused' ? 'Listing marked unavailable.' : status === 'active' ? 'Listing is available again.' : `Listing ${status}.`);
    } catch (error) {
      onDemoAction?.(error.message || 'Could not update listing status.');
    } finally {
      setActionBusy(false);
    }
  };
  const removeListing = async () => {
    if (!user || !window.confirm('Delete this listing? This cannot be undone.')) return;
    setActionBusy(true);
    try {
      await deleteListing(listing.id, user.id);
      onClose?.();
      onDemoAction?.('Listing deleted.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not delete listing.');
    } finally {
      setActionBusy(false);
    }
  };
  const submitComment = async (event) => {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    if (!user) { onAuthRequired?.('Sign in to join the public listing discussion.'); return; }
    setCommentsBusy(true);
    try {
      const saved = await submitListingComment({ listingId: listing.id, userId: user.id, body });
      setComments((current) => [{
        ...saved,
        user: { display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You' },
      }, ...current]);
      setCommentText('');
      onDemoAction?.('Comment posted.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not submit the comment.');
    } finally {
      setCommentsBusy(false);
    }
  };
  const submitReview = async (event) => {
    event.preventDefault();
    if (!user) { onAuthRequired?.('Sign in to leave feedback.'); return; }
    if (!listing.sellerId || owner) return;
    setReviewBusy(true);
    try {
      const saved = await submitListingReview({ listingId: listing.id, reviewerId: user.id, revieweeId: listing.sellerId, rating: reviewRating, body: reviewBody });
      setReviews((current) => [
        { ...saved, reviewer_id: user.id, reviewer: { display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You' }, listing: { title: listing.title } },
        ...current,
      ]);
      setReviewSocials((current) => ({ ...current, [saved.id]: { likeCount: 0, commentCount: 0, liked: false } }));
      setReviewOpen(false);
      setReviewBody('');
      onDemoAction?.('Your feedback was submitted for moderation.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not submit feedback.');
    } finally {
      setReviewBusy(false);
    }
  };
  const sendReportClick = () => {
    if (!user) { onAuthRequired?.('Sign in to report a listing.'); return; }
    setReportReason('scam');
    setReportDetails('');
    setReportOpen(true);
  };
  const renderReview = (review) => {
    const social = reviewSocials[review.id] || { likeCount: 0, commentCount: 0, liked: false };
    return <ReviewFeedbackCard
      key={review.id}
      review={review}
      user={user}
      likeCount={social.likeCount}
      commentCount={social.commentCount}
      liked={social.liked}
      onToggleLike={toggleLike}
      onCommentPublished={onCommentPublished}
      onReport={reportReview}
      onAuthRequired={onAuthRequired}
      onNotice={onDemoAction}
    />;
  };

  return (
    <div className="listing-modal-backdrop listing-details-backdrop" role="dialog" aria-modal="true" aria-label="Listing details" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="listing-details-view">
        <header className="listing-new-header">
          <button type="button" className="listing-back-button" onClick={onClose} aria-label="Back"><ArrowLeft size={20} /></button>
          <strong>Home page</strong>
          <div className="listing-new-header-actions">
            <span className="listing-header-view-count">{Number(raw.views_count || 0).toLocaleString('en-NG')}</span>
            <button type="button" onClick={() => onToggleSave?.(listing.id)} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} aria-pressed={isSaved}><Heart size={20} fill={isSaved ? 'currentColor' : 'none'} /></button>
            <button type="button" onClick={share} aria-label="Share listing"><Share2 size={19} /></button>
          </div>
        </header>
        <main className="listing-new-content">
          <section className="listing-new-image-section">
            <div className="listing-new-image-frame" onTouchStart={(event) => setTouchStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => {
              if (touchStart == null) return;
              const delta = event.changedTouches[0].clientX - touchStart;
              if (Math.abs(delta) > 45) delta < 0 ? nextImage() : previousImage();
              setTouchStart(null);
            }}>
              {primaryImage
                ? <button type="button" className="listing-new-image-button" onClick={() => setZoomed(true)}><img src={primaryImage} alt={`${listing.title} image ${activeImage + 1}`} onError={() => setFailedImageUrls((current) => new Set([...current, primaryImage]))} /></button>
                : <div className="listing-new-no-image"><ImageIcon size={30} /><span>No listing photo</span></div>}
              {validImages.length > 1 && <>
                <button type="button" className="listing-new-gallery-arrow prev" onClick={previousImage} aria-label="Previous photo"><ArrowLeft size={17} /></button>
                <button type="button" className="listing-new-gallery-arrow next" onClick={nextImage} aria-label="Next photo"><ArrowRight size={17} /></button>
              </>}
              <span className="listing-new-counter">{validImages.length ? `${activeImage + 1}/${validImages.length}` : '0/0'}</span>
            </div>
            {validImages.length > 1 && <div className="listing-new-thumbs">{validImages.map((image, index) => <button type="button" key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`View photo ${index + 1}`}><img src={image} alt="" loading="lazy" /></button>)}</div>}
          </section>

          <section className="listing-new-section listing-new-summary">
            <div className="listing-new-meta"><MapPin size={15} /> {sellerLocation} <span>·</span> {listing.posted || 'Recently'}</div>
            <h1>{listing.title}</h1>
            <div className="listing-new-price-row"><div className="listing-new-price">{listing.price}</div><span className="listing-new-price-type">{priceType}</span></div>
            <div className="listing-new-summary-tags">{titleParts && <span><Tag size={12} /> {titleParts}</span>}{listing.condition && <span>{listing.condition}</span>}{raw.views_count != null && <span>{Number(raw.views_count || 0).toLocaleString('en-NG')} views</span>}</div>
            <div className="listing-new-trust"><ShieldCheck size={19} /><div><strong>{listing.verified ? 'Verified seller' : 'Seller profile'}</strong><span>{listing.verified ? 'Identity or business status reviewed by Bese26.' : 'Check the seller profile and keep arrangements clear.'}</span></div></div>
          </section>

          <section className="listing-new-section listing-new-contact">
            <div className="listing-new-action-grid">
              {whatsappEnabled && !owner && <button type="button" className="listing-new-whatsapp" onClick={openWhatsApp}><MessageCircle size={17} /> WhatsApp</button>}
              {phoneEnabled && <button type="button" className="listing-new-solid-action" onClick={callSeller}><Phone size={17} /> Call</button>}
              {!phoneEnabled && !whatsappEnabled && <div className="listing-contact-note">{contactLoading ? 'Loading seller contact…' : user ? 'The seller has not enabled calls or WhatsApp for this listing.' : <><span>Sign in to view the contact options enabled by this seller.</span><button type="button" onClick={() => onAuthRequired?.('Sign in to view seller contact details.')}>Sign in</button></>}</div>}
            </div>
            {owner && <p className="listing-contact-note">This is your listing. Manage it from the seller controls below.</p>}
          </section>

          <section className="listing-new-section listing-new-chat">
            <div className="listing-new-section-heading"><div><h2>Chat with the seller</h2><p className="listing-new-chat-note">Message privately through Bese26 to ask a question or make an offer.</p></div><MessageCircle size={20} /></div>
            <div className="listing-new-quick-actions">
              {!owner && <button type="button" onClick={() => user ? setOfferOpen(true) : onAuthRequired?.('Sign in to make an offer.')}>Make an offer</button>}
              <button type="button" onClick={() => setQuickMessage('Is this still available?')}>Is this available?</button>
              <button type="button" onClick={() => setQuickMessage('What is your best price?')}>Last price</button>
            </div>
            <form onSubmit={sendQuickMessage}>
              <textarea value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} maxLength={500} placeholder="Write your message here…" aria-label="Message the seller" />
              <button type="submit" className="listing-new-start-chat"><MessageCircle size={16} /> Start chat</button>
            </form>
          </section>

          {specs.length > 0 && <section className="listing-new-section"><div className="listing-new-section-heading"><h2>Listing details</h2></div><div className="listing-new-specs">{specs.map((item) => <div key={item.key}><span>{item.key}</span><strong>{String(item.value)}</strong></div>)}</div></section>}
          {description && <section className="listing-new-section"><div className="listing-new-section-heading"><h2>Description</h2></div><p className={`listing-new-description ${!expandedDescription && description.length > 500 ? 'collapsed' : ''}`}>{description}</p>{description.length > 500 && <button type="button" className="listing-new-more" onClick={() => setExpandedDescription((value) => !value)}>{expandedDescription ? 'Show less' : 'Show more'} <ChevronRight size={14} /></button>}</section>}
          {deliveryDetails.length > 0 && <section className="listing-new-section"><div className="listing-new-section-heading"><h2>Delivery</h2></div><div className="listing-new-delivery">{deliveryDetails.map((item, index) => <span key={`${item}-${index}`}>✓ {item}</span>)}</div></section>}

          <details className="listing-new-section listing-store-location">
            <summary><span><Store size={18} /> Seller location</span><span>Show <ChevronDown size={15} /></span></summary>
            <p><MapPin size={15} /> {sellerLocation}</p>
            <small>Only the location shared on this listing is shown. Confirm the exact meeting point in chat.</small>
          </details>

          <section className="listing-new-section listing-new-seller">
            <div className="listing-new-seller-head">
              <div className="listing-new-seller-avatar">{listing.sellerAvatar ? <img src={listing.sellerAvatar} alt="" loading="lazy" /> : listing.sellerInitials}</div>
              <div><h2>{listing.sellerDisplayName || listing.seller}</h2><VerificationBadges idVerified={listing.idVerified} cacVerified={listing.cacVerified} compact /><p><MapPin size={13} /> {sellerLocation}{sellerSince ? ` · Member since ${sellerSince}` : ''}</p></div>
              <button type="button" className="listing-new-link" onClick={() => listing.sellerBusinessHandle ? window.location.assign(`/@${listing.sellerBusinessHandle}`) : listing.sellerId && raw.profiles?.username ? window.location.assign(`/${raw.profiles.username}`) : onDemoAction?.('Seller profile is not public yet.')}>View store <ChevronRight size={15} /></button>
            </div>
            <div className="listing-new-seller-actions"><button type="button" onClick={followSeller} disabled={owner || !listing.sellerId}><UserPlus size={15} /> {followingSeller ? 'Following' : 'Follow'}</button><button type="button" onClick={share}><Share2 size={15} /> Share</button></div>
          </section>

          <section className="listing-new-section listing-new-reviews">
            <div className="listing-new-section-heading">
              <div><h2>Feedback about seller</h2>{reviewAverage && <span className="listing-review-summary"><Star size={14} fill="currentColor" /> {reviewAverage} · {publishedReviews.length} {publishedReviews.length === 1 ? 'review' : 'reviews'}</span>}</div>
              <div className="listing-review-heading-actions">{canReview && <button type="button" className="listing-new-link" onClick={() => setReviewOpen(true)}>Leave feedback</button>}{publishedReviews.length > 2 && <button type="button" className="listing-new-link" onClick={() => setReviewsOpen(true)}>View all ({publishedReviews.length}) <ChevronRight size={14} /></button>}</div>
            </div>
            {visibleReviews.length ? visibleReviews.map(renderReview)
              : loadingDetails ? <div className="listing-new-no-reviews"><p>Loading seller feedback…</p></div>
                : <div className="listing-new-no-reviews"><span>☆</span><p>No published feedback yet.</p><small className="listing-review-empty-note">Seller feedback will appear here after it is approved.</small>{canReview && <button type="button" className="listing-new-link" onClick={() => setReviewOpen(true)}>Be the first to leave feedback</button>}</div>}
          </section>

          <section className="listing-new-section listing-public-comments">
            <div className="listing-new-section-heading"><div><span className="listing-new-kicker">PUBLIC DISCUSSION</span><h2>Comments & questions</h2><p className="listing-new-chat-note">Share a useful question or experience about this listing.</p></div><span>{comments.length} comments</span></div>
            <form className="listing-comment-form" onSubmit={submitComment}><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Write a public comment or question…" rows={3} aria-label="Public listing comment" /><button type="submit" className="listing-new-start-chat" disabled={commentsBusy}>{commentsBusy ? 'Posting…' : 'Post comment'} <Send size={15} /></button></form>
            <div className="listing-comments-list">{comments.length ? comments.map((comment) => <article className="listing-public-comment" key={comment.id}><div className="listing-public-comment-avatar">{(comment.business?.business_name || comment.user?.display_name || 'B').slice(0, 1).toUpperCase()}</div><div><div className="listing-public-comment-head"><strong>{comment.business?.business_name || comment.user?.display_name || 'Bese26 member'}</strong>{comment.business?.business_name && <small className="listing-comment-business-label">Business</small>}<time>{new Date(comment.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</time>{comment.status === 'pending' && comment.user_id === user?.id && <span>Pending review</span>}</div><p>{comment.body}</p></div></article>) : <div className="listing-comments-empty"><MessageCircle size={20} /><p>No comments yet. Be the first to share a useful question or experience.</p></div>}</div>
          </section>

          <section className="listing-new-safety"><ShieldCheck size={20} /><div><strong>Stay safe</strong><p>Meet in a public place, inspect the item before paying, and never share OTPs, passwords or PINs.</p></div></section>

          <section className="listing-details-bottom-actions">
            {!owner && <button type="button" className="listing-report-button" onClick={sendReportClick}><Flag size={16} /> Report abuse</button>}
            <button type="button" className="listing-copy-ad-button" onClick={() => onCopyListing?.(listing)}><Package size={16} /> Post an ad like this</button>
          </section>

          {owner && <section className="listing-owner-controls"><div><strong>Manage your listing</strong><span>{Number(raw.views_count || 0).toLocaleString('en-NG')} real views · status: {listingStatus}</span></div><div><button type="button" onClick={() => onEditListing?.(listing)}>Edit listing</button><button type="button" disabled={actionBusy} onClick={() => manage(listingStatus === 'paused' ? 'active' : 'paused')}>{listingStatus === 'paused' ? 'Make available' : 'Mark unavailable'}</button>{listingStatus !== 'sold' && <button type="button" disabled={actionBusy} onClick={() => manage('sold')}>Mark sold</button>}<button type="button" disabled={actionBusy} onClick={removeListing}>Delete</button></div></section>}

          {sellerListings.length > 0 && <section className="listing-new-section listing-new-similar"><div className="listing-new-section-heading"><h2>More from {listing.sellerDisplayName || listing.seller}</h2><button type="button" className="listing-new-link" onClick={() => listing.sellerBusinessHandle ? window.location.assign(`/@${listing.sellerBusinessHandle}`) : raw.profiles?.username ? window.location.assign(`/${raw.profiles.username}`) : onDemoAction?.('Seller profile is not public yet.')}>View store <ChevronRight size={15} /></button></div><div className="listing-new-feed">{sellerListings.map((item) => <SimilarListingCard key={item.id} item={item} savedIds={savedIds} onOpenListing={onOpenListing} onToggleSave={onToggleSave} />)}</div></section>}
          {similar.length > 0 && <section className="listing-new-section listing-new-similar"><div className="listing-new-section-heading"><h2>Similar ads</h2><span>{similar.length} available</span></div><div className="listing-new-feed">{similar.filter((item, index, items) => item.id !== listing.id && items.findIndex((candidate) => candidate.id === item.id) === index).slice(0, similarVisibleCount).map((item) => <SimilarListingCard key={item.id} item={item} savedIds={savedIds} onOpenListing={onOpenListing} onToggleSave={onToggleSave} />)}</div>{similarVisibleCount < similar.length && <div ref={similarSentinelRef} className="listing-new-feed-sentinel" aria-hidden="true">Loading more ads…</div>}</section>}
        </main>
      </div>

      {zoomed && <div className="listing-gallery-lightbox" role="dialog" aria-label="Fullscreen listing gallery" onClick={() => setZoomed(false)}><button type="button" className="icon-button lightbox-close" onClick={() => setZoomed(false)} aria-label="Close fullscreen"><X size={20} /></button>{validImages.length > 1 && <button type="button" className="gallery-control gallery-control-prev" onClick={(event) => { event.stopPropagation(); previousImage(); }} aria-label="Previous photo"><ArrowLeft size={20} /></button>}{primaryImage && <img src={primaryImage} alt={`${listing.title} fullscreen image ${activeImage + 1}`} onClick={(event) => event.stopPropagation()} />}{validImages.length > 1 && <button type="button" className="gallery-control gallery-control-next" onClick={(event) => { event.stopPropagation(); nextImage(); }} aria-label="Next photo"><ArrowRight size={20} /></button>}</div>}

      {reviewOpen && <div className="listing-action-overlay" role="dialog" aria-modal="true" aria-label="Leave feedback" onClick={(event) => event.target === event.currentTarget && setReviewOpen(false)}><form className="listing-action-sheet listing-review-form" onSubmit={submitReview}><div className="listing-action-sheet-head"><div><span className="listing-new-kicker">SELLER FEEDBACK</span><h2>Rate this seller</h2></div><button type="button" className="icon-button" onClick={() => setReviewOpen(false)} aria-label="Close feedback"><X size={18} /></button></div><div className="listing-review-stars-input" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={value <= reviewRating ? 'selected' : ''} onClick={() => setReviewRating(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`}>★</button>)}</div><label>Comment<textarea value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} maxLength={1000} placeholder="Share your honest experience…" rows={4} required /></label><small>Your feedback will be reviewed before it appears publicly.</small><button className="primary-button" disabled={reviewBusy}>{reviewBusy ? 'Submitting…' : 'Submit feedback'} <Check size={15} /></button></form></div>}

      {offerOpen && <div className="listing-action-overlay" role="dialog" aria-modal="true" aria-label="Make an offer" onClick={(event) => event.target === event.currentTarget && setOfferOpen(false)}><form className="listing-action-sheet" onSubmit={submitListingOffer}><div className="listing-action-sheet-head"><div><span className="listing-new-kicker">NEGOTIATE SAFELY</span><h2>Make an offer</h2></div><button type="button" className="icon-button" onClick={() => setOfferOpen(false)} aria-label="Close offer"><X size={18} /></button></div><p>Listing price: <strong>{listing.price}</strong></p><label>Your offer (NGN)<input type="number" min="1" step="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder="Enter amount" autoFocus required /></label><small>Your offer is sent in private chat. It is not a payment.</small><button className="primary-button" disabled={offerBusy}>{offerBusy ? 'Sending offer…' : 'Send offer'}</button></form></div>}

      {reportOpen && <div className="listing-action-overlay" role="dialog" aria-modal="true" aria-label="Report listing" onClick={(event) => event.target === event.currentTarget && setReportOpen(false)}><form className="listing-action-sheet listing-report-form" onSubmit={submitReport}><div className="listing-action-sheet-head"><div><span className="listing-new-kicker">HELP KEEP BESE26 SAFE</span><h2>Report this listing</h2></div><button type="button" className="icon-button" onClick={() => setReportOpen(false)} aria-label="Close report"><X size={18} /></button></div><label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="scam">Scam or suspicious activity</option><option value="prohibited_item">Prohibited item</option><option value="fake_information">Fake or misleading information</option><option value="harassment">Harassment</option><option value="other">Other</option></select></label><label>Details (optional)<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={2000} rows={4} placeholder="Tell our moderation team what happened." /></label><button className="primary-button" disabled={actionBusy}>{actionBusy ? 'Sending report…' : 'Send report'} <Flag size={15} /></button></form></div>}

      {reviewsOpen && <div className="listing-action-overlay" role="dialog" aria-modal="true" aria-label="Seller reviews" onClick={(event) => event.target === event.currentTarget && setReviewsOpen(false)}><section className="listing-action-sheet listing-reviews-sheet"><div className="listing-action-sheet-head"><div><span className="listing-new-kicker">SELLER FEEDBACK</span><h2>All reviews ({publishedReviews.length})</h2></div><button type="button" className="icon-button" onClick={() => setReviewsOpen(false)} aria-label="Close reviews"><X size={18} /></button></div><div className="listing-reviews-list">{publishedReviews.map(renderReview)}</div></section></div>}
    </div>
  );
}

function SimilarListingCard({ item, savedIds = [], onOpenListing, onToggleSave }) {
  const isSaved = savedIds.includes(item.id);
  return <article className="listing-new-card">
    <button type="button" className="listing-new-card-open" onClick={() => onOpenListing?.(item)}>
      <div className="listing-new-card-image">{item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Package size={22} />}</div>
      <strong>{item.title}</strong><b>{item.price}</b><small><MapPin size={11} /> {item.location}</small>
    </button>
    <button type="button" className="listing-new-card-save" onClick={() => onToggleSave?.(item.id)} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} aria-pressed={isSaved}><Heart size={16} fill={isSaved ? 'currentColor' : 'none'} /></button>
  </article>;
}
