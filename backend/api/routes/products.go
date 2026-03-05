package routes

import (
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/models"
	"github.com/warehouse-intel/api/services"
)

type ProductHandler struct {
	deps *Deps
}

func NewProductHandler(deps *Deps) *ProductHandler {
	return &ProductHandler{deps: deps}
}

func (h *ProductHandler) Scan(w http.ResponseWriter, r *http.Request) {
	authUser := middleware.GetAuthUser(r.Context())
	if authUser == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, err := models.GetUserByFirebaseUID(r.Context(), h.deps.DB, authUser.UID)
	if err != nil || user == nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	imageData, err := io.ReadAll(file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	// Call inference
	inferReq := &services.InferenceRequest{
		ImageData: imageData,
		FileName:  header.Filename,
	}
	result, err := h.deps.Inference.InferProduct(r.Context(), inferReq)
	if err != nil {
		respondError(w, http.StatusBadGateway, "inference service error")
		return
	}

	// Save scan record
	scan := &models.ProductScan{
		UserID:       user.ID,
		RawInference: result.Data,
	}
	if result.Confidence > 0 {
		conf := result.Confidence
		scan.Confidence = &conf
	}

	if err := models.CreateProductScan(r.Context(), h.deps.DB, scan); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save scan")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"scan":      scan,
		"inference": result,
	})
}

func (h *ProductHandler) Get(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productID")
	product, err := models.GetProductByID(r.Context(), h.deps.DB, productID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get product")
		return
	}
	if product == nil {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}
	respondJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		respondError(w, http.StatusBadRequest, "query parameter 'q' is required")
		return
	}
	limit := queryInt(r, "limit", 20)
	offset := queryInt(r, "offset", 0)

	products, err := models.SearchProducts(r.Context(), h.deps.DB, q, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to search products")
		return
	}
	if products == nil {
		products = []models.Product{}
	}
	respondJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) BarcodeLookup(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	product, err := models.GetProductByUPC(r.Context(), h.deps.DB, code)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to lookup barcode")
		return
	}
	if product == nil {
		respondError(w, http.StatusNotFound, "product not found for barcode")
		return
	}
	respondJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) Prices(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productID")
	prices, err := models.GetProductPrices(r.Context(), h.deps.DB, productID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get prices")
		return
	}
	if prices == nil {
		prices = []models.ProductPrice{}
	}
	respondJSON(w, http.StatusOK, prices)
}

func (h *ProductHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	// Reviews are not in the schema, return empty for now
	respondJSON(w, http.StatusOK, []interface{}{})
}
