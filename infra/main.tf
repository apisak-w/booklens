# =============================================================================
# BookLens Worker
# =============================================================================

resource "cloudflare_workers_script" "booklens_worker" {
  account_id  = var.account_id
  script_name = "booklens-worker"

  content    = file("${path.module}/../worker/worker.js")
  main_module = "worker.js"

  compatibility_date = "2024-09-23"

  bindings = [
    # Workers AI binding
    {
      name = "AI"
      type = "ai"
    },
    # Google Books API key (secret)
    {
      name = "GOOGLE_BOOKS_API_KEY"
      type = "secret_text"
      text = var.google_books_api_key
    },
  ]

  observability = {
    enabled            = true
    head_sampling_rate = 1
    logs = {
      enabled         = true
      invocation_logs = true
    }
  }
}

# Enable workers.dev subdomain
resource "cloudflare_workers_script_subdomain" "booklens_worker_subdomain" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.booklens_worker.script_name
  enabled     = true
}

# =============================================================================
# BookLens Pages (frontend)
# =============================================================================

resource "cloudflare_pages_project" "booklens_frontend" {
  account_id        = var.account_id
  name              = "booklens"
  production_branch = "main"
}
