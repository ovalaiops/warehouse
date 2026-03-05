package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID          string          `json:"id"`
	FirebaseUID string          `json:"firebase_uid"`
	Email       string          `json:"email"`
	Name        string          `json:"name"`
	Role        string          `json:"role"`
	OrgID       *string         `json:"org_id,omitempty"`
	Preferences json.RawMessage `json:"preferences"`
	CreatedAt   time.Time       `json:"created_at"`
}

func GetUserByFirebaseUID(ctx context.Context, pool *pgxpool.Pool, uid string) (*User, error) {
	var u User
	err := pool.QueryRow(ctx,
		`SELECT id, firebase_uid, email, name, role, org_id, preferences, created_at
		 FROM users WHERE firebase_uid = $1`, uid).
		Scan(&u.ID, &u.FirebaseUID, &u.Email, &u.Name, &u.Role, &u.OrgID, &u.Preferences, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by firebase uid: %w", err)
	}
	return &u, nil
}

func GetUserByID(ctx context.Context, pool *pgxpool.Pool, id string) (*User, error) {
	var u User
	err := pool.QueryRow(ctx,
		`SELECT id, firebase_uid, email, name, role, org_id, preferences, created_at
		 FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.FirebaseUID, &u.Email, &u.Name, &u.Role, &u.OrgID, &u.Preferences, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

func CreateUser(ctx context.Context, pool *pgxpool.Pool, u *User) error {
	if u.Preferences == nil {
		u.Preferences = json.RawMessage(`{}`)
	}
	return pool.QueryRow(ctx,
		`INSERT INTO users (firebase_uid, email, name, role, org_id, preferences)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		u.FirebaseUID, u.Email, u.Name, u.Role, u.OrgID, u.Preferences).
		Scan(&u.ID, &u.CreatedAt)
}

func UpdateUser(ctx context.Context, pool *pgxpool.Pool, u *User) error {
	_, err := pool.Exec(ctx,
		`UPDATE users SET name = $1, role = $2, org_id = $3, preferences = $4 WHERE id = $5`,
		u.Name, u.Role, u.OrgID, u.Preferences, u.ID)
	return err
}
