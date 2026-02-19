use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

mod geo;
mod search_preprocess;

#[derive(Debug, Deserialize)]
struct HitInput {
    id: String,
    score: f64,
    city: Option<String>,
    state: Option<String>,
    country: Option<String>,
    headline: Option<String>,
    title: Option<String>,
    company: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ScoreConfig {
    query_city: Option<String>,
    query_state: Option<String>,
    query_country: Option<String>,
    exact_boost: f64,
    fuzzy_boost: f64,
    skip_boosts: bool,
    penalty_cities: Vec<String>,
    penalty_terms: Vec<String>,
    strict_penalty: bool,
    limit: usize,
}

#[derive(Debug, Serialize)]
struct ScoredHit {
    id: String,
    score: f64,
}

fn lower_non_empty(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|v| v.to_lowercase())
        .filter(|v| !v.is_empty())
}

fn first_two_chars(value: &str) -> String {
    value.chars().take(2).collect()
}

fn to_js_error(prefix: &str, err: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&format!("{prefix}: {err}"))
}

#[wasm_bindgen]
pub fn score_hits(hits: JsValue, config: JsValue) -> Result<JsValue, JsValue> {
    let hits: Vec<HitInput> = serde_wasm_bindgen::from_value(hits)
        .map_err(|err| to_js_error("invalid hits payload", err))?;
    let config: ScoreConfig = serde_wasm_bindgen::from_value(config)
        .map_err(|err| to_js_error("invalid config payload", err))?;

    let penalty_cities: HashSet<String> = config
        .penalty_cities
        .iter()
        .map(|city| city.to_lowercase())
        .collect();
    let penalty_terms: HashSet<String> = config
        .penalty_terms
        .iter()
        .map(|term| term.to_lowercase())
        .collect();

    let compiled_penalty_terms: Vec<(String, Regex)> = penalty_terms
        .iter()
        .filter(|term| !term.is_empty())
        .filter_map(|term| {
            let pattern = format!("(^|\\b){}(\\b|$)", regex::escape(term));
            Regex::new(&pattern).ok().map(|regex| (term.clone(), regex))
        })
        .collect();

    let query_city = lower_non_empty(&config.query_city);
    let query_state = lower_non_empty(&config.query_state);
    let query_country = lower_non_empty(&config.query_country);

    let mut scored_hits = hits
        .into_iter()
        .map(|hit| {
            let mut location_boost = 0.0;

            let hit_city = hit.city.unwrap_or_default().to_lowercase();
            let hit_state = hit.state.unwrap_or_default().to_lowercase();
            let hit_country = hit.country.unwrap_or_default().to_lowercase();

            if !config.skip_boosts {
                if let Some(expected_state) = &query_state {
                    if hit_state == *expected_state {
                        location_boost += config.exact_boost;
                    }
                }

                if let Some(expected_city) = &query_city {
                    if hit_city == *expected_city {
                        location_boost += config.exact_boost;
                    }
                }

                if let Some(expected_country) = &query_country {
                    if hit_country == *expected_country {
                        location_boost += config.exact_boost;
                    }
                }

                if let Some(expected_state) = &query_state {
                    if !hit_state.is_empty() {
                        let query_prefix = first_two_chars(expected_state);
                        let hit_prefix = first_two_chars(&hit_state);

                        if hit_state.contains(&query_prefix) || expected_state.contains(&hit_prefix)
                        {
                            location_boost += config.fuzzy_boost;
                        }
                    }
                }
            }

            let mut penalty = if penalty_cities.contains(&hit_city) {
                0.2
            } else {
                0.0
            };

            let headline = hit.headline.unwrap_or_default().to_lowercase();
            let title = hit.title.unwrap_or_default().to_lowercase();
            let company = hit.company.unwrap_or_default().to_lowercase();
            let text_blob = format!("{headline} {title} {company}");

            for (term, exact_regex) in &compiled_penalty_terms {
                if exact_regex.is_match(&text_blob) {
                    penalty += if config.strict_penalty { 0.6 } else { 0.35 };
                } else if text_blob.contains(term) {
                    penalty += if config.strict_penalty { 0.35 } else { 0.2 };
                }
            }

            ScoredHit {
                id: hit.id,
                score: hit.score + location_boost - penalty,
            }
        })
        .collect::<Vec<_>>();

    scored_hits.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
    scored_hits.truncate(config.limit);

    serde_wasm_bindgen::to_value(&scored_hits)
        .map_err(|err| to_js_error("failed to serialize score output", err))
}
