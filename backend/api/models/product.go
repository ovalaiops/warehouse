package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Product struct {
	ID             string          `json:"id"`
	UPC            *string         `json:"upc,omitempty"`
	EAN            *string         `json:"ean,omitempty"`
	Name           string          `json:"name"`
	Brand          *string         `json:"brand,omitempty"`
	Category       *string         `json:"category,omitempty"`
	Description    *string         `json:"description,omitempty"`
	ImageURL       *string         `json:"image_url,omitempty"`
	Ingredients    json.RawMessage `json:"ingredients,omitempty"`
	Nutrition      json.RawMessage `json:"nutrition,omitempty"`
	Allergens      []string        `json:"allergens,omitempty"`
	Certifications []string        `json:"certifications,omitempty"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type ProductPrice struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	Retailer  string    `json:"retailer"`
	Price     float64   `json:"price"`
	Currency  string    `json:"currency"`
	UnitPrice *float64  `json:"unit_price,omitempty"`
	Unit      *string   `json:"unit,omitempty"`
	SourceURL *string   `json:"source_url,omitempty"`
	FetchedAt time.Time `json:"fetched_at"`
}

type ProductScan struct {
	ID           string          `json:"id"`
	UserID       string          `json:"user_id"`
	ProductID    *string         `json:"product_id,omitempty"`
	ScanImageURL *string         `json:"scan_image_url,omitempty"`
	RawInference json.RawMessage `json:"raw_inference,omitempty"`
	Confidence   *float64        `json:"confidence,omitempty"`
	ScannedAt    time.Time       `json:"scanned_at"`
}

type ShoppingList struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	Name      string          `json:"name"`
	Items     json.RawMessage `json:"items"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

func GetProductByID(ctx context.Context, pool *pgxpool.Pool, id string) (*Product, error) {
	var p Product
	err := pool.QueryRow(ctx,
		`SELECT id, upc, ean, name, brand, category, description, image_url,
		        ingredients, nutrition, allergens, certifications, metadata, created_at
		 FROM products WHERE id = $1`, id).
		Scan(&p.ID, &p.UPC, &p.EAN, &p.Name, &p.Brand, &p.Category, &p.Description, &p.ImageURL,
			&p.Ingredients, &p.Nutrition, &p.Allergens, &p.Certifications, &p.Metadata, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	return &p, nil
}

func GetProductByUPC(ctx context.Context, pool *pgxpool.Pool, upc string) (*Product, error) {
	var p Product
	err := pool.QueryRow(ctx,
		`SELECT id, upc, ean, name, brand, category, description, image_url,
		        ingredients, nutrition, allergens, certifications, metadata, created_at
		 FROM products WHERE upc = $1 OR ean = $1`, upc).
		Scan(&p.ID, &p.UPC, &p.EAN, &p.Name, &p.Brand, &p.Category, &p.Description, &p.ImageURL,
			&p.Ingredients, &p.Nutrition, &p.Allergens, &p.Certifications, &p.Metadata, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get product by upc: %w", err)
	}
	return &p, nil
}

func SearchProducts(ctx context.Context, pool *pgxpool.Pool, query string, limit, offset int) ([]Product, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := pool.Query(ctx,
		`SELECT id, upc, ean, name, brand, category, description, image_url,
		        ingredients, nutrition, allergens, certifications, metadata, created_at
		 FROM products
		 WHERE name ILIKE '%' || $1 || '%' OR brand ILIKE '%' || $1 || '%' OR category ILIKE '%' || $1 || '%'
		 ORDER BY name LIMIT $2 OFFSET $3`, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("search products: %w", err)
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.UPC, &p.EAN, &p.Name, &p.Brand, &p.Category, &p.Description, &p.ImageURL,
			&p.Ingredients, &p.Nutrition, &p.Allergens, &p.Certifications, &p.Metadata, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

func GetProductPrices(ctx context.Context, pool *pgxpool.Pool, productID string) ([]ProductPrice, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, product_id, retailer, price, currency, unit_price, unit, source_url, fetched_at
		 FROM product_prices WHERE product_id = $1 ORDER BY price`, productID)
	if err != nil {
		return nil, fmt.Errorf("get prices: %w", err)
	}
	defer rows.Close()

	var prices []ProductPrice
	for rows.Next() {
		var pp ProductPrice
		if err := rows.Scan(&pp.ID, &pp.ProductID, &pp.Retailer, &pp.Price, &pp.Currency,
			&pp.UnitPrice, &pp.Unit, &pp.SourceURL, &pp.FetchedAt); err != nil {
			return nil, fmt.Errorf("scan price: %w", err)
		}
		prices = append(prices, pp)
	}
	return prices, nil
}

func CreateProductScan(ctx context.Context, pool *pgxpool.Pool, s *ProductScan) error {
	return pool.QueryRow(ctx,
		`INSERT INTO product_scans (user_id, product_id, scan_image_url, raw_inference, confidence)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, scanned_at`,
		s.UserID, s.ProductID, s.ScanImageURL, s.RawInference, s.Confidence).
		Scan(&s.ID, &s.ScannedAt)
}

func ListProductScans(ctx context.Context, pool *pgxpool.Pool, userID string, limit, offset int) ([]ProductScan, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := pool.Query(ctx,
		`SELECT id, user_id, product_id, scan_image_url, raw_inference, confidence, scanned_at
		 FROM product_scans WHERE user_id = $1 ORDER BY scanned_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list scans: %w", err)
	}
	defer rows.Close()

	var scans []ProductScan
	for rows.Next() {
		var s ProductScan
		if err := rows.Scan(&s.ID, &s.UserID, &s.ProductID, &s.ScanImageURL, &s.RawInference, &s.Confidence, &s.ScannedAt); err != nil {
			return nil, fmt.Errorf("scan product scan: %w", err)
		}
		scans = append(scans, s)
	}
	return scans, nil
}

func GetProductScanByID(ctx context.Context, pool *pgxpool.Pool, id string) (*ProductScan, error) {
	var s ProductScan
	err := pool.QueryRow(ctx,
		`SELECT id, user_id, product_id, scan_image_url, raw_inference, confidence, scanned_at
		 FROM product_scans WHERE id = $1`, id).
		Scan(&s.ID, &s.UserID, &s.ProductID, &s.ScanImageURL, &s.RawInference, &s.Confidence, &s.ScannedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get scan: %w", err)
	}
	return &s, nil
}

// Shopping List CRUD

func ListShoppingLists(ctx context.Context, pool *pgxpool.Pool, userID string) ([]ShoppingList, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, user_id, name, items, created_at, updated_at
		 FROM shopping_lists WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list shopping lists: %w", err)
	}
	defer rows.Close()

	var lists []ShoppingList
	for rows.Next() {
		var l ShoppingList
		if err := rows.Scan(&l.ID, &l.UserID, &l.Name, &l.Items, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan shopping list: %w", err)
		}
		lists = append(lists, l)
	}
	return lists, nil
}

func GetShoppingListByID(ctx context.Context, pool *pgxpool.Pool, id string) (*ShoppingList, error) {
	var l ShoppingList
	err := pool.QueryRow(ctx,
		`SELECT id, user_id, name, items, created_at, updated_at
		 FROM shopping_lists WHERE id = $1`, id).
		Scan(&l.ID, &l.UserID, &l.Name, &l.Items, &l.CreatedAt, &l.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get shopping list: %w", err)
	}
	return &l, nil
}

func CreateShoppingList(ctx context.Context, pool *pgxpool.Pool, l *ShoppingList) error {
	if l.Items == nil {
		l.Items = json.RawMessage(`[]`)
	}
	return pool.QueryRow(ctx,
		`INSERT INTO shopping_lists (user_id, name, items) VALUES ($1, $2, $3)
		 RETURNING id, created_at, updated_at`,
		l.UserID, l.Name, l.Items).
		Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
}

func UpdateShoppingList(ctx context.Context, pool *pgxpool.Pool, l *ShoppingList) error {
	_, err := pool.Exec(ctx,
		`UPDATE shopping_lists SET name = $1, items = $2, updated_at = NOW() WHERE id = $3`,
		l.Name, l.Items, l.ID)
	return err
}

func DeleteShoppingList(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM shopping_lists WHERE id = $1`, id)
	return err
}
