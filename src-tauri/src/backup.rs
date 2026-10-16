//! Copies the database aside once per app version, before any upgrade touches it,
//! so an update can never cost the user their goals and tasks.

use std::fs;
use std::path::Path;

const KEEP: usize = 10;

pub fn backup_before_upgrade(config_dir: &Path, version: &str) -> std::io::Result<()> {
    let db = config_dir.join("tracker.db");
    if !db.exists() {
        return Ok(());
    }
    let dir = config_dir.join("backups");
    fs::create_dir_all(&dir)?;
    let target = dir.join(format!("tracker-before-v{version}.db"));
    if target.exists() {
        return Ok(());
    }
    fs::copy(&db, &target)?;

    // Keep only the newest few backups.
    let mut backups: Vec<_> = fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().starts_with("tracker-before-"))
        .collect();
    backups.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());
    let excess = backups.len().saturating_sub(KEEP);
    for old in backups.into_iter().take(excess) {
        let _ = fs::remove_file(old.path());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_once_per_version() {
        let dir = std::env::temp_dir().join(format!("mtt-backup-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("tracker.db"), b"v1 data").unwrap();
        backup_before_upgrade(&dir, "0.2.0").unwrap();
        fs::write(dir.join("tracker.db"), b"changed").unwrap();
        backup_before_upgrade(&dir, "0.2.0").unwrap();
        let saved = fs::read(dir.join("backups/tracker-before-v0.2.0.db")).unwrap();
        assert_eq!(saved, b"v1 data");
        fs::remove_dir_all(&dir).unwrap();
    }
}
