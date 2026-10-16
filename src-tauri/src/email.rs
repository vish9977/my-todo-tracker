//! Email reminders, sent through the user's own mail account (e.g. Gmail with an
//! app password). The password lives in the operating system's credential store
//! (Windows Credential Manager), never in the app's database.

use std::sync::Mutex;
use std::time::Duration;

use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use serde::Deserialize;

const KEYRING_SERVICE: &str = "MyTodoTracker";
const KEYRING_USER: &str = "smtp-password";
/// Failed sends are retried (e.g. while offline) for this long.
const GIVE_UP_AFTER_MS: i64 = 6 * 60 * 60 * 1000;
const RETRY_EVERY_MS: i64 = 2 * 60 * 1000;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailConfig {
    pub to: String,
    pub smtp_host: String,
    pub smtp_port: u16,
    pub username: String,
}

pub struct OutgoingEmail {
    /// Recipient; None means the user's own address.
    pub to: Option<String>,
    pub subject: String,
    pub body: String,
    pub due_ms: i64,
    pub next_try_ms: i64,
}

#[derive(Default)]
pub struct Outbox {
    pub queue: Mutex<Vec<OutgoingEmail>>,
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_email_password(password: String) -> Result<(), String> {
    let entry = entry()?;
    if password.is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        entry.set_password(&password).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn has_email_password() -> bool {
    entry().and_then(|e| e.get_password().map_err(|e| e.to_string())).is_ok()
}

#[tauri::command]
pub async fn send_test_email(config: EmailConfig) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        send(
            &config,
            &config.to,
            "MyTodoTracker test email",
            "Email reminders are working. You'll get task reminders at this address.",
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Sends one email now, e.g. a task assigned to someone else.
#[tauri::command]
pub async fn send_email(config: EmailConfig, to: String, subject: String, body: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || send(&config, &to, &subject, &body))
        .await
        .map_err(|e| e.to_string())?
}

pub fn send(config: &EmailConfig, to: &str, subject: &str, body: &str) -> Result<(), String> {
    let password = entry()?
        .get_password()
        .map_err(|_| "No email password saved. Add your app password in Settings.".to_string())?;
    let from = format!("MyTodoTracker <{}>", config.username)
        .parse()
        .map_err(|e| format!("Invalid sender address: {e}"))?;
    let to = to.parse().map_err(|e| format!("Invalid email address {to}: {e}"))?;
    let message = Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(body.to_string())
        .map_err(|e| e.to_string())?;

    // Port 465 uses TLS from the start; 587 and others upgrade with STARTTLS.
    let builder = if config.smtp_port == 465 {
        SmtpTransport::relay(&config.smtp_host)
    } else {
        SmtpTransport::starttls_relay(&config.smtp_host)
    }
    .map_err(|e| e.to_string())?;
    let mailer = builder
        .port(config.smtp_port)
        .credentials(Credentials::new(config.username.clone(), password))
        .timeout(Some(Duration::from_secs(20)))
        .build();
    mailer.send(&message).map(|_| ()).map_err(|e| friendly_error(&e.to_string()))
}

fn friendly_error(raw: &str) -> String {
    if raw.contains("535") || raw.to_lowercase().contains("credentials") {
        "The mail server rejected the login. For Gmail, use an App Password, not your normal password.".into()
    } else {
        raw.to_string()
    }
}

/// Sends what is due; keeps failed emails for a later retry until they're too old.
pub fn flush(outbox: &Outbox, config: Option<&EmailConfig>, now: i64) {
    let ready: Vec<OutgoingEmail> = {
        let mut queue = outbox.queue.lock().unwrap();
        queue.retain(|m| now - m.due_ms <= GIVE_UP_AFTER_MS);
        let (ready, waiting): (Vec<_>, Vec<_>) = queue.drain(..).partition(|m| m.next_try_ms <= now);
        *queue = waiting;
        ready
    };
    let Some(config) = config else { return };
    for mut mail in ready {
        let to = mail.to.as_deref().unwrap_or(&config.to);
        if send(config, to, &mail.subject, &mail.body).is_err() {
            mail.next_try_ms = now + RETRY_EVERY_MS;
            outbox.queue.lock().unwrap().push(mail);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drops_emails_that_are_too_old_and_keeps_waiting_ones() {
        let outbox = Outbox::default();
        {
            let mut q = outbox.queue.lock().unwrap();
            q.push(OutgoingEmail { to: None, subject: "old".into(), body: String::new(), due_ms: 0, next_try_ms: 0 });
            q.push(OutgoingEmail {
                to: None,
                subject: "later".into(),
                body: String::new(),
                due_ms: GIVE_UP_AFTER_MS,
                next_try_ms: GIVE_UP_AFTER_MS + 10_000,
            });
        }
        // No config: nothing is sent, ready mail is dropped from the queue, waiting mail stays.
        flush(&outbox, None, GIVE_UP_AFTER_MS + 1);
        let q = outbox.queue.lock().unwrap();
        assert_eq!(q.len(), 1);
        assert_eq!(q[0].subject, "later");
    }
}
