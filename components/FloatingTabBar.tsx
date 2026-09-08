import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  isCenter?: boolean;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({ tabs }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeTabIndex = React.useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;
    tabs.forEach((tab, index) => {
      if (tab.isCenter) return; // center button is never "active"
      let score = 0;
      if (pathname === tab.route) {
        score = 100;
      } else if (pathname.startsWith(tab.route as string)) {
        score = 80;
      } else if (pathname.includes(tab.name)) {
        score = 60;
      } else if (String(tab.route).includes('/(tabs)/') && pathname.includes(String(tab.route).split('/(tabs)/')[1])) {
        score = 40;
      }
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });
    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  const handleTabPress = (tab: TabBarItem) => {
    console.log(`[TabBar] Tab pressed: ${tab.label}`);
    if (tab.isCenter) {
      // Center "Spielen" button always navigates to /setup
      router.push('/setup' as Href);
    } else {
      router.push(tab.route);
    }
  };

  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {tabs.map((tab, index) => {
        const isActive = activeTabIndex === index;
        const isCenter = tab.isCenter === true;

        if (isCenter) {
          return (
            <TouchableOpacity
              key={index}
              style={styles.centerTabWrap}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.85}
            >
              <View style={styles.centerButton}>
                <MaterialIcons name={tab.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.centerLabel}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={tab.icon}
              size={24}
              color={isActive ? COLORS.tabActive : COLORS.tabInactive}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.tabBar,
    height: 64,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.tabInactive,
  },
  tabLabelActive: {
    color: COLORS.tabActive,
  },
  centerTabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.tabActive,
  },
});
