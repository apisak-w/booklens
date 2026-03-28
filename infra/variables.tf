variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers and Pages permissions"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "google_books_api_key" {
  description = "Google Books API key (stored as a Worker secret)"
  type        = string
  sensitive   = true
}
