const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api/v1";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async uploadImage<T>(path: string, imageUri: string): Promise<T> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as unknown as Blob);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async scanProduct(imageUri: string) {
    return this.uploadImage<{
      product: import("../types").Product;
      prices: import("../types").ProductPrice[];
      confidence: number;
      reasoning: string;
    }>("/products/scan", imageUri);
  }

  async getProduct(id: string) {
    return this.get<import("../types").Product>(`/products/${id}`);
  }

  async getProductPrices(id: string) {
    return this.get<import("../types").ProductPrice[]>(
      `/products/${id}/prices`
    );
  }

  async searchProducts(query: string) {
    return this.get<import("../types").Product[]>(
      `/products/search?q=${encodeURIComponent(query)}`
    );
  }

  async lookupBarcode(code: string) {
    return this.get<import("../types").Product>(`/products/barcode/${code}`);
  }

  async getScanHistory() {
    return this.get<import("../types").ScanHistoryItem[]>("/scans");
  }
}

export const api = new ApiClient();
