use js_sys::{Array, Object, Reflect};
use regex::{Regex, RegexBuilder};
use serde::Deserialize;
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

fn to_js_error(prefix: &str, err: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&format!("{prefix}: {err}"))
}

#[derive(Debug, Deserialize)]
struct ParsedLocationInput {
    city: Option<String>,
    state: Option<String>,
    country: Option<String>,
    #[serde(rename = "restOfQuery")]
    rest_of_query: String,
}

#[derive(Debug, Clone, Copy)]
struct HardcodedLocation {
    city: Option<&'static str>,
    state: Option<&'static str>,
    country: Option<&'static str>,
    force_exact_city: bool,
}

struct AliasEntry {
    key: &'static str,
    key_len: usize,
    location: HardcodedLocation,
    regex: Regex,
}

fn normalize_text_case_and_whitespace(text: &str) -> String {
    text.trim().to_lowercase()
}

fn collapse_whitespace_and_trim(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn js_nullable_string(value: Option<&str>) -> JsValue {
    match value {
        Some(v) => JsValue::from_str(v),
        None => JsValue::NULL,
    }
}

fn set(obj: &Object, key: &str, value: JsValue) -> Result<(), JsValue> {
    Reflect::set(obj, &JsValue::from_str(key), &value)?;
    Ok(())
}

fn to_js_string_array(values: &[&str]) -> JsValue {
    let arr = Array::new();
    for v in values {
        arr.push(&JsValue::from_str(v));
    }
    arr.into()
}

fn state_synonyms(key: &str) -> Option<&'static [&'static str; 2]> {
    for (k, v) in STATE_SYNONYMS.iter() {
        if *k == key {
            return Some(v);
        }
    }
    None
}

static DC_TOKEN_RE: OnceLock<Regex> = OnceLock::new();
static LA_TOKEN_RE: OnceLock<Regex> = OnceLock::new();
static DC_REMOVE_RE: OnceLock<Regex> = OnceLock::new();
static LA_REMOVE_RE: OnceLock<Regex> = OnceLock::new();
static EXPLICIT_LOUISIANA_RE: OnceLock<Regex> = OnceLock::new();
static EXPLICIT_LOUISIANA_CITIES_RE: OnceLock<Regex> = OnceLock::new();
static ALIAS_ENTRIES: OnceLock<Vec<AliasEntry>> = OnceLock::new();

fn dc_token_re() -> &'static Regex {
    DC_TOKEN_RE.get_or_init(|| {
        RegexBuilder::new(r"(^|[^a-z])d\.?\s*c\.?([^a-z]|$)")
            .case_insensitive(true)
            .build()
            .expect("dc token regex must compile")
    })
}

fn la_token_re() -> &'static Regex {
    LA_TOKEN_RE.get_or_init(|| {
        RegexBuilder::new(r"(^|[^a-z])l\.?\s*a\.?([^a-z]|$)")
            .case_insensitive(true)
            .build()
            .expect("la token regex must compile")
    })
}

fn dc_remove_re() -> &'static Regex {
    DC_REMOVE_RE.get_or_init(|| {
        // TS: /\bD\.?\s*C\.?\b/gi
        RegexBuilder::new(r"(?-u:\b)D\.?\s*C\.?(?-u:\b)")
            .case_insensitive(true)
            .build()
            .expect("dc remove regex must compile")
    })
}

fn la_remove_re() -> &'static Regex {
    LA_REMOVE_RE.get_or_init(|| {
        // TS: /\bL\.?\s*A\.?\b/gi
        RegexBuilder::new(r"(?-u:\b)L\.?\s*A\.?(?-u:\b)")
            .case_insensitive(true)
            .build()
            .expect("la remove regex must compile")
    })
}

fn explicit_louisiana_re() -> &'static Regex {
    EXPLICIT_LOUISIANA_RE.get_or_init(|| {
        // TS: /\blouisiana\b/i
        RegexBuilder::new(r"(?-u:\b)louisiana(?-u:\b)")
            .case_insensitive(true)
            .build()
            .expect("explicit louisiana regex must compile")
    })
}

fn explicit_louisiana_cities_re() -> &'static Regex {
    EXPLICIT_LOUISIANA_CITIES_RE.get_or_init(|| {
        // TS: /\bnew orleans\b|\bbaton rouge\b|\bshreveport\b/i
        RegexBuilder::new(r"(?-u:\b)(?:new orleans|baton rouge|shreveport)(?-u:\b)")
            .case_insensitive(true)
            .build()
            .expect("explicit louisiana cities regex must compile")
    })
}

fn alias_entries() -> &'static [AliasEntry] {
    ALIAS_ENTRIES.get_or_init(|| {
        LOCATION_ALIASES
            .iter()
            .map(|(key, location)| {
                // TS: new RegExp(`\\b${escapeRegex(key)}\\b`, 'i')
                let escaped = regex::escape(key);
                let pattern = format!(r"(?-u:\b){escaped}(?-u:\b)");
                let compiled = RegexBuilder::new(&pattern)
                    .case_insensitive(true)
                    .build()
                    .expect("alias regex must compile");
                AliasEntry {
                    key,
                    key_len: key.len(),
                    location: *location,
                    regex: compiled,
                }
            })
            .collect()
    })
}

fn select_alias_hit(lowered_query: &str) -> Option<&'static AliasEntry> {
    let mut best: Option<&AliasEntry> = None;
    for entry in alias_entries() {
        if !entry.regex.is_match(lowered_query) {
            continue;
        }
        match best {
            None => best = Some(entry),
            Some(current) => {
                if entry.key_len > current.key_len {
                    best = Some(entry);
                }
            }
        }
    }
    best
}

fn build_overrides_object(
    city: Option<&str>,
    state: Option<&str>,
    country: Option<&str>,
    rest_of_query: &str,
) -> Result<JsValue, JsValue> {
    let obj = Object::new();
    set(&obj, "city", js_nullable_string(city))?;
    set(&obj, "state", js_nullable_string(state))?;
    set(&obj, "country", js_nullable_string(country))?;
    set(&obj, "restOfQuery", JsValue::from_str(rest_of_query))?;
    Ok(obj.into())
}

fn build_result_object(
    overrides: JsValue,
    force_city_exact_city: JsValue,
    force_state_any: JsValue,
    force_city_any: Option<JsValue>,
) -> Result<JsValue, JsValue> {
    let obj = Object::new();
    set(&obj, "overrides", overrides)?;
    set(&obj, "penaltyCities", Array::new().into())?;
    set(&obj, "forceCityExactCity", force_city_exact_city)?;
    set(&obj, "forceStateAny", force_state_any)?;
    if let Some(v) = force_city_any {
        set(&obj, "forceCityAny", v)?;
    }
    set(&obj, "penaltyTerms", Array::new().into())?;
    set(&obj, "strictPenalty", JsValue::from_bool(false))?;
    Ok(obj.into())
}

#[wasm_bindgen]
pub fn apply_hardcoded_location_overrides(raw_query: String, parsed: JsValue) -> Result<JsValue, JsValue> {
    let parsed_js = parsed.clone();
    let parsed: ParsedLocationInput = serde_wasm_bindgen::from_value(parsed)
        .map_err(|err| to_js_error("invalid parsed payload", err))?;

    let lowered = normalize_text_case_and_whitespace(&raw_query);

    // Special-case: standalone "DC" tokens (e.g., "Music venues DC", "in D.C.") map to Washington, DC
    // Accept variations like: DC, D.C, D.C., D C
    if dc_token_re().is_match(&lowered) {
        let cleaned_rest = if parsed.rest_of_query.is_empty() {
            parsed.rest_of_query.clone()
        } else {
            let removed = dc_remove_re().replace_all(&parsed.rest_of_query, "").into_owned();
            collapse_whitespace_and_trim(&removed)
        };

        let overrides = build_overrides_object(
            Some("Washington"),
            Some("District of Columbia"),
            Some("United States of America"),
            &cleaned_rest,
        )?;
        let force_city_exact_city = JsValue::from_str("Washington");
        let force_state_any = to_js_string_array(&["District of Columbia", "DC"]);
        return build_result_object(overrides, force_city_exact_city, force_state_any, None);
    }

    // Special-case: standalone "LA" tokens that likely mean Los Angeles.
    // Prefer Los Angeles unless Louisiana is explicitly referenced.
    let explicit_louisiana = explicit_louisiana_re().is_match(&lowered)
        || explicit_louisiana_cities_re().is_match(&lowered);
    if la_token_re().is_match(&lowered) && !explicit_louisiana {
        let cleaned_rest = if parsed.rest_of_query.is_empty() {
            parsed.rest_of_query.clone()
        } else {
            let removed = la_remove_re().replace_all(&parsed.rest_of_query, "").into_owned();
            collapse_whitespace_and_trim(&removed)
        };

        let overrides = build_overrides_object(
            Some("Los Angeles"),
            Some("California"),
            Some("United States of America"),
            &cleaned_rest,
        )?;
        let force_city_exact_city = JsValue::from_str("Los Angeles");
        let force_state_any = to_js_string_array(&["California", "CA"]);
        return build_result_object(overrides, force_city_exact_city, force_state_any, None);
    }

    // Find alias present in the query using strict, word-boundary-aware matching.
    // Prefer the longest matching alias to avoid partial overshadowing (e.g., "washington dc" over "dc").
    let hit = select_alias_hit(&lowered);
    let Some(hit) = hit else {
        // Even when no alias is hit, if a state was parsed, allow common synonyms/abbreviations (e.g., California ↔ CA)
        let parsed_state_key = parsed.state.clone().unwrap_or_default().to_lowercase();
        let force_state_any = if !parsed_state_key.is_empty() {
            state_synonyms(&parsed_state_key).map(|arr| to_js_string_array(arr))
        } else {
            None
        }
        .unwrap_or(JsValue::UNDEFINED);

        let force_city_exact_city = match parsed.city.as_deref() {
            Some(v) => JsValue::from_str(v),
            None => JsValue::UNDEFINED,
        };

        return build_result_object(parsed_js, force_city_exact_city, force_state_any, None);
    };

    let alias = hit.location;

    // Override parsed values
    let city = alias.city.map(|s| s.to_string()).or(parsed.city.clone());
    let state = alias.state.map(|s| s.to_string()).or(parsed.state.clone());
    let country = alias.country.map(|s| s.to_string()).or(parsed.country.clone());

    // Remove the alias token from the restOfQuery using boundary-aware replacement
    let cleaned_rest = if parsed.rest_of_query.is_empty() {
        parsed.rest_of_query.clone()
    } else {
        let removed = hit.regex.replace_all(&parsed.rest_of_query, "").into_owned();
        collapse_whitespace_and_trim(&removed)
    };

    let overrides = build_overrides_object(
        city.as_deref(),
        state.as_deref(),
        country.as_deref(),
        &cleaned_rest,
    )?;

    let force_city_exact_city = if alias.force_exact_city {
        match city.as_deref() {
            Some(v) if !v.is_empty() => JsValue::from_str(v),
            _ => JsValue::UNDEFINED,
        }
    } else {
        JsValue::UNDEFINED
    };

    // If we have a known state, allow strict matching against any of its common synonyms/abbreviations
    let state_key = state.clone().unwrap_or_default().to_lowercase();
    let force_state_any = if !state_key.is_empty() {
        state_synonyms(&state_key).map(|arr| to_js_string_array(arr))
    } else {
        None
    }
    .unwrap_or(JsValue::UNDEFINED);

    // NYC and "New York City": allow both New York and Brooklyn as exact city matches
    let force_city_any_value = if hit.key == "nyc" || hit.key == "new york city" || hit.key == "newyorkcity" {
        to_js_string_array(&["New York", "Brooklyn"])
    } else {
        JsValue::UNDEFINED
    };

    build_result_object(
        overrides,
        force_city_exact_city,
        force_state_any,
        Some(force_city_any_value),
    )
}

// Minimal, deterministic aliases. Extend as needed.
// Ported verbatim from `src/app/api/_utils/searchPreprocess.ts` (do not edit generated behavior).
const LOCATION_ALIASES: &[(&str, HardcodedLocation)] = &[
    (
        "manhattan",
        HardcodedLocation {
            city: Some("New York"),
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "nyc",
        HardcodedLocation {
            city: None,
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: false,
        },
    ),
    (
        "new york city",
        HardcodedLocation {
            city: None,
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: false,
        },
    ),
    (
        "newyorkcity",
        HardcodedLocation {
            city: None,
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: false,
        },
    ),
    (
        "philadelphia",
        HardcodedLocation {
            city: Some("Philadelphia"),
            state: Some("Pennsylvania"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "philly",
        HardcodedLocation {
            city: Some("Philadelphia"),
            state: Some("Pennsylvania"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "phiadelphia",
        HardcodedLocation {
            city: Some("Philadelphia"),
            state: Some("Pennsylvania"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "brooklyn",
        HardcodedLocation {
            city: Some("Brooklyn"),
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "boston",
        HardcodedLocation {
            city: Some("Boston"),
            state: Some("Massachusetts"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "baltimore",
        HardcodedLocation {
            city: Some("Baltimore"),
            state: Some("Maryland"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "chicago",
        HardcodedLocation {
            city: Some("Chicago"),
            state: Some("Illinois"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "nashville",
        HardcodedLocation {
            city: Some("Nashville"),
            state: Some("Tennessee"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "memphis",
        HardcodedLocation {
            city: Some("Memphis"),
            state: Some("Tennessee"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "washington dc",
        HardcodedLocation {
            city: Some("Washington"),
            state: Some("District of Columbia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "washington, dc",
        HardcodedLocation {
            city: Some("Washington"),
            state: Some("District of Columbia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "washingtondc",
        HardcodedLocation {
            city: Some("Washington"),
            state: Some("District of Columbia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "district of columbia",
        HardcodedLocation {
            city: Some("Washington"),
            state: Some("District of Columbia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "los angeles",
        HardcodedLocation {
            city: Some("Los Angeles"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "losangeles",
        HardcodedLocation {
            city: Some("Los Angeles"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "las vegas",
        HardcodedLocation {
            city: Some("Las Vegas"),
            state: Some("Nevada"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "new orleans",
        HardcodedLocation {
            city: Some("New Orleans"),
            state: Some("Louisiana"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "neworleans",
        HardcodedLocation {
            city: Some("New Orleans"),
            state: Some("Louisiana"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "san antonio",
        HardcodedLocation {
            city: Some("San Antonio"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "san diego",
        HardcodedLocation {
            city: Some("San Diego"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "san jose",
        HardcodedLocation {
            city: Some("San Jose"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "san francisco",
        HardcodedLocation {
            city: Some("San Francisco"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "sanfrancisco",
        HardcodedLocation {
            city: Some("San Francisco"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "fresno",
        HardcodedLocation {
            city: Some("Fresno"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "sacramento",
        HardcodedLocation {
            city: Some("Sacramento"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "oakland",
        HardcodedLocation {
            city: Some("Oakland"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "long beach",
        HardcodedLocation {
            city: Some("Long Beach"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "longbeach",
        HardcodedLocation {
            city: Some("Long Beach"),
            state: Some("California"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "buffallo",
        HardcodedLocation {
            city: Some("Buffalo"),
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "rochester",
        HardcodedLocation {
            city: Some("Rochester"),
            state: Some("New York"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "indianapolis",
        HardcodedLocation {
            city: Some("Indianapolis"),
            state: Some("Indiana"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "jacksonville",
        HardcodedLocation {
            city: Some("Jacksonville"),
            state: Some("Florida"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "miami",
        HardcodedLocation {
            city: Some("Miami"),
            state: Some("Florida"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "houston",
        HardcodedLocation {
            city: Some("Houston"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "austin",
        HardcodedLocation {
            city: Some("Austin"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "dallas",
        HardcodedLocation {
            city: Some("Dallas"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "fort worth",
        HardcodedLocation {
            city: Some("Fort Worth"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "fortworth",
        HardcodedLocation {
            city: Some("Fort Worth"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "el paso",
        HardcodedLocation {
            city: Some("El Paso"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "elpaso",
        HardcodedLocation {
            city: Some("El Paso"),
            state: Some("Texas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "atlanta",
        HardcodedLocation {
            city: Some("Atlanta"),
            state: Some("Georgia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "louisville",
        HardcodedLocation {
            city: Some("Louisville"),
            state: Some("Kentucky"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "charlotte",
        HardcodedLocation {
            city: Some("Charlotte"),
            state: Some("North Carolina"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "raleigh",
        HardcodedLocation {
            city: Some("Raleigh"),
            state: Some("North Carolina"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "virginia beach",
        HardcodedLocation {
            city: Some("Virginia Beach"),
            state: Some("Virginia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "virginiabeach",
        HardcodedLocation {
            city: Some("Virginia Beach"),
            state: Some("Virginia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "virginia beah",
        HardcodedLocation {
            city: Some("Virginia Beach"),
            state: Some("Virginia"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "minneapolis",
        HardcodedLocation {
            city: Some("Minneapolis"),
            state: Some("Minnesota"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "seattle",
        HardcodedLocation {
            city: Some("Seattle"),
            state: Some("Washington"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "denver",
        HardcodedLocation {
            city: Some("Denver"),
            state: Some("Colorado"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "colorado springs",
        HardcodedLocation {
            city: Some("Colorado Springs"),
            state: Some("Colorado"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "coloradosprings",
        HardcodedLocation {
            city: Some("Colorado Springs"),
            state: Some("Colorado"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "hartford",
        HardcodedLocation {
            city: Some("Hartford"),
            state: Some("Connecticut"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "kansas city",
        HardcodedLocation {
            city: Some("Kansas City"),
            state: Some("Missouri"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "kansascity",
        HardcodedLocation {
            city: Some("Kansas City"),
            state: Some("Missouri"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "oklahoma city",
        HardcodedLocation {
            city: Some("Oklahoma City"),
            state: Some("Oklahoma"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "oklahomacity",
        HardcodedLocation {
            city: Some("Oklahoma City"),
            state: Some("Oklahoma"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "tulsa",
        HardcodedLocation {
            city: Some("Tulsa"),
            state: Some("Oklahoma"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "detroit",
        HardcodedLocation {
            city: Some("Detroit"),
            state: Some("Michigan"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "albuquerque",
        HardcodedLocation {
            city: Some("Albuquerque"),
            state: Some("New Mexico"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "albequerque",
        HardcodedLocation {
            city: Some("Albuquerque"),
            state: Some("New Mexico"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "milwaukee",
        HardcodedLocation {
            city: Some("Milwaukee"),
            state: Some("Wisconsin"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "wilmington",
        HardcodedLocation {
            city: Some("Wilmington"),
            state: Some("Delaware"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "harrisburg",
        HardcodedLocation {
            city: Some("Harrisburg"),
            state: Some("Pennsylvania"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "omaha",
        HardcodedLocation {
            city: Some("Omaha"),
            state: Some("Nebraska"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "cleveland",
        HardcodedLocation {
            city: Some("Cleveland"),
            state: Some("Ohio"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "columbus",
        HardcodedLocation {
            city: Some("Columbus"),
            state: Some("Ohio"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "wichita",
        HardcodedLocation {
            city: Some("Wichita"),
            state: Some("Kansas"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "pheonix",
        HardcodedLocation {
            city: Some("Pheonix"),
            state: Some("Arizona"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "phoenix",
        HardcodedLocation {
            city: Some("Phoenix"),
            state: Some("Arizona"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "tucson",
        HardcodedLocation {
            city: Some("Tucson"),
            state: Some("Arizona"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
    (
        "mesa",
        HardcodedLocation {
            city: Some("Mesa"),
            state: Some("Arizona"),
            country: Some("United States of America"),
            force_exact_city: true,
        },
    ),
];

// Synonyms for state values to ensure strict matching allows common abbreviations
// Ported verbatim from `src/app/api/_utils/searchPreprocess.ts`.
const STATE_SYNONYMS: &[(&str, [&str; 2])] = &[
    ("district of columbia", ["District of Columbia", "DC"]),
    ("dc", ["District of Columbia", "DC"]),
    ("new york", ["New York", "NY"]),
    ("pennsylvania", ["Pennsylvania", "PA"]),
    ("massachusetts", ["Massachusetts", "MA"]),
    ("maryland", ["Maryland", "MD"]),
    ("illinois", ["Illinois", "IL"]),
    ("alabama", ["Alabama", "AL"]),
    ("al", ["Alabama", "AL"]),
    ("alaska", ["Alaska", "AK"]),
    ("ak", ["Alaska", "AK"]),
    ("arizona", ["Arizona", "AZ"]),
    ("az", ["Arizona", "AZ"]),
    ("arkansas", ["Arkansas", "AR"]),
    ("ar", ["Arkansas", "AR"]),
    ("california", ["California", "CA"]),
    ("ca", ["California", "CA"]),
    ("colorado", ["Colorado", "CO"]),
    ("co", ["Colorado", "CO"]),
    ("connecticut", ["Connecticut", "CT"]),
    ("ct", ["Connecticut", "CT"]),
    ("delaware", ["Delaware", "DE"]),
    ("de", ["Delaware", "DE"]),
    ("florida", ["Florida", "FL"]),
    ("fl", ["Florida", "FL"]),
    ("georgia", ["Georgia", "GA"]),
    ("ga", ["Georgia", "GA"]),
    ("hawaii", ["Hawaii", "HI"]),
    ("hi", ["Hawaii", "HI"]),
    ("idaho", ["Idaho", "ID"]),
    ("id", ["Idaho", "ID"]),
    ("il", ["Illinois", "IL"]),
    ("indiana", ["Indiana", "IN"]),
    ("in", ["Indiana", "IN"]),
    ("iowa", ["Iowa", "IA"]),
    ("ia", ["Iowa", "IA"]),
    ("kansas", ["Kansas", "KS"]),
    ("ks", ["Kansas", "KS"]),
    ("kentucky", ["Kentucky", "KY"]),
    ("ky", ["Kentucky", "KY"]),
    ("louisiana", ["Louisiana", "LA"]),
    ("la", ["Louisiana", "LA"]),
    ("maine", ["Maine", "ME"]),
    ("me", ["Maine", "ME"]),
    ("md", ["Maryland", "MD"]),
    ("ma", ["Massachusetts", "MA"]),
    ("michigan", ["Michigan", "MI"]),
    ("mi", ["Michigan", "MI"]),
    ("minnesota", ["Minnesota", "MN"]),
    ("mn", ["Minnesota", "MN"]),
    ("mississippi", ["Mississippi", "MS"]),
    ("ms", ["Mississippi", "MS"]),
    ("missouri", ["Missouri", "MO"]),
    ("mo", ["Missouri", "MO"]),
    ("montana", ["Montana", "MT"]),
    ("mt", ["Montana", "MT"]),
    ("nebraska", ["Nebraska", "NE"]),
    ("ne", ["Nebraska", "NE"]),
    ("nevada", ["Nevada", "NV"]),
    ("nv", ["Nevada", "NV"]),
    ("new hampshire", ["New Hampshire", "NH"]),
    ("nh", ["New Hampshire", "NH"]),
    ("new jersey", ["New Jersey", "NJ"]),
    ("nj", ["New Jersey", "NJ"]),
    ("new mexico", ["New Mexico", "NM"]),
    ("nm", ["New Mexico", "NM"]),
    ("ny", ["New York", "NY"]),
    ("north carolina", ["North Carolina", "NC"]),
    ("nc", ["North Carolina", "NC"]),
    ("north dakota", ["North Dakota", "ND"]),
    ("nd", ["North Dakota", "ND"]),
    ("ohio", ["Ohio", "OH"]),
    ("oh", ["Ohio", "OH"]),
    ("oklahoma", ["Oklahoma", "OK"]),
    ("ok", ["Oklahoma", "OK"]),
    ("oregon", ["Oregon", "OR"]),
    ("or", ["Oregon", "OR"]),
    ("pa", ["Pennsylvania", "PA"]),
    ("rhode island", ["Rhode Island", "RI"]),
    ("ri", ["Rhode Island", "RI"]),
    ("south carolina", ["South Carolina", "SC"]),
    ("sc", ["South Carolina", "SC"]),
    ("south dakota", ["South Dakota", "SD"]),
    ("sd", ["South Dakota", "SD"]),
    ("tennessee", ["Tennessee", "TN"]),
    ("tn", ["Tennessee", "TN"]),
    ("texas", ["Texas", "TX"]),
    ("tx", ["Texas", "TX"]),
    ("utah", ["Utah", "UT"]),
    ("ut", ["Utah", "UT"]),
    ("vermont", ["Vermont", "VT"]),
    ("vt", ["Vermont", "VT"]),
    ("virginia", ["Virginia", "VA"]),
    ("va", ["Virginia", "VA"]),
    ("washington", ["Washington", "WA"]),
    ("wa", ["Washington", "WA"]),
    ("west virginia", ["West Virginia", "WV"]),
    ("wv", ["West Virginia", "WV"]),
    ("wisconsin", ["Wisconsin", "WI"]),
    ("wi", ["Wisconsin", "WI"]),
    ("wyoming", ["Wyoming", "WY"]),
    ("wy", ["Wyoming", "WY"]),
];

