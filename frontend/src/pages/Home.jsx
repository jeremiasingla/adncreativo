import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import WebsiteUrlInput from "../components/WebsiteUrlInput";
import HeroBackground from "../components/HeroBackground";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const { t } = useTranslation();
  const pageRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const heroPhrases = useMemo(
    () => [
      t("home.hero.phrase1"),
      t("home.hero.phrase2"),
      t("home.hero.phrase3"),
    ],
    [t],
  );
  const [heroPhraseIndex, setHeroPhraseIndex] = useState(0);
  const [heroCharIndex, setHeroCharIndex] = useState(0);
  const [heroIsDeleting, setHeroIsDeleting] = useState(false);

  React.useEffect(() => {
    const phrase = heroPhrases[heroPhraseIndex];
    const typingDelay = heroIsDeleting ? 60 : 120;
    const pauseWhenFull = 2000;
    const delay =
      !heroIsDeleting && heroCharIndex === phrase.length
        ? pauseWhenFull
        : typingDelay;
    const timeout = setTimeout(() => {
      if (!heroIsDeleting) {
        if (heroCharIndex < phrase.length) {
          setHeroCharIndex((i) => i + 1);
        } else {
          setHeroIsDeleting(true);
        }
      } else {
        if (heroCharIndex > 0) {
          setHeroCharIndex((i) => i - 1);
        } else {
          setHeroIsDeleting(false);
          setHeroPhraseIndex((i) => (i + 1) % heroPhrases.length);
        }
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [heroPhraseIndex, heroCharIndex, heroIsDeleting, heroPhrases]);

  // Beam animation for "Una marca. Todas las redes." diagram
  const beamContainerRef = useRef(null);
  const beamTimelineRef = useRef(null);
  useEffect(() => {
    const container = beamContainerRef.current;
    if (!container) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const runAnimation = () => {
      // Incluir _r_ y _R_ por si el id se transforma (ej. build/hydration)
      const gradients = container.querySelectorAll(
        "linearGradient[id^='_r_'], linearGradient[id^='_R_']",
      );
      if (!gradients.length) return null;

      const masterTimeline = gsap.timeline({ repeat: -1 });
      gradients.forEach((grad) => {
        const tl = gsap.timeline();
        tl.fromTo(
          grad,
          { attr: { x1: "-20%", x2: "-30%" } },
          {
            attr: { x1: "120%", x2: "110%" },
            duration: 2.5,
            ease: "power1.inOut",
          },
        );
        masterTimeline.add(tl, 0);
      });
      masterTimeline.to({}, { duration: 1.5 });
      return masterTimeline;
    };

    // En mobile el DOM puede no estar listo; dar un frame para que los SVG defs existan
    const raf = requestAnimationFrame(() => {
      beamTimelineRef.current = runAnimation();
    });

    return () => {
      cancelAnimationFrame(raf);
      if (beamTimelineRef.current) {
        beamTimelineRef.current.kill();
        beamTimelineRef.current = null;
      }
    };
  }, []);

  const faqs = useMemo(() => t("home.faq.items", { returnObjects: true }), [t]);

  const heroMarqueeImages = useMemo(() => {
    const base = [
      {
        src: "/images/hero-examples/v1-1766231845894.webp",
        alt: "Website example 1",
      },
      {
        src: "/images/hero-examples/v2-1766231020715.webp",
        alt: "Website example 2",
      },
      {
        src: "/images/hero-examples/v2-1766231047310.webp",
        alt: "Website example 3",
      },
      {
        src: "/images/hero-examples/v2-1766231111956.webp",
        alt: "Website example 4",
      },
      {
        src: "/images/hero-examples/v2-1766231142030.webp",
        alt: "Website example 5",
      },
      {
        src: "/images/hero-examples/v2-1766231305340.webp",
        alt: "Website example 6",
      },
      {
        src: "/images/hero-examples/v2-1766231471725.webp",
        alt: "Website example 7",
      },
      {
        src: "/images/hero-examples/v2-1766231571582.webp",
        alt: "Website example 8",
      },
      {
        src: "/images/hero-examples/v2-1766232398021.webp",
        alt: "Website example 9",
      },
      {
        src: "/images/hero-examples/v2-1766233335794.webp",
        alt: "Website example 10",
      },
      {
        src: "/images/hero-examples/v2-1766233443664.webp",
        alt: "Website example 11",
      },
    ];
    return [...base, ...base];
  }, []);

  const handleUrlChange = useCallback((e) => setWebsiteUrl(e.target.value), []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!websiteUrl?.trim()) return;
      // TODO: enviar URL al backend cuando exista endpoint (ej. /workspaces/new o similar)
    },
    [websiteUrl],
  );

  const toggleFaq = useCallback((index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  }, []);

  const CARD_TILT_MAX = 8;
  const tiltPendingRef = useRef(null);
  const tiltRafRef = useRef(null);
  const cardInnerRefs = useRef([null, null, null]);

  const handleCardMouseMove = useCallback((index, e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 2 * CARD_TILT_MAX;
    const rotateX = (0.5 - y) * 2 * CARD_TILT_MAX;
    tiltPendingRef.current = { index, x: rotateX, y: rotateY };
    if (tiltRafRef.current != null) return;
    tiltRafRef.current = requestAnimationFrame(() => {
      tiltRafRef.current = null;
      const p = tiltPendingRef.current;
      if (p == null) return;
      tiltPendingRef.current = null;
      const cardEl = cardInnerRefs.current[p.index];
      if (cardEl) {
        cardEl.style.transform = `perspective(1000px) rotateX(${p.x}deg) rotateY(${p.y}deg)`;
      }
    });
  }, []);

  const handleCardMouseLeave = useCallback((index) => {
    const cardEl = cardInnerRefs.current[index];
    if (cardEl) cardEl.style.transform = "";
  }, []);

  useEffect(() => {
    if (!pageRef.current) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const ctx = gsap.context(() => {
      const sections = pageRef.current.querySelectorAll("section");
      const heroTitle = pageRef.current.querySelector(
        "[data-gsap='hero-title']",
      );
      const heroSubtitle = pageRef.current.querySelector(
        "[data-gsap='hero-subtitle']",
      );
      const heroInput = pageRef.current.querySelector(
        "[data-gsap='hero-input']",
      );
      if (heroTitle && heroSubtitle && heroInput && !prefersReducedMotion) {
        gsap.from([heroTitle, heroSubtitle, heroInput], {
          opacity: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out",
          delay: 0.15,
        });
      }
      sections.forEach((section, index) => {
        if (index === 0) return;
        if (prefersReducedMotion) return;
        const isCta = section.querySelector(".relative.z-10.max-w-4xl");
        const marcaBlock = section.querySelector("[class*='38rem']");
        const heading = section.querySelector("h2");
        const sub = section.querySelector("p");
        const targets = [heading, sub].filter(Boolean);
        if (targets.length && !isCta && !marcaBlock) {
          gsap.from(targets, {
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              end: "top 55%",
            },
            opacity: 0,
            y: 30,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
        const grid = section.querySelector("[class*='md:grid']");
        if (grid && grid.children.length) {
          gsap.from(grid.children, {
            scrollTrigger: { trigger: grid, start: "top 90%" },
            opacity: 0,
            y: 30,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
        const faqList = section.querySelector(".space-y-4");
        if (faqList && faqList.children.length) {
          gsap.from(faqList.children, {
            scrollTrigger: { trigger: faqList, start: "top 92%" },
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.04,
            ease: "power2.out",
          });
        }
        const diagramBox = section.querySelector("[data-gsap='brand-diagram']");
        if (diagramBox) {
          gsap.from(diagramBox, {
            scrollTrigger: { trigger: diagramBox, start: "top 88%" },
            opacity: 0,
            y: 30,
            duration: 0.6,
            ease: "power2.out",
          });
        }
        const ctaContent = section.querySelector(".relative.z-10.max-w-4xl");
        if (ctaContent && ctaContent.children.length) {
          // Solo animar título y subtítulo; el input queda siempre visible
          const ctaTexts = [
            ctaContent.children[0],
            ctaContent.children[1],
          ].filter(Boolean);
          if (ctaTexts.length) {
            gsap.from(ctaTexts, {
              scrollTrigger: { trigger: ctaContent, start: "top 88%" },
              opacity: 0,
              y: 30,
              duration: 0.6,
              stagger: 0.12,
              ease: "power2.out",
            });
          }
        }
        if (marcaBlock && marcaBlock.children.length) {
          gsap.from(Array.from(marcaBlock.children), {
            scrollTrigger: { trigger: section, start: "top 85%" },
            opacity: 0,
            x: -24,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef}>
      {/* Hero Section – solo fondo shader (sin bg white) */}
      <section className="relative min-h-screen w-full lg:min-h-0 lg:h-[100dvh]">
        <HeroBackground />
        <div
          className="relative z-10 min-h-screen w-full lg:h-[100dvh] flex flex-col items-center justify-center p-4"
          style={{
            paddingTop:
              "max(10rem, calc(env(safe-area-inset-top, 0px) + 10rem))",
            paddingBottom:
              "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center mt-8 sm:mt-12 lg:mt-0">
            <h1
              data-gsap="hero-title"
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-3 sm:mb-4 leading-tight font-instrument-serif bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-500 bg-clip-text text-transparent"
              style={{
                transition: "800ms ease-out",
                opacity: 1,
                transform: "translate(0px, 0px)",
              }}
            >
              {t("home.hero.title1")}
              <br />
              <span className="italic mr-1">{t("home.hero.title2")}</span>
            </h1>
            <div
              data-gsap="hero-subtitle"
              className="mb-6 sm:mb-8 transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              <span className="inline-block text-lg sm:text-xl md:text-2xl text-black">
                <span className="underline decoration-2 underline-offset-4">
                  {heroPhrases[heroPhraseIndex].slice(0, heroCharIndex)}
                </span>
                <span className="animate-pulse" aria-hidden>
                  |
                </span>
              </span>
            </div>
          </div>

          {/* Input form – glass-prompt-wrap */}
          <div
            data-gsap="hero-input"
            className="w-full px-4 sm:px-6 mb-8 sm:mb-12 lg:mb-0"
          >
            <div
              className="max-w-md mx-auto"
              style={{
                transition: "800ms ease-out",
                opacity: 1,
                transform: "translate(0px, 0px)",
              }}
            >
              <div className="w-full max-w-2xl mx-auto relative rounded-xl p-1 transition-all duration-300 glass-prompt-wrap hover:scale-[1.005]">
                <WebsiteUrlInput
                  value={websiteUrl}
                  onChange={handleUrlChange}
                  onSubmit={handleSubmit}
                  placeholder={t("home.placeholderUrl")}
                />
              </div>
              <p className="text-black/60 text-sm mt-4 text-center">
                {t("home.hero.inputSubtitle")}
              </p>
            </div>
          </div>

          {/* Mobile marquee carousel */}
          <div className="w-full mt-8 lg:hidden">
            <div className="opacity-100 transition-[800ms] ease-out">
              <div className="relative w-full max-w-[100vw] overflow-x-clip">
                <div className="relative overflow-hidden h-[230px]">
                  <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
                    {heroMarqueeImages.map((img, i) => (
                      <div
                        key={`marquee-${img.src}-${i}`}
                        className="flex-shrink-0 px-2 w-[160px] h-[190px]"
                      >
                        <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
                          <img
                            alt={img.alt}
                            loading="lazy"
                            decoding="async"
                            className="object-cover absolute inset-0 w-full h-full"
                            src={img.src}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="w-full bg-white py-12 md:py-24 contain-paint">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 text-gray-900 font-instrument-serif">
            {t("home.howItWorks.title")}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            {t("home.howItWorks.subtitle")}
          </p>

          {/* Mobile: pasos verticales (igual que referencia, en español) */}
          <div className="md:hidden space-y-16">
            {/* Paso 1 - Móvil */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-gray-300 font-instrument-serif text-4xl italic mb-4">
                1
              </span>
              <h3 className="text-2xl italic text-gray-900 font-instrument-serif mb-3">
                {t("home.howItWorks.step1Title")}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                {t("home.howItWorks.step1Desc")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Logo
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Colores
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Fuentes
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Estilo
                </span>
              </div>
              <div className="card-figma p-5 w-full max-w-[220px]">
                <div className="w-14 h-14 mx-auto mb-4 bg-cyan-50 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-cyan-500 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  {t("home.howItWorks.analyzing")}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1">
                  <div className="bg-black h-1 rounded-full w-2/3 transition-all duration-500" />
                </div>
              </div>
            </div>

            {/* Paso 2 - Móvil */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-gray-300 font-instrument-serif text-4xl italic mb-4">
                2
              </span>
              <h3 className="text-2xl italic text-gray-900 font-instrument-serif mb-3">
                {t("home.howItWorks.step2Title")}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                {t("home.howItWorks.step2Desc")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-1">
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Stories
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Reels
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Publicaciones
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Banners
                </span>
              </div>
              <div className="relative h-[220px] w-full flex items-center justify-center">
                <div className="relative" style={{ width: 340, height: 200 }}>
                  <div
                    className="absolute left-0 top-1/2 rounded-lg shadow-md overflow-hidden z-[1]"
                    style={{
                      transform: "translateY(calc(-50% + 8px)) rotate(-8deg)",
                    }}
                  >
                    <img
                      src="/images/facebook-example.webp"
                      alt="Creativo ejemplo 1"
                      loading="lazy"
                      decoding="async"
                      className="w-[80px] h-[107px] object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-[55px] top-1/2 rounded-lg shadow-lg overflow-hidden z-[2]"
                    style={{
                      transform: "translateY(calc(-50% - 8px)) rotate(-3deg)",
                    }}
                  >
                    <img
                      src="/images/instagram-example.webp"
                      alt="Creativo ejemplo 2"
                      loading="lazy"
                      decoding="async"
                      className="w-[85px] h-[113px] object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-[115px] top-1/2 rounded-lg shadow-lg overflow-hidden z-[3]"
                    style={{
                      transform: "translateY(calc(-50% + 5px)) rotate(1deg)",
                    }}
                  >
                    <img
                      src="/images/twitter-example.webp"
                      alt="Creativo ejemplo 3"
                      loading="lazy"
                      decoding="async"
                      className="w-[88px] h-[117px] object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-[180px] top-1/2 rounded-lg shadow-lg overflow-hidden z-[2]"
                    style={{
                      transform: "translateY(calc(-50% - 5px)) rotate(5deg)",
                    }}
                  >
                    <img
                      src="/images/linkedin-example.webp"
                      alt="Creativo ejemplo 4"
                      loading="lazy"
                      decoding="async"
                      className="w-[82px] h-[109px] object-cover"
                    />
                  </div>
                  <div
                    className="absolute right-0 top-1/2 rounded-lg shadow-md overflow-hidden z-[1]"
                    style={{
                      transform: "translateY(calc(-50% + 10px)) rotate(9deg)",
                    }}
                  >
                    <div className="w-[78px] h-[104px] bg-gradient-to-br from-indigo-200 to-purple-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Paso 3 - Móvil */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-gray-300 font-instrument-serif text-4xl italic mb-4">
                3
              </span>
              <h3 className="text-2xl italic text-gray-900 font-instrument-serif mb-3">
                {t("home.howItWorks.step3Title")}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                {t("home.howItWorks.step3Desc")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Instagram
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  Facebook
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  TikTok
                </span>
                <span className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                  LinkedIn
                </span>
              </div>
              <div className="card-figma p-5 w-full max-w-[280px]">
                <div className="flex justify-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-sm">
                    <svg
                      className="w-4.5 h-4.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shadow-sm">
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                    </svg>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#0A66C2] flex items-center justify-center shadow-sm">
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shadow-sm">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {t("home.howItWorks.readyToExport")}
                </p>
                <p className="text-xs text-gray-400">
                  {t("home.howItWorks.creativesGenerated")}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop: 3 cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1 */}
            <div
              className="group/card relative aspect-square transition-[transform,box-shadow] duration-300 ease-out"
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px",
                background: "transparent",
              }}
              onMouseMove={(e) => handleCardMouseMove(0, e)}
              onMouseLeave={() => handleCardMouseLeave(0)}
            >
              <div
                className="relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  background: "transparent",
                }}
              >
                <div
                  ref={(el) => {
                    cardInnerRefs.current[0] = el;
                  }}
                  className="relative card-figma p-4 sm:p-6 text-center h-full flex flex-col justify-between transition-[transform,box-shadow] duration-300 ease-out will-change-transform group-hover/card:shadow-2xl"
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    1
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      {t("home.howItWorks.card1Title")}
                    </h3>
                    <div className="relative">
                      <div
                        className="bg-white rounded-xl p-1.5 border border-gray-200"
                        style={{
                          boxShadow:
                            "rgba(255, 255, 255, 0.3) 0px 0px 15px 3px, rgba(255, 255, 255, 0.15) 0px 0px 25px 8px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-gray-50/80 rounded-lg px-3 py-2 text-left">
                            <span className="text-gray-800 text-xs">
                              {t("home.placeholderUrl")}
                            </span>
                            <span className="inline-block w-0.5 h-3 bg-black animate-pulse ml-0.5 align-middle"></span>
                          </div>
                          <button
                            type="button"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg p-2 transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 19V5M5 12l7-7 7 7"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-8 -right-1 flex flex-col items-start">
                        <svg
                          className="w-6 h-6 drop-shadow-sm"
                          viewBox="0 0 24 24"
                          fill="#000000"
                        >
                          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.86a.5.5 0 0 0-.85.35Z"></path>
                        </svg>
                        <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded -mt-1 ml-4 font-medium">
                          {t("home.howItWorks.you")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-4">
                    {t("home.howItWorks.card1Subtitle")}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="group/card relative aspect-square transition-[transform,box-shadow] duration-300 ease-out"
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px",
                background: "transparent",
              }}
              onMouseMove={(e) => handleCardMouseMove(1, e)}
              onMouseLeave={() => handleCardMouseLeave(1)}
            >
              <div
                className="relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  background: "transparent",
                }}
              >
                <div
                  ref={(el) => {
                    cardInnerRefs.current[1] = el;
                  }}
                  className="relative card-figma p-4 sm:p-6 text-center h-full flex flex-col justify-between transition-[transform,box-shadow] duration-300 ease-out will-change-transform group-hover/card:shadow-2xl"
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    2
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      {t("home.howItWorks.card2TitleDesktop")}
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex justify-center mb-3">
                        <svg
                          className="w-8 h-8"
                          viewBox="0 0 24 24"
                          fill="#000000"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"></path>
                        </svg>
                      </div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">
                        {t("home.howItWorks.colors")}
                      </p>
                      <div className="flex justify-center gap-1.5 mb-3">
                        <div
                          className="w-5 h-5 rounded"
                          title="#0071E3"
                          style={{ backgroundColor: "rgb(0, 113, 227)" }}
                        ></div>
                        <div
                          className="w-5 h-5 rounded"
                          title="#4B5563"
                          style={{ backgroundColor: "rgb(75, 85, 99)" }}
                        ></div>
                        <div
                          className="w-5 h-5 rounded"
                          title="#0071E3"
                          style={{ backgroundColor: "rgb(0, 113, 227)" }}
                        ></div>
                        <div
                          className="w-5 h-5 rounded border border-gray-200"
                          title="#F6F6F8"
                          style={{ backgroundColor: "rgb(246, 246, 248)" }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">
                        {t("home.howItWorks.fonts")}
                      </p>
                      <div className="flex justify-center gap-2 text-[10px] text-gray-600">
                        <span>Myriad Set Pro</span>
                        <span>•</span>
                        <span>SF Pro</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-4">
                    {t("home.howItWorks.card1Desc")}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="group/card relative aspect-square overflow-visible transition-[transform,box-shadow] duration-300 ease-out"
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px",
                background: "transparent",
              }}
              onMouseMove={(e) => handleCardMouseMove(2, e)}
              onMouseLeave={() => handleCardMouseLeave(2)}
            >
              <div
                className="relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  background: "transparent",
                }}
              >
                <div
                  ref={(el) => {
                    cardInnerRefs.current[2] = el;
                  }}
                  className="relative card-figma p-4 sm:p-6 text-center overflow-visible h-full flex flex-col justify-between transition-[transform,box-shadow] duration-300 ease-out will-change-transform group-hover/card:shadow-2xl"
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    3
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      {t("home.howItWorks.card2Title")}
                    </h3>
                    <div className="relative h-[220px] sm:h-[130px] md:h-[160px] flex items-center justify-center overflow-visible">
                      <div
                        className="absolute bg-white p-1.5 rounded-xl shadow-2xl z-[2]"
                        style={{
                          transform:
                            "translateX(-100px) translateY(5px) rotate(-8deg)",
                        }}
                      >
                        <img
                          src="/images/facebook-example.webp"
                          alt="Anuncio Facebook"
                          loading="lazy"
                          decoding="async"
                          className="w-[115px] h-[190px] sm:w-[65px] sm:h-[110px] md:w-[80px] md:h-[135px] rounded-lg object-cover"
                        />
                      </div>
                      <div
                        className="absolute bg-white p-1.5 rounded-xl shadow-2xl z-[3]"
                        style={{
                          transform:
                            "translateX(-30px) translateY(-15px) rotate(-2deg)",
                        }}
                      >
                        <img
                          src="/images/instagram-example.webp"
                          alt="Anuncio Instagram"
                          loading="lazy"
                          decoding="async"
                          className="w-[110px] h-[195px] sm:w-[60px] sm:h-[109px] md:w-[75px] md:h-[136px] rounded-lg object-cover"
                        />
                      </div>
                      <div
                        className="absolute bg-white p-1.5 rounded-xl shadow-2xl z-[4]"
                        style={{
                          transform:
                            "translateX(45px) translateY(20px) rotate(4deg)",
                        }}
                      >
                        <img
                          src="/images/twitter-example.webp"
                          alt="Anuncio Twitter"
                          loading="lazy"
                          decoding="async"
                          className="w-[125px] h-[125px] sm:w-[75px] sm:h-[75px] md:w-[95px] md:h-[95px] rounded-lg object-cover"
                        />
                      </div>
                      <div
                        className="absolute bg-white p-1.5 rounded-xl shadow-2xl z-[1]"
                        style={{
                          transform:
                            "translateX(110px) translateY(0px) rotate(10deg)",
                        }}
                      >
                        <img
                          src="/images/linkedin-example.webp"
                          alt="Anuncio LinkedIn"
                          loading="lazy"
                          decoding="async"
                          className="w-[120px] h-[165px] sm:w-[68px] sm:h-[95px] md:w-[85px] md:h-[118px] rounded-lg object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-4">
                    {t("home.howItWorks.card2Desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Una marca. Todas las redes. - WITH EXACT CIRCLE-FIGMA STYLES */}
      <section className="py-20 px-6 bg-white contain-paint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 sm:mb-6 text-gray-900 font-instrument-serif">
            {t("home.oneBrand.title")}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            {t("home.oneBrand.subtitle")}
          </p>
          <div
            ref={beamContainerRef}
            className="relative flex h-[400px] min-h-[320px] sm:h-[500px] md:h-[650px] w-full items-center justify-center overflow-hidden rounded-3xl card-figma"
            data-gsap="brand-diagram"
          >
            <div className="flex w-full h-full min-w-0 flex-row items-center justify-between px-3 sm:px-12 md:px-24 gap-1 sm:gap-4 md:gap-6">
              {/* User icon */}
              <div className="flex items-center">
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-12 sm:size-16 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>

              {/* Vibiz logo */}
              <div className="flex items-center -ml-4 sm:-ml-6 md:-ml-8">
                <div className="z-10 flex items-center justify-center rounded-full circle-figma size-14 sm:size-20 md:size-28 p-2 sm:p-3 md:p-4">
                  <img
                    alt="Vibiz"
                    loading="lazy"
                    width="64"
                    height="64"
                    decoding="async"
                    className="w-full h-full object-contain"
                    style={{ color: "transparent" }}
                    src="/images/logo-vibiz-no-background.svg"
                  />
                </div>
              </div>

              {/* Social media icons column */}
              <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 md:gap-4">
                {/* Instagram */}
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="instagram-gradient"
                        x1="0%"
                        y1="100%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#FFDC80" />
                        <stop offset="25%" stopColor="#F77737" />
                        <stop offset="50%" stopColor="#E1306C" />
                        <stop offset="75%" stopColor="#C13584" />
                        <stop offset="100%" stopColor="#833AB4" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                      fill="url(#instagram-gradient)"
                    />
                  </svg>
                </div>

                {/* Facebook */}
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#1877F2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>

                {/* LinkedIn */}
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#0A66C2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>

                {/* X/Twitter */}
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#000000"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>

                {/* TikTok */}
                <div className="z-10 flex items-center justify-center rounded-full circle-figma p-3 size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#000000"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* SVG beams - keeping all the existing beam paths */}
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 144,325 Q 372,325 600,325"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 144,325 Q 372,325 600,325"
                strokeWidth="2"
                stroke="url(#_r_u_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_u_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                  <stop stopColor="#6366f1" />
                  <stop offset="32.5%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 600,325 Q 844,325 1088,101"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 600,325 Q 844,325 1088,101"
                strokeWidth="2"
                stroke="url(#_r_v_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_v_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#E4405F" stopOpacity="0" />
                  <stop stopColor="#E4405F" />
                  <stop offset="32.5%" stopColor="#833AB4" />
                  <stop offset="100%" stopColor="#833AB4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 600,325 Q 844,325 1088,213"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 600,325 Q 844,325 1088,213"
                strokeWidth="2"
                stroke="url(#_r_10_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_10_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#1877F2" stopOpacity="0" />
                  <stop stopColor="#1877F2" />
                  <stop offset="32.5%" stopColor="#3B5998" />
                  <stop offset="100%" stopColor="#3B5998" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 600,325 Q 844,325 1088,325"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 600,325 Q 844,325 1088,325"
                strokeWidth="2"
                stroke="url(#_r_11_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_11_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#0A66C2" stopOpacity="0" />
                  <stop stopColor="#0A66C2" />
                  <stop offset="32.5%" stopColor="#0077B5" />
                  <stop offset="100%" stopColor="#0077B5" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 600,325 Q 844,325 1088,437"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 600,325 Q 844,325 1088,437"
                strokeWidth="2"
                stroke="url(#_r_12_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_12_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#1DA1F2" stopOpacity="0" />
                  <stop stopColor="#1DA1F2" />
                  <stop offset="32.5%" stopColor="#14171A" />
                  <stop offset="100%" stopColor="#14171A" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              fill="none"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 transform-gpu stroke-2 w-full h-full"
              viewBox="0 0 1232 650"
            >
              <path
                d="M 600,325 Q 844,325 1088,549"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 600,325 Q 844,325 1088,549"
                strokeWidth="2"
                stroke="url(#_r_13_)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  className="transform-gpu"
                  id="_r_13_"
                  gradientUnits="userSpaceOnUse"
                  x1="109.33824%"
                  x2="99.33824%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#00F2EA" stopOpacity="0" />
                  <stop stopColor="#00F2EA" />
                  <stop offset="32.5%" stopColor="#FF0050" />
                  <stop offset="100%" stopColor="#FF0050" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* Brand-first AI - sin animaciones para que siempre sea visible */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white contain-paint">
        <div className="max-w-7xl mx-auto">
          <div className="relative w-full min-h-[300px] sm:min-h-[350px] md:min-h-[400px] flex items-center justify-start overflow-hidden rounded-2xl md:rounded-3xl">
            {/* Banner: pasado vs futuro, marca primero / IA después */}
            <div className="absolute inset-0 z-0">
              <img
                alt={t("home.brandFirst.imageAlt")}
                loading="lazy"
                decoding="async"
                className="object-cover object-bottom w-full h-full"
                src="/images/Banner.png"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
            </div>
            {/* Content */}
            <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
              <div className="max-w-[38rem]">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight font-serif">
                  {t("home.brandFirst.title")}
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-white mb-3 sm:mb-4 font-medium">
                  {t("home.brandFirst.subtitle1")}{" "}
                  <span className="font-bold">
                    {t("home.brandFirst.subtitle2")}
                  </span>
                </p>
                <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed max-w-2xl">
                  {t("home.brandFirst.body")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="w-full bg-white py-12 md:py-24 contain-paint">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 text-gray-900 font-instrument-serif">
            {t("home.faq.title")}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            {t("home.faq.subtitle")}
          </p>

          <div
            role="region"
            data-slot="accordion"
            data-orientation="vertical"
            dir="ltr"
            className="flex flex-col gap-3"
          >
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="card-figma overflow-hidden"
                data-slot="accordion-item-card"
                data-orientation="vertical"
                data-index={index}
                data-open={openFaq === index ? "" : undefined}
                data-closed={openFaq !== index ? "" : undefined}
              >
                <h3
                  className="flex"
                  data-orientation="vertical"
                  data-index={index}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="group flex flex-1 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-foreground font-sans outline-none transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-64"
                    aria-expanded={openFaq === index}
                    data-slot="accordion-trigger-card"
                    data-panel-open={openFaq === index ? "" : undefined}
                  >
                    <span>{faq.question}</span>
                    <motion.div
                      className="chevron-button shrink-0"
                      animate={{ rotate: openFaq === index ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
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
                        className="size-4"
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </motion.div>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                      role="region"
                      data-slot="accordion-panel-card"
                    >
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer con CTA, disclaimer e iconos sociales */}
      <footer className="relative w-full overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-24 sm:h-36 md:h-48 bg-gradient-to-b from-white via-white/50 to-transparent pointer-events-none z-20"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/Footer.png')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/20"
          aria-hidden
        />

        <div className="relative z-10 pt-20 sm:pt-32 md:pt-40 pb-32 sm:pb-48 md:pb-64">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-black font-instrument-serif">
              {t("home.cta.title")}
            </h2>
            <p className="text-lg sm:text-xl text-black mb-8 sm:mb-12">
              {t("home.cta.subtitle")}
            </p>
            <div className="max-w-md mx-auto">
              <div className="w-full max-w-2xl mx-auto relative rounded-xl p-1 transition-all duration-300 glass-prompt-wrap hover:scale-[1.005]">
                <WebsiteUrlInput
                  value={websiteUrl}
                  onChange={handleUrlChange}
                  onSubmit={handleSubmit}
                  placeholder={t("home.placeholderUrl")}
                />
              </div>
            </div>
            <p className="text-black/80 text-xs sm:text-sm mt-4">
              {t("home.footer.disclaimer")}
            </p>
          </div>
        </div>

        <div className="relative z-10 py-8 sm:py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
                <a
                  href="https://discord.com/invite/N9dGY8gf3y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/90 hover:text-black transition-colors cursor-pointer"
                  aria-label="Discord"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/vibiz.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/90 hover:text-black transition-colors cursor-pointer"
                  aria-label="Instagram"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@vibiz.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/90 hover:text-black transition-colors cursor-pointer"
                  aria-label="TikTok"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/vibiz_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/90 hover:text-black transition-colors cursor-pointer"
                  aria-label="X (Twitter)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/vibizai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/90 hover:text-black transition-colors cursor-pointer"
                  aria-label="LinkedIn"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect width="4" height="12" x="2" y="9" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <div className="w-px h-5 bg-black/50" aria-hidden />
                <a
                  href="/privacy"
                  className="text-black/90 hover:text-black transition-colors text-sm"
                >
                  {t("home.footer.privacy")}
                </a>
                <a
                  href="/refund-policy"
                  className="text-black/90 hover:text-black transition-colors text-sm"
                >
                  {t("home.footer.refundPolicy")}
                </a>
              </div>
              <p className="text-black/90 text-sm">
                {t("home.footer.copyright")}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
