# The Wine Corner — Backend Test Checklist

Run through this checklist after every deployment or significant code change.

---

## 1. Pre-Deployment

- [ ] **Container is built and pushed to GHCR**
  ```bash
  docker pull ghcr.io/fahmiefendy/be-the-wine-corner:latest
  ```
  **Expected:** Image pulls successfully

- [ ] **Environment variables are configured**
  ```bash
  cat apps/thewinecorner/be-the-wine-corner/.env
  ```
  **Expected:** All required variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_TOKEN_KEY`) are set

- [ ] **Container starts without errors**
  ```bash
  docker compose up -d twc-be
  docker logs twc-be --tail 20
  ```
  **Expected:** `Server is running on port 5001` and `Database initialization completed successfully!`

---

## 2. Health & Connectivity

- [ ] **Health check endpoint responds**
  ```bash
  curl -s http://api-wine.fahmiefendy.dev/health | jq .
  ```
  **Expected:** `{ "status": "UP", "database": "connected", "timestamp": "..." }`

- [ ] **Database connection is active**
  ```bash
  docker exec twc-be wget -q -O - http://localhost:5001/health
  ```
  **Expected:** Same as above, confirms internal connectivity

- [ ] **Container is on the proxy network**
  ```bash
  docker network inspect proxy --format '{{range .Containers}}{{.Name}} {{end}}' | grep twc-be
  ```
  **Expected:** `twc-be` appears in the list

---

## 3. Authentication

- [ ] **Register a new user**
  ```bash
  curl -s -X POST http://api-wine.fahmiefendy.dev/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "TestPass123!"}' | jq .
  ```
  **Expected:** 201 with user data (no password in response)

- [ ] **Login with valid credentials**
  ```bash
  curl -s -X POST http://api-wine.fahmiefendy.dev/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "TestPass123!"}' | jq .
  ```
  **Expected:** 200 with JWT token

- [ ] **Reject invalid credentials**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X POST http://api-wine.fahmiefendy.dev/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "wrongpassword"}'
  ```
  **Expected:** `401`

- [ ] **Reject duplicate registration**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X POST http://api-wine.fahmiefendy.dev/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "TestPass123!"}'
  ```
  **Expected:** `409` or `400`

---

## 4. Categories CRUD

- [ ] **Create a category** (requires JWT)
  ```bash
  curl -s -X POST http://api-wine.fahmiefendy.dev/categories \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"productPath": "red-wine", "productType": "Red Wine"}' | jq .
  ```
  **Expected:** 201 with created category data

- [ ] **List all categories**
  ```bash
  curl -s http://api-wine.fahmiefendy.dev/categories | jq .
  ```
  **Expected:** 200 with array of categories

- [ ] **Get category by ID**
  ```bash
  curl -s http://api-wine.fahmiefendy.dev/categories/<CATEGORY_ID> | jq .
  ```
  **Expected:** 200 with single category object

- [ ] **Update a category** (requires JWT)
  ```bash
  curl -s -X PUT http://api-wine.fahmiefendy.dev/categories/<CATEGORY_ID> \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"productType": "Red Wines"}' | jq .
  ```
  **Expected:** 200 with updated data

- [ ] **Delete a category** (requires JWT)
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    http://api-wine.fahmiefendy.dev/categories/<CATEGORY_ID> \
    -H "Authorization: Bearer <JWT_TOKEN>"
  ```
  **Expected:** `200`

---

## 5. Products CRUD

- [ ] **Create a product with image upload** (requires JWT)
  ```bash
  curl -s -X POST http://api-wine.fahmiefendy.dev/products \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -F "productName=Cabernet Sauvignon" \
    -F "productPrice=250000" \
    -F "productCategoryId=<CATEGORY_ID>" \
    -F "productImage=@/path/to/image.jpg" | jq .
  ```
  **Expected:** 201 with product data including image path

- [ ] **List all products**
  ```bash
  curl -s http://api-wine.fahmiefendy.dev/products | jq .
  ```
  **Expected:** 200 with array of products

- [ ] **Get product by ID**
  ```bash
  curl -s http://api-wine.fahmiefendy.dev/products/<PRODUCT_ID> | jq .
  ```
  **Expected:** 200 with single product including `view_count` incremented

- [ ] **Update a product** (requires JWT)
  ```bash
  curl -s -X PUT http://api-wine.fahmiefendy.dev/products/<PRODUCT_ID> \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"productPrice": 275000}' | jq .
  ```
  **Expected:** 200 with updated data

- [ ] **Delete a product** (requires JWT)
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    http://api-wine.fahmiefendy.dev/products/<PRODUCT_ID> \
    -H "Authorization: Bearer <JWT_TOKEN>"
  ```
  **Expected:** `200`

- [ ] **Product image is accessible**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://api-wine.fahmiefendy.dev/uploads/images/<image-filename>
  ```
  **Expected:** `200`

---

## 6. Error Handling & Validation

- [ ] **Unauthorized request is rejected**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X POST http://api-wine.fahmiefendy.dev/products \
    -H "Content-Type: application/json" \
    -d '{"productName": "Test"}'
  ```
  **Expected:** `401` or `403`

- [ ] **Invalid UUID returns 400 validation error**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://api-wine.fahmiefendy.dev/products/not-a-uuid
  ```
  **Expected:** `400`

- [ ] **Missing required product fields return validation error**
  ```bash
  curl -s -X POST http://api-wine.fahmiefendy.dev/products \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
  ```
  **Expected:** `400` with `errors` array

- [ ] **Missing required auth fields return validation error**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X POST http://api-wine.fahmiefendy.dev/auth/register \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
  **Expected:** `400`

- [ ] **Invalid click type is rejected**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    http://api-wine.fahmiefendy.dev/products/<PRODUCT_ID>/click/invalid-type
  ```
  **Expected:** `400`

- [ ] **Rate limit is enforced on auth endpoints** — Send 16+ requests rapidly
  ```bash
  for i in $(seq 1 16); do
    curl -s -o /dev/null -w "%{http_code} " -X POST http://api-wine.fahmiefendy.dev/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"x","password":"y"}';
  done
  ```
  **Expected:** Last response(s) return `429`

---

## 7. Image Optimization

- [ ] **Original image is served correctly**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://api-wine.fahmiefendy.dev/uploads/<image-filename>
  ```
  **Expected:** `200`

- [ ] **Resized image served with width parameter**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" "http://api-wine.fahmiefendy.dev/uploads/<image-filename>?w=300"
  ```
  **Expected:** `200` with image content smaller than original

- [ ] **Cache-Control header present on resized image**
  ```bash
  curl -s -I "http://api-wine.fahmiefendy.dev/uploads/<image-filename>?w=300" | grep -i cache-control
  ```
  **Expected:** `Cache-Control: public, max-age=31536000, immutable`

- [ ] **Oversized dimension request is capped**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" "http://api-wine.fahmiefendy.dev/uploads/<image-filename>?w=999999"
  ```
  **Expected:** `200` (capped to 2000px, no error)

---

## 7. Rollback

- [ ] **Previous image can be restored**
  ```bash
  # Pull a known good version
  docker compose pull twc-be
  docker compose up -d twc-be
  docker logs twc-be --tail 10
  ```
  **Expected:** Container starts with previous version, health check passes
