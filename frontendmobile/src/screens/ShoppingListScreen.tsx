import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useListStore } from "../store/listStore";

const DEMO_ITEMS = [
  { productId: "1", productName: "Organic Whole Milk", quantity: 1, checked: false, estimatedPrice: 5.99 },
  { productId: "2", productName: "Cheerios Original", quantity: 2, checked: true, estimatedPrice: 3.98 },
  { productId: "3", productName: "Bananas (bunch)", quantity: 1, checked: false, estimatedPrice: 0.69 },
  { productId: "4", productName: "Chicken Breast 2lb", quantity: 1, checked: false, estimatedPrice: 8.99 },
  { productId: "5", productName: "Whole Wheat Bread", quantity: 1, checked: true, estimatedPrice: 3.49 },
  { productId: "6", productName: "Greek Yogurt 32oz", quantity: 1, checked: false, estimatedPrice: 5.49 },
  { productId: "7", productName: "Baby Spinach 5oz", quantity: 2, checked: false, estimatedPrice: 3.99 },
  { productId: "8", productName: "Eggs (dozen)", quantity: 1, checked: true, estimatedPrice: 4.29 },
];

export default function ShoppingListScreen() {
  const unchecked = DEMO_ITEMS.filter((i) => !i.checked);
  const checked = DEMO_ITEMS.filter((i) => i.checked);
  const total = DEMO_ITEMS.reduce(
    (sum, i) => sum + (i.estimatedPrice || 0) * i.quantity,
    0
  );
  const remaining = unchecked.reduce(
    (sum, i) => sum + (i.estimatedPrice || 0) * i.quantity,
    0
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{DEMO_ITEMS.length}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#00ffb2" }]}>
            ${remaining.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Remaining</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Est. Total</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          To Buy ({unchecked.length})
        </Text>
        {unchecked.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <View style={styles.checkbox} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemMeta}>
                Qty: {item.quantity} | ~${(item.estimatedPrice! * item.quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {checked.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Done ({checked.length})
          </Text>
          {checked.map((item) => (
            <View key={item.productId} style={[styles.itemRow, styles.itemChecked]}>
              <View style={[styles.checkbox, styles.checkboxChecked]}>
                <Text style={styles.checkmark}>V</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, styles.itemNameChecked]}>
                  {item.productName}
                </Text>
                <Text style={styles.itemMeta}>
                  Qty: {item.quantity} | ${(item.estimatedPrice! * item.quantity).toFixed(2)}
                </Text>
              </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  addButton: {
    backgroundColor: "#00ffb215",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#00ffb230",
  },
  addButtonText: { color: "#00ffb2", fontSize: 14, fontWeight: "600" },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  summaryLabel: { fontSize: 11, color: "#71717a", marginTop: 4 },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a1a1aa",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17171d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  itemChecked: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#71717a",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#00ffb2",
    borderColor: "#00ffb2",
  },
  checkmark: { color: "#08070e", fontSize: 12, fontWeight: "700" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "500", color: "#fff" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#71717a" },
  itemMeta: { fontSize: 12, color: "#71717a", marginTop: 2 },
});
