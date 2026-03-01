// SEO 헤드 — SEO 랜딩 페이지의 title·description·OG·Twitter 카드·JSON-LD를 설정하는 공통 헤드 컴포넌트.
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  jsonLd?: object;
  keywords?: string;
}

// SEO 메타태그 컴포넌트
export default function SeoHead({
  title,
  description,
  canonicalPath,
  ogImage = 'https://tourgether.io/og-image.png',
  ogTitle,
  ogDescription,
  jsonLd,
  keywords,
}: SeoHeadProps) {
  const baseUrl = 'https://tourgether.io';
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ko_KR" />
      <meta property="og:site_name" content="Tourgether" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD 구조화 데이터 */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
