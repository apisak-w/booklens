# =============================================================================
# Identity Provider
# =============================================================================

resource "cloudflare_zero_trust_access_identity_provider" "otp" {
  account_id = var.account_id
  name       = ""
  type       = "onetimepin"
  config     = {}
}

# =============================================================================
# Access Applications
# =============================================================================

resource "cloudflare_zero_trust_access_application" "booklens" {
  account_id       = var.account_id
  name             = "Booklens"
  type             = "self_hosted"
  domain           = "${var.pages_domain}/*"
  session_duration = "24h"

  destinations = [{
    type = "public"
    uri  = "${var.pages_domain}/*"
  }]

  allowed_idps = [
    cloudflare_zero_trust_access_identity_provider.otp.id,
  ]

  app_launcher_visible      = true
  auto_redirect_to_identity = false
  enable_binding_cookie     = false
  http_only_cookie_attribute = false
  options_preflight_bypass  = false

  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.booklens_external.id
      precedence = 1
    },
    {
      id         = cloudflare_zero_trust_access_policy.booklens_internal.id
      precedence = 2
    },
  ]

  tags = ["booklens-fe", "booklens"]
}

resource "cloudflare_zero_trust_access_application" "warp_login" {
  account_id           = var.account_id
  name                 = "Warp Login App"
  type                 = "warp"
  session_duration     = "24h"
  allowed_idps         = []
  auto_redirect_to_identity = false

  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.warp_allow_1.id
      precedence = 1
    },
    {
      id         = cloudflare_zero_trust_access_policy.warp_allow_2.id
      precedence = 2
    },
    {
      id         = cloudflare_zero_trust_access_policy.warp_allow_3.id
      precedence = 3
    },
  ]
}

# =============================================================================
# Access Policies
# =============================================================================

resource "cloudflare_zero_trust_access_policy" "booklens_external" {
  account_id       = var.account_id
  name             = "Booklens Access - External Users"
  decision         = "allow"
  session_duration = "0s"

  include = [{
    email = {
      email = var.allowed_email
    }
  }]

  connection_rules = {
    rdp = {}
  }
}

resource "cloudflare_zero_trust_access_policy" "booklens_internal" {
  account_id       = var.account_id
  name             = "Booklens Access - Internal Users"
  decision         = "non_identity"
  session_duration = "24h"

  include = [{
    device_posture = {
      integration_uid = cloudflare_zero_trust_device_posture_rule.gateway.id
    }
  }]

  connection_rules = {
    rdp = {}
  }
}

resource "cloudflare_zero_trust_access_policy" "warp_allow_1" {
  account_id       = var.account_id
  name             = "Allow emails"
  decision         = "allow"
  session_duration = "24h"

  include = [{
    email = {
      email = var.allowed_email
    }
  }]
}

resource "cloudflare_zero_trust_access_policy" "warp_allow_2" {
  account_id       = var.account_id
  name             = "Allow emails: 22/03/2026"
  decision         = "allow"
  session_duration = "24h"

  include = [{
    email = {
      email = var.allowed_email
    }
  }]
}

resource "cloudflare_zero_trust_access_policy" "warp_allow_3" {
  account_id       = var.account_id
  name             = "Allow emails: 22/03/2026"
  decision         = "allow"
  session_duration = "24h"

  include = [{
    email = {
      email = var.allowed_email
    }
  }]
}

# =============================================================================
# Device Posture Rules
# =============================================================================

resource "cloudflare_zero_trust_device_posture_rule" "gateway" {
  account_id  = var.account_id
  name        = "Gateway"
  type        = "gateway"
  description = ""
}

resource "cloudflare_zero_trust_device_posture_rule" "warp" {
  account_id  = var.account_id
  name        = "Warp"
  type        = "warp"
  description = ""
}

# =============================================================================
# Device Profiles
# =============================================================================

locals {
  default_fallback_domains = [
    { suffix = "home.arpa" },
    { suffix = "intranet" },
    { suffix = "internal" },
    { suffix = "private" },
    { suffix = "localdomain" },
    { suffix = "domain" },
    { suffix = "lan" },
    { suffix = "home" },
    { suffix = "host" },
    { suffix = "corp" },
    { suffix = "local" },
    { suffix = "localhost" },
    { suffix = "invalid" },
    { suffix = "test" },
  ]

  default_split_tunnel_exclude = [
    { address = "10.0.0.0/8" },
    { address = "100.64.0.0/10" },
    { address = "169.254.0.0/16", description = "DHCP Unspecified" },
    { address = "172.16.0.0/12" },
    { address = "192.0.0.0/24" },
    { address = "192.168.0.0/16" },
    { address = "224.0.0.0/24" },
    { address = "240.0.0.0/4" },
    { address = "255.255.255.255/32", description = "DHCP Broadcast" },
    { address = "fe80::/10", description = "IPv6 Link Local" },
    { address = "fd00::/8" },
    { address = "ff01::/16" },
    { address = "ff02::/16" },
    { address = "ff03::/16" },
    { address = "ff04::/16" },
    { address = "ff05::/16" },
  ]

  warp_include = [
    { address = "100.64.0.0/10", description = "Virtual IP space for WARP-to-WARP communication" },
  ]
}

# Profile 1: Exclude-based (precedence 1000)
resource "cloudflare_zero_trust_device_custom_profile" "onboarding_exclude" {
  account_id  = var.account_id
  name        = "Onboarding Device profile: 22/03/2026"
  description = "Auto-generated device profile created by warp onboarding"
  enabled     = true
  precedence  = 1000
  match       = "identity.email in {\"${var.allowed_email}\"}"

  allow_mode_switch     = false
  allow_updates         = false
  allowed_to_leave      = true
  auto_connect          = 0
  captive_portal        = 180
  disable_auto_fallback = false
  switch_locked         = false
  support_url           = ""
  tunnel_protocol       = ""

  service_mode_v2 = {
    mode = "warp"
  }

  exclude            = local.default_split_tunnel_exclude
  exclude_office_ips = false

  register_interface_ip_with_dns = true
}

resource "cloudflare_zero_trust_device_custom_profile_local_domain_fallback" "onboarding_exclude_fallback" {
  account_id = var.account_id
  policy_id  = cloudflare_zero_trust_device_custom_profile.onboarding_exclude.id
  domains    = local.default_fallback_domains
}

# Profile 2: Include-based (precedence 2000)
resource "cloudflare_zero_trust_device_custom_profile" "onboarding_include_2000" {
  account_id  = var.account_id
  name        = "Onboarding Device profile: 22/03/2026"
  description = "Auto-generated device profile created by warp onboarding"
  enabled     = true
  precedence  = 2000
  match       = "identity.email in {\"${var.allowed_email}\"}"

  allow_mode_switch     = false
  allow_updates         = false
  allowed_to_leave      = true
  auto_connect          = 0
  captive_portal        = 180
  disable_auto_fallback = false
  switch_locked         = false
  support_url           = ""
  tunnel_protocol       = ""

  service_mode_v2 = {
    mode = "warp"
  }

  include            = local.warp_include
  exclude_office_ips = false

  register_interface_ip_with_dns = true
}

resource "cloudflare_zero_trust_device_custom_profile_local_domain_fallback" "onboarding_include_2000_fallback" {
  account_id = var.account_id
  policy_id  = cloudflare_zero_trust_device_custom_profile.onboarding_include_2000.id
  domains    = local.default_fallback_domains
}

# Profile 3: Include-based (precedence 3000)
resource "cloudflare_zero_trust_device_custom_profile" "onboarding_include_3000" {
  account_id  = var.account_id
  name        = "Onboarding Device profile: 22/03/2026"
  description = "Auto-generated device profile created by warp onboarding"
  enabled     = true
  precedence  = 3000
  match       = "identity.email in {\"${var.allowed_email}\"}"

  allow_mode_switch     = false
  allow_updates         = false
  allowed_to_leave      = true
  auto_connect          = 0
  captive_portal        = 180
  disable_auto_fallback = false
  switch_locked         = false
  support_url           = ""
  tunnel_protocol       = ""

  service_mode_v2 = {
    mode = "warp"
  }

  include            = local.warp_include
  exclude_office_ips = false

  register_interface_ip_with_dns = true
}

resource "cloudflare_zero_trust_device_custom_profile_local_domain_fallback" "onboarding_include_3000_fallback" {
  account_id = var.account_id
  policy_id  = cloudflare_zero_trust_device_custom_profile.onboarding_include_3000.id
  domains    = local.default_fallback_domains
}
