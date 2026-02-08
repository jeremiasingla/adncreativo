import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import HeroBackground from "../components/HeroBackground";
import Footer from "../components/Footer";

const PLAN_IDS = ["plus", "pro", "ultra"];

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-check h-4 w-4 text-primary shrink-0 mt-0.5"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-circle-question-mark h-3.5 w-3.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");

  const handleUrlChange = useCallback((e) => setWebsiteUrl(e.target.value), []);
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!websiteUrl?.trim()) return;
    },
    [websiteUrl],
  );

  return (
    <div className="relative w-full min-h-screen flex flex-col overflow-hidden">
      {/* Hero + plans section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-32">
        <div className="absolute inset-0 z-0">
          <HeroBackground />
        </div>
        <div
          className="absolute inset-0 z-[1] w-full h-full bg-white/30 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-[1] w-full h-full bg-gradient-to-b from-transparent via-transparent to-white pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold mb-3 text-black leading-tight font-instrument-serif">
              {t("pricing.title")}
            </h1>
            <p className="text-xl md:text-2xl text-black mb-8">
              {t("pricing.subtitle")}
            </p>
            <div className="flex items-center justify-center mt-8">
              <div className="relative inline-flex items-center rounded-[39px] p-1.5 bg-white/5 backdrop-blur-[5px] shadow-[0px_2px_30px_0px_rgba(0,0,0,0.05),0px_8px_72px_-5px_rgba(0,0,0,0.1)] border border-white/10">
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-full transition-all duration-300 ease-out border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)]"
                  style={{
                    left: billingAnnual ? "87px" : "6px",
                    width: billingAnnual ? "131px" : "81px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setBillingAnnual(false)}
                  className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    !billingAnnual
                      ? "text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingAnnual(true)}
                  className={`relative z-10 pl-4 pr-2.5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    billingAnnual
                      ? "text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  {t("pricing.annual")}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all duration-200 border border-primary/30 bg-gradient-to-r from-primary/15 via-white/80 to-primary/15 text-primary">
                    {t("pricing.annualBadge")}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 mb-16">
            {PLAN_IDS.map((planId) => {
              const plan = t(`pricing.plans.${planId}`, {
                returnObjects: true,
              });
              const isPro = planId === "pro";
              const features = Array.isArray(plan.features)
                ? plan.features
                : [];
              const price = billingAnnual
                ? plan.priceAnnual
                : plan.priceMonthly;
              const priceStrike = billingAnnual ? plan.priceMonthly : null;

              return (
                <div
                  key={planId}
                  className={
                    isPro
                      ? "relative rounded-2xl p-1 -m-1 glass-prompt-wrap lg:-mt-9 flex flex-col lg:mb-[-2rem]"
                      : "contents"
                  }
                >
                  {isPro && (
                    <div className="text-center py-1.5">
                      <span className="text-sm font-medium text-primary">
                        {t("pricing.recommended")}
                      </span>
                    </div>
                  )}
                  <div
                    className={`relative flex flex-col px-6 py-5 transition-all duration-200 h-full card-figma ${
                      isPro ? "flex-1" : "hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-neutral-900 font-serif">
                          {plan.name}
                        </h3>
                      </div>
                      <div
                        className="relative shrink-0 rounded-full overflow-hidden"
                        style={{ ["--x"]: "-100%" }}
                      >
                        <img
                          alt={`${plan.name} badge`}
                          loading="lazy"
                          width={53}
                          height={24}
                          decoding="async"
                          className="h-6 w-auto relative z-10"
                          src={`/images/plan-badges/${planId}.svg`}
                          style={{ color: "transparent" }}
                        />
                        <span
                          className="absolute inset-0 z-20 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(-75deg, transparent calc(var(--x) + 20%), rgba(255,255,255,0.5) calc(var(--x) + 25%), transparent calc(var(--x) + 30%))",
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-neutral-500 mb-4">
                      {plan.credits}
                    </p>
                    <div className="mb-5">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2 h-10">
                          <span className="text-4xl font-bold text-neutral-900">
                            ${price}
                          </span>
                          {priceStrike && (
                            <span className="text-lg text-neutral-400 line-through">
                              ${priceStrike}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">
                          {t("pricing.perMemberMonth")}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {t("pricing.billedYearly")} {plan.yearlyTotal}
                        </span>
                      </div>
                    </div>
                    <div className="mb-5 flex-1 border-t border-neutral-100 pt-5">
                      <p className="text-sm font-medium text-neutral-900 mb-3">
                        {t("pricing.whatsIncluded")}
                      </p>
                      <ul className="space-y-2.5">
                        {features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-neutral-600"
                          >
                            <CheckIcon />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      className={
                        isPro
                          ? "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] border border-primary/50 h-12 rounded-xl px-8 w-full"
                          : "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer btn-signin-header h-12 rounded-xl px-8 w-full"
                      }
                    >
                      {t("pricing.startWith")} {plan.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-normal text-neutral-500 hover:text-primary transition-colors"
            >
              <QuestionIcon />
              {t("pricing.creditsExplained")}
            </button>
          </div>
        </div>
      </section>

      <Footer
        value={websiteUrl}
        onChange={handleUrlChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
