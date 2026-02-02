import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import WebsiteUrlInput from "../components/WebsiteUrlInput";
import HeroBackground from "../components/HeroBackground";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const pageRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const heroPhrases = [
    "menos costo. más ventas.",
    "una URL. creativos listos.",
  ];
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
  }, [heroPhraseIndex, heroCharIndex, heroIsDeleting]);

  const faqs = [
    {
      question: "¿Qué es ADNCreativo?",
      answer:
        "Una herramienta que toma la URL de tu sitio, extrae tu marca (logo, colores, fuentes) y genera creativos listos para publicar. Sin briefs. Sin diseñador. Menos costo, más velocidad.",
    },
    {
      question: "¿Quién lo usa?",
      answer:
        "Equipos de marketing, agencias y marcas que quieren sacar más creativos sin depender de un diseñador o de IA genérica que no convierte.",
    },
    {
      question: "¿Genera texto e imágenes?",
      answer:
        "Sí. Imágenes, copy y formatos para redes. Todo alineado a tu marca porque la IA lee tu web primero.",
    },
    {
      question: "¿En qué se diferencia de otras IAs?",
      answer:
        "Otras IAs te dan creativos genéricos. ADNCreativo aprende tu marca desde tu URL y genera todo coherente. Más reconocimiento = mejor performance.",
    },
    {
      question: "¿Qué redes y formatos?",
      answer:
        "Instagram, Facebook, LinkedIn, X (Twitter), TikTok. Formatos listos para cada una. Un solo lugar, todas las redes.",
    },
    {
      question: "¿Puedo usar varias marcas o clientes?",
      answer:
        "Sí. Una cuenta, múltiples sitios. Cambiás de URL y generás para otra marca al toque.",
    },
    {
      question: "¿Dónde se guarda todo?",
      answer:
        "En nuestros servidores. No tenés que configurar nada. Entrás, pegás URL, generás.",
    },
    {
      question: "¿Por qué usarlo ahora?",
      answer:
        "Cada día que publicás creativos que no se reconocen como tuyos, perdés ventas y reconocimiento. Quien unifica marca primero, gana. El costo de no actuar es seguir gastando en anuncios que no se distinguen.",
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!websiteUrl?.trim()) return;
    // TODO: enviar URL al backend cuando exista endpoint (ej. /workspaces/new o similar)
  };

  const [cardTilts, setCardTilts] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const CARD_TILT_MAX = 10;

  function handleCardMouseMove(index, e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 2 * CARD_TILT_MAX;
    const rotateX = (0.5 - y) * 2 * CARD_TILT_MAX;
    setCardTilts((prev) => {
      const next = [...prev];
      next[index] = { x: rotateX, y: rotateY };
      return next;
    });
  }

  function handleCardMouseLeave(index) {
    setCardTilts((prev) => {
      const next = [...prev];
      next[index] = { x: 0, y: 0 };
      return next;
    });
  }

  useEffect(() => {
    if (!pageRef.current) return;
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
      if (heroTitle && heroSubtitle && heroInput) {
        gsap.from([heroTitle, heroSubtitle, heroInput], {
          opacity: 0,
          y: 56,
          duration: 0.9,
          stagger: 0.15,
          ease: "power3.out",
          delay: 0.2,
        });
      }
      sections.forEach((section, index) => {
        if (index === 0) return;
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
            y: 50,
            duration: 0.75,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
        const grid = section.querySelector("[class*='md:grid']");
        if (grid && grid.children.length) {
          gsap.from(grid.children, {
            scrollTrigger: { trigger: grid, start: "top 90%" },
            opacity: 0,
            y: 44,
            duration: 0.65,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
        const faqList = section.querySelector(".space-y-4");
        if (faqList && faqList.children.length) {
          gsap.from(faqList.children, {
            scrollTrigger: { trigger: faqList, start: "top 92%" },
            opacity: 0,
            y: 28,
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
            y: 40,
            duration: 0.8,
            ease: "power2.out",
          });
        }
        const ctaContent = section.querySelector(".relative.z-10.max-w-4xl");
        if (ctaContent && ctaContent.children.length) {
          gsap.from(ctaContent.children, {
            scrollTrigger: { trigger: ctaContent, start: "top 88%" },
            opacity: 0,
            y: 40,
            duration: 0.6,
            stagger: 0.12,
            ease: "power2.out",
          });
        }
        if (marcaBlock && marcaBlock.children.length) {
          gsap.from(Array.from(marcaBlock.children), {
            scrollTrigger: { trigger: section, start: "top 85%" },
            opacity: 0,
            x: -36,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out",
          });
        }
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="bg-white">
      {/* Hero Section – paper shader exacto como referencia (fixed > canvas + gradiente to-background) */}
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
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-3 sm:mb-4 text-black leading-tight font-serif text-center transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              <em>
                Creativos que venden.
                <br />
                Sin diseñador.
              </em>
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

          {/* Input form – mismo componente que "Dejá de pagar por creativos que no convierten" */}
          <div
            data-gsap="hero-input"
            className="w-full px-4 sm:px-6 mb-8 sm:mb-12 lg:mb-0"
          >
            <div
              className="max-w-md mx-auto transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              <WebsiteUrlInput
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onSubmit={handleSubmit}
                className="max-w-md mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="w-full bg-white py-12 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 text-gray-900 font-instrument-serif">
            Cómo <span className="italic">funciona</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            Tres pasos simples para contenido con tu marca
          </p>

          {/* Mobile: pasos verticales (igual que referencia, en español) */}
          <div className="md:hidden space-y-16">
            {/* Paso 1 - Móvil */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-gray-300 font-instrument-serif text-4xl italic mb-4">
                1
              </span>
              <h3 className="text-2xl italic text-gray-900 font-instrument-serif mb-3">
                Analizá tu marca
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                Pegá la URL de tu sitio. Nuestra IA lee tu web y extrae logo,
                colores, fuentes y estilo en segundos. Sin subir archivos.
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
              <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100/80 w-full max-w-[220px]">
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
                  Analizando tu marca...
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
                Generá creativos
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                La IA genera creativos profesionales a la medida de tu marca.
                Desde Stories hasta banners, todos los formatos que necesitás.
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
                Exportá y publicá
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[280px]">
                Descargá tus creativos en cualquier formato. Listos para
                Instagram, Facebook, TikTok, LinkedIn y más.
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
              <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100/80 w-full max-w-[280px]">
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
                  Listo para exportar
                </p>
                <p className="text-xs text-gray-400">Creativos generados</p>
              </div>
            </div>
          </div>

          {/* Desktop: 3 cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1 */}
            <div
              className="relative aspect-square"
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              onMouseMove={(e) => handleCardMouseMove(0, e)}
              onMouseLeave={() => handleCardMouseLeave(0)}
            >
              <div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div
                  className="relative bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-lg text-center h-full flex flex-col justify-between transition-shadow duration-300 hover:shadow-2xl"
                  style={{
                    transform: `perspective(1000px) rotateX(${cardTilts[0].x}deg) rotateY(${cardTilts[0].y}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    1
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      Pegá tu URL
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
                              tusitio.com
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
                          Vos
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-4">
                    Una URL. Extraemos tu marca y generamos.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="relative aspect-square"
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              onMouseMove={(e) => handleCardMouseMove(1, e)}
              onMouseLeave={() => handleCardMouseLeave(1)}
            >
              <div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div
                  className="relative bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-lg text-center h-full flex flex-col justify-between transition-shadow duration-300 hover:shadow-2xl"
                  style={{
                    transform: `perspective(1000px) rotateX(${cardTilts[1].x}deg) rotateY(${cardTilts[1].y}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    2
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      Leemos tu marca
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
                        Colores
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
                        Fuentes
                      </p>
                      <div className="flex justify-center gap-2 text-[10px] text-gray-600">
                        <span>Myriad Set Pro</span>
                        <span>•</span>
                        <span>SF Pro</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-4">
                    Logo, colores, fuentes. Todo desde tu web.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="relative aspect-square overflow-visible"
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              onMouseMove={(e) => handleCardMouseMove(2, e)}
              onMouseLeave={() => handleCardMouseLeave(2)}
            >
              <div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div
                  className="relative bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-lg text-center overflow-visible h-full flex flex-col justify-between transition-shadow duration-300 hover:shadow-2xl"
                  style={{
                    transform: `perspective(1000px) rotateX(${cardTilts[2].x}deg) rotateY(${cardTilts[2].y}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 font-instrument-serif text-2xl sm:text-3xl italic">
                    3
                  </span>
                  <div>
                    <h3 className="italic text-gray-900 font-instrument-serif text-xl sm:text-2xl mb-3 sm:mb-4">
                      Creativos listos
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
                    Imágenes, copy y formatos. Tu marca. Sin diseñador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Una marca. Todas las redes. */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 sm:mb-6 text-gray-900 font-instrument-serif">
            Una marca. <span className="italic">Todas las redes.</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Contenido coherente en todas tus redes desde una sola fuente. Menos
            trabajo. Más reconocimiento.
          </p>
          <div
            data-gsap="brand-diagram"
            className="relative flex h-[400px] sm:h-[500px] md:h-[650px] w-full items-center justify-center overflow-hidden rounded-3xl backdrop-blur-sm"
          >
            <div className="flex w-full h-full flex-row items-center justify-between px-4 sm:px-12 md:px-24 gap-2 sm:gap-4 md:gap-6">
              <div className="flex items-center">
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-12 sm:size-16 md:size-24">
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
              <div className="flex items-center">
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-14 sm:size-20 md:size-28 p-2 sm:p-3 md:p-4">
                  <img
                    alt="ADNCreativo"
                    loading="lazy"
                    width="64"
                    height="64"
                    decoding="async"
                    className="w-full h-full object-contain"
                    style={{ color: "transparent" }}
                    src="/images/logo-adncreativo.svg"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 md:gap-4">
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="instagram-gradient-brand"
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
                      fill="url(#instagram-gradient-brand)"
                    />
                  </svg>
                </div>
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#1877F2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#0A66C2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-10 sm:size-14 md:size-24">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12"
                    viewBox="0 0 24 24"
                    fill="#000000"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="z-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] size-10 sm:size-14 md:size-24">
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
            {/* Líneas de conexión con gradientes */}
            <svg
              fill="none"
              width="100%"
              height="100%"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute top-0 left-0 transform-gpu stroke-2"
              viewBox="0 0 1232 650"
              preserveAspectRatio="xMidYMid slice"
            >
              <path
                d="M 144,325 Q 380,325 616,325"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 144,325 Q 380,325 616,325"
                strokeWidth="2"
                stroke="url(#gradLine1)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,101"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,101"
                strokeWidth="2"
                stroke="url(#gradLine2)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,213"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,213"
                strokeWidth="2"
                stroke="url(#gradLine3)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,325"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,325"
                strokeWidth="2"
                stroke="url(#gradLine4)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,437"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,437"
                strokeWidth="2"
                stroke="url(#gradLine5)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,549"
                stroke="gray"
                strokeWidth="2"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />
              <path
                d="M 616,325 Q 852,325 1088,549"
                strokeWidth="2"
                stroke="url(#gradLine6)"
                strokeOpacity="1"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="gradLine1"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#6366f1" stopOpacity="0" />
                  <stop stopColor="#6366f1" />
                  <stop offset="32.5%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="gradLine2"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#E4405F" stopOpacity="0" />
                  <stop stopColor="#E4405F" />
                  <stop offset="32.5%" stopColor="#833AB4" />
                  <stop offset="100%" stopColor="#833AB4" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="gradLine3"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#1877F2" stopOpacity="0" />
                  <stop stopColor="#1877F2" />
                  <stop offset="32.5%" stopColor="#3B5998" />
                  <stop offset="100%" stopColor="#3B5998" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="gradLine4"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#0A66C2" stopOpacity="0" />
                  <stop stopColor="#0A66C2" />
                  <stop offset="32.5%" stopColor="#0077B5" />
                  <stop offset="100%" stopColor="#0077B5" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="gradLine5"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#1DA1F2" stopOpacity="0" />
                  <stop stopColor="#1DA1F2" />
                  <stop offset="32.5%" stopColor="#14171A" />
                  <stop offset="100%" stopColor="#14171A" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="gradLine6"
                  gradientUnits="userSpaceOnUse"
                  x1="83.31602%"
                  x2="73.31602%"
                  y1="0%"
                  y2="0%"
                >
                  <stop stopColor="#00F2EA" stopOpacity="0" />
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
      <section
        className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white"
        style={{ opacity: 1, visibility: "visible" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="relative w-full min-h-[300px] sm:min-h-[350px] md:min-h-[400px] flex items-center justify-start overflow-hidden rounded-2xl md:rounded-3xl">
            {/* Background image con fondo de respaldo por si no carga */}
            <div className="absolute inset-0 z-0">
              <img
                alt="Cómo funciona ADNCreativo"
                loading="lazy"
                decoding="async"
                className="object-cover object-center w-full h-full"
                src="/images/div-computer.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
            </div>
            {/* Content */}
            <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
              <div className="max-w-[38rem]">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight font-serif">
                  Marca primero. <em className="italic">IA después.</em>
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-white mb-3 sm:mb-4 font-medium">
                  IA genérica no vende.{" "}
                  <span className="font-bold">La tuya sí.</span>
                </p>
                <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed max-w-2xl">
                  Leemos tu web primero. Colores, fuentes, tono. Todo lo que
                  generamos sale con tu marca. Creativos que se reconocen = más
                  conversión. Quien unifica primero, gana. Seguís con IA
                  genérica y seguís tirando plata en anuncios que no se
                  distinguen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-serif text-center mb-4">
            <em className="italic">Preguntas frecuentes</em>
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Objeciones resueltas. Decidí con datos.
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                  whileTap={{ scale: 0.995 }}
                >
                  <span className="font-medium text-gray-900">
                    {faq.question}
                  </span>
                  <motion.svg
                    className="w-5 h-5 text-gray-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </motion.svg>
                </motion.button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-gray-600">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-emerald-300"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-serif mb-6">
            Dejá de pagar por creativos que{" "}
            <em className="italic">no convierten</em>
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Pegá tu URL. Empezá hoy. Cada día que esperás es plata en anuncios
            que no se distinguen.
          </p>

          <WebsiteUrlInput
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto"
          />
        </div>
      </section>
    </div>
  );
}
