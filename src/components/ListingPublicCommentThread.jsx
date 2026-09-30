import { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle, Send, ThumbsUp } from 'lucide-react';
import { getAvatarUrl } from '../lib/supabase';
import { getBusinessLogoDisplayUrl, handleBusinessLogoLoad, isOfficialBese26Business } from '../lib/businessLogoFit';
import VerificationBadges from './VerificationBadges';

const COMMENT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🙏', '🎉', '💯'];

function commentName(comment) {
  return comment.business?.business_name || comment.user?.display_name || comment.user?.username || 'Bese26 member';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListingPublicCommentThread({
  comment,
  replies = [],
  commentSocials = {},
  user,
  depth = 0,
  onToggleLike,
  onSelectReaction,
  onReply,
  onAuthRequired,
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState('');
  const [visibleReplyCount, setVisibleReplyCount] = useState(1);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const name = commentName(comment);
  const avatarPath = comment.business?.logo_path || comment.user?.avatar_path;
  const avatarUrl = comment.business
    ? getBusinessLogoDisplayUrl(comment.business, avatarPath ? getAvatarUrl(avatarPath) : '')
    : avatarPath ? getAvatarUrl(avatarPath) : '';
  const usesBusinessLogo = Boolean(comment.business?.logo_path || isOfficialBese26Business(comment.business));
  const social = commentSocials[comment.id] || { likeCount: 0, replyCount: 0, liked: false, reaction: '' };
  const replyCount = Math.max(Number(social.replyCount || 0), replies.length);
  const canInteract = comment.status === 'published';

  useEffect(() => {
    if (!social.liked) setSelectedReaction('');
  }, [social.liked, comment.id]);

  const beginReply = () => {
    if (!user) {
      onAuthRequired?.('Sign in to reply to this public comment.');
      return;
    }
    setReplyOpen((open) => !open);
  };

  const toggleLike = async () => {
    if (likeBusy || !canInteract) return;
    setLikeBusy(true);
    try {
      await onToggleLike?.(comment);
    } finally {
      setLikeBusy(false);
    }
  };

  const chooseReaction = async (reaction) => {
    if (!canInteract || likeBusy || reactionBusy) return;
    setReactionBusy(true);
    setSelectedReaction(reaction);
    setReactionOpen(false);
    try {
      await onSelectReaction?.(comment, reaction);
    } finally {
      setReactionBusy(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || replyBusy) return;
    if (!user) {
      onAuthRequired?.('Sign in to reply to this public comment.');
      return;
    }
    setReplyBusy(true);
    try {
      const saved = await onReply?.(comment, body);
      if (saved) {
        setDraft('');
        setReplyOpen(false);
      }
    } finally {
      setReplyBusy(false);
    }
  };

  return (
    <article className={`listing-public-comment${depth ? ' listing-public-comment-reply' : ''}`}>
      <div className={`listing-public-comment-avatar ${usesBusinessLogo && avatarUrl ? 'is-business-logo' : ''}`}>
        {avatarUrl && !avatarFailed
          ? <img src={avatarUrl} alt="" loading="lazy" onLoad={usesBusinessLogo && avatarUrl ? handleBusinessLogoLoad : undefined} onError={() => setAvatarFailed(true)} />
          : name.slice(0, 1).toUpperCase()}
      </div>
      <div className="listing-public-comment-content">
        <div className="listing-public-comment-head">
          <strong>{name}</strong>
          <VerificationBadges idVerified={Boolean(comment.id_verified || comment.user?.id_verified)} cacVerified={Boolean(comment.cac_verified || comment.user?.cac_verified)} compact />
          {comment.business?.business_name && <small className="listing-comment-business-label">Business</small>}
          <time dateTime={comment.created_at || undefined}>{formatDate(comment.created_at)}</time>
          {comment.status === 'pending' && comment.user_id === user?.id && <span>Pending review</span>}
        </div>
        <p>{comment.body}</p>
        <div className="listing-public-comment-actions">
          <span className="listing-comment-reaction-wrap">
            <button type="button" className={social.liked ? 'is-liked' : ''} aria-pressed={Boolean(social.liked)} disabled={!canInteract || likeBusy} onClick={toggleLike}>
              <span className="listing-comment-reaction-current">{selectedReaction || social.reaction || <ThumbsUp size={14} />}</span> Like <span>{Number(social.likeCount || 0)}</span>
            </button>
            <button type="button" className="listing-comment-reaction-trigger" aria-label="Choose a reaction" aria-expanded={reactionOpen} disabled={!canInteract || reactionBusy} onClick={(event) => { event.stopPropagation(); setReactionOpen((open) => !open); }}>☺</button>
            {reactionOpen && <span className="listing-comment-reaction-picker" role="menu" aria-label="Comment reactions">{COMMENT_REACTIONS.map((reaction) => <button type="button" key={reaction} role="menuitem" aria-label={`React ${reaction}`} onClick={() => chooseReaction(reaction)}>{reaction}</button>)}</span>}
          </span>
          {canInteract && <button type="button" aria-expanded={replyOpen} onClick={beginReply}><MessageCircle size={14} /> Reply</button>}
          {replyCount > 0 && <span className="listing-public-comment-reply-count">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>}
        </div>
        {replyOpen && <form className="listing-public-comment-reply-form" onSubmit={submitReply}>
          <div><span>Replying to {name}</span><button type="button" onClick={() => setReplyOpen(false)}>Cancel</button></div>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={2} placeholder={`Reply to ${name}…`} aria-label={`Reply to ${name}`} />
          <button type="submit" disabled={replyBusy || !draft.trim()}>{replyBusy ? 'Posting…' : <><Send size={14} /> Reply</>}</button>
        </form>}
        {replies.length > 0 && <div className="listing-public-comment-replies" aria-label={`${replyCount} replies`}>
          {replies.slice(0, visibleReplyCount).map((reply) => <ListingPublicCommentThread key={reply.comment.id} comment={reply.comment} replies={reply.replies} commentSocials={commentSocials} user={user} depth={depth + 1} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onReply={onReply} onAuthRequired={onAuthRequired} />)}
          {replies.length > visibleReplyCount && <button type="button" className="listing-public-comment-more-replies" onClick={() => setVisibleReplyCount(replies.length)}>More replies <span>({replies.length - visibleReplyCount} more)</span><ChevronDown size={14} /></button>}
        </div>}
      </div>
    </article>
  );
}
