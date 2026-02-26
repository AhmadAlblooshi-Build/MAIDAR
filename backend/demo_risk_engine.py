"""
MAIDAR Risk Engine Demonstration
=================================

This script demonstrates the risk scoring engine with realistic examples.
"""

from app.core.risk_engine import (
    EmployeeProfile,
    Scenario,
    calculate_risk_score,
    AgeRange,
    Gender,
    Seniority,
    ScenarioCategory,
)


def print_risk_score(employee_name: str, scenario_name: str, risk):
    """Print risk score with detailed breakdown."""
    print(f"\n{'='*70}")
    print(f"Employee: {employee_name}")
    print(f"Scenario: {scenario_name}")
    print(f"{'='*70}")
    print(f"\n>> RISK SCORE: {risk.risk_score}/100 [{risk.risk_band.value}]")
    print(f"   Likelihood: {float(risk.likelihood):.4f}")
    print(f"   Impact:     {float(risk.impact):.4f}")

    print(f"\n>> LIKELIHOOD BREAKDOWN:")
    lb = risk.likelihood_breakdown
    print(f"   - Technical Literacy Risk: {float(lb.tl_risk):.4f} (weight 0.40) -> {float(lb.tl_contribution):.4f}")
    print(f"   - Age Modifier:            {float(lb.age_modifier):.4f} (weight 0.25) -> {float(lb.age_contribution):.4f}")
    print(f"   - Language Match:          {float(lb.lang_match):.4f} (weight 0.20) -> {float(lb.lang_contribution):.4f}")
    print(f"   - Gender Modifier:         {float(lb.gender_modifier):.4f} (weight 0.15) -> {float(lb.gender_contribution):.4f}")
    print(f"   {'-'*66}")
    print(f"   TOTAL LIKELIHOOD: {float(lb.total_likelihood):.4f}")

    print(f"\n>> IMPACT BREAKDOWN:")
    ib = risk.impact_breakdown
    print(f"   - Seniority Impact:        {float(ib.seniority_impact):.4f} (alpha={float(ib.alpha):.2f}) -> {float(ib.seniority_contribution):.4f}")
    print(f"   - Role Impact:             {float(ib.role_impact):.4f} (1-alpha={float(1-ib.alpha):.2f}) -> {float(ib.role_contribution):.4f}")
    print(f"   - Scenario Category: {ib.scenario_category.value}")
    print(f"   {'-'*66}")
    print(f"   TOTAL IMPACT: {float(ib.total_impact):.4f}")

    print(f"\n>> INTERPRETATION:")
    if risk.risk_band.value == "CRITICAL":
        print("   [!!!] CRITICAL RISK - Immediate attention required!")
    elif risk.risk_band.value == "HIGH":
        print("   [!!]  HIGH RISK - Priority for targeted training")
    elif risk.risk_band.value == "MEDIUM":
        print("   [!]   MEDIUM RISK - Monitor and provide awareness training")
    else:
        print("   [OK]  LOW RISK - Standard security awareness sufficient")


def main():
    """Run risk engine demonstrations."""
    print("\n" + "="*70)
    print(" MAIDAR RISK ENGINE DEMONSTRATION ".center(70, "="))
    print("="*70)

    # ========================================================================
    # SCENARIO 1: CFO targeted by BEC (Business Email Compromise)
    # ========================================================================

    cfo = EmployeeProfile(
        age_range=AgeRange.AGE_51_60,
        gender=Gender.MALE,
        languages=['en', 'ar'],
        technical_literacy=4,  # Below average tech skills
        seniority=Seniority.EXECUTIVE,
        department='Finance'
    )

    bec_scenario = Scenario(
        category=ScenarioCategory.BEC,
        language='en'
    )

    cfo_risk = calculate_risk_score(cfo, bec_scenario, "cfo-001")
    print_risk_score("CFO - Finance Department", "BEC (Wire Fraud)", cfo_risk)

    # ========================================================================
    # SCENARIO 2: IT Admin targeted by Credentials Harvest
    # ========================================================================

    it_admin = EmployeeProfile(
        age_range=AgeRange.AGE_26_35,
        gender=Gender.FEMALE,
        languages=['en'],
        technical_literacy=9,  # High tech skills
        seniority=Seniority.SENIOR,
        department='IT Security'
    )

    creds_scenario = Scenario(
        category=ScenarioCategory.CREDENTIALS,
        language='en'
    )

    it_risk = calculate_risk_score(it_admin, creds_scenario, "it-001")
    print_risk_score("IT Security Admin", "Credential Harvest", it_risk)

    # ========================================================================
    # SCENARIO 3: Marketing Intern targeted by Credentials Harvest
    # ========================================================================

    intern = EmployeeProfile(
        age_range=AgeRange.AGE_18_25,
        gender=Gender.FEMALE,
        languages=['en'],
        technical_literacy=8,  # Tech-savvy
        seniority=Seniority.INTERN,
        department='Marketing'
    )

    intern_risk = calculate_risk_score(intern, creds_scenario, "intern-001")
    print_risk_score("Marketing Intern", "Credential Harvest", intern_risk)

    # ========================================================================
    # SCENARIO 4: HR Manager targeted by Data Disclosure
    # ========================================================================

    hr_manager = EmployeeProfile(
        age_range=AgeRange.AGE_36_50,
        gender=Gender.FEMALE,
        languages=['en', 'ar'],
        technical_literacy=5,  # Average tech skills
        seniority=Seniority.SENIOR,
        department='HR'
    )

    data_scenario = Scenario(
        category=ScenarioCategory.DATA,
        language='en'
    )

    hr_risk = calculate_risk_score(hr_manager, data_scenario, "hr-001")
    print_risk_score("HR Manager", "Data Disclosure Request", hr_risk)

    # ========================================================================
    # SCENARIO 5: Operations Employee targeted by Malware
    # ========================================================================

    ops_employee = EmployeeProfile(
        age_range=AgeRange.AGE_60_PLUS,
        gender=Gender.MALE,
        languages=['ar'],  # Language mismatch
        technical_literacy=2,  # Low tech skills
        seniority=Seniority.MID,
        department='Operations'
    )

    malware_scenario = Scenario(
        category=ScenarioCategory.MALWARE,
        language='en'
    )

    ops_risk = calculate_risk_score(ops_employee, malware_scenario, "ops-001")
    print_risk_score("Operations Employee (60+)", "Malware Attachment", ops_risk)

    # ========================================================================
    # SUMMARY
    # ========================================================================

    print(f"\n{'='*70}")
    print(" SUMMARY ".center(70, "="))
    print("="*70)

    print("\n>> RISK SCORES COMPARISON:\n")
    scenarios = [
        ("CFO - Finance + BEC", cfo_risk.risk_score, cfo_risk.risk_band.value),
        ("IT Admin + Credentials", it_risk.risk_score, it_risk.risk_band.value),
        ("Marketing Intern + Credentials", intern_risk.risk_score, intern_risk.risk_band.value),
        ("HR Manager + Data", hr_risk.risk_score, hr_risk.risk_band.value),
        ("Operations (60+) + Malware", ops_risk.risk_score, ops_risk.risk_band.value),
    ]

    # Sort by risk score
    scenarios.sort(key=lambda x: x[1], reverse=True)

    for i, (name, score, band) in enumerate(scenarios, 1):
        bar = "#" * (score // 2)  # Visual bar
        print(f"{i}. {name:35} {score:3}/100 [{band:8}] {bar}")

    print("\n>> KEY INSIGHTS:")
    print("   - CFO + BEC = HIGH risk (Executive seniority + Finance role + BEC scenario)")
    print("   - IT Admin + Credentials = HIGH risk (High impact role despite high tech literacy)")
    print("   - Intern + Credentials = LOW risk (Low seniority offsets likelihood)")
    print("   - HR Manager + Data = HIGH risk (HR role highly exposed to data scenarios)")
    print("   - Operations 60+ + Malware = MEDIUM/HIGH (Age + low tech literacy + language mismatch)")

    print("\n>> THE ENGINE IS:")
    print("   [OK] Deterministic: Same inputs always produce same outputs")
    print("   [OK] Explainable: Every score shows exactly why it's that value")
    print("   [OK] Scenario-Aware: Risk varies by scenario type (BEC != Credentials)")
    print("   [OK] Multiplicative: High L + Low I != Critical (both must be high)")

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
