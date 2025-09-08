import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Shield, MapPin, Cookie, Code } from 'lucide-react';
import { Link } from 'wouter';

const legalDocuments = {
  privacy: {
    title: '개인정보 처리방침',
    file: '/legal/privacy_ko.md',
    icon: Shield,
    description: '개인정보 수집, 이용, 처리에 관한 정책'
  },
  terms: {
    title: '서비스 이용약관',
    file: '/legal/terms_ko.md',
    icon: FileText,
    description: '서비스 이용에 관한 약관 및 조건'
  },
  location: {
    title: '위치기반서비스 이용약관',
    file: '/legal/location_terms_ko.md',
    icon: MapPin,
    description: '위치정보 수집 및 이용에 관한 약관'
  },
  cookies: {
    title: '쿠키 및 트래킹 공지',
    file: '/legal/cookie_notice_ko.md',
    icon: Cookie,
    description: '쿠키 및 트래킹 기술 사용에 관한 공지'
  },
  oss: {
    title: '오픈소스 라이선스',
    file: '/legal/oss_licenses_ko.md',
    icon: Code,
    description: '사용된 오픈소스 라이브러리의 라이선스'
  }
};

type DocumentType = keyof typeof legalDocuments;

function LegalDocumentList() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/config">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              설정으로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              법적 고지
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Tourgether 서비스 이용에 관한 법적 문서들을 확인하실 수 있습니다.
            </p>
          </div>

          <div className="p-6">
            <div className="grid gap-4">
              {Object.entries(legalDocuments).map(([key, doc]) => {
                const IconComponent = doc.icon;
                return (
                  <Link 
                    key={key} 
                    href={`/legal/${key}`}
                    className="block"
                  >
                    <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {doc.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {doc.description}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegalDocumentViewer({ documentType }: { documentType: DocumentType }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const document = legalDocuments[documentType];

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(document.file);
        if (!response.ok) {
          throw new Error('문서를 불러올 수 없습니다.');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : '문서 로드 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [document.file]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            문서 로드 실패
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link href="/legal">
            <Button>목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = document.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/legal">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              목록으로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {document.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {document.description}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900 dark:text-white">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 ml-6 list-disc text-gray-700 dark:text-gray-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 ml-6 list-decimal text-gray-700 dark:text-gray-300">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="mb-1">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto mb-4">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 mb-4 italic text-gray-600 dark:text-gray-400">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LegalPage() {
  const [match, params] = useRoute('/legal/:type?');
  
  if (!match) {
    return <LegalDocumentList />;
  }

  const documentType = params?.type as DocumentType;
  
  if (!documentType || !legalDocuments[documentType]) {
    return <LegalDocumentList />;
  }

  return <LegalDocumentViewer documentType={documentType} />;
}