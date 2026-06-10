use keyring::Entry;

pub fn store_secret(service: &str, key: &str, value: &str) -> Result<(), String> {
    let entry = Entry::new(service, key).map_err(|e| e.to_string())?;
    entry.set_password(value).map_err(|e| e.to_string())
}

pub fn retrieve_secret(service: &str, key: &str) -> Result<String, String> {
    let entry = Entry::new(service, key).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}
