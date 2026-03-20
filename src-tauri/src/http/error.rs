use thiserror::Error;

#[derive(Error, Debug)]
pub enum HttpError {
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    
    #[error("Timeout after {0} seconds")]
    Timeout(u64),
    
    #[error("Connection refused")]
    ConnectionRefused,
    
    #[error("SSL error: {0}")]
    SslError(String),
}
