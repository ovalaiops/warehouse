import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useAuthStore } from "../store/authStore";

const ALLERGENS = [
  { id: "gluten", label: "Gluten", active: true },
  { id: "dairy", label: "Dairy", active: false },
  { id: "nuts", label: "Tree Nuts", active: true },
  { id: "peanuts", label: "Peanuts", active: false },
  { id: "soy", label: "Soy", active: false },
  { id: "eggs", label: "Eggs", active: false },
  { id: "shellfish", label: "Shellfish", active: false },
];

const DIET_PREFS = [
  { id: "organic", label: "Prefer Organic", active: true },
  { id: "low_sugar", label: "Low Sugar", active: true },
  { id: "high_protein", label: "High Protein", active: false },
  { id: "vegan", label: "Vegan", active: false },
  { id: "keto", label: "Keto", active: false },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]?.toUpperCase() || "D"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || "Demo User"}</Text>
        <Text style={styles.userEmail}>
          {user?.email || "demo@warehouse.ai"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>47</Text>
          <Text style={styles.statLabel}>Scans</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#00ffb2" }]}>$87</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>B+</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergen Alerts</Text>
        <Text style={styles.sectionDesc}>
          Get flagged when scanned products contain these
        </Text>
        {ALLERGENS.map((a) => (
          <View key={a.id} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{a.label}</Text>
            <Switch
              value={a.active}
              trackColor={{ false: "#202026", true: "#00ffb240" }}
              thumbColor={a.active ? "#00ffb2" : "#71717a"}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        {DIET_PREFS.map((p) => (
          <View key={p.id} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{p.label}</Text>
            <Switch
              value={p.active}
              trackColor={{ false: "#202026", true: "#00ffb240" }}
              thumbColor={p.active ? "#00ffb2" : "#71717a"}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Notification Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>About Warehouse AI</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v0.1.0 | Powered by NVIDIA Cosmos Reason 2</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08070e" },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#00ffb220",
    borderWidth: 2,
    borderColor: "#00ffb2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#00ffb2" },
  userName: { fontSize: 22, fontWeight: "700", color: "#fff" },
  userEmail: { fontSize: 14, color: "#71717a", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 12, color: "#71717a", marginTop: 4 },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: "#71717a", marginBottom: 14 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(95, 95, 113, 0.12)",
  },
  toggleLabel: { fontSize: 15, color: "#fff" },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(95, 95, 113, 0.12)",
  },
  menuText: { fontSize: 15, color: "#fff" },
  logoutButton: {
    marginHorizontal: 24,
    backgroundColor: "#ff006615",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff006630",
    marginTop: 8,
  },
  logoutText: { color: "#ff0066", fontSize: 16, fontWeight: "600" },
  version: {
    textAlign: "center",
    color: "#71717a",
    fontSize: 12,
    marginTop: 24,
  },
});
