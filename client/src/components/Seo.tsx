import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title: string;
  desc?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, any>;
}

export function Seo({ title, desc, image, url, jsonLd }: SeoProps) {
  const siteTitle = 'Tourgether';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDesc = 'Explore the world with local experiences and authentic travel connections';
  const finalDesc = desc || defaultDesc;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      {image && <meta property="og:image" content={image} />}
      {finalUrl && <meta property="og:url" content={finalUrl} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      {image && <meta name="twitter:image" content={image} />}
      
      {/* Canonical URL */}
      {finalUrl && <link rel="canonical" href={finalUrl} />}
      
      {/* JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
