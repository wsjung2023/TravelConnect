import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Calendar,
  Users,
  Shield,
  DollarSign,
  Camera,
  Heart,
  Compass,
  Star,
  Globe,
} from 'lucide-react';

interface SeoLink {
  path: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
}

const seoLinks: SeoLink[] = [
  {
    path: '/travel-itinerary',
    titleKey: 'seoLinks.travelItinerary',
    descKey: 'seoLinks.travelItineraryDesc',
    icon: <Calendar className="w-5 h-5" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    path: '/map-travel',
    titleKey: 'seoLinks.mapTravel',
    descKey: 'seoLinks.mapTravelDesc',
    icon: <MapPin className="w-5 h-5" />,
    color: 'from-green-500 to-green-600',
  },
  {
    path: '/travel-timeline',
    titleKey: 'seoLinks.travelTimeline',
    descKey: 'seoLinks.travelTimelineDesc',
    icon: <Compass className="w-5 h-5" />,
    color: 'from-purple-500 to-purple-600',
  },
  {
    path: '/local-tips',
    titleKey: 'seoLinks.localTips',
    descKey: 'seoLinks.localTipsDesc',
    icon: <Star className="w-5 h-5" />,
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    path: '/travel-mate',
    titleKey: 'seoLinks.travelMate',
    descKey: 'seoLinks.travelMateDesc',
    icon: <Users className="w-5 h-5" />,
    color: 'from-pink-500 to-pink-600',
  },
  {
    path: '/safety',
    titleKey: 'seoLinks.safety',
    descKey: 'seoLinks.safetyDesc',
    icon: <Shield className="w-5 h-5" />,
    color: 'from-red-500 to-red-600',
  },
  {
    path: '/become-guide',
    titleKey: 'seoLinks.becomeGuide',
    descKey: 'seoLinks.becomeGuideDesc',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-teal-500 to-teal-600',
  },
  {
    path: '/earn-travel',
    titleKey: 'seoLinks.earnTravel',
    descKey: 'seoLinks.earnTravelDesc',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    path: '/travel-creator',
    titleKey: 'seoLinks.travelCreator',
    descKey: 'seoLinks.travelCreatorDesc',
    icon: <Camera className="w-5 h-5" />,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    path: '/travel-friends',
    titleKey: 'seoLinks.travelFriends',
    descKey: 'seoLinks.travelFriendsDesc',
    icon: <Heart className="w-5 h-5" />,
    color: 'from-rose-500 to-rose-600',
  },
];

interface SeoLinkCardsProps {
  variant?: 'full' | 'compact' | 'minimal';
  maxItems?: number;
  filterPaths?: string[];
}

export default function SeoLinkCards({
  variant = 'compact',
  maxItems,
  filterPaths,
}: SeoLinkCardsProps) {
  const { t } = useTranslation(['ui']);

  let displayLinks = filterPaths
    ? seoLinks.filter((link) => filterPaths.includes(link.path))
    : seoLinks;

  if (maxItems) {
    displayLinks = displayLinks.slice(0, maxItems);
  }

  if (variant === 'minimal') {
    return (
      <div className="px-4 py-3 bg-gray-50 border-t">
        <p className="text-xs text-gray-500 mb-2">{t('ui:seoLinks.exploreMore')}</p>
        <div className="flex flex-wrap gap-2">
          {displayLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-600">{link.icon}</span>
              <span className="text-gray-700">{t(`ui:${link.titleKey}`)}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="px-4 py-4 bg-gradient-to-b from-gray-50 to-white border-t">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('ui:seoLinks.discoverMore')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {displayLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:shadow-md transition-all group"
            >
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
              >
                {link.icon}
              </div>
              <span className="text-xs font-medium text-gray-700 truncate">
                {t(`ui:${link.titleKey}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 bg-gradient-to-b from-gray-50 to-white border-t">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {t('ui:seoLinks.exploreFeatures')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayLinks.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            className="flex items-start gap-3 p-3 bg-white border rounded-xl hover:shadow-lg transition-all group"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform`}
            >
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800">
                {t(`ui:${link.titleKey}`)}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {t(`ui:${link.descKey}`)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
