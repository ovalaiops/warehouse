export interface Product {
  id: string;
  upc?: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  ingredients?: IngredientAnalysis[];
  nutrition?: NutritionInfo;
  allergens?: string[];
  certifications?: string[];
}

export interface IngredientAnalysis {
  name: string;
  classification: "safe" | "caution" | "red_flag";
  reason: string;
  commonConcerns: string[];
}

export interface NutritionInfo {
  servingSize: string;
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
  transFatG: number;
  cholesterolMg: number;
  sodiumMg: number;
  totalCarbG: number;
  dietaryFiberG: number;
  sugarsG: number;
  proteinG: number;
}

export interface ProductPrice {
  id: string;
  retailer: string;
  price: number;
  currency: string;
  unitPrice?: number;
  unit?: string;
}

export interface ProductScanResult {
  product: Product;
  prices: ProductPrice[];
  confidence: number;
  reasoning: string;
  overallScore: string;
  recommendation: string;
}

export interface ShoppingListItem {
  productId: string;
  productName: string;
  quantity: number;
  checked: boolean;
  estimatedPrice?: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ScanHistoryItem {
  id: string;
  productName: string;
  brand?: string;
  imageUrl?: string;
  confidence: number;
  scannedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  dietaryPreferences: string[];
  allergens: string[];
}
