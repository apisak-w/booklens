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

variable "allowed_email" {
  description = "Email address allowed in Access policies and device profiles"
  type        = string
  sensitive   = true
}

variable "pages_domain" {
  description = "Cloudflare Pages domain for the frontend (e.g. example.pages.dev)"
  type        = string
  sensitive   = true
}
