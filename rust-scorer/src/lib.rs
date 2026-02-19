use js_sys::{Array, JsString, Reflect};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

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
extern "C" {
    #[wasm_bindgen(js_name = String)]
    fn js_string(value: &JsValue) -> JsString;
}

fn is_nullish(value: &JsValue) -> bool {
    value.is_null() || value.is_undefined()
}

fn js_to_string(value: &JsValue) -> String {
    js_string(value).as_string().unwrap_or_default()
}

fn normalize_terms(terms: &[String]) -> Vec<String> {
    terms
        .iter()
        .map(|term| term.to_lowercase())
        .map(|term| term.trim().to_string())
        .filter(|term| !term.is_empty())
        .collect()
}

fn contains_any_lc(text_lc: &str, terms: &[String]) -> bool {
    if text_lc.is_empty() || terms.is_empty() {
        return false;
    }
    terms
        .iter()
        .any(|term| !term.is_empty() && text_lc.contains(term))
}

fn is_js_truthy(value: &JsValue) -> bool {
    if is_nullish(value) {
        return false;
    }
    if let Some(b) = value.as_bool() {
        return b;
    }
    if let Some(n) = value.as_f64() {
        return n != 0.0 && !n.is_nan();
    }
    if let Some(s) = value.as_string() {
        return !s.is_empty();
    }
    // Objects, arrays, functions, symbols are all truthy in JS.
    true
}

fn slice_end_index(len: usize, end: f64) -> usize {
    if end.is_nan() {
        return 0;
    }
    if end.is_infinite() {
        return if end.is_sign_positive() { len } else { 0 };
    }

    let int = end.trunc() as i64;
    if int >= 0 {
        return std::cmp::min(int as usize, len);
    }

    let candidate = len as i64 + int;
    if candidate <= 0 {
        0
    } else if candidate >= len as i64 {
        len
    } else {
        candidate as usize
    }
}

fn reflect_get(obj: &JsValue, key: &str) -> Option<JsValue> {
    if is_nullish(obj) {
        return None;
    }
    if !obj.is_object() && !obj.is_function() {
        return None;
    }
    Reflect::get(obj, &JsValue::from_str(key)).ok()
}

fn metadata_value(metadata: &JsValue, key: &str) -> Option<String> {
    let value = reflect_get(metadata, key)?;
    if is_nullish(&value) {
        return None;
    }
    if let Some(s) = value.as_string() {
        return Some(s);
    }
    if Array::is_array(&value) {
        let arr: Array = value.dyn_into().ok()?;
        for i in 0..arr.length() {
            let entry = arr.get(i);
            if is_nullish(&entry) {
                continue;
            }
            return Some(js_to_string(&entry));
        }
        return None;
    }
    Some(js_to_string(&value))
}

fn extract_title_value(item: &JsValue) -> Option<String> {
    // Contacts store `title` directly; ES/vector matches store `metadata.title`.
    // Treat empty/whitespace-only strings as missing and fall back to `metadata.title`.
    let direct = metadata_value(item, "title").filter(|value| !value.trim().is_empty());
    if direct.is_some() {
        return direct;
    }

    let metadata = reflect_get(item, "metadata").unwrap_or(JsValue::UNDEFINED);
    metadata_value(&metadata, "title")
}

fn match_id_or_empty(match_obj: &JsValue) -> String {
    let value = reflect_get(match_obj, "id").unwrap_or(JsValue::UNDEFINED);
    if is_js_truthy(&value) {
        js_to_string(&value)
    } else {
        String::new()
    }
}

#[derive(Debug, Deserialize)]
struct PostTrainingProfile {
    active: bool,
    #[serde(rename = "excludeTerms", default)]
    exclude_terms: Vec<String>,
    #[serde(rename = "demoteTerms", default)]
    demote_terms: Vec<String>,
    #[serde(rename = "requirePositive", default)]
    require_positive: Option<bool>,
    #[serde(rename = "includeCompanyTerms", default)]
    include_company_terms: Vec<String>,
    #[serde(rename = "includeTitleTerms", default)]
    include_title_terms: Vec<String>,
    #[serde(rename = "includeWebsiteTerms", default)]
    include_website_terms: Vec<String>,
    #[serde(rename = "includeIndustryTerms", default)]
    include_industry_terms: Vec<String>,
    #[serde(rename = "auxCompanyTerms", default)]
    aux_company_terms: Vec<String>,
    #[serde(rename = "auxTitleTerms", default)]
    aux_title_terms: Vec<String>,
    #[serde(rename = "auxWebsiteTerms", default)]
    aux_website_terms: Vec<String>,
    #[serde(rename = "auxIndustryTerms", default)]
    aux_industry_terms: Vec<String>,
}

#[derive(Debug)]
struct PostTrainingTerms {
    exclude_terms: Vec<String>,
    demote_terms: Vec<String>,
    include_company_terms: Vec<String>,
    include_title_terms: Vec<String>,
    include_website_terms: Vec<String>,
    include_industry_terms: Vec<String>,
    include_company_or_title_terms: Vec<String>,
    aux_company_terms: Vec<String>,
    aux_title_terms: Vec<String>,
    aux_website_terms: Vec<String>,
    aux_industry_terms: Vec<String>,
    aux_company_or_title_terms: Vec<String>,
    require_positive: bool,
}

fn build_post_training_terms(profile: &PostTrainingProfile) -> PostTrainingTerms {
    let include_company_terms = normalize_terms(&profile.include_company_terms);
    let include_title_terms = normalize_terms(&profile.include_title_terms);
    let aux_company_terms = normalize_terms(&profile.aux_company_terms);
    let aux_title_terms = normalize_terms(&profile.aux_title_terms);

    let mut include_company_or_title_terms = Vec::with_capacity(
        include_company_terms.len().saturating_add(include_title_terms.len()),
    );
    include_company_or_title_terms.extend(include_company_terms.iter().cloned());
    include_company_or_title_terms.extend(include_title_terms.iter().cloned());

    let mut aux_company_or_title_terms =
        Vec::with_capacity(aux_company_terms.len().saturating_add(aux_title_terms.len()));
    aux_company_or_title_terms.extend(aux_company_terms.iter().cloned());
    aux_company_or_title_terms.extend(aux_title_terms.iter().cloned());

    PostTrainingTerms {
        exclude_terms: normalize_terms(&profile.exclude_terms),
        demote_terms: normalize_terms(&profile.demote_terms),
        include_company_terms,
        include_title_terms,
        include_website_terms: normalize_terms(&profile.include_website_terms),
        include_industry_terms: normalize_terms(&profile.include_industry_terms),
        include_company_or_title_terms,
        aux_company_terms,
        aux_title_terms,
        aux_website_terms: normalize_terms(&profile.aux_website_terms),
        aux_industry_terms: normalize_terms(&profile.aux_industry_terms),
        aux_company_or_title_terms,
        require_positive: profile.require_positive.unwrap_or(false),
    }
}

#[derive(Debug)]
struct ClassifiedMatch {
    js_match: JsValue,
    key: String,
    positive: bool,
    aux: bool,
    demoted_positive: bool,
}

fn push_classified_if_new(
    entry: &ClassifiedMatch,
    seen: &mut HashSet<String>,
    ordered: &mut Vec<JsValue>,
) {
    if entry.key.is_empty() {
        return;
    }
    if seen.contains(&entry.key) {
        return;
    }
    seen.insert(entry.key.clone());
    ordered.push(entry.js_match.clone());
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

#[wasm_bindgen]
pub fn apply_post_training_to_es_matches(
    matches: JsValue,
    profile: JsValue,
    final_limit: JsValue,
) -> Result<JsValue, JsValue> {
    let profile: PostTrainingProfile = serde_wasm_bindgen::from_value(profile)
        .map_err(|err| to_js_error("invalid profile payload", err))?;
    let final_limit: f64 = serde_wasm_bindgen::from_value(final_limit)
        .map_err(|err| to_js_error("invalid finalLimit payload", err))?;

    if !Array::is_array(&matches) {
        return Err(to_js_error("invalid matches payload", "expected array"));
    }
    let matches_array: Array = matches
        .clone()
        .dyn_into()
        .map_err(|_| to_js_error("invalid matches payload", "expected array"))?;

    if !profile.active || matches_array.length() == 0 {
        return Ok(matches);
    }

    let terms = build_post_training_terms(&profile);

    let mut strictly_allowed: Vec<JsValue> =
        Vec::with_capacity(matches_array.length() as usize);
    let mut classified: Vec<ClassifiedMatch> =
        Vec::with_capacity(matches_array.length() as usize);

    for i in 0..matches_array.length() {
        let js_match = matches_array.get(i);
        let metadata = reflect_get(&js_match, "metadata").unwrap_or(JsValue::UNDEFINED);

        let company_lc = metadata_value(&metadata, "company")
            .unwrap_or_default()
            .to_lowercase();
        let title_lc = metadata_value(&metadata, "title")
            .unwrap_or_default()
            .to_lowercase();
        let headline_lc = metadata_value(&metadata, "headline")
            .unwrap_or_default()
            .to_lowercase();

        let excluded = contains_any_lc(&company_lc, &terms.exclude_terms)
            || contains_any_lc(&title_lc, &terms.exclude_terms)
            || contains_any_lc(&headline_lc, &terms.exclude_terms);
        if excluded {
            continue;
        }

        if !terms.require_positive {
            strictly_allowed.push(js_match);
            continue;
        }

        let website_lc = metadata_value(&metadata, "website")
            .unwrap_or_default()
            .to_lowercase();
        let industry_lc = metadata_value(&metadata, "companyIndustry")
            .unwrap_or_default()
            .to_lowercase();
        let metadata_text_lc = metadata_value(&metadata, "metadata")
            .unwrap_or_default()
            .to_lowercase();

        let positive = contains_any_lc(&company_lc, &terms.include_company_terms)
            || contains_any_lc(&title_lc, &terms.include_title_terms)
            || contains_any_lc(&headline_lc, &terms.include_company_or_title_terms)
            || contains_any_lc(&website_lc, &terms.include_website_terms)
            || contains_any_lc(&industry_lc, &terms.include_industry_terms)
            || contains_any_lc(&metadata_text_lc, &terms.include_company_or_title_terms);

        let aux = !positive
            && (contains_any_lc(&company_lc, &terms.aux_company_terms)
                || contains_any_lc(&title_lc, &terms.aux_title_terms)
                || contains_any_lc(&headline_lc, &terms.aux_company_or_title_terms)
                || contains_any_lc(&website_lc, &terms.aux_website_terms)
                || contains_any_lc(&industry_lc, &terms.aux_industry_terms)
                || contains_any_lc(&metadata_text_lc, &terms.aux_company_or_title_terms));

        let demoted_positive = positive
            && (contains_any_lc(&company_lc, &terms.demote_terms)
                || contains_any_lc(&title_lc, &terms.demote_terms)
                || contains_any_lc(&headline_lc, &terms.demote_terms));

        let contact_id = metadata_value(&metadata, "contactId")
            .filter(|value| !value.is_empty());
        let id_fallback = match_id_or_empty(&js_match);
        let key = contact_id.unwrap_or(id_fallback);

        classified.push(ClassifiedMatch {
            js_match,
            key,
            positive,
            aux,
            demoted_positive,
        });
    }

    if !terms.require_positive {
        let end = slice_end_index(strictly_allowed.len(), final_limit);
        let out = Array::new();
        for js_match in strictly_allowed.iter().take(end) {
            out.push(js_match);
        }
        return Ok(out.into());
    }

    let mut seen: HashSet<String> = HashSet::new();
    let mut ordered: Vec<JsValue> = Vec::with_capacity(classified.len());

    for entry in &classified {
        if entry.positive {
            push_classified_if_new(entry, &mut seen, &mut ordered);
        }
        if (ordered.len() as f64) >= final_limit {
            break;
        }
    }

    if (ordered.len() as f64) < final_limit {
        for entry in &classified {
            if entry.demoted_positive {
                push_classified_if_new(entry, &mut seen, &mut ordered);
            }
            if (ordered.len() as f64) >= final_limit {
                break;
            }
        }
    }

    if (ordered.len() as f64) < final_limit {
        for entry in &classified {
            if !entry.positive && entry.aux {
                push_classified_if_new(entry, &mut seen, &mut ordered);
            }
            if (ordered.len() as f64) >= final_limit {
                break;
            }
        }
    }

    if (ordered.len() as f64) < final_limit {
        for entry in &classified {
            if !entry.positive && !entry.aux {
                push_classified_if_new(entry, &mut seen, &mut ordered);
            }
            if (ordered.len() as f64) >= final_limit {
                break;
            }
        }
    }

    let end = slice_end_index(ordered.len(), final_limit);
    let out = Array::new();
    for js_match in ordered.iter().take(end) {
        out.push(js_match);
    }

    Ok(out.into())
}

#[wasm_bindgen]
pub fn filter_items_by_title_prefixes(
    items: JsValue,
    prefixes: JsValue,
    keep_null_titles: bool,
) -> Result<JsValue, JsValue> {
    if !Array::is_array(&items) {
        return Err(to_js_error("invalid items payload", "expected array"));
    }
    if !Array::is_array(&prefixes) {
        return Err(to_js_error("invalid prefixes payload", "expected array"));
    }

    let items_array: Array = items
        .clone()
        .dyn_into()
        .map_err(|_| to_js_error("invalid items payload", "expected array"))?;
    let prefixes_array: Array = prefixes
        .clone()
        .dyn_into()
        .map_err(|_| to_js_error("invalid prefixes payload", "expected array"))?;

    // Normalize prefixes once: trim + lowercase; ignore empty prefixes.
    let mut normalized_prefixes: Vec<String> = Vec::with_capacity(prefixes_array.length() as usize);
    for i in 0..prefixes_array.length() {
        let entry = prefixes_array.get(i);
        if is_nullish(&entry) {
            continue;
        }
        let normalized = js_to_string(&entry).trim().to_lowercase();
        if !normalized.is_empty() {
            normalized_prefixes.push(normalized);
        }
    }

    // When no usable prefixes are provided, treat this as "no filter".
    let out = Array::new();
    if normalized_prefixes.is_empty() {
        for i in 0..items_array.length() {
            out.push(&items_array.get(i));
        }
        return Ok(out.into());
    }

    for i in 0..items_array.length() {
        let item = items_array.get(i);
        let title_opt = extract_title_value(&item);
        let title = match title_opt {
            Some(t) => t,
            None => {
                if keep_null_titles {
                    out.push(&item);
                }
                continue;
            }
        };

        let title_norm = title.trim().to_lowercase();
        if title_norm.is_empty() {
            if keep_null_titles {
                out.push(&item);
            }
            continue;
        }

        let mut matched = false;
        for prefix in &normalized_prefixes {
            if title_norm.starts_with(prefix) {
                matched = true;
                break;
            }
        }

        if matched {
            out.push(&item);
        }
    }

    Ok(out.into())
}
