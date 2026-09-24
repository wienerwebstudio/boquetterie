import type { FAQ, Product, SiteSettings } from "@/types";

/** JSON-LD helpers. Only emit data that actually exists in the content. */

export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function organizationLd(settings: SiteSettings) {
  const hasAddress = !settings.brand.address.street.startsWith("[");
  return {
    "@context": "https://schema.org",
    "@type": "Florist",
    name: settings.brand.name,
    url: settings.seo.siteUrl,
    image: `${settings.seo.siteUrl}/images/hero/hero-wide.jpg`,
    areaServed: ["Wien", "Niederösterreich"],
    ...(hasAddress && {
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.brand.address.street,
        postalCode: settings.brand.address.zip,
        addressLocality: settings.brand.address.city,
        addressCountry: "AT",
      },
    }),
    ...(!settings.brand.email.startsWith("[") && { email: settings.brand.email }),
    ...(!settings.brand.phone.startsWith("[") && { telephone: settings.brand.phone }),
  };
}

export function productLd(product: Product, settings: SiteSettings) {
  const prices = product.sizes.map((s) => s.price);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((i) => `${settings.seo.siteUrl}${i.src}`),
    brand: { "@type": "Brand", name: settings.brand.name },
    sku: product.id,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: product.sizes.length,
      availability: product.stock === null || product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${settings.seo.siteUrl}/produkt/${product.slug}`,
    },
    ...(product.rating && product.rating.count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.value, reviewCount: product.rating.count },
    }),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[], settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${settings.seo.siteUrl}${it.url}`,
    })),
  };
}

export function faqLd(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}
