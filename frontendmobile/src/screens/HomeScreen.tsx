import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useScanStore } from "../store/scanStore";

const QUICK_ACTIONS = [
  { id: "scan", label: "Scan Product", icon: "S", color: "#00ffb2" },
  { id: "barcode", label: "Barcode", icon: "B", color: "#3b82f6" },
  { id: "list", label: "Shopping List", icon: "L", color: "#ffb800" },
  { id: "history", label: "Recent Scans", icon: "R", color: "#a855f7" },
];

const DEMO_RECENT_SCANS = [
  {
    id: "1",
    name: "Organic Valley Whole Milk",
    brand: "Organic Valley",
    score: "A",
    scannedAt: "2 min ago",
  },
  {
    id: "2",
    name: "Cheerios Original",
    brand: "General Mills",
    score: "B+",
    scannedAt: "15 min ago",
  },
  {
    id: "3",
    name: "Lay's Classic Chips",
    brand: "Frito-Lay",
    score: "C",
    scannedAt: "1 hr ago",
  },
  {
    id: "4",
    name: "Kind Bars Dark Chocolate",
    brand: "Kind",
    score: "A-",
    scannedAt: "3 hr ago",
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const handleQuickAction = (id: string) => {
    if (id === "scan" || id === "barcode") {
      navigation.navigate("Scan");
    } else if (id === "list") {
      navigation.navigate("List");
    } else if (id === "history") {
      navigation.navigate("History");
    }
  };

  const getScoreColor = (score: string) => {
    if (score.startsWith("A")) return "#00ffb2";
    if (score.startsWith("B")) return "#3b82f6";
    if (score.startsWith("C")) return "#ffb800";
    return "#f06";
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good evening</Text>
        <Text style={styles.title}>WareHouse AI</Text>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => handleQuickAction(action.id)}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: action.color + "20" },
              ]}
            >
              <Text style={[styles.actionIconText, { color: action.color }]}>
                {action.icon}
              </Text>
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {DEMO_RECENT_SCANS.map((scan) => (
          <TouchableOpacity
            key={scan.id}
            style={styles.scanCard}
            onPress={() =>
              navigation.navigate("ProductDetail", { productId: scan.id })
            }
          >
            <View style={styles.scanImagePlaceholder}>
              <Text style={styles.scanImageText}>
                {scan.brand?.[0] || "?"}
              </Text>
            </View>
            <View style={styles.scanInfo}>
              <Text style={styles.scanName}>{scan.name}</Text>
              <Text style={styles.scanBrand}>{scan.brand}</Text>
              <Text style={styles.scanTime}>{scan.scannedAt}</Text>
            </View>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: getScoreColor(scan.score) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  { color: getScoreColor(scan.score) },
                ]}
              >
                {scan.score}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>This Week's Shopping</Text>
          <Text style={styles.insightValue}>12 products scanned</Text>
          <Text style={styles.insightDetail}>
            Average health score: B+ | Estimated savings: $14.50
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08070e",
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    color: "#71717a",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#17171d",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 18,
    fontWeight: "700",
  },
  actionLabel: {
    fontSize: 11,
    color: "#a1a1aa",
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 16,
  },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  scanImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#202026",
    alignItems: "center",
    justifyContent: "center",
  },
  scanImageText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#71717a",
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scanName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  scanBrand: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 2,
  },
  scanTime: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  insightCard: {
    backgroundColor: "#17171d",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  insightValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#00ffb2",
    marginTop: 8,
  },
  insightDetail: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 4,
  },
});
