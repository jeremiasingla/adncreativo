import React from "react";
import { useTranslation } from "react-i18next";
import { CenteredLoadingSpinner } from "./LoadingSpinner";
import { IconSparkles } from "./icons";

/**
 * Vista de la galería de referencias: grid de anuncios ganadores con botón "Clonar con mi marca".
 */
export default function ReferenceGalleryView({
  workspaceSlug,
  referenceGallery,
  galleryLoading,
  cloningReferenceId,
  setCloningReferenceId,
  refetchWorkspace,
  navigate,
  fetchWithAuth,
}) {
  const { t } = useTranslation();
  const handleClone = async (ref) => {
    if (!workspaceSlug || cloningReferenceId) return;
    setCloningReferenceId(ref.id);
    try {
      const res = await fetchWithAuth(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/clone-reference`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId: ref.id }),
        }
      );
      const json = await res?.json().catch(() => ({}));
      if (res?.ok && json?.success) {
        await refetchWorkspace();
        setCloningReferenceId(null);
        navigate(`/${workspaceSlug}/creatives`, { replace: true });
      } else {
        setCloningReferenceId(null);
      }
    } catch (_) {
      setCloningReferenceId(null);
    }
  };

  if (galleryLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        <CenteredLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-auto">
      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-semibold text-neutral-900 mb-1 flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-primary" aria-hidden="true" />
            {t("gallery.title")}
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            {t("gallery.subtitle")}
          </p>
          {referenceGallery.length === 0 ? (
            <p className="text-neutral-500 text-sm">{t("gallery.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {referenceGallery.map((ref) => (
                <article
                  key={ref.id}
                  className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden">
                    <img
                      src={ref.imageUrl}
                      alt={ref.category ? `Referencia ${ref.category}` : "Referencia"}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    {ref.category && (
                      <p className="font-medium text-neutral-900 text-sm line-clamp-1">
                        {ref.category}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={!!cloningReferenceId}
                      onClick={() => handleClone(ref)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      {cloningReferenceId === ref.id ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                          Clonando…
                        </>
                      ) : (
                        "Clonar con mi marca"
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
