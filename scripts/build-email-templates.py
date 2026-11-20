#!/usr/bin/env python3
"""Regenerates the branded Supabase auth email templates in supabase/templates/.

    python3 scripts/build-email-templates.py supabase/templates

Edit the copy in TEMPLATES below, run this, then paste each file into
Supabase -> Authentication -> Emails -> Templates.
"""
import os, sys
OUT = sys.argv[1]

BASE = """<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Michroma&family=Montserrat:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  body {{ margin:0; padding:0; background:#070A14; }}
  a {{ color:#7EE0B2; }}
  @media (max-width:600px) {{
    .card {{ padding:28px 22px !important; }}
    .h1 {{ font-size:24px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#070A14;">
<!-- Preview text shown in the inbox list -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070A14;">{preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070A14;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <!-- Logo -->
        <tr>
          <td style="padding:0 4px 28px;">
            <a href="{{{{ .SiteURL }}}}" style="text-decoration:none;">
              <img src="{{{{ .SiteURL }}}}/email/crew-orchard-logo.png" width="220" height="32" alt="Crew Orchard" style="display:block;border:0;outline:none;width:220px;height:auto;color:#EEF1F8;font-family:Arial,sans-serif;font-size:16px;letter-spacing:2px;">
            </a>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td class="card" style="background:#0D1222;border:2px solid #26304A;border-radius:20px;padding:40px 36px;">
            <p style="margin:0 0 14px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#7EE0B2;">{eyebrow}</p>
            <h1 class="h1" style="margin:0 0 18px;font-family:'Michroma',Arial,Helvetica,sans-serif;font-size:28px;font-weight:400;line-height:1.2;letter-spacing:0.5px;text-transform:uppercase;color:#EEF1F8;">{heading}</h1>
{body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:28px 4px 0;">
            <p style="margin:0 0 8px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#98A1B8;">Crew Orchard is a product of <a href="https://astraretrieval.com" style="color:#EEF1F8;text-decoration:none;">Astra Retrieval</a></p>
            <p style="margin:0;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B7490;">You're receiving this because of activity on your Crew Orchard account at <a href="{{{{ .SiteURL }}}}" style="color:#98A1B8;">{{{{ .SiteURL }}}}</a>.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""

P = "margin:0 0 16px;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#C9CFDC;"
SMALL = "margin:0;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#98A1B8;"
GREET = '{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hi there,{{ end }}'

def para(text): return f'            <p style="{P}">{text}</p>\n'

def button(url, label):
    return f"""            <!-- Button (table-based so it renders in Outlook) -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 28px;">
              <tr>
                <td align="center" bgcolor="#7EE0B2" style="border-radius:999px;background:#7EE0B2;">
                  <a href="{url}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#070A14;text-decoration:none;border-radius:999px;">{label}</a>
                </td>
              </tr>
            </table>
"""

def fallback(url, note):
    return f"""            <div style="border-top:1px solid #26304A;padding-top:20px;">
              <p style="{SMALL}">{note}</p>
              <p style="margin:10px 0 0;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all;"><a href="{url}" style="color:#7EE0B2;">{url}</a></p>
            </div>
"""

def link(t, nxt): return "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=" + t + "&next=" + nxt

TEMPLATES = {
  "confirmation": dict(
    subject="Confirm your email for Crew Orchard",
    title="Confirm your email", preheader="One click to confirm your email and finish creating your Crew Orchard account.",
    eyebrow="Account &middot; Confirm email", heading="Welcome aboard",
    body=para(GREET) + para("Confirm that <strong style=\"color:#EEF1F8;\">{{ .Email }}</strong> is your email address to finish creating your Crew Orchard account.")
      + para("Your early-bird price of <strong style=\"color:#7EE0B2;\">$10 per seat, per month</strong> stays locked in, and nothing is charged until launch on January 1, 2027.")
      + button(link("email","/account"), "Confirm my email")
      + fallback(link("email","/account"), "This link can only be used once. If the button doesn&rsquo;t work, paste this address into your browser. Didn&rsquo;t sign up? You can safely ignore this email.")),
  "recovery": dict(
    subject="Reset your Crew Orchard password",
    title="Reset your password", preheader="Use this link to choose a new password for your Crew Orchard account.",
    eyebrow="Account &middot; Password reset", heading="Reset your password",
    body=para(GREET) + para("We received a request to reset the password for <strong style=\"color:#EEF1F8;\">{{ .Email }}</strong>. Click below to choose a new one.")
      + button(link("recovery","/reset-password"), "Choose a new password")
      + fallback(link("recovery","/reset-password"), "This link works once and expires soon. If you requested more than one reset, use the newest email. Didn&rsquo;t ask for this? Ignore this email and your password won&rsquo;t change.")),
  "magic_link": dict(
    subject="Your Crew Orchard sign-in link",
    title="Sign in to Crew Orchard", preheader="Your one-time link to sign in to Crew Orchard.",
    eyebrow="Account &middot; Sign in", heading="Your sign-in link",
    body=para(GREET) + para("Use the button below to sign in to Crew Orchard as <strong style=\"color:#EEF1F8;\">{{ .Email }}</strong>. No password needed.")
      + button(link("magiclink","/account"), "Sign in")
      + fallback(link("magiclink","/account"), "This link works once and expires soon. Didn&rsquo;t try to sign in? Ignore this email; nobody can sign in without it.")),
  "email_change": dict(
    subject="Confirm your new email for Crew Orchard",
    title="Confirm your new email", preheader="Confirm the change to the email address on your Crew Orchard account.",
    eyebrow="Account &middot; Email change", heading="Confirm your new email",
    body=para(GREET) + para("You asked to change the email on your Crew Orchard account from <strong style=\"color:#EEF1F8;\">{{ .Email }}</strong> to <strong style=\"color:#EEF1F8;\">{{ .NewEmail }}</strong>. Confirm the change below.")
      + button(link("email_change","/account"), "Confirm email change")
      + fallback(link("email_change","/account"), "This link works once and expires soon. Didn&rsquo;t ask for this? Ignore this email and your email address won&rsquo;t change.")),
  "invite": dict(
    subject="You're invited to Crew Orchard",
    title="You're invited to Crew Orchard", preheader="You've been invited to join a crew on Crew Orchard.",
    eyebrow="Account &middot; Invitation", heading="You&rsquo;re invited",
    body=para("Hi there,") + para("You&rsquo;ve been invited to join <strong style=\"color:#EEF1F8;\">Crew Orchard</strong>, the backend system for engineers, with the email <strong style=\"color:#EEF1F8;\">{{ .Email }}</strong>.")
      + para("Accept below, then choose a password to finish setting up your account.")
      + button(link("invite","/reset-password"), "Accept invitation")
      + fallback(link("invite","/reset-password"), "This link works once and expires soon. Not expecting an invitation? You can safely ignore this email.")),
  "reauthentication": dict(
    subject="Your Crew Orchard verification code",
    title="Your verification code", preheader="Your one-time Crew Orchard verification code.",
    eyebrow="Account &middot; Verify it&rsquo;s you", heading="Verification code",
    body=para(GREET) + para("Enter this code to confirm it&rsquo;s you:")
      + """            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
              <tr>
                <td style="border-top:2px solid #7EE0B2;padding:16px 0 0;">
                  <span style="font-family:Inter,'Helvetica Neue',Arial,sans-serif;font-size:40px;font-weight:700;letter-spacing:8px;color:#7EE0B2;">{{ .Token }}</span>
                </td>
              </tr>
            </table>
"""
      + f'            <p style="{SMALL}">This code expires soon. If you didn&rsquo;t request it, someone may be trying to change your account; ignore this email and consider changing your password.</p>\n'),
}

for name, t in TEMPLATES.items():
    html = BASE.format(**{k: v for k, v in t.items() if k != "subject"})
    html = html.replace("<head>", f"<head>\n<!-- Supabase: Authentication > Emails > Templates. Subject: {t['subject']} -->", 1)
    open(os.path.join(OUT, f"{name}.html"), "w").write(html)
    print(name, len(html))
