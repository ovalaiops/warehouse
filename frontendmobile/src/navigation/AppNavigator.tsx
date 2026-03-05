import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import ScanScreen from "../screens/ScanScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import ShoppingListScreen from "../screens/ShoppingListScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LoginScreen from "../screens/LoginScreen";
import { useAuthStore } from "../store/authStore";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: "H",
    Scan: "S",
    List: "L",
    History: "R",
    Profile: "P",
  };
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: focused
          ? "rgba(0, 255, 178, 0.15)"
          : "transparent",
      }}
    >
      <Text
        style={{
          color: focused ? "#00ffb2" : "#71717a",
          fontSize: 16,
          fontWeight: focused ? "700" : "400",
        }}
      >
        {icons[label] || label[0]}
      </Text>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#17171d",
          borderTopColor: "rgba(95, 95, 113, 0.22)",
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#00ffb2",
        tabBarInactiveTintColor: "#71717a",
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="List" component={ShoppingListScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#08070e" },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={HomeTabs} />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#17171d" },
              headerTintColor: "#ffffff",
              title: "Product Details",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
