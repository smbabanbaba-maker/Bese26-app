import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function findBusinessLogoPreviewTarget(target) {
  return target?.closest?.('img.is-business-logo-previewable') || null;
}

function getPreviewSource(source) {
  try {
    const url = new URL(source, window.location.href);
    if (url.pathname.includes('/storage/v1/render/image/public/')) {
      url.pathname = url.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
      url.search = '';
    }
    return url.href;
  } catch {
    return source;
  }
}

function getLogoLabel(image) {
  const alt = String(image.alt || '').trim();
  if (!alt) return 'Business logo';
  return /\blogo\b/i.test(alt) ? alt : `${alt} logo`;
}

export default function BusinessLogoPreview() {
  const [preview, setPreview] = useState(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    const openPreview = (image) => {
      const source = image.currentSrc || image.src;
      if (!source) return;
      openerRef.current = image;
      setPreview({ source: getPreviewSource(source), alt: getLogoLabel(image) });
    };

    const handleClick = (event) => {
      const image = findBusinessLogoPreviewTarget(event.target);
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      openPreview(image);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (!preview) return undefined;

    const priorBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleDialogKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPreview(null);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKey);

    return () => {
      document.removeEventListener('keydown', handleDialogKey);
      document.body.style.overflow = priorBodyOverflow;
      if (openerRef.current?.isConnected) {
        openerRef.current.focus({ preventScroll: true });
      }
      openerRef.current = null;
    };
  }, [preview]);

  if (!preview || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="business-logo-lightbox"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) setPreview(null);
      }}
    >
      <section
        className="business-logo-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Full-size ${preview.alt}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="business-logo-lightbox-close"
          type="button"
          aria-label="Close logo preview"
          title="Close preview"
          onClick={() => setPreview(null)}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <img
          className="business-logo-lightbox-image"
          src={preview.source}
          alt={preview.alt}
          draggable="false"
        />
      </section>
    </div>,
    document.body,
  );
}
