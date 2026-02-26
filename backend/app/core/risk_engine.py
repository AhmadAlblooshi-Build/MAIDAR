"""
MAIDAR Risk Scoring Engine - Core Algorithm
============================================

This module implements the deterministic, explainable, scenario-aware
Human Risk Scoring algorithm as defined in the MAIDAR product specification.

Formula:
    HumanRisk(e,s) = round(100 × L(e,s) × I(e,s))

Where:
    L(e,s) = Likelihood of employee e falling for scenario s
    I(e,s) = Impact if employee e falls for scenario s

All calculations are deterministic, versioned, and fully explainable.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional


# ============================================================================
# ENUMS - Data types
# ============================================================================

class AgeRange(str, Enum):
    """Age range categories for likelihood calculation."""
    AGE_18_24 = "18_24"
    AGE_25_34 = "25_34"
    AGE_35_44 = "35_44"
    AGE_45_54 = "45_54"
    AGE_55_PLUS = "55_plus"


class Gender(str, Enum):
    """Gender categories for likelihood calculation."""
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class Seniority(str, Enum):
    """Seniority levels for impact calculation."""
    INTERN = "INTERN"
    JUNIOR = "JUNIOR"
    MID = "MID"
    SENIOR = "SENIOR"
    EXECUTIVE = "EXECUTIVE"


class ScenarioCategory(str, Enum):
    """Scenario categories for scenario-aware impact calculation."""
    BEC = "BEC"  # Business Email Compromise (invoice/wire fraud)
    CREDENTIALS = "CREDENTIALS"  # Credential harvest
    DATA = "DATA"  # Data/PII disclosure
    MALWARE = "MALWARE"  # Malware/ransomware lure


class RiskBand(str, Enum):
    """Risk score bands."""
    LOW = "LOW"  # 0-24
    MEDIUM = "MEDIUM"  # 25-49
    HIGH = "HIGH"  # 50-74
    CRITICAL = "CRITICAL"  # 75-100


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class EmployeeProfile:
    """Employee profile data for risk assessment."""
    # Likelihood factors
    age_range: str  # AgeRange value as string (e.g., "35_44")
    gender: str  # Gender value as string (e.g., "MALE")
    languages: List[str]  # ISO 639-1 codes (e.g., ['en', 'ar'])
    technical_literacy: int  # 0-10

    # Impact factors
    seniority: str  # Seniority value as string (e.g., "senior")
    department: str
    job_title: Optional[str] = None

    def __post_init__(self):
        """Validate inputs."""
        if not (0 <= self.technical_literacy <= 10):
            raise ValueError("technical_literacy must be between 0 and 10")


@dataclass
class Scenario:
    """Phishing scenario definition."""
    category: str  # ScenarioCategory value as string (e.g., "BEC", "CREDENTIALS")
    language: str  # ISO 639-1 code (e.g., 'en', 'ar')


@dataclass
class LikelihoodBreakdown:
    """Explainability breakdown for likelihood calculation."""
    tl_risk: Decimal
    tl_contribution: Decimal
    age_modifier: Decimal
    age_contribution: Decimal
    lang_match: Decimal
    lang_contribution: Decimal
    gender_modifier: Decimal
    gender_contribution: Decimal
    total_likelihood: Decimal


@dataclass
class ImpactBreakdown:
    """Explainability breakdown for impact calculation."""
    seniority_impact: Decimal
    seniority_contribution: Decimal
    role_impact: Decimal
    role_contribution: Decimal
    alpha: Decimal
    scenario_category: ScenarioCategory
    total_impact: Decimal


@dataclass
class RiskScore:
    """Final risk score with full explainability."""
    employee_id: str
    scenario: Scenario
    likelihood: Decimal
    impact: Decimal
    risk_score: int  # 0-100
    risk_band: RiskBand
    likelihood_breakdown: LikelihoodBreakdown
    impact_breakdown: ImpactBreakdown
    algorithm_version: str = "v1.0"


# ============================================================================
# CONFIGURATION - Lookup Tables
# ============================================================================

class RiskScoringConfig:
    """Configuration and lookup tables for risk scoring."""

    # Likelihood formula weights
    WEIGHT_TL = Decimal("0.40")
    WEIGHT_AGE = Decimal("0.25")
    WEIGHT_LANG = Decimal("0.20")
    WEIGHT_GENDER = Decimal("0.15")

    # Age modifiers (from research)
    # Using string keys since database stores age_range as strings now
    AGE_MODIFIERS = {
        "18_24": Decimal("0.70"),
        "25_34": Decimal("0.55"),
        "35_44": Decimal("0.45"),
        "45_54": Decimal("0.60"),
        "55_plus": Decimal("0.75"),
    }

    # Gender modifiers (from research)
    # Using string keys since database stores gender as strings now
    # Supporting both lowercase (database) and uppercase (enum) formats
    GENDER_MODIFIERS = {
        "MALE": Decimal("0.50"),
        "FEMALE": Decimal("0.55"),
        "OTHER": Decimal("0.50"),
        "PREFER_NOT_TO_SAY": Decimal("0.50"),
        "male": Decimal("0.50"),  # Lowercase variants for database
        "female": Decimal("0.55"),
        "other": Decimal("0.50"),
        "prefer_not_to_say": Decimal("0.50"),
    }

    # Language match modifiers
    LANG_FULL_MATCH = Decimal("0.50")
    LANG_PARTIAL_MATCH = Decimal("0.60")  # Optional for v1
    LANG_MISMATCH = Decimal("0.70")

    # Seniority impact scores
    # Using string keys since database stores seniority as strings now
    # Supporting both lowercase (database) and uppercase (enum) formats
    SENIORITY_IMPACT = {
        "intern": Decimal("0.20"),
        "junior": Decimal("0.35"),
        "mid": Decimal("0.55"),
        "senior": Decimal("0.75"),
        "executive": Decimal("1.00"),
        "INTERN": Decimal("0.20"),
        "JUNIOR": Decimal("0.35"),
        "MID": Decimal("0.55"),
        "SENIOR": Decimal("0.75"),
        "EXECUTIVE": Decimal("1.00"),
    }

    # Scenario alpha weights (how much seniority matters)
    # Using string keys since database stores category as strings now
    SCENARIO_ALPHA = {
        "BEC": Decimal("0.70"),
        "CREDENTIALS": Decimal("0.20"),
        "DATA": Decimal("0.30"),
        "MALWARE": Decimal("0.40"),
    }

    # Role-specific impact matrices
    ROLE_IMPACT_BEC = {
        "Finance": Decimal("1.00"),
        "Accounting": Decimal("1.00"),
        "Procurement": Decimal("0.85"),
        "Purchasing": Decimal("0.85"),
        "Executive": Decimal("0.80"),
        "Legal": Decimal("0.70"),
        "HR": Decimal("0.65"),
        "IT": Decimal("0.55"),
        "Security": Decimal("0.55"),
        "Sales": Decimal("0.50"),
        "Marketing": Decimal("0.50"),
        "Operations": Decimal("0.50"),
        "Other": Decimal("0.50"),
    }

    ROLE_IMPACT_CREDENTIALS = {
        "IT Security": Decimal("1.00"),
        "IT Admin": Decimal("1.00"),
        "IT": Decimal("0.85"),
        "Finance": Decimal("0.75"),
        "Legal": Decimal("0.75"),
        "HR": Decimal("0.75"),
        "Operations": Decimal("0.65"),
        "Sales": Decimal("0.55"),
        "Marketing": Decimal("0.55"),
        "Other": Decimal("0.55"),
    }

    ROLE_IMPACT_DATA = {
        "HR": Decimal("1.00"),
        "Legal": Decimal("0.90"),
        "Compliance": Decimal("0.90"),
        "Finance": Decimal("0.85"),
        "Customer Support": Decimal("0.80"),
        "Sales Operations": Decimal("0.80"),
        "Operations": Decimal("0.65"),
        "IT": Decimal("0.60"),
        "Security": Decimal("0.60"),
        "Marketing": Decimal("0.55"),
        "Other": Decimal("0.55"),
    }

    ROLE_IMPACT_MALWARE = {
        "IT Admin": Decimal("0.95"),
        "IT Security": Decimal("0.95"),
        "IT": Decimal("0.85"),
        "Operations": Decimal("0.80"),
        "Finance": Decimal("0.75"),
        "HR": Decimal("0.75"),
        "Legal": Decimal("0.75"),
        "Sales": Decimal("0.65"),
        "Marketing": Decimal("0.65"),
        "Other": Decimal("0.55"),
    }

    @classmethod
    def get_role_impact_table(cls, category: ScenarioCategory) -> Dict[str, Decimal]:
        """Get the appropriate role impact table for a scenario category."""
        return {
            ScenarioCategory.BEC: cls.ROLE_IMPACT_BEC,
            ScenarioCategory.CREDENTIALS: cls.ROLE_IMPACT_CREDENTIALS,
            ScenarioCategory.DATA: cls.ROLE_IMPACT_DATA,
            ScenarioCategory.MALWARE: cls.ROLE_IMPACT_MALWARE,
        }[category]


# ============================================================================
# CORE RISK SCORING ENGINE
# ============================================================================

class RiskScoringEngine:
    """
    Core risk scoring engine implementing the MAIDAR algorithm.

    This engine is:
    - Deterministic: Same inputs always produce same outputs
    - Explainable: Every score includes a breakdown
    - Scenario-aware: Risk varies by scenario type
    - Versioned: Algorithm version tracked for auditability
    """

    def __init__(self, config: RiskScoringConfig = None):
        """Initialize the risk scoring engine."""
        self.config = config or RiskScoringConfig()

    def calculate_risk(
        self,
        employee: EmployeeProfile,
        scenario: Scenario,
        employee_id: str = None
    ) -> RiskScore:
        """
        Calculate the complete risk score for an employee-scenario pair.

        Args:
            employee: Employee profile data
            scenario: Phishing scenario
            employee_id: Optional employee identifier for the result

        Returns:
            RiskScore with full explainability breakdown
        """
        # Calculate likelihood and impact with explainability
        likelihood, likelihood_breakdown = self._calculate_likelihood(employee, scenario)
        impact, impact_breakdown = self._calculate_impact(employee, scenario)

        # Final risk score: round(100 × L × I)
        risk_score = self._calculate_final_score(likelihood, impact)

        # Determine risk band
        risk_band = self._get_risk_band(risk_score)

        return RiskScore(
            employee_id=employee_id or "unknown",
            scenario=scenario,
            likelihood=likelihood,
            impact=impact,
            risk_score=risk_score,
            risk_band=risk_band,
            likelihood_breakdown=likelihood_breakdown,
            impact_breakdown=impact_breakdown,
        )

    def _calculate_likelihood(
        self,
        employee: EmployeeProfile,
        scenario: Scenario
    ) -> tuple[Decimal, LikelihoodBreakdown]:
        """
        Calculate likelihood L(e,s) with explainability.

        Formula:
            L(e,s) = 0.40×TL_risk + 0.25×A + 0.20×LM(e,s) + 0.15×G

        All components clamped to [0, 1].
        """
        # A) Technical literacy risk
        tl_risk = self._calculate_tl_risk(employee.technical_literacy)
        tl_contribution = self.config.WEIGHT_TL * tl_risk

        # B) Age modifier
        age_modifier = self.config.AGE_MODIFIERS[employee.age_range]
        age_contribution = self.config.WEIGHT_AGE * age_modifier

        # C) Language match modifier (scenario-dependent)
        lang_match = self._calculate_language_match(employee.languages, scenario.language)
        lang_contribution = self.config.WEIGHT_LANG * lang_match

        # D) Gender modifier
        gender_modifier = self.config.GENDER_MODIFIERS[employee.gender]
        gender_contribution = self.config.WEIGHT_GENDER * gender_modifier

        # Total likelihood (clamped to [0, 1])
        likelihood = tl_contribution + age_contribution + lang_contribution + gender_contribution
        likelihood = self._clamp(likelihood, Decimal("0"), Decimal("1"))

        breakdown = LikelihoodBreakdown(
            tl_risk=tl_risk,
            tl_contribution=tl_contribution,
            age_modifier=age_modifier,
            age_contribution=age_contribution,
            lang_match=lang_match,
            lang_contribution=lang_contribution,
            gender_modifier=gender_modifier,
            gender_contribution=gender_contribution,
            total_likelihood=likelihood,
        )

        return likelihood, breakdown

    def _calculate_impact(
        self,
        employee: EmployeeProfile,
        scenario: Scenario
    ) -> tuple[Decimal, ImpactBreakdown]:
        """
        Calculate impact I(e,s) with scenario awareness.

        Formula:
            I(e,s) = α_cat(s) × S(e) + (1 - α_cat(s)) × R(e,s)

        Where:
            α = scenario-specific weight (how much seniority matters)
            S(e) = seniority impact
            R(e,s) = role-specific impact for this scenario
        """
        # Get scenario alpha weight
        alpha = self.config.SCENARIO_ALPHA[scenario.category]

        # Get seniority impact
        seniority_impact = self.config.SENIORITY_IMPACT[employee.seniority]

        # Get role-specific impact for this scenario
        role_impact = self._get_role_impact(employee.department, scenario.category)

        # Calculate total impact
        seniority_contribution = alpha * seniority_impact
        role_contribution = (Decimal("1") - alpha) * role_impact
        impact = seniority_contribution + role_contribution

        # Clamp to [0, 1]
        impact = self._clamp(impact, Decimal("0"), Decimal("1"))

        breakdown = ImpactBreakdown(
            seniority_impact=seniority_impact,
            seniority_contribution=seniority_contribution,
            role_impact=role_impact,
            role_contribution=role_contribution,
            alpha=alpha,
            scenario_category=scenario.category,
            total_impact=impact,
        )

        return impact, breakdown

    def _calculate_tl_risk(self, technical_literacy: int) -> Decimal:
        """
        Calculate technical literacy risk.

        Formula:
            TL_risk = 1 - (TL / 10)

        Higher literacy = lower risk.
        """
        tl = Decimal(str(technical_literacy))
        tl_risk = Decimal("1") - (tl / Decimal("10"))
        return self._clamp(tl_risk, Decimal("0"), Decimal("1"))

    def _calculate_language_match(
        self,
        employee_languages: List[str],
        scenario_language: str
    ) -> Decimal:
        """
        Calculate language match modifier.

        Logic:
            - If scenario language in employee languages → Full match (0.50)
            - Else → Mismatch (0.70)

        Note: Partial match logic (0.60) is optional for v1.
        """
        if scenario_language.lower() in [lang.lower() for lang in employee_languages]:
            return self.config.LANG_FULL_MATCH
        else:
            return self.config.LANG_MISMATCH

    def _get_role_impact(self, department: str, category: ScenarioCategory) -> Decimal:
        """
        Get role-specific impact for a department and scenario category.

        Falls back to "Other" if department not found in lookup table.
        """
        impact_table = self.config.get_role_impact_table(category)
        return impact_table.get(department, impact_table.get("Other", Decimal("0.50")))

    def _calculate_final_score(self, likelihood: Decimal, impact: Decimal) -> int:
        """
        Calculate final risk score.

        Formula:
            Score = round(100 × L × I)
        """
        score = (Decimal("100") * likelihood * impact).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
        return int(score)

    def _get_risk_band(self, score: int) -> RiskBand:
        """
        Determine risk band from score.

        Bands:
            0-24: Low
            25-49: Medium
            50-74: High
            75-100: Critical
        """
        if score <= 24:
            return RiskBand.LOW
        elif score <= 49:
            return RiskBand.MEDIUM
        elif score <= 74:
            return RiskBand.HIGH
        else:
            return RiskBand.CRITICAL

    @staticmethod
    def _clamp(value: Decimal, min_val: Decimal, max_val: Decimal) -> Decimal:
        """Clamp a value to [min_val, max_val]."""
        return max(min_val, min(value, max_val))


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def calculate_risk_score(
    employee: EmployeeProfile,
    scenario: Scenario,
    employee_id: str = None
) -> RiskScore:
    """
    Convenience function to calculate risk score.

    Usage:
        >>> employee = EmployeeProfile(
        ...     age_range=AgeRange.AGE_35_44,
        ...     gender=Gender.MALE,
        ...     languages=['en'],
        ...     technical_literacy=7,
        ...     seniority=Seniority.SENIOR,
        ...     department='Finance'
        ... )
        >>> scenario = Scenario(
        ...     category=ScenarioCategory.BEC,
        ...     language='en'
        ... )
        >>> score = calculate_risk_score(employee, scenario)
        >>> print(f"Risk Score: {score.risk_score} ({score.risk_band})")
    """
    engine = RiskScoringEngine()
    return engine.calculate_risk(employee, scenario, employee_id)
