// @ts-nocheck
// POI·스마트피드 라우터 — POI(관심장소) 카테고리/타입 조회·시딩, 해시태그 팔로우/언팔로우·내 해시태그 목록, 게시글 저장/해제/목록, 스마트 피드 조회·점수 갱신, 트렌딩 해시태그 엔드포인트를 담당한다.
import type { Express } from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyPOISmartFeedRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any }
) {
  const { storage, authenticateToken, authenticateHybrid } = deps;

  // POI (Point of Interest) API 엔드포인트
  // ==========================================

  // POI 카테고리 및 타입 조회 (번역 포함)
  app.get('/api/poi/categories', async (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'en';
      const categories = await storage.getPoiCategoriesWithTypes(lang);
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching POI categories:', error);
      res.status(500).json({ message: 'Failed to fetch POI categories' });
    }
  });

  // POI 초기 데이터 시딩 (한 번만 실행)
  app.post('/api/poi/seed', async (req, res) => {
    try {
      // 이미 데이터가 있는지 확인
      const existingCount = await storage.getPoiCategoryCount();
      if (existingCount > 0) {
        return res.json({ message: 'POI data already seeded', count: existingCount });
      }

      // POI 카테고리 정의 (8개 대분류 + 만남활성화/세렌디피티)
      const categoryData = [
        { code: 'food_drink', icon: '🍽️', sortOrder: 1, isActive: true, isSystem: false },
        { code: 'lodging', icon: '🏨', sortOrder: 2, isActive: true, isSystem: false },
        { code: 'culture', icon: '🎭', sortOrder: 3, isActive: true, isSystem: false },
        { code: 'shopping', icon: '🛍️', sortOrder: 4, isActive: true, isSystem: false },
        { code: 'transport', icon: '🚇', sortOrder: 5, isActive: true, isSystem: false },
        { code: 'nature', icon: '🌳', sortOrder: 6, isActive: true, isSystem: false },
        { code: 'utilities', icon: '💊', sortOrder: 7, isActive: true, isSystem: false },
        { code: 'open_to_meet', icon: '👋', sortOrder: 8, isActive: true, isSystem: true },
        { code: 'serendipity', icon: '✨', sortOrder: 9, isActive: true, isSystem: true },
      ];

      const categories = await storage.bulkInsertPoiCategories(categoryData);
      const categoryMap = Object.fromEntries(categories.map(c => [c.code, c.id]));

      // POI 타입 정의 (Google Places API 타입 매핑)
      const typeData = [
        // 음식 & 음료
        { categoryId: categoryMap['food_drink'], code: 'restaurant', googlePlaceType: 'restaurant', icon: '🍽️', sortOrder: 1 },
        { categoryId: categoryMap['food_drink'], code: 'cafe', googlePlaceType: 'cafe', icon: '☕', sortOrder: 2 },
        { categoryId: categoryMap['food_drink'], code: 'bar', googlePlaceType: 'bar', icon: '🍺', sortOrder: 3 },
        { categoryId: categoryMap['food_drink'], code: 'bakery', googlePlaceType: 'bakery', icon: '🥐', sortOrder: 4 },
        // 숙박
        { categoryId: categoryMap['lodging'], code: 'hotel', googlePlaceType: 'lodging', icon: '🏨', sortOrder: 1 },
        { categoryId: categoryMap['lodging'], code: 'guesthouse', googlePlaceType: 'lodging', icon: '🏠', sortOrder: 2 },
        // 문화 & 엔터테인먼트
        { categoryId: categoryMap['culture'], code: 'tourist_attraction', googlePlaceType: 'tourist_attraction', icon: '🏛️', sortOrder: 1 },
        { categoryId: categoryMap['culture'], code: 'museum', googlePlaceType: 'museum', icon: '🏛️', sortOrder: 2 },
        { categoryId: categoryMap['culture'], code: 'art_gallery', googlePlaceType: 'art_gallery', icon: '🎨', sortOrder: 3 },
        { categoryId: categoryMap['culture'], code: 'movie_theater', googlePlaceType: 'movie_theater', icon: '🎬', sortOrder: 4 },
        { categoryId: categoryMap['culture'], code: 'amusement_park', googlePlaceType: 'amusement_park', icon: '🎢', sortOrder: 5 },
        // 쇼핑
        { categoryId: categoryMap['shopping'], code: 'shopping_mall', googlePlaceType: 'shopping_mall', icon: '🛒', sortOrder: 1 },
        { categoryId: categoryMap['shopping'], code: 'department_store', googlePlaceType: 'department_store', icon: '🏬', sortOrder: 2 },
        { categoryId: categoryMap['shopping'], code: 'store', googlePlaceType: 'store', icon: '🏪', sortOrder: 3 },
        // 교통
        { categoryId: categoryMap['transport'], code: 'train_station', googlePlaceType: 'train_station', icon: '🚆', sortOrder: 1 },
        { categoryId: categoryMap['transport'], code: 'bus_station', googlePlaceType: 'bus_station', icon: '🚌', sortOrder: 2 },
        { categoryId: categoryMap['transport'], code: 'airport', googlePlaceType: 'airport', icon: '✈️', sortOrder: 3 },
        { categoryId: categoryMap['transport'], code: 'subway_station', googlePlaceType: 'subway_station', icon: '🚇', sortOrder: 4 },
        // 자연 & 야외
        { categoryId: categoryMap['nature'], code: 'park', googlePlaceType: 'park', icon: '🌳', sortOrder: 1 },
        { categoryId: categoryMap['nature'], code: 'natural_feature', googlePlaceType: 'natural_feature', icon: '🏔️', sortOrder: 2 },
        { categoryId: categoryMap['nature'], code: 'campground', googlePlaceType: 'campground', icon: '⛺', sortOrder: 3 },
        // 편의시설
        { categoryId: categoryMap['utilities'], code: 'pharmacy', googlePlaceType: 'pharmacy', icon: '💊', sortOrder: 1 },
        { categoryId: categoryMap['utilities'], code: 'hospital', googlePlaceType: 'hospital', icon: '🏥', sortOrder: 2 },
        { categoryId: categoryMap['utilities'], code: 'atm', googlePlaceType: 'atm', icon: '🏧', sortOrder: 3 },
        { categoryId: categoryMap['utilities'], code: 'convenience_store', googlePlaceType: 'convenience_store', icon: '🏪', sortOrder: 4 },
        // 만남활성화 (시스템)
        { categoryId: categoryMap['open_to_meet'], code: 'open_users', googlePlaceType: null, icon: '👋', sortOrder: 1 },
        // 세렌디피티 (시스템)
        { categoryId: categoryMap['serendipity'], code: 'serendipity_users', googlePlaceType: null, icon: '✨', sortOrder: 1 },
      ];

      const types = await storage.bulkInsertPoiTypes(typeData as any);
      const typeMap = Object.fromEntries(types.map(t => [t.code, t.id]));

      // 6개 언어 번역 데이터
      const languages = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
      const categoryTranslations: { [key: string]: { [lang: string]: { name: string; description?: string } } } = {
        food_drink: {
          en: { name: 'Food & Drink', description: 'Restaurants, cafes, bars, bakeries' },
          ko: { name: '음식 & 음료', description: '레스토랑, 카페, 바, 베이커리' },
          ja: { name: '飲食', description: 'レストラン、カフェ、バー、ベーカリー' },
          zh: { name: '餐饮', description: '餐厅、咖啡馆、酒吧、面包店' },
          fr: { name: 'Nourriture & Boissons', description: 'Restaurants, cafés, bars, boulangeries' },
          es: { name: 'Comida y Bebida', description: 'Restaurantes, cafés, bares, panaderías' },
        },
        lodging: {
          en: { name: 'Lodging', description: 'Hotels, guesthouses, hostels' },
          ko: { name: '숙박', description: '호텔, 게스트하우스, 호스텔' },
          ja: { name: '宿泊', description: 'ホテル、ゲストハウス、ホステル' },
          zh: { name: '住宿', description: '酒店、民宿、青年旅社' },
          fr: { name: 'Hébergement', description: 'Hôtels, maisons d\'hôtes, auberges' },
          es: { name: 'Alojamiento', description: 'Hoteles, casas de huéspedes, hostales' },
        },
        culture: {
          en: { name: 'Culture & Entertainment', description: 'Museums, galleries, theaters, theme parks' },
          ko: { name: '문화 & 엔터테인먼트', description: '박물관, 미술관, 극장, 테마파크' },
          ja: { name: '文化・エンターテイメント', description: '博物館、美術館、劇場、テーマパーク' },
          zh: { name: '文化娱乐', description: '博物馆、画廊、剧院、主题公园' },
          fr: { name: 'Culture & Divertissement', description: 'Musées, galeries, théâtres, parcs' },
          es: { name: 'Cultura y Entretenimiento', description: 'Museos, galerías, teatros, parques' },
        },
        shopping: {
          en: { name: 'Shopping', description: 'Malls, markets, department stores' },
          ko: { name: '쇼핑', description: '쇼핑몰, 시장, 백화점' },
          ja: { name: 'ショッピング', description: 'モール、市場、デパート' },
          zh: { name: '购物', description: '商场、市场、百货公司' },
          fr: { name: 'Shopping', description: 'Centres commerciaux, marchés, grands magasins' },
          es: { name: 'Compras', description: 'Centros comerciales, mercados, grandes almacenes' },
        },
        transport: {
          en: { name: 'Transport', description: 'Train stations, bus terminals, airports, subway' },
          ko: { name: '교통', description: '기차역, 버스터미널, 공항, 지하철역' },
          ja: { name: '交通', description: '駅、バスターミナル、空港、地下鉄' },
          zh: { name: '交通', description: '火车站、汽车站、机场、地铁站' },
          fr: { name: 'Transport', description: 'Gares, terminaux de bus, aéroports, métro' },
          es: { name: 'Transporte', description: 'Estaciones de tren, terminales de bus, aeropuertos, metro' },
        },
        nature: {
          en: { name: 'Nature & Outdoors', description: 'Parks, beaches, mountains, hiking trails' },
          ko: { name: '자연 & 야외', description: '공원, 해변, 산, 하이킹코스' },
          ja: { name: '自然・アウトドア', description: '公園、ビーチ、山、ハイキングコース' },
          zh: { name: '自然户外', description: '公园、海滩、山脉、徒步小径' },
          fr: { name: 'Nature & Plein air', description: 'Parcs, plages, montagnes, sentiers' },
          es: { name: 'Naturaleza y Exterior', description: 'Parques, playas, montañas, senderos' },
        },
        utilities: {
          en: { name: 'Utilities', description: 'Pharmacies, hospitals, ATMs, convenience stores' },
          ko: { name: '편의시설', description: '약국, 병원, ATM, 편의점' },
          ja: { name: '便利施設', description: '薬局、病院、ATM、コンビニ' },
          zh: { name: '便利设施', description: '药店、医院、ATM、便利店' },
          fr: { name: 'Services', description: 'Pharmacies, hôpitaux, distributeurs, épiceries' },
          es: { name: 'Servicios', description: 'Farmacias, hospitales, cajeros, tiendas' },
        },
        open_to_meet: {
          en: { name: 'Open to Meet', description: 'Users available to meet nearby' },
          ko: { name: '만남활성화', description: '근처에서 만남이 가능한 사용자' },
          ja: { name: '会いたい人', description: '近くで会える人' },
          zh: { name: '愿意见面', description: '附近愿意见面的用户' },
          fr: { name: 'Ouvert aux rencontres', description: 'Utilisateurs disponibles à proximité' },
          es: { name: 'Abierto a conocer', description: 'Usuarios disponibles cerca' },
        },
        serendipity: {
          en: { name: 'Serendipity', description: 'Discover unexpected connections' },
          ko: { name: '세렌디피티', description: '예상치 못한 만남을 발견하세요' },
          ja: { name: 'セレンディピティ', description: '予期せぬ出会いを発見' },
          zh: { name: '偶遇', description: '发现意想不到的缘分' },
          fr: { name: 'Sérendipité', description: 'Découvrez des connexions inattendues' },
          es: { name: 'Serendipia', description: 'Descubre conexiones inesperadas' },
        },
      };

      const catTransData: any[] = [];
      for (const [code, translations] of Object.entries(categoryTranslations)) {
        for (const lang of languages) {
          if (translations[lang]) {
            catTransData.push({
              categoryId: categoryMap[code],
              languageCode: lang,
              name: translations[lang].name,
              description: translations[lang].description || null,
            });
          }
        }
      }
      await storage.bulkInsertPoiCategoryTranslations(catTransData);

      // 타입 번역
      const typeTranslations: { [key: string]: { [lang: string]: string } } = {
        restaurant: { en: 'Restaurant', ko: '레스토랑', ja: 'レストラン', zh: '餐厅', fr: 'Restaurant', es: 'Restaurante' },
        cafe: { en: 'Cafe', ko: '카페', ja: 'カフェ', zh: '咖啡馆', fr: 'Café', es: 'Café' },
        bar: { en: 'Bar', ko: '바', ja: 'バー', zh: '酒吧', fr: 'Bar', es: 'Bar' },
        bakery: { en: 'Bakery', ko: '베이커리', ja: 'ベーカリー', zh: '面包店', fr: 'Boulangerie', es: 'Panadería' },
        hotel: { en: 'Hotel', ko: '호텔', ja: 'ホテル', zh: '酒店', fr: 'Hôtel', es: 'Hotel' },
        guesthouse: { en: 'Guesthouse', ko: '게스트하우스', ja: 'ゲストハウス', zh: '民宿', fr: 'Maison d\'hôtes', es: 'Casa de huéspedes' },
        tourist_attraction: { en: 'Tourist Attraction', ko: '관광명소', ja: '観光地', zh: '旅游景点', fr: 'Attraction touristique', es: 'Atracción turística' },
        museum: { en: 'Museum', ko: '박물관', ja: '博物館', zh: '博物馆', fr: 'Musée', es: 'Museo' },
        art_gallery: { en: 'Art Gallery', ko: '미술관', ja: '美術館', zh: '画廊', fr: 'Galerie d\'art', es: 'Galería de arte' },
        movie_theater: { en: 'Movie Theater', ko: '영화관', ja: '映画館', zh: '电影院', fr: 'Cinéma', es: 'Cine' },
        amusement_park: { en: 'Amusement Park', ko: '테마파크', ja: 'テーマパーク', zh: '游乐园', fr: 'Parc d\'attractions', es: 'Parque de atracciones' },
        shopping_mall: { en: 'Shopping Mall', ko: '쇼핑몰', ja: 'ショッピングモール', zh: '购物中心', fr: 'Centre commercial', es: 'Centro comercial' },
        department_store: { en: 'Department Store', ko: '백화점', ja: 'デパート', zh: '百货公司', fr: 'Grand magasin', es: 'Grandes almacenes' },
        store: { en: 'Store', ko: '상점', ja: '店舗', zh: '商店', fr: 'Magasin', es: 'Tienda' },
        train_station: { en: 'Train Station', ko: '기차역', ja: '駅', zh: '火车站', fr: 'Gare', es: 'Estación de tren' },
        bus_station: { en: 'Bus Station', ko: '버스터미널', ja: 'バスターミナル', zh: '汽车站', fr: 'Gare routière', es: 'Estación de autobuses' },
        airport: { en: 'Airport', ko: '공항', ja: '空港', zh: '机场', fr: 'Aéroport', es: 'Aeropuerto' },
        subway_station: { en: 'Subway Station', ko: '지하철역', ja: '地下鉄駅', zh: '地铁站', fr: 'Station de métro', es: 'Estación de metro' },
        park: { en: 'Park', ko: '공원', ja: '公園', zh: '公园', fr: 'Parc', es: 'Parque' },
        natural_feature: { en: 'Natural Feature', ko: '자연명소', ja: '自然', zh: '自然景观', fr: 'Site naturel', es: 'Sitio natural' },
        campground: { en: 'Campground', ko: '캠핑장', ja: 'キャンプ場', zh: '露营地', fr: 'Camping', es: 'Camping' },
        pharmacy: { en: 'Pharmacy', ko: '약국', ja: '薬局', zh: '药店', fr: 'Pharmacie', es: 'Farmacia' },
        hospital: { en: 'Hospital', ko: '병원', ja: '病院', zh: '医院', fr: 'Hôpital', es: 'Hospital' },
        atm: { en: 'ATM', ko: 'ATM', ja: 'ATM', zh: 'ATM', fr: 'Distributeur', es: 'Cajero automático' },
        convenience_store: { en: 'Convenience Store', ko: '편의점', ja: 'コンビニ', zh: '便利店', fr: 'Épicerie', es: 'Tienda de conveniencia' },
        open_users: { en: 'Open Users', ko: '만남가능', ja: '会える人', zh: '可见面', fr: 'Disponibles', es: 'Disponibles' },
        serendipity_users: { en: 'Serendipity', ko: '세렌디피티', ja: 'セレンディピティ', zh: '偶遇', fr: 'Sérendipité', es: 'Serendipia' },
      };

      const typeTransData: any[] = [];
      for (const [code, translations] of Object.entries(typeTranslations)) {
        for (const lang of languages) {
          if (translations[lang] && typeMap[code]) {
            typeTransData.push({
              typeId: typeMap[code],
              languageCode: lang,
              name: translations[lang],
            });
          }
        }
      }
      await storage.bulkInsertPoiTypeTranslations(typeTransData);

      res.json({
        message: 'POI data seeded successfully',
        categories: categories.length,
        types: types.length,
      });
    } catch (error) {
      console.error('Error seeding POI data:', error);
      res.status(500).json({ message: 'Failed to seed POI data' });
    }
  });

  // ==========================================
  // Smart Feed & Hashtag API
  // ==========================================

  // 해시태그 검색 (자동완성)
  app.get('/api/hashtags/search', async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const lang = (req.query.lang as string) || 'en';

      const hashtags = await storage.searchHashtags(query, limit);
      
      const results = await Promise.all(hashtags.map(async (h) => {
        const withTranslation = await storage.getHashtagWithTranslation(h.id, lang);
        return {
          id: h.id,
          name: h.name,
          displayName: withTranslation?.translatedName || h.name,
          postCount: h.postCount,
          followerCount: h.followerCount,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error searching hashtags:', error);
      res.status(500).json({ message: 'Failed to search hashtags' });
    }
  });

  // 트렌딩 해시태그
  app.get('/api/hashtags/trending', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const period = (req.query.period as 'day' | 'week') || 'day';
      const lang = (req.query.lang as string) || 'en';

      const trending = await storage.getTrendingHashtags(limit, period);
      
      const results = await Promise.all(trending.map(async (h) => {
        const withTranslation = await storage.getHashtagWithTranslation(h.id, lang);
        return {
          id: h.id,
          name: h.name,
          displayName: withTranslation?.translatedName || h.name,
          postCount: h.postCount,
          followerCount: h.followerCount,
          growthRate: h.growthRate,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      res.status(500).json({ message: 'Failed to get trending hashtags' });
    }
  });

  // 해시태그 상세 정보
  app.get('/api/hashtags/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lang = (req.query.lang as string) || 'en';

      const hashtag = await storage.getHashtagWithTranslation(id, lang);
      if (!hashtag) {
        return res.status(404).json({ message: 'Hashtag not found' });
      }

      res.json({
        id: hashtag.id,
        name: hashtag.name,
        displayName: hashtag.translatedName || hashtag.name,
        postCount: hashtag.postCount,
        followerCount: hashtag.followerCount,
        createdAt: hashtag.createdAt,
      });
    } catch (error) {
      console.error('Error getting hashtag:', error);
      res.status(500).json({ message: 'Failed to get hashtag' });
    }
  });

  // 해시태그별 게시물 조회
  app.get('/api/hashtags/:id/posts', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await storage.getPostsByHashtag(id, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Error getting hashtag posts:', error);
      res.status(500).json({ message: 'Failed to get hashtag posts' });
    }
  });

  // 해시태그 팔로우
  app.post('/api/hashtags/:id/follow', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const hashtagId = parseInt(req.params.id);
      const follow = await storage.followHashtag(userId, hashtagId);
      res.json({ success: true, follow });
    } catch (error) {
      console.error('Error following hashtag:', error);
      res.status(500).json({ message: 'Failed to follow hashtag' });
    }
  });

  // 해시태그 언팔로우
  app.delete('/api/hashtags/:id/follow', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const hashtagId = parseInt(req.params.id);
      await storage.unfollowHashtag(userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing hashtag:', error);
      res.status(500).json({ message: 'Failed to unfollow hashtag' });
    }
  });

  // 내가 팔로우한 해시태그 목록
  app.get('/api/me/hashtags', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const lang = (req.query.lang as string) || 'en';
      const followed = await storage.getFollowedHashtags(userId);

      const results = await Promise.all(followed.map(async (f) => {
        const withTranslation = await storage.getHashtagWithTranslation(f.hashtagId, lang);
        return {
          id: f.hashtag.id,
          name: f.hashtag.name,
          displayName: withTranslation?.translatedName || f.hashtag.name,
          postCount: f.hashtag.postCount,
          followedAt: f.createdAt,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error getting followed hashtags:', error);
      res.status(500).json({ message: 'Failed to get followed hashtags' });
    }
  });

  // 게시물 저장 (북마크)
  app.post('/api/posts/:id/save', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      const save = await storage.savePost(userId, postId);
      res.json({ success: true, save });
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ message: 'Failed to save post' });
    }
  });

  // 게시물 저장 취소
  app.delete('/api/posts/:id/save', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      await storage.unsavePost(userId, postId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unsaving post:', error);
      res.status(500).json({ message: 'Failed to unsave post' });
    }
  });

  // 저장한 게시물 목록
  app.get('/api/me/saved-posts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await storage.getSavedPosts(userId, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Error getting saved posts:', error);
      res.status(500).json({ message: 'Failed to get saved posts' });
    }
  });

  // 스마트 피드 API
  app.get('/api/feed', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';
      const mode = (req.query.mode as 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag') || 'smart';
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;
      const latitude = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const longitude = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

      const posts = await storage.getSmartFeed(userId, {
        mode,
        limit,
        offset,
        latitude,
        longitude,
      });

      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const postHashtags = await storage.getPostHashtags(post.id);
        const isSaved = userId !== 'anonymous' ? await storage.isPostSaved(userId, post.id) : false;
        return {
          ...post,
          hashtags: postHashtags.map(ph => ({ id: ph.hashtag.id, name: ph.hashtag.name })),
          isSaved,
        };
      }));

      res.json(enrichedPosts);
    } catch (error) {
      console.error('Error getting smart feed:', error);
      res.status(500).json({ message: 'Failed to get feed' });
    }
  });

  // 피드 설정 조회
  app.get('/api/me/feed-preferences', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const prefs = await storage.getUserFeedPreferences(userId);
      if (!prefs) {
        return res.json({
          preferredMode: 'smart',
          engagementWeight: 0.22,
          affinityWeight: 0.20,
          interestWeight: 0.15,
          hashtagWeight: 0.12,
          locationWeight: 0.12,
          recencyWeight: 0.11,
          velocityWeight: 0.08,
        });
      }
      res.json(prefs);
    } catch (error) {
      console.error('Error getting feed preferences:', error);
      res.status(500).json({ message: 'Failed to get feed preferences' });
    }
  });

  // 피드 설정 업데이트
  app.put('/api/me/feed-preferences', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const prefs = await storage.setUserFeedPreferences({
        userId,
        ...req.body,
      });
      res.json(prefs);
    } catch (error) {
      console.error('Error updating feed preferences:', error);
      res.status(500).json({ message: 'Failed to update feed preferences' });
    }
  });

  // 해시태그 시드 데이터 생성
  app.post('/api/hashtags/seed', async (req: Request, res: Response) => {
    try {
      await storage.seedInitialHashtags();
      res.json({ message: 'Hashtags seeded successfully' });
    } catch (error) {
      console.error('Error seeding hashtags:', error);
      res.status(500).json({ message: 'Failed to seed hashtags' });
    }
  });

}
