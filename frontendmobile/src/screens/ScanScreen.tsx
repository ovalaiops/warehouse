import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { useScanStore } from "../store/scanStore";
import type { ProductScanResult, IngredientAnalysis } from "../types";

// Demo mock result
const MOCK_SCAN_RESULT: ProductScanResult = {
  product: {
    id: "prod-001",
    name: "Cheerios Original",
    brand: "General Mills",
    category: "Breakfast Cereal",
    description:
      "Toasted whole grain oat cereal, heart healthy, low in fat and cholesterol-free",
    ingredients: [
      { name: "Whole Grain Oats", classification: "safe", reason: "Whole grain", commonConcerns: [] },
      { name: "Corn Starch", classification: "safe", reason: "Common thickener", commonConcerns: [] },
      { name: "Sugar", classification: "caution", reason: "Added sugar - 2g per serving", commonConcerns: ["weight gain", "blood sugar spike"] },
      { name: "Salt", classification: "safe", reason: "Minimal amount", commonConcerns: [] },
      { name: "Tripotassium Phosphate", classification: "caution", reason: "Food additive E340", commonConcerns: ["mineral absorption"] },
      { name: "Vitamin E (Mixed Tocopherols)", classification: "safe", reason: "Antioxidant preservative", commonConcerns: [] },
      { name: "Yellow 5", classification: "red_flag", reason: "Artificial color linked to hyperactivity in children", commonConcerns: ["ADHD", "allergic reactions", "banned in some countries"] },
      { name: "Yellow 6", classification: "red_flag", reason: "Artificial color - petroleum derived", commonConcerns: ["hyperactivity", "allergic reactions"] },
    ],
    nutrition: {
      servingSize: "39g (1.5 cups)",
      calories: 140,
      totalFatG: 2.5,
      saturatedFatG: 0.5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 190,
      totalCarbG: 29,
      dietaryFiberG: 4,
      sugarsG: 2,
      proteinG: 5,
    },
    allergens: ["wheat"],
    certifications: ["Heart Healthy"],
  },
  prices: [
    { id: "p1", retailer: "Walmart", price: 3.98, currency: "USD", unitPrice: 0.22, unit: "oz" },
    { id: "p2", retailer: "Target", price: 4.29, currency: "USD", unitPrice: 0.24, unit: "oz" },
    { id: "p3", retailer: "Amazon", price: 4.49, currency: "USD", unitPrice: 0.25, unit: "oz" },
    { id: "p4", retailer: "Costco (2pk)", price: 6.99, currency: "USD", unitPrice: 0.19, unit: "oz" },
    { id: "p5", retailer: "Kroger", price: 4.19, currency: "USD", unitPrice: 0.23, unit: "oz" },
  ],
  confidence: 0.96,
  reasoning:
    "Identified Cheerios Original by General Mills from front packaging. Read nutrition facts panel and ingredient list on side panel. Detected Yellow 5 and Yellow 6 artificial colors which are flagged concerns. Product is a whole grain cereal with relatively low sugar content.",
  overallScore: "B+",
  recommendation:
    "Good whole grain cereal option but contains artificial colors (Yellow 5 & 6). Consider Nature's Path Organic O's as a cleaner alternative.",
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ProductScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<any>();

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo) {
      setCapturedImage(photo.uri);
      analyzeImage(photo.uri);
    }
  };

  const analyzeImage = async (_uri: string) => {
    setScanning(true);
    // Simulate API call with mock data
    setTimeout(() => {
      setResult(MOCK_SCAN_RESULT);
      setScanning(false);
    }, 2000);
  };

  const resetScan = () => {
    setCapturedImage(null);
    setResult(null);
    setScanning(false);
  };

  const getClassColor = (classification: string) => {
    switch (classification) {
      case "safe": return "#00ffb2";
      case "caution": return "#ffb800";
      case "red_flag": return "#ff0066";
      default: return "#a1a1aa";
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is needed to scan products
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (result) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultHeader}>
          <View style={styles.resultBrand}>
            <Text style={styles.resultName}>{result.product.name}</Text>
            <Text style={styles.resultBrandText}>{result.product.brand}</Text>
          </View>
          <View
            style={[
              styles.scoreBadgeLarge,
              {
                backgroundColor:
                  result.overallScore.startsWith("A")
                    ? "#00ffb220"
                    : result.overallScore.startsWith("B")
                    ? "#3b82f620"
                    : "#ffb80020",
              },
            ]}
          >
            <Text
              style={[
                styles.scoreLargeText,
                {
                  color: result.overallScore.startsWith("A")
                    ? "#00ffb2"
                    : result.overallScore.startsWith("B")
                    ? "#3b82f6"
                    : "#ffb800",
                },
              ]}
            >
              {result.overallScore}
            </Text>
          </View>
        </View>

        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceLabel}>
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </Text>
          <View style={styles.confidenceTrack}>
            <View
              style={[
                styles.confidenceFill,
                { width: `${result.confidence * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients Analysis</Text>
          {result.product.ingredients?.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View
                style={[
                  styles.ingredientDot,
                  { backgroundColor: getClassColor(ing.classification) },
                ]}
              />
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientReason}>{ing.reason}</Text>
                {ing.commonConcerns.length > 0 && (
                  <Text style={styles.ingredientConcerns}>
                    Concerns: {ing.commonConcerns.join(", ")}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.classificationBadge,
                  { backgroundColor: getClassColor(ing.classification) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.classificationText,
                    { color: getClassColor(ing.classification) },
                  ]}
                >
                  {ing.classification === "red_flag"
                    ? "FLAG"
                    : ing.classification.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Comparison</Text>
          {result.prices.map((price, i) => (
            <View
              key={price.id}
              style={[
                styles.priceRow,
                i === 0 && styles.bestPrice,
              ]}
            >
              <Text style={styles.retailerName}>{price.retailer}</Text>
              <View style={styles.priceInfo}>
                <Text style={styles.priceAmount}>
                  ${price.price.toFixed(2)}
                </Text>
                {price.unitPrice && (
                  <Text style={styles.unitPrice}>
                    ${price.unitPrice.toFixed(2)}/{price.unit}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Nutrition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <View style={styles.nutritionGrid}>
            {[
              { label: "Calories", value: `${result.product.nutrition?.calories}` },
              { label: "Protein", value: `${result.product.nutrition?.proteinG}g` },
              { label: "Carbs", value: `${result.product.nutrition?.totalCarbG}g` },
              { label: "Fat", value: `${result.product.nutrition?.totalFatG}g` },
              { label: "Fiber", value: `${result.product.nutrition?.dietaryFiberG}g` },
              { label: "Sugar", value: `${result.product.nutrition?.sugarsG}g` },
            ].map((item) => (
              <View key={item.label} style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{item.value}</Text>
                <Text style={styles.nutritionLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Reasoning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningText}>{result.reasoning}</Text>
          </View>
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationLabel}>Recommendation</Text>
            <Text style={styles.recommendationText}>
              {result.recommendation}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
          <Text style={styles.scanAgainText}>Scan Another Product</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.preview} />
          {scanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color="#00ffb2" />
              <Text style={styles.scanningText}>
                Analyzing with Cosmos Reason 2...
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.instructionText}>
                Point camera at a product
              </Text>
            </View>
          </CameraView>
          <View style={styles.captureBar}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08070e" },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#08070e",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionText: { color: "#a1a1aa", fontSize: 16, textAlign: "center", marginBottom: 24 },
  primaryButton: {
    backgroundColor: "#00ffb2",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#08070e", fontSize: 16, fontWeight: "700" },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 14, 0.3)",
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#00ffb2",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 24,
    fontWeight: "500",
  },
  captureBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 255, 178, 0.2)",
    borderWidth: 3,
    borderColor: "#00ffb2",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00ffb2",
  },
  previewContainer: { flex: 1 },
  preview: { flex: 1, resizeMode: "contain" },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 7, 14, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanningText: { color: "#00ffb2", fontSize: 16, marginTop: 16, fontWeight: "500" },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  resultBrand: { flex: 1 },
  resultName: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  resultBrandText: { fontSize: 14, color: "#a1a1aa", marginTop: 4 },
  scoreBadgeLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreLargeText: { fontSize: 20, fontWeight: "900" },
  confidenceBar: { paddingHorizontal: 24, marginBottom: 24 },
  confidenceLabel: { fontSize: 12, color: "#71717a", marginBottom: 6 },
  confidenceTrack: {
    height: 4,
    backgroundColor: "#202026",
    borderRadius: 2,
  },
  confidenceFill: {
    height: 4,
    backgroundColor: "#00ffb2",
    borderRadius: 2,
  },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#17171d",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  ingredientReason: { fontSize: 12, color: "#a1a1aa", marginTop: 2 },
  ingredientConcerns: { fontSize: 11, color: "#ff0066", marginTop: 4 },
  classificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  classificationText: { fontSize: 10, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#17171d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  bestPrice: {
    borderColor: "#00ffb240",
    backgroundColor: "#00ffb208",
  },
  retailerName: { fontSize: 14, fontWeight: "500", color: "#ffffff" },
  priceInfo: { alignItems: "flex-end" },
  priceAmount: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  unitPrice: { fontSize: 11, color: "#71717a", marginTop: 2 },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nutritionItem: {
    width: "31%",
    backgroundColor: "#17171d",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  nutritionValue: { fontSize: 20, fontWeight: "700", color: "#00ffb2" },
  nutritionLabel: { fontSize: 11, color: "#a1a1aa", marginTop: 4 },
  reasoningCard: {
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
    marginBottom: 10,
  },
  reasoningText: { fontSize: 13, color: "#a1a1aa", lineHeight: 20 },
  recommendationCard: {
    backgroundColor: "#00ffb208",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#00ffb230",
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00ffb2",
    marginBottom: 6,
  },
  recommendationText: { fontSize: 13, color: "#ffffff", lineHeight: 20 },
  scanAgainButton: {
    marginHorizontal: 24,
    backgroundColor: "#17171d",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(95, 95, 113, 0.22)",
  },
  scanAgainText: { color: "#00ffb2", fontSize: 16, fontWeight: "600" },
});
