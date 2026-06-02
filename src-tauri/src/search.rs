use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchItem {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub category: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub item: SearchItem,
    pub score: i64,
}

#[tauri::command]
pub fn fuzzy_search(query: String, items: Vec<SearchItem>) -> Vec<SearchResult> {
    let matcher = SkimMatcherV2::default();
    let mut results: Vec<SearchResult> = items
        .into_iter()
        .filter_map(|item| {
            // Match against title and subtitle if present
            let search_text = format!("{} {}", item.title, item.subtitle.clone().unwrap_or_default());
            matcher.fuzzy_match(&search_text, &query).map(|score| SearchResult {
                item,
                score,
            })
        })
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.score.cmp(&a.score));

    // Return top 20 results
    results.into_iter().take(20).collect()
}
