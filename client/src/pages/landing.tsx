import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import logoImg from "@assets/logo_reorg_1772727107589.png";

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-[#EEECEA] bg-white/60 text-[#3A4058]">
      {children}
    </span>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [activePhase, setActivePhase] = useState("1");
  const [activeTab, setActiveTab] = useState("phases");
  const [demoForm, setDemoForm] = useState({ company: "", role: "", email: "", useCase: "" });

  const NAV_LINKS = [
    { label: t("landing.navPlatform"), href: "#platform" },
    { label: t("landing.navMethod"), href: "#method" },
    { label: t("landing.navTGF"), href: "#tgf" },
    { label: t("landing.navFounder"), href: "#founder" },
    { label: t("landing.navDashboards"), href: "#dashboards" },
    { label: t("landing.navSecurity"), href: "#security" },
    { label: t("landing.navPackaging"), href: "#pricing" },
    { label: t("landing.navFAQ"), href: "#faq" },
  ];

  const PHASE_LIST = [
    { id: "0", name: t("landing.phase0Name"), desc: t("landing.phase0Desc"), chips: [t("landing.phase0Chip1"), t("landing.phase0Chip2"), t("landing.phase0Chip3")] },
    { id: "1", name: t("landing.phase1Name"), desc: t("landing.phase1Desc"), chips: [t("landing.phase1Chip1"), t("landing.phase1Chip2"), t("landing.phase1Chip3")] },
    { id: "2", name: t("landing.phase2Name"), desc: t("landing.phase2Desc"), chips: [t("landing.phase2Chip1"), t("landing.phase2Chip2"), t("landing.phase2Chip3")] },
    { id: "3", name: t("landing.phase3Name"), desc: t("landing.phase3Desc"), chips: [t("landing.phase3Chip1"), t("landing.phase3Chip2"), t("landing.phase3Chip3")] },
    { id: "4", name: t("landing.phase4Name"), desc: t("landing.phase4Desc"), chips: [t("landing.phase4Chip1"), t("landing.phase4Chip2"), t("landing.phase4Chip3")] },
    { id: "5", name: t("landing.phase5Name"), desc: t("landing.phase5Desc"), chips: [t("landing.phase5Chip1"), t("landing.phase5Chip2"), t("landing.phase5Chip3")] },
    { id: "6", name: t("landing.phase6Name"), desc: t("landing.phase6Desc"), chips: [t("landing.phase6Chip1"), t("landing.phase6Chip2"), t("landing.phase6Chip3")] },
    { id: "7", name: t("landing.phase7Name"), desc: t("landing.phase7Desc"), chips: [t("landing.phase7Chip1"), t("landing.phase7Chip2"), t("landing.phase7Chip3")] },
  ];

  const PHASE_DETAIL: Record<string, { title: string; body: string; outputs: string[]; checks: string[] }> = {
    "0": {
      title: t("landing.phase0DetailTitle"),
      body: t("landing.phase0DetailBody"),
      outputs: [t("landing.phase0Output1"), t("landing.phase0Output2"), t("landing.phase0Output3"), t("landing.phase0Output4")],
      checks: [t("landing.phase0Check1"), t("landing.phase0Check2"), t("landing.phase0Check3"), t("landing.phase0Check4")],
    },
    "1": {
      title: t("landing.phase1DetailTitle"),
      body: t("landing.phase1DetailBody"),
      outputs: [t("landing.phase1Output1"), t("landing.phase1Output2"), t("landing.phase1Output3"), t("landing.phase1Output4")],
      checks: [t("landing.phase1Check1"), t("landing.phase1Check2"), t("landing.phase1Check3"), t("landing.phase1Check4")],
    },
    "2": {
      title: t("landing.phase2DetailTitle"),
      body: t("landing.phase2DetailBody"),
      outputs: [t("landing.phase2Output1"), t("landing.phase2Output2"), t("landing.phase2Output3"), t("landing.phase2Output4")],
      checks: [t("landing.phase2Check1"), t("landing.phase2Check2"), t("landing.phase2Check3"), t("landing.phase2Check4")],
    },
    "3": {
      title: t("landing.phase3DetailTitle"),
      body: t("landing.phase3DetailBody"),
      outputs: [t("landing.phase3Output1"), t("landing.phase3Output2"), t("landing.phase3Output3"), t("landing.phase3Output4")],
      checks: [t("landing.phase3Check1"), t("landing.phase3Check2"), t("landing.phase3Check3"), t("landing.phase3Check4")],
    },
    "4": {
      title: t("landing.phase4DetailTitle"),
      body: t("landing.phase4DetailBody"),
      outputs: [t("landing.phase4Output1"), t("landing.phase4Output2"), t("landing.phase4Output3"), t("landing.phase4Output4")],
      checks: [t("landing.phase4Check1"), t("landing.phase4Check2"), t("landing.phase4Check3"), t("landing.phase4Check4")],
    },
    "5": {
      title: t("landing.phase5DetailTitle"),
      body: t("landing.phase5DetailBody"),
      outputs: [t("landing.phase5Output1"), t("landing.phase5Output2"), t("landing.phase5Output3"), t("landing.phase5Output4")],
      checks: [t("landing.phase5Check1"), t("landing.phase5Check2"), t("landing.phase5Check3"), t("landing.phase5Check4")],
    },
    "6": {
      title: t("landing.phase6DetailTitle"),
      body: t("landing.phase6DetailBody"),
      outputs: [t("landing.phase6Output1"), t("landing.phase6Output2"), t("landing.phase6Output3"), t("landing.phase6Output4")],
      checks: [t("landing.phase6Check1"), t("landing.phase6Check2"), t("landing.phase6Check3"), t("landing.phase6Check4")],
    },
    "7": {
      title: t("landing.phase7DetailTitle"),
      body: t("landing.phase7DetailBody"),
      outputs: [t("landing.phase7Output1"), t("landing.phase7Output2"), t("landing.phase7Output3"), t("landing.phase7Output4")],
      checks: [t("landing.phase7Check1"), t("landing.phase7Check2"), t("landing.phase7Check3"), t("landing.phase7Check4")],
    },
  };

  const FAQ_ITEMS = [
    { q: t("landing.faqQ1"), a: t("landing.faqA1") },
    { q: t("landing.faqQ2"), a: t("landing.faqA2") },
    { q: t("landing.faqQ3"), a: t("landing.faqA3") },
    { q: t("landing.faqQ4"), a: t("landing.faqA4") },
    { q: t("landing.faqQ5"), a: t("landing.faqA5") },
    { q: t("landing.faqQ6"), a: t("landing.faqA6") },
  ];

  const TGF_PILLARS = [
    { name: t("landing.tgfPillar1Name"), title: t("landing.tgfPillar1Title"), purpose: t("landing.tgfPillar1Purpose"), outputs: t("landing.tgfPillar1Outputs") },
    { name: t("landing.tgfPillar2Name"), title: t("landing.tgfPillar2Title"), purpose: t("landing.tgfPillar2Purpose"), outputs: t("landing.tgfPillar2Outputs") },
    { name: t("landing.tgfPillar3Name"), title: t("landing.tgfPillar3Title"), purpose: t("landing.tgfPillar3Purpose"), outputs: t("landing.tgfPillar3Outputs") },
    { name: t("landing.tgfPillar4Name"), title: t("landing.tgfPillar4Title"), purpose: t("landing.tgfPillar4Purpose"), outputs: t("landing.tgfPillar4Outputs") },
    { name: t("landing.tgfPillar5Name"), title: t("landing.tgfPillar5Title"), purpose: t("landing.tgfPillar5Purpose"), outputs: t("landing.tgfPillar5Outputs") },
  ];

  useEffect(() => {
    document.title = t("landing.seo.title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", t("landing.seo.description"));
    }
    const setOgTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setOgTag("og:title", t("landing.seo.ogTitle"));
    setOgTag("og:description", t("landing.seo.ogDescription"));
    setOgTag("og:type", "website");
    return () => { document.title = "ReOrg AI"; };
  }, [t, i18n.language]);

  const scrollTo = (hash: string) => {
    setMobileOpen(false);
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: t("landing.demoReceived"), description: t("landing.wellBeInTouch", { email: demoForm.email }) });
    setDemoForm({ company: "", role: "", email: "", useCase: "" });
  };

  const detail = PHASE_DETAIL[activePhase];

  const container = "max-w-[1180px] mx-auto px-6";
  const sectionCls = "py-16 md:py-20";
  const sectionAlt = `${sectionCls} bg-[#EEECEA]/40`;
  const cardCls = "bg-white rounded-2xl border border-[#EEECEA] p-5 shadow-[0_6px_18px_rgba(32,19,27,.07)]";
  const calloutCls = "bg-white rounded-2xl border border-[#EEECEA] p-5 shadow-[0_10px_30px_rgba(32,19,27,.08)]";
  const btnPrimary = "inline-flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer border transition-transform hover:-translate-y-px active:translate-y-0 bg-[#F09B44] border-[#E56932]/40 text-[#20131B] no-underline";
  const btnSecondary = "inline-flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer border border-[#EEECEA] bg-white text-[#3A4058] transition-transform hover:-translate-y-px active:translate-y-0 no-underline";
  const btnGhost = "inline-flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer border border-transparent bg-transparent text-[#3A4058] transition-transform hover:-translate-y-px hover:bg-[#4C8EB7]/12 hover:border-[#4C8EB7]/18 active:translate-y-0 no-underline";
  const leadCls = "text-[#20131B]/70 text-base max-w-3xl";
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[#EEECEA] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4C8EB7]/30";

  return (
    <div style={{ background: "#FAF9F8", color: "#20131B", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", lineHeight: 1.4, scrollBehavior: "smooth" }}>

      <header className="sticky top-0 z-50 border-b border-[#EEECEA]" style={{ backdropFilter: "blur(12px)", background: "color-mix(in srgb, #FAF9F8 80%, transparent 20%)" }}>
        <div className={`${container} flex items-center justify-between py-3.5 gap-4`}>
          <a href="#" className="flex items-center gap-3 font-bold tracking-wide no-underline" data-testid="link-brand">
            <img src={logoImg} alt="Re-Org.AI" className="w-9 h-9 rounded-xl object-contain" />
            <span className="flex flex-col leading-none">
              <span className="text-base font-bold">Re-Org.AI</span>
              <small className="text-xs font-semibold text-[#20131B]/60 tracking-wider">{t("landing.aiFirstReorg")}</small>
            </span>
          </a>

          <nav className="hidden lg:flex gap-3 items-center text-sm font-semibold text-[#20131B]/70" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); scrollTo(l.href); }}
                className="py-2 px-2 rounded-[10px] hover:bg-[#B5B1BC]/18 no-underline"
                data-testid={`link-nav-${l.label.replace(/[^a-z]/gi, "").toLowerCase()}`}
              >{l.label}</a>
            ))}
          </nav>

          <div className="hidden lg:flex gap-2.5 items-center">
            <a href="#demo" onClick={(e) => { e.preventDefault(); scrollTo("#demo"); }} className={btnSecondary} data-testid="link-request-demo">{t("landing.requestDemo")}</a>
            <a href="#pilot" onClick={(e) => { e.preventDefault(); scrollTo("#pilot"); }} className={btnPrimary} data-testid="link-start-pilot">{t("landing.startPilot")}</a>
            <button onClick={() => navigate("/auth")} className={btnGhost} data-testid="button-sign-in">{t("common.signIn")}</button>
          </div>

          <button
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-[#EEECEA]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("landing.toggleMenu")} aria-expanded={mobileOpen}
            data-testid="button-mobile-menu"
          >
            <div className="flex flex-col gap-1">
              <span className="block w-4 h-0.5 rounded-sm bg-[#20131B]/80" />
              <span className="block w-4 h-0.5 rounded-sm bg-[#20131B]/80" />
              <span className="block w-4 h-0.5 rounded-sm bg-[#20131B]/80" />
            </div>
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden px-6 pb-5 pt-3 border-t border-[#EEECEA]">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); scrollTo(l.href); }}
                className="block py-3 font-bold text-[#20131B]/70 no-underline"
                data-testid={`link-mobile-${l.label.replace(/[^a-z]/gi, "").toLowerCase()}`}
              >{l.label}</a>
            ))}
            <div className="flex gap-2.5 flex-wrap mt-2">
              <a href="#demo" onClick={(e) => { e.preventDefault(); scrollTo("#demo"); }} className={`${btnPrimary} flex-1 justify-center`} data-testid="link-mobile-request-demo">{t("landing.requestDemo")}</a>
              <button onClick={() => navigate("/auth")} className={`${btnGhost} flex-1`} data-testid="button-mobile-sign-in">{t("common.signIn")}</button>
            </div>
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1}>

        <section className="pt-16 pb-10" style={{
          background: "radial-gradient(900px 500px at 35% 10%, rgba(240,155,68,.14), transparent 55%), radial-gradient(900px 500px at 70% 20%, rgba(76,142,183,.16), transparent 55%), radial-gradient(900px 500px at 55% 75%, rgba(94,78,110,.14), transparent 55%)"
        }}>
          <div className={`${container} max-w-4xl text-center mx-auto`}>
            <div className="mb-5 inline-flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#F09B44]" aria-hidden="true" />
              <span className="inline-flex items-center gap-2.5 px-3 py-2 rounded-full border border-[#EEECEA] bg-white/75 text-[#3A4058]/70 text-[13px] font-semibold">
                {t("landing.multiTenantPlatform")}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.06] tracking-tight mb-5" data-testid="text-hero-headline">
              {t("landing.heroHeadline")}
            </h1>

            <p className="text-[#20131B]/70 text-lg max-w-2xl mx-auto mb-7" data-testid="text-hero-lead">
              {t("landing.heroLead")}
            </p>

            <div className="flex gap-2.5 flex-wrap justify-center mb-8">
              <a href="#pilot" onClick={(e) => { e.preventDefault(); scrollTo("#pilot"); }} className={btnPrimary} data-testid="button-hero-pilot">{t("landing.startAPilot")}</a>
              <a href="#demo" onClick={(e) => { e.preventDefault(); scrollTo("#demo"); }} className={btnSecondary} data-testid="button-hero-demo">{t("landing.requestADemo")}</a>
              <a href="#method" onClick={(e) => { e.preventDefault(); scrollTo("#method"); }} className={btnGhost} data-testid="button-hero-method">{t("landing.exploreMethod")}</a>
            </div>

            <div className="flex gap-2.5 flex-wrap justify-center mb-10" aria-label="Trust indicators">
              {[t("landing.evidenceFirst"), t("landing.phaseGated"), t("landing.antiHallucination"), t("landing.fullAuditTrail")].map((b) => (
                <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#EEECEA] bg-white/75 text-[#3A4058]/80" data-testid={`badge-${b.replace(/[^a-z]/gi, "").toLowerCase()}`}>
                  {b}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto" aria-label="Key metrics">
              {[
                { value: t("landing.pages170"), label: t("landing.implPlaybook") },
                { value: t("landing.phases7"), label: t("landing.structuredMethod") },
                { value: t("landing.ratio8020"), label: t("landing.automationRatio") },
              ].map((k) => (
                <div key={k.label} className="py-4 rounded-2xl border border-[#EEECEA] bg-white/60">
                  <div className="text-2xl font-extrabold text-[#3A4058]">{k.value}</div>
                  <div className="text-xs text-[#20131B]/55 font-semibold mt-1">{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className={sectionCls}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.whatIsReorg")}</h2>
            <p className={`${leadCls} mb-8`}>
              {t("landing.whatIsReorgDesc")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { title: t("landing.zeroBasedRebuild"), desc: t("landing.zeroBasedDesc"), color: "#E56932" },
                { title: t("landing.multiTenantTitle"), desc: t("landing.multiTenantDesc"), color: "#4C8EB7" },
                { title: t("landing.antiHallucinationTitle"), desc: t("landing.antiHallucinationDesc"), color: "#5E4E6E" },
              ].map((c) => (
                <div key={c.title} className={cardCls} data-testid={`card-platform-${c.title.replace(/[^a-z]/gi, "").toLowerCase()}`}>
                  <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                    <div className="w-4 h-4 rounded-sm" style={{ background: c.color }} />
                  </div>
                  <h3 className="font-extrabold text-base mb-1">{c.title}</h3>
                  <p className="text-sm text-[#20131B]/65">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className={calloutCls}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-extrabold text-base mb-2">{t("landing.howItWorks")}</h3>
                  <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                    <li>{t("landing.howItWorksList1")}</li>
                    <li>{t("landing.howItWorksList2")}</li>
                    <li>{t("landing.howItWorksList3")}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-extrabold text-base mb-2">{t("landing.whatConsultantsDeliver")}</h3>
                  <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                    <li>{t("landing.consultantsList1")}</li>
                    <li>{t("landing.consultantsList2")}</li>
                    <li>{t("landing.consultantsList3")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="method" className={sectionAlt}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.methodTitle")}</h2>
            <p className={`${leadCls} mb-6`}>
              {t("landing.methodDesc")}
            </p>

            <div className="flex gap-2 mb-4" role="tablist" aria-label="Method tabs">
              {[
                { id: "phases", label: t("landing.phases07") },
                { id: "agents", label: t("landing.extractionPrecision") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${activeTab === tab.id ? "bg-[#3A4058] text-white border-[#3A4058]" : "bg-white text-[#3A4058] border-[#EEECEA] hover:bg-[#EEECEA]/50"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "phases" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3.5">
                <div className="space-y-2">
                  {PHASE_LIST.map((phase) => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setActivePhase(phase.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition-colors ${activePhase === phase.id ? "border-[#4C8EB7]/40 bg-[#4C8EB7]/5 shadow-[0_6px_18px_rgba(32,19,27,.07)]" : "border-[#EEECEA] bg-white hover:bg-[#EEECEA]/30"}`}
                      data-testid={`phase-item-${phase.id}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${activePhase === phase.id ? "bg-[#4C8EB7] text-white" : "bg-[#EEECEA] text-[#3A4058]"}`}>
                          {phase.id}
                        </span>
                        <span className="font-extrabold text-sm">{phase.name}</span>
                      </div>
                      <p className="text-sm text-[#20131B]/60 ml-10">{phase.desc}</p>
                      <div className="flex gap-1.5 flex-wrap ml-10 mt-2">
                        {phase.chips.map((c) => <Chip key={c}>{c}</Chip>)}
                      </div>
                    </button>
                  ))}
                </div>

                <div className={calloutCls}>
                  {detail && (
                    <>
                      <h3 className="font-extrabold text-lg mb-2" data-testid="text-phase-detail-title">{detail.title}</h3>
                      <p className="text-sm text-[#20131B]/65 mb-4">{detail.body}</p>
                      <div className="mb-4">
                        <div className="font-extrabold text-sm text-[#3A4058] mb-2">{t("landing.typicalOutputs")}</div>
                        <div className="flex gap-1.5 flex-wrap" data-testid="phase-detail-outputs">
                          {detail.outputs.map((o) => <Chip key={o}>{o}</Chip>)}
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#3A4058] mb-2">{t("landing.acceptanceChecks")}</div>
                        <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1" data-testid="phase-detail-checks">
                          {detail.checks.map((c) => <li key={c}>{c}</li>)}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "agents" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
                <div className={calloutCls}>
                  <h3 className="font-extrabold text-base mb-2" data-testid="text-agents-title">{t("landing.agentsTitle")}</h3>
                  <p className="text-sm text-[#20131B]/65 mb-3">
                    {t("landing.agentsDesc")}
                  </p>
                  <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                    <li><strong className="text-[#20131B]">{t("landing.agentClassifier")}</strong> - {t("landing.agentClassifierDesc")}</li>
                    <li><strong className="text-[#20131B]">{t("landing.agentExtractor")}</strong> - {t("landing.agentExtractorDesc")}</li>
                    <li><strong className="text-[#20131B]">{t("landing.agentNormalizer")}</strong> - {t("landing.agentNormalizerDesc")}</li>
                    <li><strong className="text-[#20131B]">{t("landing.agentModeler")}</strong> - {t("landing.agentModelerDesc")}</li>
                    <li><strong className="text-[#20131B]">{t("landing.agentReporter")}</strong> - {t("landing.agentReporterDesc")}</li>
                  </ul>
                </div>
                <div className={calloutCls}>
                  <h3 className="font-extrabold text-base mb-2">{t("landing.precisionTitle")}</h3>
                  <p className="text-sm text-[#20131B]/65 mb-3">
                    {t("landing.precisionDesc")}
                  </p>
                  <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                    <li>{t("landing.precisionList1")}</li>
                    <li>{t("landing.precisionList2")}</li>
                    <li>{t("landing.precisionList3")}</li>
                    <li>{t("landing.precisionList4")}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="tgf" className={sectionCls}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.tgfTitle")}</h2>
            <p className={`${leadCls} mb-3`}>
              {t("landing.tgfDesc1")}
            </p>
            <p className={`${leadCls} mb-8`}>
              {t("landing.tgfDesc2")}
            </p>

            <div className="space-y-3 mb-6">
              {TGF_PILLARS.map((p, i) => (
                <div key={p.name} className={cardCls} data-testid={`card-tgf-pillar-${i}`}>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 bg-[#5E4E6E]/12 text-[#5E4E6E] border border-[#5E4E6E]/20">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <h3 className="font-extrabold text-base">{p.name}</h3>
                        <span className="text-sm text-[#20131B]/55 font-semibold">{p.title}</span>
                      </div>
                      <p className="text-sm text-[#20131B]/65 mb-1.5">{p.purpose}</p>
                      <p className="text-xs text-[#20131B]/50"><strong className="text-[#20131B]/65">{t("landing.boardOutputs")}</strong> {p.outputs}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={calloutCls} data-testid="card-tgf-flywheel">
                <h3 className="font-extrabold text-base mb-2">{t("landing.tgfFlywheelTitle")}</h3>
                <p className="text-sm text-[#20131B]/65 mb-3">
                  {t("landing.tgfFlywheelBody")}
                </p>
                <p className="text-sm text-[#20131B]/65">
                  {t("landing.tgfFlywheelResult")}
                </p>
              </div>
              <div className={calloutCls} data-testid="card-tgf-why-matters">
                <h3 className="font-extrabold text-base mb-2">{t("landing.tgfWhyMattersTitle")}</h3>
                <p className="text-sm text-[#20131B]/65 mb-3">
                  {t("landing.tgfWhyMattersBody")}
                </p>
                <p className="text-sm text-[#20131B]/65">
                  {t("landing.tgfWhyMattersResult")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              {[
                { label: t("landing.tgfMetricFinancial"), items: t("landing.tgfMetricFinancialItems") },
                { label: t("landing.tgfMetricCustomer"), items: t("landing.tgfMetricCustomerItems") },
                { label: t("landing.tgfMetricProcess"), items: t("landing.tgfMetricProcessItems") },
                { label: t("landing.tgfMetricLearning"), items: t("landing.tgfMetricLearningItems") },
              ].map((m) => (
                <div key={m.label} className="py-3 px-4 rounded-2xl border border-[#EEECEA] bg-white/60 text-center" data-testid={`card-tgf-metric-${m.label.toLowerCase()}`}>
                  <div className="text-sm font-extrabold text-[#3A4058] mb-1">{m.label}</div>
                  <div className="text-xs text-[#20131B]/55">{m.items}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="founder" className={sectionAlt}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.founderTitle")}</h2>
            <p className={`${leadCls} mb-8`}>
              {t("landing.founderDesc")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div className={calloutCls}>
                <h3 className="font-extrabold text-xl mb-1" data-testid="text-founder-name">{t("landing.founderName")}</h3>
                <p className="text-sm text-[#4C8EB7] font-semibold mb-4">{t("landing.founderRole")}</p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#3A4058] mb-1.5">{t("landing.founderBoardTitle")}</h4>
                    <p className="text-sm text-[#20131B]/65">
                      {t("landing.founderBoardDesc")}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-[#3A4058] mb-1.5">{t("landing.founderTrackTitle")}</h4>
                    <p className="text-sm text-[#20131B]/65">
                      {t("landing.founderTrackDesc")}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-[#3A4058] mb-1.5">{t("landing.founderAcademicTitle")}</h4>
                    <p className="text-sm text-[#20131B]/65">
                      {t("landing.founderAcademicDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={cardCls} data-testid="card-founder-credentials">
                  <h4 className="font-extrabold text-sm text-[#3A4058] mb-2">{t("landing.founderCredentials")}</h4>
                  <ul className="text-sm text-[#20131B]/65 space-y-1.5">
                    <li>{t("landing.founderCred1")}</li>
                    <li>{t("landing.founderCred2")}</li>
                    <li>{t("landing.founderCred3")}</li>
                    <li>{t("landing.founderCred4")}</li>
                  </ul>
                </div>

                <div className={cardCls} data-testid="card-founder-networks">
                  <h4 className="font-extrabold text-sm text-[#3A4058] mb-2">{t("landing.founderNetworks")}</h4>
                  <ul className="text-sm text-[#20131B]/65 space-y-1.5">
                    <li>{t("landing.founderNet1")}</li>
                    <li>{t("landing.founderNet2")}</li>
                    <li>{t("landing.founderNet3")}</li>
                  </ul>
                </div>

                <div className={cardCls} data-testid="card-founder-research">
                  <h4 className="font-extrabold text-sm text-[#3A4058] mb-2">{t("landing.founderResearch")}</h4>
                  <p className="text-sm text-[#20131B]/65 italic mb-2">
                    {t("landing.founderResearchQuote")}
                  </p>
                  <p className="text-xs text-[#20131B]/50">
                    {t("landing.founderResearchMethod")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="dashboards" className={sectionCls}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.dashboardsTitle")}</h2>
            <p className={`${leadCls} mb-8`}>
              {t("landing.dashboardsDesc")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-3">{t("landing.dashboardBaselineTitle")}</h3>
                <div className="grid grid-cols-3 gap-3 mb-3" aria-label="Dashboard KPI tiles">
                  {[
                    { label: t("landing.dashboardCostToServe"), value: "$", pct: 70 },
                    { label: t("landing.dashboardCycleTime"), value: "-", pct: 58 },
                    { label: t("landing.dashboardQualityRisk"), value: "-", pct: 76 },
                  ].map((k) => (
                    <div key={k.label}>
                      <div className="text-[11px] text-[#20131B]/55 font-semibold">{k.label}</div>
                      <div className="text-lg font-extrabold">{k.value}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-[#EEECEA] overflow-hidden">
                        <span className="block h-full rounded-full bg-[#4C8EB7]" style={{ width: `${k.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-20 rounded-xl border border-dashed border-[#B5B1BC]/55 relative overflow-hidden" style={{
                  background: "linear-gradient(to top, rgba(76,142,183,.12), transparent 55%), radial-gradient(220px 120px at 30% 60%, rgba(240,155,68,.22), transparent 60%)",
                }}>
                  <div className="absolute inset-0 opacity-35" style={{
                    backgroundImage: "linear-gradient(90deg, rgba(181,177,188,.20) 1px, transparent 1px)",
                    backgroundSize: "22px 100%",
                  }} />
                </div>
                <div className="flex gap-2.5 flex-wrap mt-2.5 text-[12.5px] text-[#20131B]/55">
                  <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-[#4C8EB7] inline-block" />{t("landing.dashboardEvidenceKPIs")}</span>
                  <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-[#F09B44] inline-block" />{t("landing.dashboardOpportunities")}</span>
                  <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-[#5E4E6E] inline-block" />{t("landing.dashboardRiskTiers")}</span>
                </div>
              </div>

              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-1">{t("landing.dashboardReportBuilder")}</h3>
                <p className="text-sm text-[#20131B]/65 mb-3">{t("landing.dashboardReportBuilderDesc")}</p>
                <div className="space-y-2.5">
                  {[
                    { title: t("landing.dashboardExports"), desc: t("landing.dashboardExportsDesc") },
                    { title: t("landing.dashboardVersioning"), desc: t("landing.dashboardVersioningDesc") },
                    { title: t("landing.dashboardEvidence"), desc: t("landing.dashboardEvidenceDesc") },
                  ].map((c) => (
                    <div key={c.title} className={cardCls}>
                      <h3 className="font-extrabold text-sm mb-0.5">{c.title}</h3>
                      <p className="text-sm text-[#20131B]/65">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: t("landing.dashboardBoardReady"), desc: t("landing.dashboardBoardReadyDesc") },
                { title: t("landing.dashboardFinancialModels"), desc: t("landing.dashboardFinancialModelsDesc") },
                { title: t("landing.dashboardRepeatable"), desc: t("landing.dashboardRepeatableDesc") },
              ].map((c) => (
                <div key={c.title} className={cardCls}>
                  <h3 className="font-extrabold text-base mb-1">{c.title}</h3>
                  <p className="text-sm text-[#20131B]/65">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className={sectionAlt}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.securityTitle")}</h2>
            <p className={`${leadCls} mb-8`}>
              {t("landing.securityDesc")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { title: t("landing.securityIsolation"), desc: t("landing.securityIsolationDesc") },
                { title: t("landing.securityDataProtection"), desc: t("landing.securityDataProtectionDesc") },
                { title: t("landing.securityAuditTrail"), desc: t("landing.securityAuditTrailDesc") },
              ].map((c) => (
                <div key={c.title} className={cardCls}>
                  <h3 className="font-extrabold text-base mb-1">{c.title}</h3>
                  <p className="text-sm text-[#20131B]/65">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-2">{t("landing.securityDeployment")}</h3>
                <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1">
                  <li>{t("landing.securityDeployList1")}</li>
                  <li>{t("landing.securityDeployList2")}</li>
                  <li>{t("landing.securityDeployList3")}</li>
                </ul>
              </div>
              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-2">{t("landing.securityPackage")}</h3>
                <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1">
                  <li>{t("landing.securityPackList1")}</li>
                  <li>{t("landing.securityPackList2")}</li>
                  <li>{t("landing.securityPackList3")}</li>
                  <li>{t("landing.securityPackList4")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className={sectionCls}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.pricingTitle")}</h2>
            <p className={`${leadCls} mb-8`}>
              {t("landing.pricingDesc")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: t("landing.pricingDiagnostic"), desc: t("landing.pricingDiagnosticDesc"), highlight: false },
                { title: t("landing.pricingRebuild"), desc: t("landing.pricingRebuildDesc"), highlight: true },
                { title: t("landing.pricingEnterprise"), desc: t("landing.pricingEnterpriseDesc"), highlight: false },
              ].map((p) => (
                <div key={p.title} className={`${cardCls} ${p.highlight ? "ring-2 ring-[#F09B44]/40" : ""}`} data-testid={`card-pricing-${p.title.replace(/\s/g, "-").toLowerCase()}`}>
                  <h3 className="font-extrabold text-base mb-1">{p.title}</h3>
                  <p className="text-sm text-[#20131B]/65">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className={sectionAlt}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.faqTitle")}</h2>
            <p className={`${leadCls} mb-6`}>{t("landing.faqDesc")}</p>

            <div className="space-y-2.5">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className={`${cardCls} group`} data-testid={`faq-item-${i}`}>
                  <summary className="font-extrabold text-sm text-[#3A4058] cursor-pointer list-none select-none flex items-center justify-between gap-3" data-testid={`faq-toggle-${i}`}>
                    {item.q}
                    <span className="text-[#B5B1BC] text-lg flex-shrink-0 group-open:hidden">+</span>
                    <span className="text-[#B5B1BC] text-lg flex-shrink-0 hidden group-open:inline">-</span>
                  </summary>
                  <p className="text-sm text-[#20131B]/65 mt-2.5">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className={sectionCls}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.demoTitle")}</h2>
            <p className={`${leadCls} mb-6`}>{t("landing.demoDesc")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-2">{t("landing.demoWhatYouSee")}</h3>
                <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                  <li>{t("landing.demoList1")}</li>
                  <li>{t("landing.demoList2")}</li>
                  <li>{t("landing.demoList3")}</li>
                  <li>{t("landing.demoList4")}</li>
                </ul>
              </div>

              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-3">{t("landing.demoGetInTouch")}</h3>
                <form onSubmit={handleDemoSubmit} data-testid="form-demo-request">
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="text-sm font-semibold text-[#3A4058]">
                      {t("landing.demoCompany")}
                      <input required className={`${inputCls} mt-1`} value={demoForm.company} onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })} data-testid="input-demo-company" />
                    </label>
                    <label className="text-sm font-semibold text-[#3A4058]">
                      {t("landing.demoRole")}
                      <input required className={`${inputCls} mt-1`} value={demoForm.role} onChange={(e) => setDemoForm({ ...demoForm, role: e.target.value })} data-testid="input-demo-role" />
                    </label>
                  </div>
                  <label className="block mt-2.5 text-sm font-semibold text-[#3A4058]">
                    {t("landing.demoEmail")}
                    <input type="email" required className={`${inputCls} mt-1`} value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} data-testid="input-demo-email" />
                  </label>
                  <label className="block mt-2.5 text-sm font-semibold text-[#3A4058]">
                    {t("landing.demoUseCase")}
                    <textarea rows={3} className={`${inputCls} mt-1`} value={demoForm.useCase} onChange={(e) => setDemoForm({ ...demoForm, useCase: e.target.value })} data-testid="input-demo-usecase" />
                  </label>
                  <div className="flex gap-2.5 flex-wrap mt-3">
                    <button type="submit" className={btnPrimary} data-testid="button-demo-submit">{t("landing.demoSubmit")}</button>
                    <a href="#security" onClick={(e) => { e.preventDefault(); scrollTo("#security"); }} className={btnSecondary}>{t("landing.securityDetails")}</a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section id="pilot" className={sectionAlt}>
          <div className={container}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t("landing.pilotTitle")}</h2>
            <p className={`${leadCls} mb-6`}>
              {t("landing.pilotDesc")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-2">{t("landing.pilotSuccessCriteria")}</h3>
                <ul className="pl-4 list-disc text-sm text-[#20131B]/65 space-y-1.5">
                  <li>{t("landing.pilotCrit1")}</li>
                  <li>{t("landing.pilotCrit2")}</li>
                  <li>{t("landing.pilotCrit3")}</li>
                  <li>{t("landing.pilotCrit4")}</li>
                </ul>
              </div>

              <div className={calloutCls}>
                <h3 className="font-extrabold text-base mb-2">{t("landing.pilotReadyTitle")}</h3>
                <p className="text-sm text-[#20131B]/65 mb-3">{t("landing.pilotReadyDesc")}</p>
                <div className="flex gap-2.5 flex-wrap">
                  <a href="#demo" onClick={(e) => { e.preventDefault(); scrollTo("#demo"); }} className={btnPrimary} data-testid="link-pilot-demo">{t("landing.requestDemo")}</a>
                  <a href="#method" onClick={(e) => { e.preventDefault(); scrollTo("#method"); }} className={btnSecondary} data-testid="link-pilot-method">{t("landing.exploreMethod")}</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 pb-10 border-t border-[#EEECEA] text-[#20131B]/55" role="contentinfo">
        <div className={`${container} flex justify-between items-start gap-4 flex-wrap`}>
          <div>
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="Re-Org.AI" className="w-7 h-7 rounded-lg object-contain" />
              <strong className="text-[#20131B]">Re-Org.AI</strong>
            </div>
            <small className="block mt-2.5">{t("landing.footerTagline")}</small>
          </div>
          <div className="flex gap-3.5 flex-wrap text-sm">
            {[
              { label: t("landing.navPlatform"), href: "#platform" },
              { label: t("landing.navMethod"), href: "#method" },
              { label: t("landing.navTGF"), href: "#tgf" },
              { label: t("landing.navFounder"), href: "#founder" },
              { label: t("landing.navSecurity"), href: "#security" },
              { label: t("landing.navDemo"), href: "#demo" },
            ].map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); scrollTo(l.href); }} className="text-[#20131B]/55 hover:text-[#20131B] no-underline" data-testid={`link-footer-${l.label.toLowerCase()}`}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
