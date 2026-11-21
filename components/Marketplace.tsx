"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Heart, MessageSquare, Globe2, Menu, ArrowLeft, Send, X, ClipboardList, Package, Building2, ShieldCheck, ChevronDown } from "lucide-react";
import { categories, products, type Product } from "@/lib/catalog";

function Header({search,setSearch}:{search?:string;setSearch?:(value:string)=>void}) {
  const [mobile,setMobile]=useState(false);
  return <><header className="site-header">
    <div className="header-inner">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span><strong>SYLUTION <em>TRADE</em></strong><small>Global B2B Marketplace</small></span></Link>
      <div className="header-search"><Search size={19}/><input aria-label="Search products" placeholder="Search products, suppliers, or categories..." value={search??""} onChange={e=>setSearch?.(e.target.value)} /></div>
      <nav className="header-actions"><span><Globe2 size={18}/> Global</span><Link href="/#products">Products</Link><Link href="/#how-it-works">How It Works</Link></nav>
      <button aria-label="Toggle menu" className="menu-toggle" onClick={()=>setMobile(!mobile)}><Menu size={23}/></button>
    </div>
  </header>
  {mobile&&<div className="mobile-menu"><Link href="/">Home</Link><Link href="/#products">Products</Link><Link href="/#how-it-works">How It Works</Link></div>}
  </>;
}
const cash = (s:string)=>s;
export function InquiryModal({product,close}:{product:Product;close:()=>void}) {
  const [qty,setQty]=useState("");const [country,setCountry]=useState("");const [port,setPort]=useState("");const [incoterm,setIncoterm]=useState("FOB");const [email,setEmail]=useState("");const [company,setCompany]=useState("");const [message,setMessage]=useState("");const [submitted,setSubmitted]=useState(false);
  function submit(e:React.FormEvent){e.preventDefault();if(!Number(qty)||Number(qty)<=0)return;const data={product:product.name,productId:product.id,quantity:Number(qty),unit:product.unit,destinationCountry:country,port,incoterm,email,company,message,createdAt:new Date().toISOString()};try{const prev=JSON.parse(localStorage.getItem("sylution_demo_rfqs")||"[]");localStorage.setItem("sylution_demo_rfqs",JSON.stringify([...prev,data]));}catch{}setSubmitted(true);}
  useEffect(()=>{function onKey(e:KeyboardEvent){if(e.key==="Escape")close();}document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey)},[close]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="rfq-modal" role="dialog" aria-modal="true" aria-label="Request for Quotation">
    <button aria-label="Close quotation" className="modal-close" onClick={close}><X size={22}/></button>
    {!submitted?<><div className="section-kicker"><ClipboardList size={16}/> REQUEST FOR QUOTATION</div><h2>Get a wholesale quotation</h2><p className="muted">For: <strong>{product.name}</strong></p>
      <form className="rfq-form" onSubmit={submit}>
        <div className="form-grid"><label>Quantity ({product.unit}) <input required type="number" min="0.01" step="any" value={qty} onChange={e=>setQty(e.target.value)} placeholder={"MOQ: "+product.moq}/></label><label>Destination country <input required value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. Nigeria"/></label></div>
        <div className="form-grid"><label>Port / City <input value={port} onChange={e=>setPort(e.target.value)} placeholder="e.g. Lagos"/></label><label>Preferred Incoterm <select value={incoterm} onChange={e=>setIncoterm(e.target.value)}><option>FOB</option><option>CIF</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option></select></label></div>
        <div className="form-grid"><label>Your company <input required value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company name"/></label><label>Business email <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label></div>
        <label>Additional requirements <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Quality, packaging, timeline or certification requirements"/></label>
        <div className="demo-notice"><ShieldCheck size={18}/> Demo mode: requests are saved only in this browser. They are not delivered to suppliers yet.</div>
        <button className="primary-btn full" type="submit"><Send size={17}/> Save demo RFQ</button>
      </form></>:<div className="success-view"><div className="success-icon">✓</div><h2>Demo RFQ saved</h2><p>Your request was saved locally in this browser. No supplier has been contacted.</p><button className="primary-btn" onClick={close}>Continue browsing</button></div>}
  </section></div>;
}
export function ProductCard({product,onInquiry}:{product:Product;onInquiry:(p:Product)=>void}){
 const [liked,setLiked]=useState(false);
 return <article className="product-card"><Link href={"/products/"+product.slug} className="product-image"><img src={product.image} alt={product.name} loading="lazy"/><span className="new-chip">Sample</span></Link><button className={"favorite"+(liked?" active":"")} aria-label="Save favorite" onClick={()=>setLiked(!liked)}><Heart size={18} fill={liked?"currentColor":"none"}/></button>
 <div className="card-body"><Link href={"/products/"+product.slug} className="product-name">{product.name}</Link><div className="product-price">{cash(product.price)} <span>/ {product.unit}</span></div><p className="product-moq">Min. order: {product.moq}</p><div className="supplier-name">{product.supplier}</div><div className="country">{product.flag} {product.country} <span className="sample-pill">Demo listing</span></div><div className="card-bottom"><button onClick={()=>onInquiry(product)} className="inquiry-btn"><MessageSquare size={15}/> Inquiry now</button><Link className="chat-link" href={"/products/"+product.slug} aria-label="See product details"><Package size={17}/></Link></div></div>
 </article>;
}
export function HomePage(){
 const [query,setQuery]=useState("");const [category,setCategory]=useState("All Categories");const [selected,setSelected]=useState<Product|null>(null);
 const filtered=useMemo(()=>products.filter(p=>(category==="All Categories"||p.category===category)&&([p.name,p.supplier,p.country,p.category].join(" ").toLowerCase().includes(query.toLowerCase()))),[category,query]);
 return <><Header search={query} setSearch={setQuery}/><main>
   <div className="announcement">Trade smarter with global suppliers <span>•</span> Discover products <span>•</span> Request quotations</div>
   <section className="hero container"><div><div className="section-kicker">GLOBAL B2B MARKETPLACE</div><h1>Connect. Source.<br/><span>Grow your business.</span></h1><p>Explore wholesale products and connect with potential suppliers in agriculture, electronics, machinery and more.</p><a href="#products" className="primary-btn hero-cta"><Search size={18}/> Explore Products</a></div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1100&q=85" alt="Shipping containers at a trade port"/><div className="hero-stat"><Globe2 size={19}/><span>Built for global trade</span></div></div></section>
   <section className="container marketplace-layout" id="products"><div className="market-main"><div className="section-head"><div><div className="section-kicker">WHOLESALE SOURCING</div><h2>Explore Products</h2><p>Browse example product listings — real supplier onboarding is coming next.</p></div><div className="result-count">{filtered.length} products</div></div>
   <div className="category-tabs">{categories.map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
   <div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p} onInquiry={setSelected}/>)}</div>{filtered.length===0&&<div className="empty-state">No products match your search. Try another keyword or category.</div>}</div>
   <aside className="market-sidebar"><div className="side-panel"><div className="side-title"><Building2 size={21}/> For Suppliers</div><p>Showcase products, receive buyer inquiries and build a global presence.</p><div className="side-note">Supplier onboarding — coming soon</div></div><div className="side-panel"><h3>Popular Categories</h3>{categories.slice(1).map(c=><button className="side-category" key={c} onClick={()=>setCategory(c)}>{c}<ChevronDown size={14}/></button>)}</div><div className="side-panel"><h3>Trade Safety</h3><p>Supplier profiles and product details shown here are demonstrations. Verification must be completed before real trading.</p></div></aside></section>
   <section id="how-it-works" className="steps container"><div className="section-kicker">HOW SYLUTION TRADE WORKS</div><h2>From discovery to quotation</h2><div className="steps-grid"><div><Search size={25}/><strong>1. Discover</strong><p>Find wholesale products by keyword and category.</p></div><div><ClipboardList size={25}/><strong>2. Request</strong><p>Share quantities, destination and trade terms.</p></div><div><MessageSquare size={25}/><strong>3. Negotiate</strong><p>Compare supplier offers once messaging is connected.</p></div></div></section>
   </main><footer><div className="container footer-inner"><div><strong>SYLUTION TRADE</strong><p>A marketplace concept by SYLUTION LTD.</p></div><span>© 2026 SYLUTION LTD • Demo build</span></div></footer>
   {selected&&<InquiryModal product={selected} close={()=>setSelected(null)}/>}
 </>;
}
export function ProductDetail({product}:{product:Product}){
 const [selected,setSelected]=useState<Product|null>(null);return <><Header/><main className="container detail-page"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to marketplace</Link><div className="detail-grid"><div className="detail-image"><img src={product.image} alt={product.name}/></div><div className="detail-summary"><div className="section-kicker">{product.category.toUpperCase()} • {product.country.toUpperCase()}</div><h1>{product.name}</h1><div className="product-price large">{product.price} <span>/ {product.unit}</span></div><div className="detail-facts"><div><span>Minimum order</span><strong>{product.moq}</strong></div><div><span>Country</span><strong>{product.flag} {product.country}</strong></div><div><span>Supplier</span><strong>{product.supplier}</strong></div><div><span>Verification</span><strong>Not verified — demo</strong></div></div><button className="primary-btn full" onClick={()=>setSelected(product)}><Send size={18}/> Request Quotation</button><p className="muted mini">This is a demonstration listing; prices and suppliers are illustrative.</p></div></div><div className="detail-extra"><h2>Product description</h2><p>{product.description}</p><h2>Specifications</h2><div className="spec-table">{product.specifications.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div></div></main><footer><div className="container footer-inner">SYLUTION TRADE • Demo build</div></footer>{selected&&<InquiryModal product={selected} close={()=>setSelected(null)}/>}</>
}
