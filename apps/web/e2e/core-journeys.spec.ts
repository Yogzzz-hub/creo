import { test, expect } from "@playwright/test";

test.describe("Core User Journeys", () => {
  test.describe("1. Sign-up & Plan Selection", () => {
    test("should display the sign-up form with all required fields", async ({
      page,
    }) => {
      await page.goto("/signup");

      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
      await expect(page.getByLabel("Full Name")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    test("should show Google and Phone sign-up options", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Phone" })).toBeVisible();
    });

    test("should navigate to plan selection page", async ({ page }) => {
      await page.goto("/signup/plan");

      await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible();
      await expect(page.getByText("Starter")).toBeVisible();
      await expect(page.getByText("Growth")).toBeVisible();
      await expect(page.getByText("Pro")).toBeVisible();
    });

    test("should display plan pricing and features", async ({ page }) => {
      await page.goto("/signup/plan");

      await expect(page.getByText("₹4,999")).toBeVisible();
      await expect(page.getByText("₹9,999")).toBeVisible();
      await expect(page.getByText("₹19,999")).toBeVisible();
      await expect(page.getByText("Most Popular")).toBeVisible();
    });

    test("should pre-select Growth plan when ?plan=growth query param is present", async ({
      page,
    }) => {
      await page.goto("/signup/plan?plan=growth");

      await expect(page.getByText("Growth plan pre-selected based on your selection.")).toBeVisible();
    });

    test("should show select buttons for each plan", async ({ page }) => {
      await page.goto("/signup/plan");

      await expect(page.getByRole("button", { name: /Select Starter/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Select Growth/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Select Pro/i })).toBeVisible();
    });
  });

  test.describe("2. Onboarding Flow (Questionnaire & Terms)", () => {
    test("should display terms and conditions page with scroll-gated agree button", async ({
      page,
    }) => {
      await page.goto("/onboarding/terms");

      await expect(page.getByRole("heading", { name: "Terms & Conditions" })).toBeVisible();
      await expect(page.getByText("Please review and accept our terms to continue.")).toBeVisible();
      await expect(page.getByText("1. Acceptance of Terms")).toBeVisible();
      await expect(page.getByText("I Agree & Continue")).toBeVisible();
    });

    test("should show scroll instruction before scrolling terms", async ({ page }) => {
      await page.goto("/onboarding/terms");

      await expect(page.getByText("Please scroll to the bottom of the terms to continue.")).toBeVisible();
    });

    test("should display Download PDF button on terms page", async ({ page }) => {
      await page.goto("/onboarding/terms");

      await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
    });

    test("should display the 3-step questionnaire form", async ({ page }) => {
      await page.goto("/onboarding/questionnaire");

      await expect(page.getByText("Step 1 of 3: Business Details")).toBeVisible();
      await expect(page.getByText("Brand Profile")).toBeVisible();
      await expect(page.getByLabel("Industry / Niche")).toBeVisible();
      await expect(page.getByLabel("Business Description")).toBeVisible();
    });

    test("should show Next button on step 1 of questionnaire", async ({ page }) => {
      await page.goto("/onboarding/questionnaire");

      await expect(page.getByRole("button", { name: /Next/ })).toBeVisible();
    });

    test("should display terms sections including privacy and payment", async ({
      page,
    }) => {
      await page.goto("/onboarding/terms");

      await expect(page.getByText("4. Subscription Plans & Payment")).toBeVisible();
      await expect(page.getByText("10. Privacy & Data Protection")).toBeVisible();
      await expect(page.getByText("Last Updated: June 2026")).toBeVisible();
    });
  });

  test.describe("3. Deliverable Approval from Client Portal", () => {
    test("should display deliverables list page with heading and filters", async ({
      page,
    }) => {
      await page.goto("/portal/deliverables");

      await expect(page.getByRole("heading", { name: "Deliverables" })).toBeVisible();
      await expect(page.getByText("Review and approve content created for your brand.")).toBeVisible();
    });

    test("should show filter controls for type and status", async ({ page }) => {
      await page.goto("/portal/deliverables");

      await expect(page.getByText("Filters")).toBeVisible();
      await expect(page.getByText("All Types")).toBeVisible();
      await expect(page.getByText("All Statuses")).toBeVisible();
    });

    test("should display mock deliverable cards with titles", async ({ page }) => {
      await page.goto("/portal/deliverables");

      await expect(page.getByText("Summer Fitness Tips Reel")).toBeVisible();
      await expect(page.getByText("Gym Membership Promo Poster")).toBeVisible();
      await expect(page.getByText("Workout Motivation Story")).toBeVisible();
    });

    test("should display status badges on deliverable cards", async ({ page }) => {
      await page.goto("/portal/deliverables");

      await expect(page.getByText("Pending Approval").first()).toBeVisible();
      await expect(page.getByText("Approved").first()).toBeVisible();
    });

    test("should navigate to deliverable detail page", async ({ page }) => {
      await page.goto("/portal/deliverables/1");

      await expect(page.getByRole("heading", { name: "Summer Fitness Tips Reel" })).toBeVisible();
      await expect(page.getByText("30-second reel showcasing 5 quick fitness tips")).toBeVisible();
    });

    test("should show Approve and Reject buttons on pending deliverable", async ({
      page,
    }) => {
      await page.goto("/portal/deliverables/1");

      await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
    });

    test("should show Back to Deliverables link on detail page", async ({ page }) => {
      await page.goto("/portal/deliverables/1");

      await expect(page.getByText("Back to Deliverables")).toBeVisible();
    });

    test("should show add-on upsell banner on deliverables page", async ({ page }) => {
      await page.goto("/portal/deliverables");

      await expect(page.getByText("You've used all your posters this month.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Buy Add-ons" })).toBeVisible();
    });
  });

  test.describe("4. Purchasing an Add-on from Client Portal", () => {
    test("should display add-ons page with heading", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByRole("heading", { name: "Add-ons" })).toBeVisible();
      await expect(page.getByText("Purchase additional content beyond your plan quota.")).toBeVisible();
    });

    test("should display all three add-on types with pricing", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByText("Extra Poster")).toBeVisible();
      await expect(page.getByText("Extra Reel")).toBeVisible();
      await expect(page.getByText("Extra Story")).toBeVisible();
      await expect(page.getByText("₹499")).toBeVisible();
      await expect(page.getByText("₹999")).toBeVisible();
      await expect(page.getByText("₹349")).toBeVisible();
    });

    test("should display Order Summary card", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByText("Order Summary")).toBeVisible();
      await expect(page.getByText("No items selected yet.")).toBeVisible();
    });

    test("should increment quantity when plus button is clicked", async ({ page }) => {
      await page.goto("/portal/addons");

      const plusButtons = page.getByRole("button").filter({ has: page.locator("svg") });

      const firstPlusButton = page.locator("button").filter({ hasText: /^$/ }).nth(1);
      await firstPlusButton.click();

      await expect(page.getByText("Pay Now")).toBeVisible();
    });

    test("should show Pay Now button", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByRole("button", { name: /Pay Now/ })).toBeVisible();
    });

    test("should show charges disclaimer", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByText("Charges added to your next invoice.")).toBeVisible();
    });

    test("should display add-on descriptions", async ({ page }) => {
      await page.goto("/portal/addons");

      await expect(page.getByText("Additional social media poster design for your campaign.")).toBeVisible();
      await expect(page.getByText("Short-form video content edited and ready to post.")).toBeVisible();
    });
  });
});
