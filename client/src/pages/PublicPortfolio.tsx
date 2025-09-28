import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, ExternalLink, MapPin, Star, Sparkles, Package, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface PublicPortfolioProps {
  publicProfileUrl: string;
}

interface ServiceTemplate {
  id: number;
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
}

interface ServicePackage {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  discountPercentage: number;
  isActive: boolean;
  packageItems: {
    templateId: number;
    quantity: number;
    template: ServiceTemplate;
  }[];
}

interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  profileImageUrl?: string;
  userType: 'influencer';
  portfolioMode: boolean;
  publicProfileUrl: string;
}

export default function PublicPortfolio({ publicProfileUrl }: PublicPortfolioProps) {
  const [, setLocation] = useLocation();

  // 공개 프로필 사용자 정보 조회
  const { data: user, isLoading: userLoading, error: userError } = useQuery<PublicUser>({
    queryKey: ['/api/portfolio', publicProfileUrl],
    queryFn: async () => {
      const response = await api(`/api/portfolio/${publicProfileUrl}`);
      return response;
    },
  });

  // 서비스 템플릿 조회
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ServiceTemplate[]>({
    queryKey: ['/api/templates/portfolio', publicProfileUrl],
    queryFn: async () => {
      const response = await api(`/api/templates/portfolio/${publicProfileUrl}`);
      return response;
    },
    enabled: !!user,
  });

  // 서비스 패키지 조회
  const { data: packages = [], isLoading: packagesLoading } = useQuery<ServicePackage[]>({
    queryKey: ['/api/packages/portfolio', publicProfileUrl],
    queryFn: async () => {
      const response = await api(`/api/packages/portfolio/${publicProfileUrl}`);
      return response;
    },
    enabled: !!user,
  });

  const isLoading = userLoading || templatesLoading || packagesLoading;

  if (userError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">포트폴리오를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">요청한 프로필이 존재하지 않거나 비공개로 설정되어 있습니다.</p>
          <Button onClick={() => setLocation('/')} className="bg-purple-600 hover:bg-purple-700">
            <ArrowLeft size={16} className="mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⭐</div>
          <p className="text-purple-600 font-medium">포트폴리오 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="hover:bg-purple-100"
          >
            <ArrowLeft size={16} className="mr-2" />
            Tourgether로 돌아가기
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-600">공개 포트폴리오</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="w-24 h-24 border-4 border-purple-200">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback className="bg-purple-100 text-purple-700 text-xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <Badge className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Sparkles size={12} className="mr-1" />
                인플루언서
              </Badge>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-purple-600 font-medium mb-4">@{user?.publicProfileUrl}</p>
              {user?.bio && (
                <p className="text-gray-700 text-lg leading-relaxed mb-6">{user.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{templates.length}</div>
                  <div className="text-sm text-gray-500">서비스</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{packages.length}</div>
                  <div className="text-sm text-gray-500">패키지</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="text-purple-600" size={24} />
            제공 서비스
          </h2>
          {templates.length === 0 ? (
            <div className="bg-white/50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🎨</div>
              <p className="text-gray-500">아직 등록된 서비스가 없습니다</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">{template.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">{template.category}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">
                          ₩{template.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">{template.duration}분</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-700 leading-relaxed">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Packages Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="text-pink-600" size={24} />
            패키지 상품
          </h2>
          {packages.length === 0 ? (
            <div className="bg-white/50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500">아직 등록된 패키지가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="bg-white/80 backdrop-blur-sm border-pink-100 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-gray-900">{pkg.name}</CardTitle>
                        <CardDescription className="mt-2 text-gray-700">
                          {pkg.description}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        {pkg.discountPercentage > 0 && (
                          <Badge className="bg-pink-100 text-pink-700 mb-2">
                            {pkg.discountPercentage}% 할인
                          </Badge>
                        )}
                        <div className="text-2xl font-bold text-pink-600">
                          ₩{pkg.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800">포함된 서비스:</h4>
                      <div className="grid gap-2">
                        {pkg.packageItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-pink-50 rounded">
                            <span className="text-sm">{item.template.title}</span>
                            <div className="text-sm text-gray-600">
                              {item.quantity}회 × ₩{item.template.price.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">함께 특별한 여행을 만들어요</h2>
          <p className="text-purple-100 mb-6">
            맞춤형 서비스와 패키지로 당신만의 독특한 여행 경험을 제공합니다
          </p>
          <Button 
            size="lg" 
            className="bg-white text-purple-600 hover:bg-purple-50"
            onClick={() => setLocation('/signup')}
          >
            <Heart size={16} className="mr-2" />
            Tourgether 시작하기
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by Tourgether - 로컬과 여행자를 연결하는 플랫폼</p>
        </div>
      </div>
    </div>
  );
}