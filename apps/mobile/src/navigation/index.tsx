import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import LeagueSwitcher from '../components/LeagueSwitcher';
import { useLeague } from '../context/LeagueContext';
import { ScheduleStackParamList, TeamStackParamList, ProfileStackParamList } from './types';
import GamePreviewScreen from '../screens/GamePreviewScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsFeedScreen from '../screens/NotificationsFeedScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import StatsScreen from '../screens/StatsScreen';
import TeamScreen from '../screens/TeamScreen';
import TeamDetailScreen from '../screens/TeamScreen/TeamDetailScreen';
import LeagueMarketplace from '../components/LeagueMarketplace';
import PlayerCardScreen from '../screens/PlayerCardScreen';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const TeamStack = createNativeStackNavigator<TeamStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function AppHeaderBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(8, 14, 27, 0.96)', 'rgba(10, 18, 33, 0.92)', 'rgba(6, 10, 20, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${colors.brandRink}20`, 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.headerGlow}
      />
      <View style={styles.headerHairline} />
    </View>
  );
}

function AppTabBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(8, 13, 24, 0.98)', 'rgba(11, 18, 33, 0.94)', 'rgba(8, 12, 22, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${colors.brandArena}20`, 'transparent']}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={styles.tabGlow}
      />
      <View style={styles.tabHairline} />
    </View>
  );
}

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
      <ScheduleStack.Screen name="ScheduleList" component={ScheduleScreen} />
      <ScheduleStack.Screen name="GamePreview" component={GamePreviewScreen} />
    </ScheduleStack.Navigator>
  );
}

function TeamNavigator() {
  return (
    <TeamStack.Navigator screenOptions={{ headerShown: false }}>
      <TeamStack.Screen name="TeamList" component={TeamScreen} />
      <TeamStack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <TeamStack.Screen name="PlayerCard" component={PlayerCardScreen} />
    </TeamStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="NotificationsFeed" component={NotificationsFeedScreen} />
      <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <ProfileStack.Screen name="LeagueMarketplace" component={LeagueMarketplace} />
      <ProfileStack.Screen name="PlayerCard" component={PlayerCardScreen} />
    </ProfileStack.Navigator>
  );
}

export default function RootNavigation() {
  const { activeTheme } = useLeague();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }: any) => ({
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerShadowVisible: false,
        headerBackground: () => <AppHeaderBackground />,
        headerTitle: () => <LeagueSwitcher />,
        sceneStyle: {
          backgroundColor: activeTheme.backgroundColor,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 80,
          paddingTop: 8,
          paddingBottom: 10,
          overflow: 'hidden',
        },
        tabBarBackground: () => <AppTabBackground />,
        tabBarIcon: ({ color, size }: any) => {
          const iconSize = size + 1;

          if (route.name === 'Schedule') {
            return <Ionicons name="calendar-outline" size={iconSize} color={color} />;
          }

          if (route.name === 'Stats') {
            return <Ionicons name="stats-chart-outline" size={iconSize} color={color} />;
          }

          if (route.name === 'Home') {
            return <Ionicons name="home-outline" size={iconSize} color={color} />;
          }

          if (route.name === 'Team') {
            return <MaterialCommunityIcons name="hockey-sticks" size={iconSize} color={color} />;
          }

          return <Ionicons name="person-outline" size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Schedule" component={ScheduleNavigator} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Team" component={TeamNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    top: -32,
    left: -28,
    right: '36%',
    bottom: '10%',
    borderRadius: 999,
  },
  headerHairline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassStroke,
  },
  tabGlow: {
    ...StyleSheet.absoluteFillObject,
    top: -12,
    left: '35%',
    bottom: '18%',
    borderRadius: 999,
  },
  tabHairline: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassStroke,
  },
});
