export type AppTab = 'map' | 'explore' | 'meet' | 'chat' | 'profile';

export interface NavigationItem {
  id: AppTab;
  labelKey: string;
}

export const APP_TABS: NavigationItem[] = [
  { id: 'map', labelKey: 'navigation.map' },
  { id: 'explore', labelKey: 'navigation.explore' },
  { id: 'meet', labelKey: 'navigation.meet' },
  { id: 'chat', labelKey: 'navigation.chat' },
  { id: 'profile', labelKey: 'navigation.profile' },
];
