import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/Marketplace";
import { getProduct, products } from "@/lib/catalog";
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const product=getProduct(slug);if(!product)notFound();return <ProductDetail product={product}/>;}
