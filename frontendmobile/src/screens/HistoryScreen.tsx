import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const DEMO_HISTORY = [
  { id: "1", name: "Organic Valley Whole Milk", brand: "Organic Valley", score: "A", confidence: 0.97, scannedAt: "Today, 6:32 PM" },
  { id: "2", name: "Cheerios Original", brand: "General Mills", score: "B+", confidence: 0.96, scannedAt: "Today, 6:15 PM" },
  { id: "3", name: "Lay's Classic Chips", brand: "Frito-Lay", score: "C", confidence: 0.94, scannedAt: "Today, 5:48 PM" },
  { id: "4", name: "Kind Bars Dark Chocolate", brand: "Kind", score: "A-", confidence: 0.98, scannedAt: "Today, 3:20 PM" },
  { id: "5", name: "Coca-Cola Classic", brand: "Coca-Cola", score: "D+", confidence: 0.99, scannedAt: "Yesterday, 8:45 PM" },
  { id: "6", name: "Oatly Oat Milk", brand: "Oatly", score: "A", confidence: 0.95, scannedAt: "Yesterday, 7:12 PM" },
  { id: "7", name: "Doritos Nacho Cheese", brand: "Frito-Lay", score: "D", confidence: 0.93, scannedAt: "Yesterday, 5:00 PM" },
  { id: "8", name: "RXBar Chocolate Sea Salt", brand: "RXBar", score: "A", confidence: 0.97, scannedAt: "Mar 3, 2:30 PM" },
  { id: "9", name: "Heinz Tomato Ketchup", brand: "Heinz", score: "C+", confidence: 0.96, scannedAt: "Mar 3, 1:15 PM" },
  { id: "10", name: "Nature Valley Granola Bars", brand: "General Mills", score: "B", confidence: 0.91, scannedAt: "Mar 2, 4:00 PM" },
];

const getScoreColor = (score: string) => {
  if (score.startsWith("A")) return "#00ffb2";
  if (score.startsWith("B")) return "#3b82f6";
  if (score.startsWith("C")) return "#ffb800";
  return "#ff0066";
};

export default function HistoryScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.count}>{DEMO_HISTORY.length} scans</Text>
      </View>

      <FlatList
        data={DEMO_HISTORY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.historyCard}
            onPress={() =>
              navigation.navigate("ProductDetail", { productId: item.id })
            }
          >
            <View style={styles.cardLeft}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imageText}>{item.brand[0]}</Text>
              </View>
            </View>
            <View style={styles.cardCenter}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.brandName}>{item.brand}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.timeText}>{item.scannedAt}</Text>
                <Text style={styles.confidenceText}>
                  {(item.confidence * 100).toFixed(0)}% match
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: getScoreColor(item.score) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  { color: getScoreColor(item.score) },
                ]}
              >
                {item.score}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08070e" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  count: { fontSize: 14, color: "#71717a" },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  cardLeft: {},
  imagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#202026",
    alignItems: "center",
    justifyContent: "center",
  },
  imageText: { fontSize: 18, fontWeight: "700", color: "#71717a" },
  cardCenter: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  brandName: { fontSize: 12, color: "#a1a1aa", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  timeText: { fontSize: 11, color: "#71717a" },
  confidenceText: { fontSize: 11, color: "#71717a" },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  scoreText: { fontSize: 14, fontWeight: "700" },
});
