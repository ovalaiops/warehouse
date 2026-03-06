FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api main.go

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
COPY --from=builder /api /api
COPY migrations /migrations
EXPOSE 8080
ENTRYPOINT ["/api"]
