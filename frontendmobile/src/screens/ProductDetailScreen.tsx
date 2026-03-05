import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

const TABS = ["Overview", "Ingredients", "Nutrition", "Prices", "Reviews"];

const DEMO_REVIEWS = [
  { id: "1", rating: 5, text: "Great taste, my kids love it!", author: "Sarah M.", date: "2 days ago" },
  { id: "2", rating: 4, text: "Good cereal but wish they'd remove the artificial colors", author: "Mike T.", date: "1 week ago" },
  { id: "3", rating: 5, text: "Heart healthy and affordable. Been eating this for years.", author: "Lisa K.", date: "2 weeks ago" },
  { id: "4", rating: 3, text: "Decent but not as good as it used to be", author: "John D.", date: "1 month ago" },
];

export default function ProductDetailScreen() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <ScrollView style={styles.container}>
      <View style={styles.productHeader}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>C</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>Cheerios Original</Text>
          <Text style={styles.productBrand}>General Mills</Text>
          <Text style={styles.productCategory}>Breakfast Cereal - 18 oz</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStars}>4.2</Text>
            <Text style={styles.ratingCount}>(12,340 reviews)</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "Overview" && (
        <View style={styles.tabContent}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>B+</Text>
              <Text style={styles.scoreLabel}>Health Score</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: "#ffb800" }]}>C+</Text>
              <Text style={styles.scoreLabel}>Ingredient Quality</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: "#3b82f6" }]}>A-</Text>
              <Text style={styles.scoreLabel}>Nutrition</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Key Facts</Text>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Calories per serving</Text>
              <Text style={styles.factValue}>140</Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Sugar</Text>
              <Text style={styles.factValue}>2g (low)</Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Whole Grain</Text>
              <Text style={[styles.factValue, { color: "#00ffb2" }]}>Yes</Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Artificial Colors</Text>
              <Text style={[styles.factValue, { color: "#ff0066" }]}>
                Yellow 5, 6
              </Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Allergens</Text>
              <Text style={[styles.factValue, { color: "#ffb800" }]}>Wheat</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Certifications</Text>
            <View style={styles.certRow}>
              <View style={styles.certBadge}>
                <Text style={styles.certText}>Heart Healthy</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {activeTab === "Reviews" && (
        <View style={styles.tabContent}>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewAvg}>4.2</Text>
            <Text style={styles.reviewTotal}>12,340 ratings</Text>
          </View>
          {DEMO_REVIEWS.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewRating}>
                  {"*".repeat(review.rating)}
                </Text>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
              <Text style={styles.reviewAuthor}>- {review.author}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === "Prices" && (
        <View style={styles.tabContent}>
          <Text style={styles.priceNote}>Best deal highlighted</Text>
          {[
            { retailer: "Costco (2pk)", price: 6.99, unit: "$0.19/oz", best: true },
            { retailer: "Walmart", price: 3.98, unit: "$0.22/oz", best: false },
            { retailer: "Kroger", price: 4.19, unit: "$0.23/oz", best: false },
            { retailer: "Target", price: 4.29, unit: "$0.24/oz", best: false },
            { retailer: "Amazon", price: 4.49, unit: "$0.25/oz", best: false },
          ].map((p, i) => (
            <View
              key={i}
              style={[styles.priceCard, p.best && styles.bestPriceCard]}
            >
              <View>
                <Text style={styles.priceRetailer}>{p.retailer}</Text>
                <Text style={styles.priceUnit}>{p.unit}</Text>
              </View>
              <Text style={styles.priceAmount}>${p.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08070e" },
  productHeader: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#202026",
    alignItems: "center",
    justifyContent: "center",
  },
  imageText: { fontSize: 32, fontWeight: "700", color: "#71717a" },
  productInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 20, fontWeight: "700", color: "#fff" },
  productBrand: { fontSize: 14, color: "#a1a1aa", marginTop: 2 },
  productCategory: { fontSize: 12, color: "#71717a", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ratingStars: { fontSize: 14, fontWeight: "700", color: "#ffb800" },
  ratingCount: { fontSize: 12, color: "#71717a", marginLeft: 6 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(95, 95, 113, 0.22)",
  },
  tab: { paddingVertical: 12, paddingHorizontal: 12, marginRight: 4 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#00ffb2" },
  tabText: { fontSize: 13, color: "#71717a", fontWeight: "500" },
  activeTabText: { color: "#00ffb2" },
  tabContent: { padding: 20 },
  scoreRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  scoreItem: {
    flex: 1,
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  scoreValue: { fontSize: 24, fontWeight: "900", color: "#00ffb2" },
  scoreLabel: { fontSize: 11, color: "#a1a1aa", marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: "#17171d",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 14 },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(95, 95, 113, 0.12)",
  },
  factLabel: { fontSize: 14, color: "#a1a1aa" },
  factValue: { fontSize: 14, fontWeight: "600", color: "#fff" },
  certRow: { flexDirection: "row", gap: 8 },
  certBadge: {
    backgroundColor: "#00ffb215",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#00ffb230",
  },
  certText: { fontSize: 12, color: "#00ffb2", fontWeight: "600" },
  reviewSummary: { alignItems: "center", marginBottom: 20 },
  reviewAvg: { fontSize: 48, fontWeight: "900", color: "#ffb800" },
  reviewTotal: { fontSize: 14, color: "#71717a" },
  reviewCard: {
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewRating: { fontSize: 14, color: "#ffb800" },
  reviewDate: { fontSize: 12, color: "#71717a" },
  reviewText: { fontSize: 14, color: "#fff", lineHeight: 20 },
  reviewAuthor: { fontSize: 12, color: "#a1a1aa", marginTop: 8 },
  priceNote: { fontSize: 12, color: "#71717a", marginBottom: 12 },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  bestPriceCard: {
    borderColor: "#00ffb240",
    backgroundColor: "#00ffb208",
  },
  priceRetailer: { fontSize: 15, fontWeight: "600", color: "#fff" },
  priceUnit: { fontSize: 12, color: "#71717a", marginTop: 2 },
  priceAmount: { fontSize: 20, fontWeight: "700", color: "#fff" },
});
