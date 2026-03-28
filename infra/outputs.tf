output "worker_script_name" {
  description = "Deployed Worker script name"
  value       = cloudflare_workers_script.booklens_worker.script_name
}

output "pages_project_name" {
  description = "Pages project name"
  value       = cloudflare_pages_project.booklens_frontend.name
}
