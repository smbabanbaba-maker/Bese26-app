import { useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, CheckCircle2, LoaderCircle, Play, Sparkles, Video, X } from 'lucide-react';

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `₦${number.toLocaleString('en-NG')}` : 'Contact seller';
}

function wrapText(context, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = next;
  });
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCover(context, image, x, y, width, height, progress = 0) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, (image.width - sourceWidth) * (0.5 + (progress - 0.5) * 0.16));
  const sourceY = Math.max(0, (image.height - sourceHeight) * 0.5);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function makeCopy({ title, category, condition, description }) {
  const cleanTitle = title?.trim() || 'Quality item';
  const cleanCategory = category || 'marketplace item';
  const cleanDescription = description?.trim();
  const firstLine = cleanDescription ? cleanDescription.split(/[.!?]/)[0].trim() : `A great ${cleanCategory.toLowerCase()} ready for its next owner.`;
  return `Discover ${cleanTitle}. ${firstLine || `Shop this ${cleanCategory.toLowerCase()} with confidence.`} Available now on Bese26.`;
}

export default function ListingVideoStudio({ images = [], title, category, condition, description, price, location, sellerName, onGenerated, onClose }) {
  const canvasRef = useRef(null);
  const [copy, setCopy] = useState(() => makeCopy({ title, category, condition, description }));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [generatedFile, setGeneratedFile] = useState(null);
  const usableImages = useMemo(() => images.filter((image) => image?.src).slice(0, 6), [images]);

  const generate = async () => {
    if (!usableImages.length) return setError('Add at least one photo before creating the video.');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return setError('Your browser does not support automatic video creation. Try Chrome or a newer browser.');
    setStatus('loading'); setError('');
    try {
      const loadedImages = await Promise.all(usableImages.map((item) => loadImage(item.src)));
      const canvas = canvasRef.current;
      canvas.width = 720; canvas.height = 1280;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      const finished = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start(100);
      const slideDuration = 2600;
      const startedAt = performance.now();
      const drawFrame = (now) => {
        const elapsed = now - startedAt;
        const slide = Math.min(loadedImages.length - 1, Math.floor(elapsed / slideDuration));
        const slideProgress = (elapsed % slideDuration) / slideDuration;
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, 720, 1280);
        const imageTop = 170; const imageHeight = 690;
        context.save(); context.beginPath(); context.roundRect(32, imageTop, 656, imageHeight, 36); context.clip();
        drawCover(context, loadedImages[slide], 32, imageTop, 656, imageHeight, slideProgress);
        const imageFade = context.createLinearGradient(0, imageTop + 420, 0, imageTop + imageHeight);
        imageFade.addColorStop(0, 'rgba(0,0,0,0)'); imageFade.addColorStop(1, 'rgba(0,0,0,.66)');
        context.fillStyle = imageFade; context.fillRect(32, imageTop, 656, imageHeight); context.restore();
        context.fillStyle = '#ff2c2c'; context.beginPath(); context.roundRect(32, 46, 48, 48, 14); context.fill();
        context.fillStyle = '#fff'; context.font = '900 28px Arial'; context.fillText('B', 47, 79);
        context.fillStyle = '#000'; context.font = '900 25px Arial'; context.fillText('Bese26', 94, 78);
        context.fillStyle = '#666'; context.font = '600 16px Arial'; context.fillText('BUY • SELL • CONNECT', 94, 101);
        context.fillStyle = '#fff'; context.font = '900 30px Arial'; context.fillText(money(price), 58, imageTop + imageHeight - 52);
        context.font = '600 16px Arial'; context.fillText(`${condition || 'Available'} • ${location || 'Nigeria'}`, 58, imageTop + imageHeight - 22);
        context.fillStyle = '#111'; context.font = '900 38px Arial';
        wrapText(context, title || 'Your next great find', 640).slice(0, 2).forEach((line, index) => context.fillText(line, 40, 930 + index * 46));
        context.fillStyle = '#ff2c2c'; context.font = '800 16px Arial'; context.fillText('AI SELLER COPY', 40, 1042);
        context.fillStyle = '#333'; context.font = '500 22px Arial';
        wrapText(context, copy, 640).slice(0, 4).forEach((line, index) => context.fillText(line, 40, 1080 + index * 30));
        context.fillStyle = '#888'; context.font = '600 16px Arial'; context.fillText(`Listed by ${sellerName || 'Bese26 seller'}`, 40, 1225);
        context.fillStyle = '#ff2c2c'; context.font = '800 17px Arial'; context.fillText('bese26.shop', 530, 1225);
        if (elapsed < loadedImages.length * slideDuration) window.requestAnimationFrame(drawFrame);
        else { recorder.stop(); stream.getTracks().forEach((track) => track.stop()); }
      };
      window.requestAnimationFrame(drawFrame);
      await finished;
      const file = new File([new Blob(chunks, { type: recorder.mimeType || 'video/webm' })], `bese26-${(title || 'listing').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 45)}.webm`, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(file);
      setGeneratedFile(file); setVideoUrl(url); setStatus('ready');
    } catch (generationError) {
      setStatus('idle'); setError(generationError.message || 'Could not create the listing video.');
    }
  };

  const download = () => { if (!generatedFile || !videoUrl) return; const link = document.createElement('a'); link.href = videoUrl; link.download = generatedFile.name; link.click(); };
  const save = () => { if (generatedFile && videoUrl) onGenerated?.({ file: generatedFile, src: videoUrl, copy }); };
  return <div className="listing-video-backdrop" role="dialog" aria-modal="true" aria-labelledby="listing-video-title" onClick={onClose}>
    <section className="listing-video-studio" onClick={(event) => event.stopPropagation()}>
      <header className="listing-video-header"><div><span className="eyebrow"><Sparkles size={13} /> AI LISTING VIDEO</span><h2 id="listing-video-title">Make your listing move</h2><p>Version 1 keeps your real photos and adds Bese26 branding.</p></div><button type="button" className="listing-video-close" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
      <div className="listing-video-body">
        <div className="listing-video-preview">{videoUrl ? <video src={videoUrl} controls playsInline /> : <div className="listing-video-placeholder"><Video size={30} /><strong>{usableImages.length} photo{usableImages.length === 1 ? '' : 's'} ready</strong><span>Generate a branded vertical advert preview.</span></div>}</div>
        <div className="listing-video-controls"><label><span>AI advert copy</span><textarea value={copy} onChange={(event) => setCopy(event.target.value)} maxLength={260} /><small>{copy.length}/260</small></label><div className="listing-video-facts"><span><strong>{money(price)}</strong> Price</span><span><strong>{category || 'Marketplace'}</strong> Category</span><span><strong>{location || 'Nigeria'}</strong> Location</span></div>{error && <div className="listing-video-error">{error}</div>}{status === 'loading' && <div className="listing-video-progress"><LoaderCircle size={17} className="spin" /> Creating your branded video…</div>}<div className="listing-video-actions">{status !== 'ready' && <button type="button" className="primary-button" onClick={generate} disabled={status === 'loading'}><Sparkles size={16} /> {status === 'loading' ? 'Creating…' : 'Create AI video'}</button>}{status === 'ready' && <><button type="button" className="secondary-button" onClick={generate}><Sparkles size={16} /> Recreate</button><button type="button" className="secondary-button" onClick={download}><ArrowDownToLine size={16} /> Download</button><button type="button" className="primary-button" onClick={save}><CheckCircle2 size={16} /> Add to listing</button></>}</div></div>
      </div>
      <canvas ref={canvasRef} className="listing-video-canvas" aria-hidden="true" />
    </section>
  </div>;
}
