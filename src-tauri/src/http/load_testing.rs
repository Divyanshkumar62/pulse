use std::collections::{HashMap, VecDeque};
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use hdrhistogram::Histogram;
use reqwest::{Client, Method, Url};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex as AsyncMutex, Semaphore};
use uuid::Uuid;

pub const MAX_VUS: usize = 5000;
pub const MAX_DURATION_SECONDS: u64 = 3600;
pub const DEFAULT_MAX_INFLIGHT: usize = 2000;

const HEARTBEAT_INTERVAL_MS: u64 = 500;
const HEARTBEAT_WINDOW_BUCKETS: usize = 10;
const HISTOGRAM_MAX_LATENCY_MS: u64 = 600_000;
const MIN_CHANNEL_CAPACITY: usize = 10_000;
const MAX_CHANNEL_CAPACITY: usize = 250_000;
const SNAPSHOT_EVENT: &str = "load-test-snapshot";
const COMPLETE_EVENT: &str = "load-test-complete";
const LIFECYCLE_EVENT: &str = "load-test-lifecycle";

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum LoadMode {
    ConstantVU,
    ConstantRPS { target_rps: u32 },
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoadTestConfig {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub virtual_users: usize,
    pub duration_seconds: u64,
    pub ramp_up_seconds: u64,
    pub request_timeout_seconds: Option<u64>,
    pub max_inflight_requests: Option<usize>,
    pub think_time_ms: Option<u64>,
    pub load_mode: LoadMode,
}

#[derive(Serialize, Deserialize, Clone, Debug, Hash, PartialEq, Eq)]
#[serde(tag = "errorType", content = "statusCode", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCategory {
    Timeout,
    DnsFailure,
    ConnectionRefused,
    TlsError,
    HttpError(u16),
    Other,
}

#[derive(Debug, Clone)]
pub struct RequestResult {
    pub duration_ms: u64,
    pub response_bytes: u64,
    pub is_success: bool,
    pub status_code: Option<u16>,
    pub error: Option<ErrorCategory>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MetricSnapshot {
    pub total_requests: u64,
    pub completed_requests: u64,
    pub failed_requests: u64,
    pub active_requests: usize,
    pub rps: f64,
    pub bandwidth_bytes_per_sec: f64,
    pub total_bytes: u64,
    pub min_latency_ms: u64,
    pub max_latency_ms: u64,
    pub avg_latency_ms: u64,
    pub p50_latency_ms: u64,
    pub p90_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub p99_latency_ms: u64,
    pub active_vus: usize,
    pub is_running: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FinalSummary {
    pub run_id: String,
    pub config: LoadTestConfig,
    pub metrics: MetricSnapshot,
    pub status_codes: HashMap<u16, u64>,
    pub errors: HashMap<String, u64>,
    pub completed_at_timestamp: u64,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LoadTestLifecycleStage {
    Started,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoadTestLifecycleEvent {
    pub run_id: String,
    pub stage: LoadTestLifecycleStage,
    pub message: Option<String>,
    pub timestamp: u64,
}

#[derive(Clone, Default)]
pub struct LoadTestManager {
    inner: Arc<Mutex<Option<ActiveLoadTest>>>,
}

#[derive(Clone)]
struct ActiveLoadTest {
    run_id: String,
    cancel_flag: Arc<AtomicBool>,
}

impl LoadTestManager {
    fn start_run(&self, run_id: String, cancel_flag: Arc<AtomicBool>) -> Result<(), String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| "Load test manager lock poisoned".to_string())?;

        if let Some(active) = guard.as_ref() {
            return Err(format!("A load test is already running: {}", active.run_id));
        }

        *guard = Some(ActiveLoadTest { run_id, cancel_flag });
        Ok(())
    }

    fn stop_run(&self) -> Result<bool, String> {
        let guard = self
            .inner
            .lock()
            .map_err(|_| "Load test manager lock poisoned".to_string())?;

        if let Some(active) = guard.as_ref() {
            active.cancel_flag.store(true, Ordering::SeqCst);
            return Ok(true);
        }

        Ok(false)
    }

    fn finish_run(&self, run_id: &str) {
        if let Ok(mut guard) = self.inner.lock() {
            if guard.as_ref().map(|active| active.run_id.as_str()) == Some(run_id) {
                *guard = None;
            }
        }
    }
}

struct RunCleanupGuard {
    manager: LoadTestManager,
    run_id: String,
}

impl RunCleanupGuard {
    fn new(manager: LoadTestManager, run_id: String) -> Self {
        Self { manager, run_id }
    }
}

impl Drop for RunCleanupGuard {
    fn drop(&mut self) {
        self.manager.finish_run(&self.run_id);
    }
}

struct AggregatorState {
    histogram: Histogram<u64>,
    completed_requests: u64,
    failed_requests: u64,
    total_bytes: u64,
    status_codes: HashMap<u16, u64>,
    errors: HashMap<ErrorCategory, u64>,
    request_buckets: VecDeque<u64>,
    byte_buckets: VecDeque<u64>,
    current_bucket_requests: u64,
    current_bucket_bytes: u64,
}

impl AggregatorState {
    fn new() -> Result<Self, String> {
        let histogram = Histogram::new_with_bounds(1, HISTOGRAM_MAX_LATENCY_MS, 3)
            .map_err(|error| format!("Failed to initialize histogram: {error}"))?;

        Ok(Self {
            histogram,
            completed_requests: 0,
            failed_requests: 0,
            total_bytes: 0,
            status_codes: HashMap::new(),
            errors: HashMap::new(),
            request_buckets: VecDeque::with_capacity(HEARTBEAT_WINDOW_BUCKETS),
            byte_buckets: VecDeque::with_capacity(HEARTBEAT_WINDOW_BUCKETS),
            current_bucket_requests: 0,
            current_bucket_bytes: 0,
        })
    }

    fn record(&mut self, result: RequestResult) {
        let clamped_latency = result.duration_ms.clamp(1, HISTOGRAM_MAX_LATENCY_MS);
        let _ = self.histogram.record(clamped_latency);

        self.total_bytes = self.total_bytes.saturating_add(result.response_bytes);
        self.current_bucket_requests = self.current_bucket_requests.saturating_add(1);
        self.current_bucket_bytes = self.current_bucket_bytes.saturating_add(result.response_bytes);

        if let Some(status_code) = result.status_code {
            *self.status_codes.entry(status_code).or_insert(0) += 1;
        }

        if result.is_success {
            self.completed_requests = self.completed_requests.saturating_add(1);
        } else {
            self.failed_requests = self.failed_requests.saturating_add(1);

            if let Some(error) = result.error {
                *self.errors.entry(error).or_insert(0) += 1;
            }
        }
    }

    fn roll_window(&mut self) {
        if self.request_buckets.len() == HEARTBEAT_WINDOW_BUCKETS {
            self.request_buckets.pop_front();
        }
        if self.byte_buckets.len() == HEARTBEAT_WINDOW_BUCKETS {
            self.byte_buckets.pop_front();
        }

        self.request_buckets.push_back(self.current_bucket_requests);
        self.byte_buckets.push_back(self.current_bucket_bytes);
        self.current_bucket_requests = 0;
        self.current_bucket_bytes = 0;
    }

    fn snapshot(&self, active_requests: usize, active_vus: usize, is_running: bool) -> MetricSnapshot {
        let total_requests = self.completed_requests.saturating_add(self.failed_requests);
        let bucket_span_secs = (self.request_buckets.len() as f64) * (HEARTBEAT_INTERVAL_MS as f64 / 1000.0);
        let rps = if bucket_span_secs > 0.0 {
            self.request_buckets.iter().sum::<u64>() as f64 / bucket_span_secs
        } else {
            0.0
        };
        let bandwidth_bytes_per_sec = if bucket_span_secs > 0.0 {
            self.byte_buckets.iter().sum::<u64>() as f64 / bucket_span_secs
        } else {
            0.0
        };

        let (min_latency_ms, max_latency_ms, avg_latency_ms, p50_latency_ms, p90_latency_ms, p95_latency_ms, p99_latency_ms) =
            if total_requests > 0 {
                (
                    self.histogram.min().min(HISTOGRAM_MAX_LATENCY_MS),
                    self.histogram.max().min(HISTOGRAM_MAX_LATENCY_MS),
                    (self.histogram.mean().round() as u64).min(HISTOGRAM_MAX_LATENCY_MS),
                    self.histogram
                        .value_at_quantile(0.50)
                        .min(HISTOGRAM_MAX_LATENCY_MS),
                    self.histogram
                        .value_at_quantile(0.90)
                        .min(HISTOGRAM_MAX_LATENCY_MS),
                    self.histogram
                        .value_at_quantile(0.95)
                        .min(HISTOGRAM_MAX_LATENCY_MS),
                    self.histogram
                        .value_at_quantile(0.99)
                        .min(HISTOGRAM_MAX_LATENCY_MS),
                )
            } else {
                (0, 0, 0, 0, 0, 0, 0)
            };

        MetricSnapshot {
            total_requests,
            completed_requests: self.completed_requests,
            failed_requests: self.failed_requests,
            active_requests,
            rps,
            bandwidth_bytes_per_sec,
            total_bytes: self.total_bytes,
            min_latency_ms,
            max_latency_ms,
            avg_latency_ms,
            p50_latency_ms,
            p90_latency_ms,
            p95_latency_ms,
            p99_latency_ms,
            active_vus,
            is_running,
        }
    }
}

#[tauri::command]
pub async fn start_load_test(
    app: AppHandle,
    manager: State<'_, LoadTestManager>,
    config: LoadTestConfig,
) -> Result<String, String> {
    validate_config(&config)?;

    let run_id = build_run_id();
    let cancel_flag = Arc::new(AtomicBool::new(false));
    manager.start_run(run_id.clone(), cancel_flag.clone())?;
    emit_lifecycle_event(&app, &run_id, LoadTestLifecycleStage::Started, None);

    let manager_handle = manager.inner().clone();
    let app_handle = app.clone();
    let config_for_task = config.clone();
    let run_id_for_task = run_id.clone();

    tokio::spawn(async move {
        if let Err(error) = run_load_test(
            app_handle.clone(),
            manager_handle.clone(),
            config_for_task,
            run_id_for_task.clone(),
            cancel_flag,
        )
        .await
        {
            log::error!("Load test {run_id_for_task} failed: {error}");
            emit_lifecycle_event(
                &app_handle,
                &run_id_for_task,
                LoadTestLifecycleStage::Failed,
                Some(error),
            );
        }
    });

    Ok(run_id)
}

#[tauri::command]
pub fn stop_load_test(manager: State<'_, LoadTestManager>) -> Result<bool, String> {
    manager.stop_run()
}

async fn run_load_test(
    app: AppHandle,
    manager: LoadTestManager,
    config: LoadTestConfig,
    run_id: String,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let _cleanup_guard = RunCleanupGuard::new(manager.clone(), run_id.clone());
    let max_inflight = config
        .max_inflight_requests
        .unwrap_or(DEFAULT_MAX_INFLIGHT);

    let shared_client = Client::builder()
        .pool_max_idle_per_host(200)
        .tcp_keepalive(Some(Duration::from_secs(60)))
        .tcp_nodelay(true)
        .build()
        .map_err(|error| format!("Failed to create load test client: {error}"))?;

    let semaphore = Arc::new(Semaphore::new(max_inflight));
    let active_vus = Arc::new(AtomicUsize::new(0));
    let pacing_state = match config.load_mode {
        LoadMode::ConstantVU => None,
        LoadMode::ConstantRPS { target_rps } => Some(Arc::new(AsyncMutex::new(RpsPacer::new(target_rps)))),
    };

    let channel_capacity =
        (config.virtual_users.saturating_mul(20)).clamp(MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY);
    let (sender, receiver) = mpsc::channel(channel_capacity);
    let deadline = Instant::now() + Duration::from_secs(config.duration_seconds);
    emit_lifecycle_event(&app, &run_id, LoadTestLifecycleStage::Running, None);

    let aggregator_handle = tokio::spawn(run_aggregator(
        app.clone(),
        run_id.clone(),
        config.clone(),
        receiver,
        semaphore.clone(),
        active_vus.clone(),
        max_inflight,
    ));

    let mut worker_handles = Vec::with_capacity(config.virtual_users);
    let ramp_delay = compute_ramp_delay(&config);

    for _ in 0..config.virtual_users {
        if cancel_flag.load(Ordering::SeqCst) || Instant::now() >= deadline {
            break;
        }

        let worker_sender = sender.clone();
        let worker_client = shared_client.clone();
        let worker_config = config.clone();
        let worker_semaphore = semaphore.clone();
        let worker_cancel = cancel_flag.clone();
        let worker_active_vus = active_vus.clone();
        let worker_pacing = pacing_state.clone();

        worker_handles.push(tokio::spawn(async move {
            worker_active_vus.fetch_add(1, Ordering::SeqCst);

            let run_result = vu_worker(
                worker_client,
                worker_config,
                worker_sender,
                worker_semaphore,
                worker_cancel,
                deadline,
                worker_pacing,
            )
            .await;

            worker_active_vus.fetch_sub(1, Ordering::SeqCst);
            run_result
        }));

        if let Some(delay) = ramp_delay {
            if !sleep_with_cancel(delay, deadline, cancel_flag.clone()).await {
                break;
            }
        }
    }

    drop(sender);

    for handle in worker_handles {
        match handle.await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => log::warn!("Load test worker exited early: {error}"),
            Err(error) => log::warn!("Load test worker join failure: {error}"),
        }
    }

    let was_cancelled = cancel_flag.load(Ordering::SeqCst) && Instant::now() < deadline;

    match aggregator_handle.await {
        Ok(Ok(())) => {}
        Ok(Err(error)) => {
            return Err(error);
        }
        Err(error) => {
            return Err(format!("Aggregator join failure: {error}"));
        }
    }

    let final_stage = if was_cancelled {
        LoadTestLifecycleStage::Cancelled
    } else {
        LoadTestLifecycleStage::Completed
    };
    emit_lifecycle_event(&app, &run_id, final_stage, None);
    Ok(())
}

async fn vu_worker(
    client: Client,
    config: LoadTestConfig,
    sender: mpsc::Sender<RequestResult>,
    semaphore: Arc<Semaphore>,
    cancel_flag: Arc<AtomicBool>,
    deadline: Instant,
    pacing_state: Option<Arc<AsyncMutex<RpsPacer>>>,
) -> Result<(), String> {
    loop {
        if cancel_flag.load(Ordering::SeqCst) || Instant::now() >= deadline {
            break;
        }

        if let Some(pacer) = pacing_state.as_ref() {
            wait_for_rps_slot(pacer.clone(), deadline, cancel_flag.clone()).await;

            if cancel_flag.load(Ordering::SeqCst) || Instant::now() >= deadline {
                break;
            }
        }

        let permit = semaphore
            .acquire()
            .await
            .map_err(|_| "Load test semaphore closed unexpectedly".to_string())?;

        if cancel_flag.load(Ordering::SeqCst) {
            drop(permit);
            break;
        }

        let result = execute_request(&client, &config).await;
        drop(permit);

        if sender.send(result).await.is_err() {
            break;
        }

        if let Some(think_time_ms) = config.think_time_ms {
            if think_time_ms > 0 {
                tokio::time::sleep(Duration::from_millis(think_time_ms)).await;
            }
        }
    }

    Ok(())
}

async fn execute_request(client: &Client, config: &LoadTestConfig) -> RequestResult {
    let started_at = Instant::now();
    let method = Method::from_bytes(config.method.as_bytes()).unwrap_or(Method::GET);
    let mut request = client.request(method, config.url.clone());

    for (header_name, header_value) in &config.headers {
        request = request.header(header_name, header_value);
    }

    if let Some(body) = config.body.as_ref() {
        if !body.is_empty() {
            request = request.body(body.clone());
        }
    }

    let request_future = async move {
        let response = request.send().await?;
        let status_code = response.status().as_u16();
        let response_bytes = response.bytes().await?.len() as u64;
        Ok::<(u16, u64), reqwest::Error>((status_code, response_bytes))
    };

    let result = if let Some(timeout_seconds) = config.request_timeout_seconds {
        match tokio::time::timeout(Duration::from_secs(timeout_seconds), request_future).await {
            Ok(inner_result) => inner_result,
            Err(_) => {
                return RequestResult {
                    duration_ms: started_at.elapsed().as_millis() as u64,
                    response_bytes: 0,
                    is_success: false,
                    status_code: None,
                    error: Some(ErrorCategory::Timeout),
                };
            }
        }
    } else {
        request_future.await
    };

    let duration_ms = started_at.elapsed().as_millis() as u64;

    match result {
        Ok((status_code, response_bytes)) => {
            let is_success = (200..=299).contains(&status_code);
            RequestResult {
                duration_ms,
                response_bytes,
                is_success,
                status_code: Some(status_code),
                error: if is_success {
                    None
                } else {
                    Some(ErrorCategory::HttpError(status_code))
                },
            }
        }
        Err(error) => RequestResult {
            duration_ms,
            response_bytes: 0,
            is_success: false,
            status_code: None,
            error: Some(classify_reqwest_error(&error)),
        },
    }
}

async fn run_aggregator(
    app: AppHandle,
    run_id: String,
    config: LoadTestConfig,
    mut receiver: mpsc::Receiver<RequestResult>,
    semaphore: Arc<Semaphore>,
    active_vus: Arc<AtomicUsize>,
    max_inflight: usize,
) -> Result<(), String> {
    let mut aggregator = AggregatorState::new()?;
    let mut heartbeat = tokio::time::interval(Duration::from_millis(HEARTBEAT_INTERVAL_MS));
    heartbeat.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    loop {
        tokio::select! {
            maybe_result = receiver.recv() => {
                match maybe_result {
                    Some(result) => aggregator.record(result),
                    None => break,
                }
            }
            _ = heartbeat.tick() => {
                aggregator.roll_window();
                let snapshot = aggregator.snapshot(
                    max_inflight.saturating_sub(semaphore.available_permits()),
                    active_vus.load(Ordering::SeqCst),
                    true,
                );
                let _ = app.emit(SNAPSHOT_EVENT, snapshot);
            }
        }
    }

    aggregator.roll_window();
    let final_snapshot = aggregator.snapshot(0, active_vus.load(Ordering::SeqCst), false);
    let final_summary = FinalSummary {
        run_id,
        config,
        metrics: final_snapshot.clone(),
        status_codes: aggregator.status_codes,
        errors: serialize_error_counts(aggregator.errors),
        completed_at_timestamp: current_timestamp_ms(),
    };

    let _ = app.emit(SNAPSHOT_EVENT, final_snapshot);
    let _ = app.emit(COMPLETE_EVENT, final_summary);
    Ok(())
}

fn validate_config(config: &LoadTestConfig) -> Result<(), String> {
    if config.virtual_users == 0 || config.virtual_users > MAX_VUS {
        return Err(format!(
            "virtualUsers must be between 1 and {MAX_VUS}, received {}",
            config.virtual_users
        ));
    }

    if config.duration_seconds == 0 || config.duration_seconds > MAX_DURATION_SECONDS {
        return Err(format!(
            "durationSeconds must be between 1 and {MAX_DURATION_SECONDS}, received {}",
            config.duration_seconds
        ));
    }

    if config.ramp_up_seconds > config.duration_seconds {
        return Err("rampUpSeconds cannot exceed durationSeconds".to_string());
    }

    if config
        .max_inflight_requests
        .map(|value| value == 0)
        .unwrap_or(false)
    {
        return Err("maxInflightRequests must be greater than 0 when provided".to_string());
    }

    if config
        .request_timeout_seconds
        .map(|value| value == 0)
        .unwrap_or(false)
    {
        return Err("requestTimeoutSeconds must be greater than 0 when provided".to_string());
    }

    let _ = Url::parse(&config.url).map_err(|error| format!("Invalid load test URL: {error}"))?;
    let _ = Method::from_bytes(config.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method for load test: {error}"))?;

    if let LoadMode::ConstantRPS { target_rps } = config.load_mode {
        if target_rps == 0 {
            return Err("targetRps must be greater than 0 for ConstantRPS mode".to_string());
        }
    }

    Ok(())
}

fn build_run_id() -> String {
    let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H-%M-%SZ");
    format!("{timestamp}-run-{}", Uuid::new_v4())
}

fn emit_lifecycle_event(
    app: &AppHandle,
    run_id: &str,
    stage: LoadTestLifecycleStage,
    message: Option<String>,
) {
    let _ = app.emit(
        LIFECYCLE_EVENT,
        LoadTestLifecycleEvent {
            run_id: run_id.to_string(),
            stage,
            message,
            timestamp: current_timestamp_ms(),
        },
    );
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn compute_ramp_delay(config: &LoadTestConfig) -> Option<Duration> {
    if config.ramp_up_seconds == 0 || config.virtual_users <= 1 {
        return None;
    }

    let per_vu_delay_ms = (config.ramp_up_seconds * 1000) as f64 / config.virtual_users as f64;
    Some(Duration::from_millis(per_vu_delay_ms.max(1.0).round() as u64))
}

fn classify_reqwest_error(error: &reqwest::Error) -> ErrorCategory {
    if error.is_timeout() {
        return ErrorCategory::Timeout;
    }

    let message = error.to_string().to_lowercase();

    if message.contains("dns")
        || message.contains("resolve")
        || message.contains("name or service not known")
        || message.contains("no such host")
    {
        return ErrorCategory::DnsFailure;
    }

    if message.contains("connection refused") {
        return ErrorCategory::ConnectionRefused;
    }

    if message.contains("tls")
        || message.contains("ssl")
        || message.contains("certificate")
        || message.contains("handshake")
    {
        return ErrorCategory::TlsError;
    }

    ErrorCategory::Other
}

fn serialize_error_counts(errors: HashMap<ErrorCategory, u64>) -> HashMap<String, u64> {
    errors
        .into_iter()
        .map(|(category, count)| (error_category_key(&category), count))
        .collect()
}

fn error_category_key(category: &ErrorCategory) -> String {
    match category {
        ErrorCategory::Timeout => "TIMEOUT".to_string(),
        ErrorCategory::DnsFailure => "DNS_FAILURE".to_string(),
        ErrorCategory::ConnectionRefused => "CONNECTION_REFUSED".to_string(),
        ErrorCategory::TlsError => "TLS_ERROR".to_string(),
        ErrorCategory::HttpError(status_code) => format!("HTTP_ERROR_{status_code}"),
        ErrorCategory::Other => "OTHER".to_string(),
    }
}

struct RpsPacer {
    interval: Duration,
    next_slot: Instant,
}

impl RpsPacer {
    fn new(target_rps: u32) -> Self {
        let interval = Duration::from_secs_f64(1.0 / target_rps as f64);
        Self {
            interval,
            next_slot: Instant::now(),
        }
    }
}

async fn wait_for_rps_slot(
    pacer: Arc<AsyncMutex<RpsPacer>>,
    deadline: Instant,
    cancel_flag: Arc<AtomicBool>,
) {
    let sleep_for = {
        let mut pacing = pacer.lock().await;
        let now = Instant::now();
        let scheduled_at = pacing.next_slot.max(now);
        pacing.next_slot = scheduled_at + pacing.interval;
        scheduled_at.saturating_duration_since(now)
    };

    if sleep_for.is_zero() {
        return;
    }

    let sleep = tokio::time::sleep(sleep_for);
    tokio::pin!(sleep);

    loop {
        if cancel_flag.load(Ordering::SeqCst) || Instant::now() >= deadline {
            break;
        }

        tokio::select! {
            _ = &mut sleep => break,
            _ = tokio::time::sleep(Duration::from_millis(25)) => {}
        }
    }
}

async fn sleep_with_cancel(
    duration: Duration,
    deadline: Instant,
    cancel_flag: Arc<AtomicBool>,
) -> bool {
    if duration.is_zero() {
        return true;
    }

    let sleep = tokio::time::sleep(duration);
    tokio::pin!(sleep);

    loop {
        if cancel_flag.load(Ordering::SeqCst) || Instant::now() >= deadline {
            return false;
        }

        tokio::select! {
            _ = &mut sleep => return true,
            _ = tokio::time::sleep(Duration::from_millis(25)) => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_config() -> LoadTestConfig {
        LoadTestConfig {
            url: "https://example.com".to_string(),
            method: "GET".to_string(),
            headers: HashMap::new(),
            body: None,
            virtual_users: 10,
            duration_seconds: 30,
            ramp_up_seconds: 5,
            request_timeout_seconds: Some(10),
            max_inflight_requests: Some(25),
            think_time_ms: Some(50),
            load_mode: LoadMode::ConstantVU,
        }
    }

    #[test]
    fn rejects_virtual_user_limit_overflow() {
        let mut config = sample_config();
        config.virtual_users = MAX_VUS + 1;

        let error = validate_config(&config).unwrap_err();
        assert!(error.contains("virtualUsers"));
    }

    #[test]
    fn rejects_invalid_constant_rps_target() {
        let mut config = sample_config();
        config.load_mode = LoadMode::ConstantRPS { target_rps: 0 };

        let error = validate_config(&config).unwrap_err();
        assert!(error.contains("targetRps"));
    }

    #[test]
    fn metric_snapshot_uses_bounded_latency_and_excludes_detail_maps() {
        let mut aggregator = AggregatorState::new().unwrap();
        aggregator.record(RequestResult {
            duration_ms: HISTOGRAM_MAX_LATENCY_MS + 5_000,
            response_bytes: 2048,
            is_success: true,
            status_code: Some(200),
            error: None,
        });
        aggregator.record(RequestResult {
            duration_ms: 120,
            response_bytes: 128,
            is_success: false,
            status_code: Some(503),
            error: Some(ErrorCategory::HttpError(503)),
        });
        aggregator.roll_window();

        let snapshot = aggregator.snapshot(3, 7, true);
        assert_eq!(snapshot.total_requests, 2);
        assert_eq!(snapshot.completed_requests, 1);
        assert_eq!(snapshot.failed_requests, 1);
        assert_eq!(snapshot.active_requests, 3);
        assert_eq!(snapshot.active_vus, 7);
        assert!(snapshot.max_latency_ms <= HISTOGRAM_MAX_LATENCY_MS);
        assert_eq!(snapshot.total_bytes, 2176);
    }

    #[test]
    fn snapshot_json_excludes_status_and_error_maps() {
        let snapshot = MetricSnapshot {
            total_requests: 1,
            completed_requests: 1,
            failed_requests: 0,
            active_requests: 0,
            rps: 2.0,
            bandwidth_bytes_per_sec: 512.0,
            total_bytes: 256,
            min_latency_ms: 10,
            max_latency_ms: 10,
            avg_latency_ms: 10,
            p50_latency_ms: 10,
            p90_latency_ms: 10,
            p95_latency_ms: 10,
            p99_latency_ms: 10,
            active_vus: 1,
            is_running: true,
        };

        let json = serde_json::to_value(snapshot).unwrap();
        assert!(json.get("statusCodes").is_none());
        assert!(json.get("errors").is_none());
    }

    #[test]
    fn manager_blocks_parallel_runs_and_allows_cleanup_for_next_run() {
        let manager = LoadTestManager::default();
        let cancel_flag = Arc::new(AtomicBool::new(false));

        manager
            .start_run("run-1".to_string(), cancel_flag.clone())
            .unwrap();
        let error = manager
            .start_run("run-2".to_string(), Arc::new(AtomicBool::new(false)))
            .unwrap_err();

        assert!(error.contains("already running"));
        manager.finish_run("run-1");
        assert!(
            manager
                .start_run("run-2".to_string(), Arc::new(AtomicBool::new(false)))
                .is_ok()
        );
    }

    #[test]
    fn lifecycle_stage_serializes_as_expected() {
        let event = LoadTestLifecycleEvent {
            run_id: "run-1".to_string(),
            stage: LoadTestLifecycleStage::Cancelled,
            message: Some("Stopped by user".to_string()),
            timestamp: 42,
        };

        let json = serde_json::to_value(event).unwrap();
        assert_eq!(json.get("stage").unwrap(), "CANCELLED");
        assert_eq!(json.get("runId").unwrap(), "run-1");
    }

    #[test]
    fn final_summary_serializes_for_event_payloads() {
        let summary = FinalSummary {
            run_id: "run-1".to_string(),
            config: sample_config(),
            metrics: MetricSnapshot {
                total_requests: 1,
                completed_requests: 1,
                failed_requests: 0,
                active_requests: 0,
                rps: 1.0,
                bandwidth_bytes_per_sec: 64.0,
                total_bytes: 64,
                min_latency_ms: 10,
                max_latency_ms: 10,
                avg_latency_ms: 10,
                p50_latency_ms: 10,
                p90_latency_ms: 10,
                p95_latency_ms: 10,
                p99_latency_ms: 10,
                active_vus: 1,
                is_running: false,
            },
            status_codes: HashMap::from([(200, 1)]),
            errors: HashMap::from([("TIMEOUT".to_string(), 1)]),
            completed_at_timestamp: 1,
        };

        let json = serde_json::to_value(summary).unwrap();
        assert!(json.get("errors").is_some());
        assert!(json.get("statusCodes").is_some());
    }
}
