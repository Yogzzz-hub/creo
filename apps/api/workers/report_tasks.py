import logging
import os
from datetime import datetime, timezone

from celery import shared_task

logger = logging.getLogger(__name__)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


def _ensure_reports_dir() -> str:
    abs_path = os.path.abspath(REPORTS_DIR)
    os.makedirs(abs_path, exist_ok=True)
    return abs_path


@shared_task(name="generate_weekly_report")
def generate_weekly_report() -> str:
    from utils.exports import generate_pdf_report

    reports_dir = _ensure_reports_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(reports_dir, f"weekly_report_{timestamp}.pdf")

    logger.info("Starting weekly report generation...")

    # Mock aggregation of weekly active tasks and deliverables
    mock_data = {
        "Report Period": {
            "Generated At": datetime.now(timezone.utc).isoformat(),
            "Report Type": "Weekly Operations Summary",
        },
        "Active Tasks": {
            "Total Tasks": 42,
            "Completed This Week": 35,
            "Pending Review": 5,
            "Overdue": 2,
        },
        "Deliverables": {
            "Total Submitted": 28,
            "Approved": 22,
            "Rejected": 3,
            "Pending Approval": 3,
        },
        "Team Performance": {
            "Active Team Members": 8,
            "Average Tasks Per Member": 5.25,
            "On-Time Delivery Rate": "88.5%",
        },
    }

    result_path = generate_pdf_report(
        title="Creo Weekly Report",
        data=mock_data,
        output_path=output_path,
    )

    logger.info("Weekly report generated successfully: %s", result_path)
    return result_path


@shared_task(name="generate_monthly_report")
def generate_monthly_report() -> str:
    from utils.exports import generate_pdf_report

    reports_dir = _ensure_reports_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(reports_dir, f"monthly_report_{timestamp}.pdf")

    logger.info("Starting monthly report generation...")

    mock_data = {
        "Report Period": {
            "Generated At": datetime.now(timezone.utc).isoformat(),
            "Report Type": "Monthly Business Summary",
        },
        "Client Growth": {
            "New Clients This Month": 12,
            "Total Active Clients": 87,
            "Churned Clients": 2,
            "Net Growth": 10,
        },
        "SLA Performance": {
            "Total Deliverables": 156,
            "Delivered On Time": 140,
            "SLA Breaches": 8,
            "SLA Compliance Rate": "94.9%",
        },
        "Plan Distribution": {
            "Starter Plan": 32,
            "Growth Plan": 38,
            "Pro Plan": 17,
        },
        "Support & Escalations": {
            "Tickets Opened": 24,
            "Tickets Resolved": 21,
            "Open Escalations": 3,
        },
    }

    result_path = generate_pdf_report(
        title="Creo Monthly Report",
        data=mock_data,
        output_path=output_path,
    )

    logger.info("Monthly report generated successfully: %s", result_path)
    return result_path


@shared_task(name="generate_financial_report")
def generate_financial_report() -> str:
    from utils.exports import generate_excel_report

    reports_dir = _ensure_reports_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(reports_dir, f"financial_report_{timestamp}.xlsx")

    logger.info("Starting financial report generation...")

    # Mock aggregation of MRR and custom pricing totals
    summary_data = [
        {"Metric": "Total MRR (INR)", "Value": 485000},
        {"Metric": "Active Subscriptions", "Value": 87},
        {"Metric": "Average Revenue Per User", "Value": 5574.71},
        {"Metric": "Custom Pricing Subscriptions", "Value": 5},
        {"Metric": "Custom Pricing Revenue", "Value": 42500},
    ]

    revenue_by_plan = [
        {"Plan": "Starter", "Subscribers": 32, "Monthly Price": 2999, "Total Revenue": 95968},
        {"Plan": "Growth", "Subscribers": 38, "Monthly Price": 5999, "Total Revenue": 227962},
        {"Plan": "Pro", "Subscribers": 12, "Monthly Price": 9999, "Total Revenue": 119988},
        {"Plan": "Custom", "Subscribers": 5, "Monthly Price": 8500, "Total Revenue": 42500},
    ]

    payment_methods = [
        {"Gateway": "Razorpay", "Transactions": 62, "Amount (INR)": 328500, "Percentage": "67.7%"},
        {"Gateway": "Stripe", "Transactions": 25, "Amount (INR)": 156500, "Percentage": "32.3%"},
    ]

    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = Workbook()

    # Sheet 1: Summary
    ws_summary = wb.active
    ws_summary.title = "Summary"
    headers = list(summary_data[0].keys())
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2B7BC4", end_color="2B7BC4", fill_type="solid")

    for col_idx, header in enumerate(headers, start=1):
        cell = ws_summary.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, row_data in enumerate(summary_data, start=2):
        for col_idx, header in enumerate(headers, start=1):
            ws_summary.cell(row=row_idx, column=col_idx, value=row_data.get(header, ""))

    # Sheet 2: Revenue by Plan
    ws_plan = wb.create_sheet("Revenue by Plan")
    plan_headers = list(revenue_by_plan[0].keys())

    for col_idx, header in enumerate(plan_headers, start=1):
        cell = ws_plan.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, row_data in enumerate(revenue_by_plan, start=2):
        for col_idx, header in enumerate(plan_headers, start=1):
            ws_plan.cell(row=row_idx, column=col_idx, value=row_data.get(header, ""))

    # Sheet 3: Payment Methods
    ws_payment = wb.create_sheet("Payment Methods")
    payment_headers = list(payment_methods[0].keys())

    for col_idx, header in enumerate(payment_headers, start=1):
        cell = ws_payment.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, row_data in enumerate(payment_methods, start=2):
        for col_idx, header in enumerate(payment_headers, start=1):
            ws_payment.cell(row=row_idx, column=col_idx, value=row_data.get(header, ""))

    wb.save(output_path)
    logger.info("Financial report generated successfully: %s", output_path)
    return output_path
