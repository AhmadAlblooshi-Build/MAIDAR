"""
Unit tests for MAIDAR Risk Scoring Engine.

Tests verify:
- Deterministic calculations
- Correct formula implementation
- Explainability completeness
- Edge cases and boundary conditions
- Scenario-awareness
"""

import pytest
from decimal import Decimal

from app.core.risk_engine import (
    RiskScoringEngine,
    EmployeeProfile,
    Scenario,
    AgeRange,
    Gender,
    Seniority,
    ScenarioCategory,
    RiskBand,
    calculate_risk_score,
)


# ============================================================================
# TEST FIXTURES
# ============================================================================

@pytest.fixture
def engine():
    """Create a risk scoring engine instance."""
    return RiskScoringEngine()


@pytest.fixture
def sample_employee_low_risk():
    """Create a low-risk employee profile."""
    return EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,  # Lowest age modifier (0.45)
        gender=Gender.MALE.value,  # Lower gender modifier (0.50)
        languages=['en', 'ar'],
        technical_literacy=9,  # High literacy = low risk
        seniority=Seniority.INTERN.value,  # Lowest impact
        department='Marketing'  # Lower impact for most scenarios
    )


@pytest.fixture
def sample_employee_high_risk():
    """Create a high-risk employee profile."""
    return EmployeeProfile(
        age_range=AgeRange.AGE_55_PLUS.value,  # Highest age modifier (0.75)
        gender=Gender.FEMALE.value,  # Higher gender modifier (0.55)
        languages=['fr'],  # Will mismatch English scenarios
        technical_literacy=2,  # Low literacy = high risk
        seniority=Seniority.EXECUTIVE.value,  # Highest impact
        department='Finance'  # Highest impact for BEC
    )


@pytest.fixture
def scenario_bec():
    """Create a BEC (wire fraud) scenario."""
    return Scenario(
        category=ScenarioCategory.BEC.value,
        language='en'
    )


@pytest.fixture
def scenario_credentials():
    """Create a credential harvest scenario."""
    return Scenario(
        category=ScenarioCategory.CREDENTIALS.value,
        language='en'
    )


# ============================================================================
# DETERMINISM TESTS
# ============================================================================

def test_deterministic_calculation(engine, sample_employee_low_risk, scenario_bec):
    """Test that same inputs always produce same outputs."""
    score1 = engine.calculate_risk(sample_employee_low_risk, scenario_bec, "emp1")
    score2 = engine.calculate_risk(sample_employee_low_risk, scenario_bec, "emp1")

    assert score1.risk_score == score2.risk_score
    assert score1.likelihood == score2.likelihood
    assert score1.impact == score2.impact
    assert score1.risk_band == score2.risk_band


def test_different_inputs_different_outputs(engine, sample_employee_low_risk, sample_employee_high_risk, scenario_bec):
    """Test that different inputs produce different outputs."""
    score_low = engine.calculate_risk(sample_employee_low_risk, scenario_bec)
    score_high = engine.calculate_risk(sample_employee_high_risk, scenario_bec)

    assert score_low.risk_score < score_high.risk_score
    assert score_low.likelihood < score_high.likelihood


# ============================================================================
# LIKELIHOOD CALCULATION TESTS
# ============================================================================

def test_technical_literacy_inversely_affects_likelihood(engine):
    """Test that higher technical literacy reduces likelihood."""
    high_tl_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=10,  # Maximum
        seniority=Seniority.MID.value,
        department='IT'
    )

    low_tl_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=0,  # Minimum
        seniority=Seniority.MID.value,
        department='IT'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_high_tl = engine.calculate_risk(high_tl_employee, scenario)
    score_low_tl = engine.calculate_risk(low_tl_employee, scenario)

    assert score_high_tl.likelihood < score_low_tl.likelihood


def test_language_match_affects_likelihood(engine):
    """Test that language match reduces likelihood."""
    matching_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en', 'ar'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='IT'
    )

    mismatching_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['fr', 'de'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='IT'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_match = engine.calculate_risk(matching_employee, scenario)
    score_mismatch = engine.calculate_risk(mismatching_employee, scenario)

    # Matching language should have LOWER likelihood (0.50 vs 0.70)
    assert score_match.likelihood < score_mismatch.likelihood


def test_age_range_affects_likelihood(engine):
    """Test that age range affects likelihood."""
    young_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,  # 0.45 - lowest risk
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='IT'
    )

    old_employee = EmployeeProfile(
        age_range=AgeRange.AGE_55_PLUS.value,  # 0.75 - highest risk
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='IT'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_young = engine.calculate_risk(young_employee, scenario)
    score_old = engine.calculate_risk(old_employee, scenario)

    assert score_young.likelihood < score_old.likelihood


# ============================================================================
# IMPACT CALCULATION TESTS
# ============================================================================

def test_seniority_affects_impact(engine):
    """Test that seniority affects impact."""
    intern = EmployeeProfile(
        age_range=AgeRange.AGE_25_34.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.INTERN.value,  # Lowest impact (0.20)
        department='IT'
    )

    executive = EmployeeProfile(
        age_range=AgeRange.AGE_25_34.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.EXECUTIVE.value,  # Highest impact (1.00)
        department='IT'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_intern = engine.calculate_risk(intern, scenario)
    score_executive = engine.calculate_risk(executive, scenario)

    assert score_intern.impact < score_executive.impact


def test_scenario_awareness_bec_finance(engine):
    """Test that BEC scenario has high impact for Finance department."""
    finance_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='Finance'  # Highest impact for BEC (1.00)
    )

    marketing_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='Marketing'  # Lower impact for BEC (0.50)
    )

    bec_scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_finance = engine.calculate_risk(finance_employee, bec_scenario)
    score_marketing = engine.calculate_risk(marketing_employee, bec_scenario)

    # Finance should have significantly higher impact for BEC scenarios
    assert score_finance.impact > score_marketing.impact


def test_scenario_awareness_credentials_it(engine):
    """Test that Credentials scenario has high impact for IT Security."""
    it_security_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='IT Security'  # Highest impact for Credentials (1.00)
    )

    marketing_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='Marketing'  # Lower impact for Credentials (0.55)
    )

    creds_scenario = Scenario(category=ScenarioCategory.CREDENTIALS.value, language='en')

    score_it = engine.calculate_risk(it_security_employee, creds_scenario)
    score_marketing = engine.calculate_risk(marketing_employee, creds_scenario)

    # IT Security should have higher impact for Credentials scenarios
    assert score_it.impact > score_marketing.impact


def test_scenario_alpha_weights(engine):
    """Test that different scenarios use different alpha weights."""
    executive = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.EXECUTIVE.value,
        department='IT'
    )

    bec_scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')
    creds_scenario = Scenario(category=ScenarioCategory.CREDENTIALS.value, language='en')

    score_bec = engine.calculate_risk(executive, bec_scenario)
    score_creds = engine.calculate_risk(executive, creds_scenario)

    # BEC has α=0.70 (seniority matters more)
    # Credentials has α=0.20 (role matters more)
    # So for an Executive in IT, BEC should have higher impact
    assert score_bec.impact_breakdown.alpha == Decimal("0.70")
    assert score_creds.impact_breakdown.alpha == Decimal("0.20")


# ============================================================================
# FINAL SCORE CALCULATION TESTS
# ============================================================================

def test_multiplicative_model(engine):
    """Test that high L + low I ≠ critical, and low L + high I ≠ critical."""
    high_l_low_i = EmployeeProfile(
        age_range=AgeRange.AGE_55_PLUS.value,
        gender=Gender.FEMALE.value,
        languages=['fr'],
        technical_literacy=0,  # High likelihood
        seniority=Seniority.INTERN.value,  # Low impact
        department='Marketing'
    )

    low_l_high_i = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=10,  # Low likelihood
        seniority=Seniority.EXECUTIVE.value,  # High impact
        department='Finance'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')

    score_hl = engine.calculate_risk(high_l_low_i, scenario)
    score_li = engine.calculate_risk(low_l_high_i, scenario)

    # Neither should be critical
    assert score_hl.risk_band != RiskBand.CRITICAL
    assert score_li.risk_band != RiskBand.CRITICAL


def test_risk_bands(engine):
    """Test that risk bands are correctly assigned."""
    scenarios = [
        Scenario(category=ScenarioCategory.BEC.value, language='en'),
        Scenario(category=ScenarioCategory.CREDENTIALS.value, language='en'),
    ]

    for scenario in scenarios:
        # Test LOW band (0-24)
        low_employee = EmployeeProfile(
            age_range=AgeRange.AGE_35_44.value,
            gender=Gender.MALE.value,
            languages=['en'],
            technical_literacy=10,
            seniority=Seniority.INTERN.value,
            department='Marketing'
        )
        score_low = engine.calculate_risk(low_employee, scenario)
        assert score_low.risk_score <= 24
        assert score_low.risk_band == RiskBand.LOW

        # Test CRITICAL band (75-100)
        critical_employee = EmployeeProfile(
            age_range=AgeRange.AGE_55_PLUS.value,
            gender=Gender.FEMALE.value,
            languages=['fr'],
            technical_literacy=0,
            seniority=Seniority.EXECUTIVE.value,
            department='Finance'
        )
        score_critical = engine.calculate_risk(critical_employee, scenario)
        # This might not always hit critical depending on exact values,
        # but should at least be HIGH or CRITICAL
        assert score_critical.risk_band in [RiskBand.HIGH, RiskBand.CRITICAL]


# ============================================================================
# EXPLAINABILITY TESTS
# ============================================================================

def test_explainability_breakdown_exists(engine, sample_employee_low_risk, scenario_bec):
    """Test that explainability breakdown is always present."""
    score = engine.calculate_risk(sample_employee_low_risk, scenario_bec)

    # Likelihood breakdown
    assert score.likelihood_breakdown is not None
    assert score.likelihood_breakdown.tl_risk is not None
    assert score.likelihood_breakdown.age_modifier is not None
    assert score.likelihood_breakdown.lang_match is not None
    assert score.likelihood_breakdown.gender_modifier is not None

    # Impact breakdown
    assert score.impact_breakdown is not None
    assert score.impact_breakdown.seniority_impact is not None
    assert score.impact_breakdown.role_impact is not None
    assert score.impact_breakdown.alpha is not None


def test_contributions_sum_to_total(engine, sample_employee_low_risk, scenario_bec):
    """Test that component contributions sum to total likelihood/impact."""
    score = engine.calculate_risk(sample_employee_low_risk, scenario_bec)

    # Likelihood components should sum to total (within rounding)
    lb = score.likelihood_breakdown
    likelihood_sum = (
        lb.tl_contribution +
        lb.age_contribution +
        lb.lang_contribution +
        lb.gender_contribution
    )
    assert abs(likelihood_sum - lb.total_likelihood) < Decimal("0.0001")

    # Impact components should sum to total
    ib = score.impact_breakdown
    impact_sum = ib.seniority_contribution + ib.role_contribution
    assert abs(impact_sum - ib.total_impact) < Decimal("0.0001")


# ============================================================================
# EDGE CASES & VALIDATION
# ============================================================================

def test_clamping_to_zero_one(engine):
    """Test that all scores are clamped to [0, 1]."""
    employees = [
        EmployeeProfile(
            age_range=age,
            gender=gender,
            languages=['en'],
            technical_literacy=tl,
            seniority=seniority,
            department=dept
        )
        for age in AgeRange
        for gender in Gender
        for tl in [0, 5, 10]
        for seniority in Seniority
        for dept in ['Finance', 'IT', 'Marketing']
    ]

    scenarios = [
        Scenario(category=cat, language='en')
        for cat in ScenarioCategory
    ]

    for employee in employees:
        for scenario in scenarios:
            score = engine.calculate_risk(employee, scenario)
            assert Decimal("0") <= score.likelihood <= Decimal("1")
            assert Decimal("0") <= score.impact <= Decimal("1")
            assert 0 <= score.risk_score <= 100


def test_invalid_technical_literacy_raises_error():
    """Test that invalid technical literacy raises ValueError."""
    with pytest.raises(ValueError, match="technical_literacy must be between 0 and 10"):
        EmployeeProfile(
            age_range=AgeRange.AGE_35_44.value,
            gender=Gender.MALE.value,
            languages=['en'],
            technical_literacy=11,  # Invalid
            seniority=Seniority.MID.value,
            department='IT'
        )

    with pytest.raises(ValueError, match="technical_literacy must be between 0 and 10"):
        EmployeeProfile(
            age_range=AgeRange.AGE_35_44.value,
            gender=Gender.MALE.value,
            languages=['en'],
            technical_literacy=-1,  # Invalid
            seniority=Seniority.MID.value,
            department='IT'
        )


def test_unknown_department_fallback(engine):
    """Test that unknown departments fall back to 'Other' impact."""
    unknown_dept_employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=5,
        seniority=Seniority.MID.value,
        department='NonexistentDepartment'
    )

    scenario = Scenario(category=ScenarioCategory.BEC.value, language='en')
    score = engine.calculate_risk(unknown_dept_employee, scenario)

    # Should not crash and should use fallback impact
    assert score.impact is not None
    assert score.impact_breakdown.role_impact == Decimal("0.50")  # "Other" default


# ============================================================================
# CONVENIENCE FUNCTION TEST
# ============================================================================

def test_convenience_function():
    """Test the convenience calculate_risk_score function."""
    employee = EmployeeProfile(
        age_range=AgeRange.AGE_35_44.value,
        gender=Gender.MALE.value,
        languages=['en'],
        technical_literacy=7,
        seniority=Seniority.SENIOR.value,
        department='Finance'
    )

    scenario = Scenario(
        category=ScenarioCategory.BEC.value,
        language='en'
    )

    score = calculate_risk_score(employee, scenario, employee_id="test123")

    assert score.employee_id == "test123"
    assert score.risk_score >= 0
    assert score.risk_score <= 100
    assert score.algorithm_version == "v1.0"


# ============================================================================
# REAL-WORLD SCENARIOS
# ============================================================================

def test_realistic_cfo_bec_scenario(engine):
    """Test a realistic high-risk scenario: CFO targeted by BEC."""
    cfo = EmployeeProfile(
        age_range=AgeRange.AGE_45_54.value,
        gender=Gender.MALE.value,
        languages=['en', 'ar'],
        technical_literacy=4,  # Average literacy
        seniority=Seniority.EXECUTIVE.value,
        department='Finance'
    )

    bec_scenario = Scenario(
        category=ScenarioCategory.BEC.value,
        language='en'
    )

    score = engine.calculate_risk(cfo, bec_scenario, "cfo-001")

    # CFO + BEC + Finance should be HIGH or CRITICAL risk
    assert score.risk_band in [RiskBand.HIGH, RiskBand.CRITICAL]
    print(f"\nCFO BEC Risk Score: {score.risk_score} ({score.risk_band.value})")
    print(f"  Likelihood: {score.likelihood}")
    print(f"  Impact: {score.impact}")


def test_realistic_intern_credentials_scenario(engine):
    """Test a realistic low-risk scenario: Marketing intern targeted by credential harvest."""
    intern = EmployeeProfile(
        age_range=AgeRange.AGE_18_24.value,
        gender=Gender.FEMALE.value,
        languages=['en'],
        technical_literacy=8,  # Tech-savvy
        seniority=Seniority.INTERN.value,
        department='Marketing'
    )

    creds_scenario = Scenario(
        category=ScenarioCategory.CREDENTIALS.value,
        language='en'
    )

    score = engine.calculate_risk(intern, creds_scenario, "intern-001")

    # Intern + Marketing should be LOW or MEDIUM risk
    assert score.risk_band in [RiskBand.LOW, RiskBand.MEDIUM]
    print(f"\nIntern Credentials Risk Score: {score.risk_score} ({score.risk_band.value})")
    print(f"  Likelihood: {score.likelihood}")
    print(f"  Impact: {score.impact}")
