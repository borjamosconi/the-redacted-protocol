use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ConfidenceScore {
    pub overall: f64,
    pub model_confidence: f64,
    pub cross_model_agreement: f64,
    pub contextual_consistency: f64,
    pub source_reliability: f64,
}

impl ConfidenceScore {
    pub fn compute(model_confidence: f64, cross_model_agreement: f64, contextual_consistency: f64, source_reliability: f64) -> Self {
        let overall = model_confidence * 0.4 + cross_model_agreement * 0.3 + contextual_consistency * 0.2 + source_reliability * 0.1;
        Self { overall: overall.clamp(0.0, 1.0), model_confidence: model_confidence.clamp(0.0, 1.0), cross_model_agreement: cross_model_agreement.clamp(0.0, 1.0), contextual_consistency: contextual_consistency.clamp(0.0, 1.0), source_reliability: source_reliability.clamp(0.0, 1.0) }
    }
    pub fn is_above_threshold(&self, threshold: f64) -> bool { self.overall >= threshold }
    pub fn as_pct(&self) -> String { format!("{:.1}%", self.overall * 100.0) }
    pub fn status_label(&self) -> &'static str {
        if self.overall >= 0.95 { "VERIFIED" }
        else if self.overall >= 0.85 { "DECLASSIFIED" }
        else if self.overall >= 0.70 { "PROVISIONAL" }
        else { "LOW CONFIDENCE" }
    }
}
